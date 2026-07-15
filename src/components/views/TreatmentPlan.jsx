import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2, Clock, Plus, Trash2, Save, FileText, Image, GitCompare, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './TreatmentPlan.css';

const STATUS_OPTIONS = [
  { value: 'done',    label: '✔ Completed',  color: '#16a34a' },
  { value: 'current', label: '🔄 In Progress', color: '#2563eb' },
  { value: 'pending', label: '⬜ Pending',     color: '#9ca3af' },
];

const DEFAULT_STAGES = [
  { name: 'Initial Consultation', status: 'pending' },
  { name: 'X-rays', status: 'pending' },
  { name: 'Treatment Planning', status: 'pending' },
  { name: 'Procedure / Treatment', status: 'pending' },
  { name: 'Follow-up & Adjustments', status: 'pending' },
  { name: 'Treatment Completion', status: 'pending' },
];

export default function TreatmentPlan() {
  const [role, setRole] = useState('patient');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Doctor state
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [planId, setPlanId] = useState(null);

  // Plan data
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [upcomingProcedures, setUpcomingProcedures] = useState('');
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [newStageName, setNewStageName] = useState('');
  const [expandedSection, setExpandedSection] = useState('timeline');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);
    const r = user.user_metadata?.role || 'patient';
    setRole(r);

    if (r === 'doctor') {
      await loadPatients(user.id);
    } else {
      // Patient: load their plan
      loadPatientPlan(user.id);
    }
    setLoading(false);
  };

  const loadPatients = async (doctorId) => {
    const { data } = await supabase
      .from('clinical_patients')
      .select('id, full_name, patient_id, email')
      .eq('doctor_id', doctorId)
      .order('full_name');
    setPatients(data || []);
  };

  const loadPatientPlan = async (patientAuthId) => {
    // Try by auth_patient_id first
    let { data } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('auth_patient_id', patientAuthId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setPlanId(data?.id || null);
    setStages(data?.stages || DEFAULT_STAGES);
    setClinicalNotes(data?.clinical_notes || '');
    setUpcomingProcedures(data?.upcoming_procedures || '');
    setProgressPhotos(data?.progress_photos || []);
  };

  const loadDoctorPlan = async (patientId) => {
    const { data } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (data) {
      setPlanId(data.id);
      setStages(data.stages || DEFAULT_STAGES);
      setClinicalNotes(data.clinical_notes || '');
      setUpcomingProcedures(data.upcoming_procedures || '');
      setProgressPhotos(data.progress_photos || []);
    } else {
      setPlanId(null);
      setStages(DEFAULT_STAGES);
      setClinicalNotes('');
      setUpcomingProcedures('');
      setProgressPhotos([]);
    }
  };

  const handlePatientChange = (e) => {
    const id = e.target.value;
    setSelectedPatientId(id);
    if (id) loadDoctorPlan(id);
  };

  const handleStageStatusChange = (idx, newStatus) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, status: newStatus } : s));
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    setStages(prev => [...prev, { name: newStageName.trim(), status: 'pending' }]);
    setNewStageName('');
  };

  const handleRemoveStage = (idx) => {
    setStages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!selectedPatientId && role === 'doctor') return;
    setSaving(true);

    // Look up auth_patient_id from the patient's email
    let resolvedAuthPatientId = null;
    if (role === 'doctor') {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient?.email) {
        const { data: authData } = await supabase
          .rpc('get_user_id_by_email', { email_input: patient.email.toLowerCase() })
          .maybeSingle();
        if (authData) resolvedAuthPatientId = authData.id;
      }
    }

    const payload = {
      patient_id: role === 'doctor' ? selectedPatientId : null,
      auth_patient_id: role === 'patient' ? user.id : resolvedAuthPatientId,
      doctor_id: role === 'doctor' ? user.id : null,
      stages,
      clinical_notes: clinicalNotes,
      upcoming_procedures: upcomingProcedures,
      progress_photos: progressPhotos,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (planId) {
      ({ error } = await supabase.from('treatment_plans').update(payload).eq('id', planId));
    } else {
      const { data, error: insertError } = await supabase.from('treatment_plans').insert(payload).select().single();
      error = insertError;
      if (data) setPlanId(data.id);
    }

    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert('Save failed: ' + error.message);
    }
    setSaving(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProgressPhotos(prev => [...prev, { url: ev.target.result, date: new Date().toLocaleDateString(), label: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const completedCount = stages.filter(s => s.status === 'done').length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  if (loading) return <div className="treatment-plan fade-in"><p>Loading...</p></div>;

  return (
    <div className="treatment-plan fade-in">
      <header className="page-header">
        <div>
          <h1>{role === 'doctor' ? 'Treatment Plans' : 'My Treatment Progress'}</h1>
          <p className="text-muted">{role === 'doctor' ? 'Create and manage patient treatment timelines.' : 'Track your dental treatment journey.'}</p>
        </div>
        {role === 'doctor' && selectedPatientId && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || saveSuccess}>
            {saving ? <><Loader2 size={16} className="spinner" /> Saving...</> : saveSuccess ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Plan</>}
          </button>
        )}
      </header>

      {/* Doctor: Patient selector */}
      {role === 'doctor' && (
        <div className="card mb-6" style={{ padding: '1.2rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Select Patient</label>
          <select className="plan-select" value={selectedPatientId} onChange={handlePatientChange}>
            <option value="">-- Choose a patient --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.full_name} {p.patient_id ? `(${p.patient_id})` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {(selectedPatientId || role === 'patient') && (
        <>
          {/* Progress bar */}
          <div className="card mb-4" style={{ padding: '1.2rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Overall Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{progress}%</span>
            </div>
            <div className="tp-progress-bar-bg">
              <div className="tp-progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{completedCount} of {stages.length} stages completed</p>
          </div>

          {/* Timeline Section */}
          <div className="card mb-4">
            <div className="section-toggle" onClick={() => setExpandedSection(expandedSection === 'timeline' ? '' : 'timeline')}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} /> Treatment Timeline</span>
              {expandedSection === 'timeline' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {expandedSection === 'timeline' && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <div className="timeline-list">
                  {stages.map((stage, idx) => (
                    <div key={idx} className={`timeline-item status-${stage.status}`}>
                      <div className="timeline-icon">
                        {stage.status === 'done' ? <CheckCircle2 size={22} color="#16a34a" fill="#dcfce7" /> :
                         stage.status === 'current' ? <Loader2 size={22} color="#2563eb" className="spinner-slow" /> :
                         <Circle size={22} color="#d1d5db" />}
                      </div>
                      <div className="timeline-content">
                        <span className="timeline-label">{stage.name}</span>
                        {stage.status === 'current' && <span className="current-badge">Current</span>}
                      </div>
                      {role === 'doctor' && (
                        <div className="timeline-actions">
                          <select
                            value={stage.status}
                            onChange={e => handleStageStatusChange(idx, e.target.value)}
                            className="stage-select"
                          >
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <button className="btn-icon text-danger" onClick={() => handleRemoveStage(idx)} title="Remove">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Doctor: Add custom stage */}
                {role === 'doctor' && (
                  <div className="add-stage-row">
                    <input
                      type="text"
                      placeholder="Add custom stage..."
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                      className="stage-input"
                    />
                    <button className="btn btn-outline" onClick={handleAddStage} style={{ whiteSpace: 'nowrap' }}>
                      <Plus size={16} /> Add Stage
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div className="card mb-4">
            <div className="section-toggle" onClick={() => setExpandedSection(expandedSection === 'notes' ? '' : 'notes')}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Clinical Notes</span>
              {expandedSection === 'notes' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSection === 'notes' && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                {role === 'doctor' ? (
                  <textarea
                    rows={5}
                    className="plan-textarea"
                    placeholder="Enter clinical observations, findings, and notes..."
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                  />
                ) : (
                  <div className="patient-notes-view">
                    {clinicalNotes ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{clinicalNotes}</p> : <p className="text-muted">No clinical notes yet.</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Procedures */}
          <div className="card mb-4">
            <div className="section-toggle" onClick={() => setExpandedSection(expandedSection === 'upcoming' ? '' : 'upcoming')}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarClock size={18} /> Upcoming Procedures</span>
              {expandedSection === 'upcoming' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSection === 'upcoming' && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                {role === 'doctor' ? (
                  <textarea
                    rows={4}
                    className="plan-textarea"
                    placeholder="List upcoming procedures, dates, and instructions..."
                    value={upcomingProcedures}
                    onChange={e => setUpcomingProcedures(e.target.value)}
                  />
                ) : (
                  <div className="patient-notes-view">
                    {upcomingProcedures ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{upcomingProcedures}</p> : <p className="text-muted">No upcoming procedures scheduled.</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Photos */}
          <div className="card mb-4">
            <div className="section-toggle" onClick={() => setExpandedSection(expandedSection === 'photos' ? '' : 'photos')}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={18} /> Progress Photos</span>
              {expandedSection === 'photos' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSection === 'photos' && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                {role === 'doctor' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={16} /> Upload Photo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                    </label>
                  </div>
                )}
                {progressPhotos.length === 0 ? (
                  <p className="text-muted">No progress photos uploaded yet.</p>
                ) : (
                  <div className="photos-grid">
                    {progressPhotos.map((photo, i) => (
                      <div key={i} className="photo-card">
                        <img src={photo.url} alt={photo.label} />
                        <div className="photo-meta">
                          <span>{photo.label}</span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>{photo.date}</span>
                        </div>
                        {role === 'doctor' && (
                          <button className="photo-delete" onClick={() => setProgressPhotos(prev => prev.filter((_, j) => j !== i))}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scan Comparisons placeholder */}
          <div className="card mb-4">
            <div className="section-toggle" onClick={() => setExpandedSection(expandedSection === 'scans' ? '' : 'scans')}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><GitCompare size={18} /> Scan Comparisons</span>
              {expandedSection === 'scans' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSection === 'scans' && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>View your AI scan reports over time in the <strong>Reports</strong> section to compare progress between visits.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
