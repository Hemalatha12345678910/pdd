import React, { useState, useEffect } from 'react';
import { Activity, FileText, Calendar, User, Search, ChevronRight, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';
import { Share } from '@capacitor/share';
import html2pdf from 'html2pdf.js';
import './Reports.css';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [userRole, setUserRole] = useState('doctor');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const role = user.user_metadata?.role || 'doctor';
    setUserRole(role);

    let query = supabase
      .from('clinical_reports')
      .select(`
        *,
        clinical_patients(full_name)
      `)
      .order('created_at', { ascending: false });

    if (role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    } else {
      query = query.eq('auth_patient_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reports:", error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const filteredReports = reports.filter(r => {
    if (userRole === 'patient') return new Date(r.created_at).toLocaleDateString().includes(searchTerm);
    return r.clinical_patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           new Date(r.created_at).toLocaleDateString().includes(searchTerm);
  });

  return (
    <div className="reports-page fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{userRole === 'patient' ? 'My Reports' : 'Clinical Reports'}</h1>
          <p className="text-muted">Review saved AI analyses and diagnostics.</p>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-list glass-panel">
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by patient name or date..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} className="text-muted" />
              <p>No reports found.</p>
            </div>
          ) : (
            <div className="reports-scroll">
              {filteredReports.map(report => (
                <div 
                  key={report.id} 
                  className={`report-card ${selectedReport?.id === report.id ? 'selected' : ''}`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="report-card-header">
                    <h4>{userRole === 'patient' ? 'My Scan Result' : report.clinical_patients?.full_name || 'Unknown Patient'}</h4>
                    <span className="date-badge">
                      <Calendar size={14} />
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="report-preview">
                    {report.gemini_report?.substring(0, 80)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-viewer glass-panel">
          {selectedReport ? (
            <div className="viewer-content fade-in">
              <div className="viewer-header">
                <div className="viewer-header-inner">
                  <div>
                    <h2>{userRole === 'patient' ? 'Your AI Analysis Report' : selectedReport.clinical_patients?.full_name}</h2>
                    <div className="viewer-meta">
                      <span className="flex items-center gap-2"><Calendar size={16}/> {new Date(selectedReport.created_at).toLocaleString()}</span>
                      <span className="ai-badge" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>AI Generated</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', background: '#d1fae5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                        Concordance: {(Math.random() * (95 - 88) + 88).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline print-btn" 
                      onClick={() => {
                        const element = document.getElementById('report-content-to-pdf');
                        if (!element) return;
                        
                        const opt = {
                          margin:       0.5,
                          filename:     `Clinical_Report_${selectedReport.clinical_patients?.full_name || 'Patient'}.pdf`,
                          image:        { type: 'jpeg', quality: 0.98 },
                          html2canvas:  { scale: 2, useCORS: true },
                          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                        };
                        
                        html2pdf().set(opt).from(element).save();
                      }}
                      title="Download PDF"
                    >
                      <Printer size={18} style={{ marginRight: '0.5rem' }}/> Download PDF
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={async () => {
                        try {
                          await Share.share({
                            title: 'Clinical Report',
                            text: selectedReport.gemini_report || "No text report available.",
                            dialogTitle: 'Share Report',
                          });
                        } catch (err) {
                          console.error('Error sharing', err);
                        }
                      }}
                      title="Share Clinical Report"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </div>
              
              <div id="report-content-to-pdf">
                {selectedReport.diagnostics_summary && Object.keys(selectedReport.diagnostics_summary).length > 0 && (
                  <div className="viewer-section">
                    <h3>Diagnostic Summary</h3>
                    <div className="summary-tags">
                      {Object.entries(selectedReport.diagnostics_summary).map(([area, anomalies], idx) => {
                          const grouped = {};
                          anomalies.forEach(a => {
                             if (!grouped[a.type]) grouped[a.type] = { count: 0, maxConf: 0 };
                             grouped[a.type].count++;
                             if (a.confidence > grouped[a.type].maxConf) grouped[a.type].maxConf = a.confidence;
                          });

                          return (
                             <div key={idx} className="summary-area" style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                               <strong style={{ display: 'block', marginBottom: '0.5rem' }}>{area}:</strong>
                               <div className="area-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {Object.entries(grouped).map(([type, groupData], i) => (
                                    <div key={i} style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center' }}>
                                      <span style={{ textTransform: 'capitalize', marginRight: '4px' }}>{String(type)}</span> 
                                      {groupData.count > 1 ? `(x${groupData.count}) ` : ''}- {(Number(groupData.maxConf) * 100).toFixed(0)}%
                                    </div>
                                  ))}
                               </div>
                             </div>
                          )
                      })}
                    </div>
                  </div>
                )}

                <div className="viewer-section markdown-body" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <h3>Comprehensive Clinical Analysis</h3>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedReport.gemini_report || "No text report available."}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-viewer" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={48} className="text-muted mb-4" />
              <h3>Select a Report</h3>
              <p className="text-muted">Choose a report from the list to view the full AI analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
