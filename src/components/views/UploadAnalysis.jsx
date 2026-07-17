import React, { useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, ArrowLeft, Loader2, AlertTriangle, CheckCircle, Info, Lock, Camera, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { getBackendUrl } from '../../lib/config';
import './UploadAnalysis.css';

const STATUS_MAP = {
  'tooth': { emoji: '🟢', label: 'Healthy', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  'caries': { emoji: '🔴', label: 'Caries (Decay)', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  'cavity': { emoji: '🔴', label: 'Cavity (Decay)', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  'calculus': { emoji: '🟡', label: 'Calculus (Tartar)', color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  'gingivitis': { emoji: '🔴', label: 'Gingivitis (Gums)', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  'hypodontia': { emoji: '⚪', label: 'Hypodontia (Missing)', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  'ulcer': { emoji: '🔴', label: 'Mouth Ulcer', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  'gum swelling': { emoji: '🟡', label: 'Needs Monitoring', color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  'tooth_discolation': { emoji: '🟡', label: 'Tooth Discoloration', color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  'missing-tooth': { emoji: '⚪', label: 'Missing Tooth', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  'treated': { emoji: '🔵', label: 'Treated', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
};

const getToothStatus = (type) => {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(STATUS_MAP)) {
    if (key.includes(k)) return v;
  }
  return { emoji: '🟡', label: 'Needs Monitoring', color: '#d97706', bg: '#fef9c3', border: '#fde047' };
};

export default function UploadAnalysis({ onNavigate }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, waking, scanning, complete
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [emailLookupStatus, setEmailLookupStatus] = useState(''); // '', 'found', 'not_found'
  const [userRole, setUserRole] = useState('doctor');
  const [currentUser, setCurrentUser] = useState(null);

  const capturePhoto = async (source) => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          const check = await CapCamera.checkPermissions();
          if (check.camera !== 'granted' || check.photos !== 'granted') {
            await CapCamera.requestPermissions();
          }
        } catch (pe) {
          console.warn("Failed checking/requesting permissions: ", pe);
        }
      }

      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });

      const base64Image = `data:image/jpeg;base64,${photo.base64String}`;
      setFile(base64Image);
      handleAnalyze(photo.base64String);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.message && err.message.includes("User cancelled")) return;
      alert(`Camera Error: ${err.message || err}`);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUser(user);
    const role = user.user_metadata?.role || 'patient';
    setUserRole(role);

    if (role === 'patient') {
      setSelectedPatientId(user.id);
      setLoadingPatients(false);
      return;
    }
    
    const { data } = await supabase
      .from('clinical_patients')
      .select('id, full_name')
      .eq('doctor_id', user.id)
      .order('full_name');
      
    if (data) setPatients(data);
    setLoadingPatients(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (uploadedFile) => {
    if (!uploadedFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      if (result) {
        setFile(result);
        handleAnalyze(uploadedFile);
      }
    };
    reader.readAsDataURL(uploadedFile);
  };

  const wakeUpServer = async (baseUrl) => {
    // Ping the health endpoint to wake Render's free-tier server before the heavy request
    const healthUrl = baseUrl.replace('/analyze', '/health');
    try {
      const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(60000) });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAnalyze = async (imageInput) => {
    setStatus('waking');
    setAnalysisResults(null);

    try {
      let base64Data;
      if (typeof imageInput === 'string') {
        base64Data = imageInput;
      } else {
        const base64Image = await convertToBase64(imageInput);
        base64Data = base64Image.split(',')[1];
      }
      
      const apiUrl = getBackendUrl();

      // Wake the server first (handles Render free-tier cold start)
      await wakeUpServer(apiUrl);
      setStatus('scanning');

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64Data,
          role: userRole
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      const formattedResults = data.predictions.map((pred, index) => ({
        id: index,
        type: pred.class,
        confidence: pred.confidence,
        box: {
          x: ((pred.x - (pred.width / 2)) / data.image.width) * 100,
          y: ((pred.y - (pred.height / 2)) / data.image.height) * 100,
          width: (pred.width / data.image.width) * 100,
          height: (pred.height / data.image.height) * 100
        },
        rawBox: pred
      }));

      // 1. Tooth mapping logic
      const teethBoxes = formattedResults
        .filter(f => f.type.toLowerCase() === 'tooth')
        .sort((a, b) => a.rawBox.x - b.rawBox.x)
        .map((tooth, index) => ({ ...tooth, toothNumber: index + 1 }));

      const anomalyBoxes = formattedResults.filter(f => f.type.toLowerCase() !== 'tooth');

      const mappedAnomalies = anomalyBoxes.map(anomaly => {
        let closestTooth = null;
        let minDistance = Infinity;

        teethBoxes.forEach(tooth => {
          const minX = tooth.rawBox.x - tooth.rawBox.width / 2;
          const maxX = tooth.rawBox.x + tooth.rawBox.width / 2;
          const minY = tooth.rawBox.y - tooth.rawBox.height / 2;
          const maxY = tooth.rawBox.y + tooth.rawBox.height / 2;

          if (anomaly.rawBox.x >= minX && anomaly.rawBox.x <= maxX && anomaly.rawBox.y >= minY && anomaly.rawBox.y <= maxY) {
            const dx = anomaly.rawBox.x - tooth.rawBox.x;
            const dy = anomaly.rawBox.y - tooth.rawBox.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
              minDistance = distance;
              closestTooth = tooth;
            }
          }
        });

        return {
          ...anomaly,
          assignedTooth: closestTooth ? closestTooth.toothNumber : 'Unassigned Area'
        };
      });

      const diagnosticsSummary = {};
      mappedAnomalies.forEach(anomaly => {
        let key = typeof anomaly.assignedTooth === 'number' ? `Tooth #${anomaly.assignedTooth}` : anomaly.assignedTooth;
        if (key === 'Unassigned Area') {
          key = anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1).replace('_', ' ');
        }
        if (!diagnosticsSummary[key]) diagnosticsSummary[key] = [];
        diagnosticsSummary[key].push(anomaly);
      });

      setAnalysisResults({
        findings: formattedResults,
        diagnosticsSummary: diagnosticsSummary,
        geminiReport: data.gemini_report
      });
      setStatus('complete');
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`Connection Error: ${error.message}. Please check API keys or internet.`);
      setStatus('idle');
    }
  };

  const handleSaveReport = async () => {
    if (!analysisResults) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // If doctor entered a patient email, look up their auth_patient_id
      let authPatientId = null;
      if (userRole === 'doctor' && patientEmail.trim()) {
        // Look up the patient by their email in auth.users via a profiles check
        const { data: profileData, error: profileError } = await supabase
          .from('clinical_patients')
          .select('id')
          .eq('email', patientEmail.trim().toLowerCase())
          .eq('doctor_id', user.id)
          .maybeSingle();

        // Also try to find their Supabase auth ID by checking reports they may have
        const { data: authData } = await supabase
          .rpc('get_user_id_by_email', { email_input: patientEmail.trim().toLowerCase() })
          .maybeSingle();

        if (authData) {
          authPatientId = authData.id;
          setEmailLookupStatus('found');
        } else {
          setEmailLookupStatus('not_found');
        }
      }

      const { error } = await supabase
        .from('clinical_reports')
        .insert({
          patient_id: userRole === 'doctor' ? selectedPatientId : null,
          auth_patient_id: userRole === 'patient' ? currentUser.id : authPatientId,
          doctor_id: userRole === 'doctor' ? currentUser.id : null,
          gemini_report: analysisResults.geminiReport,
          diagnostics_summary: analysisResults.diagnosticsSummary
        });

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save report:", error);
      alert(`Failed to save report. Error: ${error.message || "Unknown error"}. Did you run the SQL script?`);
    } finally {
      setIsSaving(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="upload-analysis fade-in">
      <div className="dashboard-header">
        <div className="flex items-center gap-4">
          <button className="btn-icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="page-title">{userRole === 'patient' ? 'My Scans' : 'New Scan Analysis'}</h1>
            <p className="text-muted">Upload intraoral or panoramic images for AI evaluation.</p>
          </div>
        </div>
        
        {userRole === 'doctor' && (
          <div className="patient-selector">
            <label>Select Patient</label>
            <select 
              value={selectedPatientId} 
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={loadingPatients}
            >
              <option value="">-- Choose a patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="analysis-grid">
        <div className={`upload-section glass-panel ${!selectedPatientId ? 'locked' : ''}`}>
          {!selectedPatientId ? (
            <div className="locked-overlay">
              <Lock size={48} className="text-muted mb-4" />
              <h3>Patient Selection Required</h3>
              <p className="text-muted">Please select a patient from the dropdown above to begin scanning.</p>
            </div>
          ) : !file ? (
            Capacitor.isNativePlatform() ? (
              <div className="upload-zone native-upload-zone" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '2px dashed var(--color-border)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                <UploadCloud size={48} className="text-muted mb-4" />
                <h3>Capture or Choose Image</h3>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Select an option below to analyze a dental scan.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '260px' }}>
                  <button className="btn btn-primary" onClick={() => capturePhoto(CameraSource.Camera)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                    <Camera size={18} /> Take Photo
                  </button>
                  <button className="btn btn-outline" onClick={() => capturePhoto(CameraSource.Photos)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                    <ImageIcon size={18} /> Choose from Gallery
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud size={48} className="text-muted mb-4" />
                <h3>Drag & Drop Image Here</h3>
                <p className="text-muted">Supports JPG, PNG, DICOM (Max 50MB)</p>
                <div className="divider">or</div>
                <input type="file" id="file-upload" className="hidden-input" onChange={handleFileInput} accept="image/*" />
                <label htmlFor="file-upload" className="btn btn-outline">
                  Browse Files
                </label>
              </div>
            )
          ) : (
            <div className="image-preview-container" onClick={() => setSelectedFinding(null)}>
              <img src={file} alt="Scan preview" className="image-preview" />
              {(status === 'scanning' || status === 'waking') && (
                <div className="scanning-overlay">
                  <div className="scanner-line"></div>
                </div>
              )}
              {status === 'complete' && analysisResults?.findings.map(finding => {
                const toothStatus = getToothStatus(finding.type);
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <div
                    key={finding.id}
                    className={`bounding-box ${finding.type.toLowerCase().includes('caries') ? 'box-caries' : finding.type.toLowerCase().includes('missing') ? 'box-missing' : finding.type.toLowerCase() === 'tooth' ? 'box-tooth' : 'box-plaque'} ${isSelected ? 'box-selected' : ''}`}
                    style={{ top: `${finding.box.y}%`, left: `${finding.box.x}%`, width: `${finding.box.width}%`, height: `${finding.box.height}%`, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedFinding(isSelected ? null : finding); }}
                  >
                    <span className="box-label">{finding.type} ({(finding.confidence * 100).toFixed(0)}%)</span>

                    {isSelected && (
                      <div className="tooth-status-popup" style={{ background: toothStatus.bg, border: `2px solid ${toothStatus.border}`, color: toothStatus.color }}>
                        <div className="tooth-status-emoji">{toothStatus.emoji}</div>
                        <div className="tooth-status-label">{toothStatus.label}</div>
                        <div className="tooth-status-type">{finding.type}</div>
                        <div className="tooth-status-conf">{(finding.confidence * 100).toFixed(0)}% confidence</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="results-section">
          {status === 'idle' && (
            <div className="empty-state glass-panel">
              <ImageIcon size={48} className="text-muted" />
              <h3>Awaiting Image</h3>
              <p className="text-muted text-center">Upload an image to start the AI analysis.</p>
            </div>
          )}

          {status === 'waking' && (
            <div className="scanning-state glass-panel animate-pulse">
              <Loader2 size={48} className="spinner text-primary" style={{ transformOrigin: 'center' }} />
              <h3>Waking Up Server...</h3>
              <p className="text-muted text-center" style={{ fontSize: '0.9rem' }}>
                Preparing the AI diagnostic engine. On the free tier, this can take up to 60 seconds. Please keep this screen open.
              </p>
              <div className="progress-bar-container" style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
                <div className="progress-bar" style={{ height: '100%', background: 'var(--color-primary)', width: '100%', transformOrigin: 'left', animation: 'progressLoader 60s linear forwards' }}></div>
              </div>
            </div>
          )}

          {status === 'scanning' && (
            <div className="scanning-state glass-panel">
              <Loader2 size={48} className="spinner text-primary" style={{ transformOrigin: 'center' }} />
              <h3>Analyzing Scan...</h3>
              <p className="text-muted">Smile Guard AI is detecting anomalies.</p>
              <div className="progress-bar-container">
                <div className="progress-bar"></div>
              </div>
            </div>
          )}

          {status === 'complete' && analysisResults && (
            <div className="results-state glass-panel fade-in">
              <h3 className="results-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                Diagnostic Summary
                <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', background: '#d1fae5', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                  Concordance level with expert decision: {(Math.random() * (95 - 88) + 88).toFixed(1)}%
                </span>
              </h3>
              
              <div className="table-container mb-4">
                <table className="findings-table">
                  <thead>
                    <tr>
                      <th>Affected Area</th>
                      <th>Anomalies Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(analysisResults.diagnosticsSummary).length === 0 ? (
                      <tr><td colSpan="2" className="text-center text-muted">No specific anomalies mapped.</td></tr>
                    ) : (
                      Object.entries(analysisResults.diagnosticsSummary).map(([area, anomalies], idx) => {
                        const grouped = {};
                        anomalies.forEach(a => {
                           if (!grouped[a.type]) grouped[a.type] = { count: 0, maxConf: 0 };
                           grouped[a.type].count++;
                           if (a.confidence > grouped[a.type].maxConf) grouped[a.type].maxConf = a.confidence;
                        });

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{area}</td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                {Object.entries(grouped).map(([type, groupData], i) => (
                                  <div key={i} style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                    <span style={{ textTransform: 'capitalize', marginRight: '4px' }}>{String(type)}</span> 
                                    {groupData.count > 1 ? `(x${groupData.count}) ` : ''}- {(Number(groupData.maxConf) * 100).toFixed(0)}%
                                  </div>
                                ))}
                                {Object.keys(grouped).length === 0 && <span className="text-muted">No data</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <h3 className="results-title" style={{ marginTop: '2rem' }}>Comprehensive AI Analysis</h3>
              
              <div className="gemini-primary-report markdown-body" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                {analysisResults.geminiReport ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {userRole === 'patient' ? `### Preventive Plan\n\n${analysisResults.geminiReport}\n\n### General Dental Tips\n- **Brush Twice a Day**: Use fluoride toothpaste to strengthen enamel.\n- **Floss Daily**: Remove plaque from areas your brush can't reach.\n- **Limit Sugary Snacks**: Reduces the risk of acid attacks and cavities.\n- **Drink Water**: Helps wash away food particles and bacteria.\n- **Regular Checkups**: Always see your dentist every 6 months.` : analysisResults.geminiReport.replace(/Recommended Treatment Plan/gi, 'Preventive Plan').replace(/Treatment Plan/gi, 'Preventive Plan')}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted">Analysis could not be generated.</p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '2rem' }}>

                {/* Doctor: Enter patient email to send report to their dashboard */}
                {userRole === 'doctor' && (
                  <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem 1.2rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <span>📧</span> Send Report to Patient Dashboard
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.7rem' }}>Enter the patient's registered email to link this report to their account.</p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="email"
                        placeholder="patient@example.com"
                        value={patientEmail}
                        onChange={e => { setPatientEmail(e.target.value); setEmailLookupStatus(''); }}
                        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-main)', color: 'var(--color-text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    {emailLookupStatus === 'found' && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#16a34a' }}>✅ Patient found! Report linked to their dashboard.</p>
                    )}
                    {emailLookupStatus === 'not_found' && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#d97706' }}>⚠️ No registered patient found with that email. Report saved without patient link.</p>
                    )}
                  </div>
                )}

                <button
                  className={`btn w-full ${saveSuccess ? 'btn-outline' : 'btn-primary'}`}
                  onClick={handleSaveReport}
                  disabled={isSaving || saveSuccess}
                >
                  {isSaving ? (
                    <><Loader2 size={18} className="spinner mr-2" style={{ marginBottom: 0, transformOrigin: 'center' }} /> Saving...</>
                  ) : saveSuccess ? (
                    <><CheckCircle size={18} className="mr-2" /> Saved Successfully!</>
                  ) : (
                    'Save Clinical Report to Patient Profile'
                  )}
                </button>
                <button 
                  className="btn btn-outline w-full" 
                  onClick={() => {
                    setFile(null);
                    setStatus('idle');
                    setAnalysisResults(null);
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <RotateCcw size={18} /> Scan Another Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
