import React, { useState, useEffect } from 'react';
import { Users, FileImage, ShieldAlert, Activity, ArrowRight, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Dashboard.css';

export default function Dashboard({ onNavigate }) {
  const [profile, setProfile] = useState({ name: '', role: 'doctor' });
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalPatients: 0,
    totalScans: 0,
    lastCheckup: 'None',
    savedReports: 0
  });

  useEffect(() => {
    const fetchProfileAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const role = user.user_metadata?.role || 'doctor';
      const userName = user.user_metadata?.full_name || 'User';

      setProfile({
        name: userName,
        role: role
      });

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
      } else {
        const { data: patients } = await supabase
          .from('clinical_patients')
          .select('id')
          .eq('doctor_id', user.id);
          
        const { data: reports } = await supabase
          .from('clinical_reports')
          .select('*, clinical_patients(full_name)')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });
          
        if (reports) setRecentScans(reports.slice(0, 4));
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
    { label: 'AI Accuracy', value: '98.5%', icon: Activity, color: 'var(--color-success)' }
  ];

  const patientStats = [
    { label: 'Total Scans', value: dashboardStats.totalScans, icon: FileImage, color: 'var(--color-primary)' },
    { label: 'Last Checkup', value: dashboardStats.lastCheckup, icon: Activity, color: 'var(--color-success)' },
    { label: 'Saved Reports', value: dashboardStats.savedReports, icon: FileImage, color: 'var(--color-warning)' },
    { label: 'Oral Health Score', value: dashboardStats.totalScans > 0 ? 'Good' : 'N/A', icon: Heart, color: 'var(--color-success)' }
  ];

  const stats = isPatient ? patientStats : doctorStats;

  if (loading) return <div className="dashboard fade-in"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            Welcome back, {isPatient ? profile.name : `Dr. ${profile.name.split(' ').pop()}`}
          </h1>
          <p className="text-muted">
            {isPatient 
              ? "Here's your oral health overview." 
              : "Here's what's happening with your clinic today."}
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
                      <div className="scan-patient">{isPatient ? profile.name : (scan.clinical_patients?.full_name || 'Unknown Patient')}</div>
                      <div className="scan-meta">
                        {new Date(scan.created_at).toLocaleDateString()} at {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="scan-status-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
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
      </div>
    </div>
  );
}
