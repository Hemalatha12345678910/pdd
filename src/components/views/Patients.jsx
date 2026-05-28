import React, { useState, useEffect } from 'react';
import { UserPlus, Users as UsersIcon, Search, MoreVertical, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Patients.css';

export default function Patients() {
  const [activeTab, setActiveTab] = useState('view'); // 'view' or 'add'

  return (
    <div className="patients-container fade-in">
      <header className="page-header">
        <div>
          <h1>Patient Management</h1>
          <p className="text-muted">View your patient roster or register a new patient.</p>
        </div>
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            <UsersIcon size={18} /> View Patients
          </button>
          <button 
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            <UserPlus size={18} /> Add Patient
          </button>
        </div>
      </header>

      {activeTab === 'view' ? <ViewPatients /> : <AddPatient onSuccess={() => setActiveTab('view')} />}
    </div>
  );
}

function ViewPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('clinical_patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  };

  const filteredPatients = patients.filter(patient => 
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card view-patients-card">
      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search patients by name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="table-responsive">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 className="spinner" size={32} style={{ margin: '0 auto', color: 'var(--color-primary)' }} />
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No patients found. Add a new patient to get started.
          </div>
        ) : (
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>DOB</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr key={patient.id}>
                  <td className="font-medium">{patient.full_name}</td>
                  <td>{patient.dob}</td>
                  <td>{patient.email || '-'}</td>
                  <td>
                    <span className={`status-badge ${patient.status === 'Active' ? 'success' : 'warning'}`}>
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon"><MoreVertical size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddPatient({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    email: '',
    phone: '',
    medical_history: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('clinical_patients').insert([
        {
          doctor_id: user.id,
          full_name: formData.full_name,
          dob: formData.dob,
          email: formData.email,
          phone: formData.phone,
          medical_history: formData.medical_history,
          status: 'Active'
        }
      ]);

      if (error) throw error;
      
      // Success! Return to view tab
      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card add-patient-card">
      <h2 className="mb-6">Register New Patient</h2>
      
      {errorMsg && (
        <div className="error-message" style={{ color: 'var(--color-danger)', marginBottom: '1rem', backgroundColor: 'var(--color-danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="e.g. Sarah Williams" required />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="sarah@example.com" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" />
          </div>
        </div>
        
        <div className="form-group mt-4">
          <label>Medical History / Notes</label>
          <textarea rows="4" name="medical_history" value={formData.medical_history} onChange={handleChange} placeholder="Any known allergies, past procedures, etc."></textarea>
        </div>
        
        <div className="form-actions mt-8">
          <button type="button" className="btn btn-outline" onClick={onSuccess}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={20} /> : 'Save Patient Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
