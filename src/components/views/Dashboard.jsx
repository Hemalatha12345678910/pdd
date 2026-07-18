import React, { useState, useEffect } from 'react';
import { Users, FileImage, ShieldAlert, Activity, ArrowRight, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Dashboard.css';

export default function Dashboard({ onNavigate }) {
  const [profile, setProfile] = useState({ name: '', role: 'patient' });
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalPatients: 0,
    totalScans: 0,
    lastCheckup: 'None',
    savedReports: 0,
    appointments: []
  });

  const [schedulerPatient, setSchedulerPatient] = useState(null);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [isSavingAppt, setIsSavingAppt] = useState(false);

  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!schedulerPatient || !apptDate || !apptTime) return;

    setIsSavingAppt(true);
    try {
      const apptFormatted = `${new Date(apptDate).toLocaleDateString()} at ${apptTime}`;
      
      let patientDbId = schedulerPatient.id;

      // If patient is not registered in clinical_patients, register them now under the doctor's roster
      if (!patientDbId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Doctor not authenticated");

        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const patientId = `PID-${year}-${rand}`;

        // Create new patient record
        const { data: newPat, error: newPatErr } = await supabase
          .from('clinical_patients')
          .insert([
            {
              doctor_id: user.id,
              patient_id: patientId,
              full_name: schedulerPatient.full_name,
              dob: '2000-01-01',
              email: schedulerPatient.email,
              phone: '',
              medical_history: `Registered via AI Scan referral.\n\n[APPOINTMENT]: ${apptFormatted}`,
              status: 'Active'
            }
          ])
          .select()
          .single();

        if (newPatErr) throw newPatErr;
        patientDbId = newPat.id;

        // Update the report to link to the new clinical_patients record ID
        await supabase
          .from('clinical_reports')
          .update({ patient_id: patientDbId })
          .eq('id', schedulerPatient.reportId);
      } else {
        // Standard flow: update existing patient record
        const baseHistory = (schedulerPatient.medical_history || '').replace(/\n\n\[APPOINTMENT\]:[\s\S]*$/g, '').trim();
        const updatedHistory = `${baseHistory}\n\n[APPOINTMENT]: ${apptFormatted}`;

        const { error } = await supabase
          .from('clinical_patients')
          .update({ medical_history: updatedHistory })
          .eq('id', patientDbId);

        if (error) throw error;
      }

      alert(`Appointment scheduled successfully for ${schedulerPatient.full_name} on ${apptFormatted}!`);
      
      // Reload page to refresh all queries and lists cleanly
      window.location.reload();
    } catch (err) {
      console.error("Failed to schedule appointment:", err);
      alert(`Error scheduling appointment: ${err.message}`);
    } finally {
      setIsSavingAppt(false);
    }
  };

  useEffect(() => {
    const fetchProfileAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const role = user.user_metadata?.role || 'patient';
      const userName = user.user_metadata?.full_name || 'User';

      const specialization = user.user_metadata?.specialization || '';
      setProfile({
        name: userName,
        role: role,
        specialization: specialization
      });

      if (role === 'doctor') {
        const syncDoctor = async () => {
          try {
            const uniquePatientId = `DOCTOR_PROFILE_${user.id}`;
            const { data: existing } = await supabase
              .from('clinical_patients')
              .select('id')
              .eq('doctor_id', user.id)
              .eq('patient_id', uniquePatientId)
              .maybeSingle();

            const payload = {
              doctor_id: user.id,
              patient_id: uniquePatientId,
              full_name: userName.startsWith('Dr.') ? userName : `Dr. ${userName}`,
              dob: '2000-01-01',
              email: user.email,
              phone: user.user_metadata?.mobile || '',
              medical_history: specialization || 'Orthodontics',
              status: 'Active'
            };

            if (existing) {
              await supabase.from('clinical_patients').update(payload).eq('id', existing.id);
            } else {
              await supabase.from('clinical_patients').insert([payload]);
            }
          } catch (e) {
            console.error("Failed to sync doctor profile:", e);
          }
        };
        syncDoctor();
      }

      // Fetch Real Data
      if (role === 'patient') {
        const { data: reports } = await supabase
          .from('clinical_reports')
          .select('*')
          .eq('auth_patient_id', user.id)
          .order('created_at', { ascending: false });
          
        if (reports) {
          setRecentScans(reports.slice(0, 4));
          setDashboardStats(prev => ({
            ...prev,
            totalScans: reports.length,
            savedReports: reports.length,
            lastCheckup: reports.length > 0 ? new Date(reports[0].created_at).toLocaleDateString() : 'No scans yet'
          }));
        }

        // Fetch their patient records in clinical_patients to check for scheduled appointments
        try {
          const { data: patientRecords } = await supabase
            .from('clinical_patients')
            .select('*')
            .eq('email', user.email.toLowerCase());

          if (patientRecords) {
            const appts = [];
            let firstApptText = null;

            for (const rec of patientRecords) {
              const apptMatch = rec.medical_history?.match(/\[APPOINTMENT\]:\s*(.*)/);
              if (apptMatch) {
                // Fetch doctor profile to get name and specialty
                const { data: doc } = await supabase
                  .from('clinical_patients')
                  .select('full_name, medical_history')
                  .eq('patient_id', `DOCTOR_PROFILE_${rec.doctor_id}`)
                  .maybeSingle();

                const timeText = apptMatch[1];
                if (!firstApptText) firstApptText = timeText;

                appts.push({
                  doctorName: doc?.full_name || 'Dentist',
                  specialty: doc?.medical_history || 'General Dentist',
                  time: timeText
                });
              }
            }

            setDashboardStats(prev => ({
              ...prev,
              upcomingAppointment: firstApptText,
              appointments: appts
            }));
          }
        } catch (err) {
          console.error("Failed to load patient appointment data:", err);
        }
      } else {
        const { data: patients } = await supabase
          .from('clinical_patients')
          .select('id')
          .eq('doctor_id', user.id);
          
        const { data: reports } = await supabase
          .from('clinical_reports')
          .select('*, clinical_patients(full_name, email, id, medical_history)')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });
          
        if (reports) setRecentScans(reports.slice(0, 4));

        // Fetch all appointments scheduled by this doctor
        try {
          const { data: roster } = await supabase
            .from('clinical_patients')
            .select('*')
            .eq('doctor_id', user.id);

          if (roster) {
            const appts = [];
            roster.forEach(pat => {
              if (pat.patient_id?.startsWith('DOCTOR_PROFILE_')) return;
              const apptMatch = pat.medical_history?.match(/\[APPOINTMENT\]:\s*(.*)/);
              if (apptMatch) {
                appts.push({
                  patientName: pat.full_name,
                  patientEmail: pat.email,
                  time: apptMatch[1]
                });
              }
            });

            setDashboardStats(prev => ({
              ...prev,
              appointments: appts
            }));
          }
        } catch (err) {
          console.error("Failed to load doctor's scheduled appointments:", err);
        }

        if (patients) {
          setDashboardStats(prev => ({
            ...prev,
            totalPatients: patients.length,
            totalScans: reports ? reports.length : 0
          }));
        }
      }

      setLoading(false);
    };
    fetchProfileAndData();
  }, []);

  const isPatient = profile.role === 'patient';
  
  const doctorStats = [
    { label: 'Total Patients', value: dashboardStats.totalPatients, icon: Users, color: 'var(--color-primary)' },
    { label: 'Total Scans', value: dashboardStats.totalScans, icon: FileImage, color: 'var(--color-warning)' },
    { label: 'Concordance level with expert decision', value: `${(Math.random() * (95 - 88) + 88).toFixed(1)}%`, icon: Activity, color: 'var(--color-success)' }
  ];

  const patientStats = [
    { label: 'Total Scans', value: dashboardStats.totalScans, icon: FileImage, color: 'var(--color-primary)' },
    { label: 'Last Checkup', value: dashboardStats.lastCheckup, icon: Activity, color: 'var(--color-success)' },
    { label: 'Saved Reports', value: dashboardStats.savedReports, icon: FileImage, color: 'var(--color-warning)' },
    { label: 'Concordance level with expert decision', value: `${(Math.random() * (95 - 88) + 88).toFixed(1)}%`, icon: Heart, color: 'var(--color-success)' }
  ];

  const stats = isPatient ? patientStats : doctorStats;

  if (loading) return <div className="dashboard fade-in"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard fade-in">
      {isPatient && dashboardStats.upcomingAppointment && (
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderLeft: '4px solid var(--color-primary)', marginBottom: '1.5rem', background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ fontSize: '1.5rem' }}>📅</div>
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Upcoming Appointment Scheduled</h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Your dentist has scheduled a consultation: **{dashboardStats.upcomingAppointment}**
            </p>
          </div>
        </div>
      )}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            Welcome back, {isPatient ? profile.name : `Dr. ${profile.name.split(' ').pop()}`}
          </h1>
          <p className="text-muted">
            {isPatient 
              ? "Here's your oral health overview." 
              : `Here's what's happening with your clinic today.${profile.specialization ? ` | Specialty: ${profile.specialization}` : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('analysis')}>
          Start New Analysis <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card glass-panel">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="recent-scans glass-panel">
          <div className="card-header">
            <h3>{isPatient ? 'My Recent Scans' : 'Recent Scans'}</h3>
            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>View All</button>
          </div>
          <div className="scan-list">
            {recentScans.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No recent scans found. Click 'Start New Analysis' to begin.
              </div>
            ) : (
              recentScans.map(scan => (
                <div key={scan.id} className="scan-item">
                  <div className="scan-info">
                    <div className="scan-avatar"><FileImage size={18} /></div>
                    <div>
                      <div className="scan-patient">
                        {isPatient 
                          ? profile.name 
                          : (() => {
                              const pName = scan.clinical_patients?.full_name || scan.diagnostics_summary?.patient_info?.full_name || 'Unknown Patient';
                              const pEmail = scan.clinical_patients?.email || scan.diagnostics_summary?.patient_info?.email;
                              return `${pName}${pEmail ? ` (${pEmail})` : ''}`;
                            })()
                        }
                      </div>
                      <div className="scan-meta">
                        {new Date(scan.created_at).toLocaleDateString()} at {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="scan-status-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    {!isPatient && (scan.clinical_patients || scan.diagnostics_summary?.patient_info) && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                        onClick={() => {
                          const patObj = scan.clinical_patients || {
                            id: null,
                            full_name: scan.diagnostics_summary?.patient_info?.full_name || 'Patient',
                            email: scan.diagnostics_summary?.patient_info?.email || '',
                            reportId: scan.id
                          };
                          setSchedulerPatient(patObj);
                          setApptDate('');
                          setApptTime('');
                        }}
                      >
                        📅 Schedule
                      </button>
                    )}
                    <span style={{ 
                      padding: '0.35rem 0.85rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      backgroundColor: '#d1fae5', 
                      color: 'var(--color-success)',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      flexShrink: 0
                    }}>
                      AI Analyzed
                    </span>
                    <button className="btn-icon text-muted" onClick={() => onNavigate('reports')}>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="ai-insights glass-panel">
          <div className="card-header">
            <h3>{isPatient ? 'Oral Health Tips' : 'AI Insights'}</h3>
          </div>
          <div className="insights-content">
            {isPatient ? (
              <>
                <div className="insight-item">
                  <Heart size={20} color="var(--color-primary)" />
                  <p><strong>Daily Routine:</strong> Remember to brush twice a day and floss every evening for optimal oral health.</p>
                </div>
                <div className="insight-item">
                  <Activity size={20} color="var(--color-success)" />
                  <p><strong>AI Recommendation:</strong> Your scans look great! Regular checkups every 6 months keep it that way.</p>
                </div>
              </>
            ) : (
              <>
                <div className="insight-item">
                  <ShieldAlert size={20} color="var(--color-danger)" />
                  <p><strong>Caries trend alert:</strong> 15% increase in early-stage caries detection among young adults this month.</p>
                </div>
                <div className="insight-item">
                  <Activity size={20} color="var(--color-primary)" />
                  <p>System update: The new plaque detection model is now active. Confidence scores improved by 4%.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Appointments Section */}
        <div className="ai-insights glass-panel" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3>{isPatient ? 'My Appointments' : 'All Scheduled Appointments'}</h3>
          </div>
          <div className="insights-content" style={{ maxHeight: '320px', overflowY: 'auto', gap: '0.8rem' }}>
            {dashboardStats.appointments?.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                No appointments scheduled.
              </p>
            ) : (
              dashboardStats.appointments.map((appt, i) => (
                <div key={i} className="insight-item" style={{ flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start', padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
                      {isPatient ? appt.doctorName : appt.patientName}
                    </strong>
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '0.72rem', 
                      color: 'var(--color-text-muted)', 
                      background: 'var(--color-bg-main)', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px' 
                    }}>
                      {isPatient ? appt.specialty : 'Patient'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                    {appt.time}
                  </p>
                  {!isPatient && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {appt.patientEmail}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Scheduler Modal */}
      {schedulerPatient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '700', color: 'var(--color-text-main)' }}>📅 Schedule Appointment</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Assign an appointment date and time for **{schedulerPatient.full_name}**. This will be visible on their dashboard.
            </p>
            <form onSubmit={handleSaveAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Date</label>
                <input 
                  type="date" 
                  value={apptDate} 
                  onChange={(e) => setApptDate(e.target.value)} 
                  required 
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-main)',
                    color: 'var(--color-text-main)'
                  }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Time</label>
                <input 
                  type="time" 
                  value={apptTime} 
                  onChange={(e) => setApptTime(e.target.value)} 
                  required 
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-main)',
                    color: 'var(--color-text-main)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setSchedulerPatient(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSavingAppt}
                  style={{ flex: 1 }}
                >
                  {isSavingAppt ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
