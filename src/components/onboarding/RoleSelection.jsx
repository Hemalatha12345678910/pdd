import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User } from 'lucide-react';
import Logo from '../layout/Logo';
import './Onboarding.css';

export default function RoleSelection() {
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    navigate(`/auth?role=${role}`);
  };

  return (
    <div className="onboarding-screen">
      <div className="role-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Logo size={50} className="small-logo mb-6" />
        <h2>How will you be using Smile Guard AI?</h2>
        <p className="text-muted mb-8">Select your role to customize your experience.</p>
        
        <div className="role-cards">
          <div className="role-card" onClick={() => handleSelectRole('doctor')}>
            <div className="role-icon"><Stethoscope size={32} /></div>
            <h3>Doctor / Dentist</h3>
            <p>I want to manage patients and run clinical AI analyses.</p>
          </div>
          
          <div className="role-card" onClick={() => handleSelectRole('patient')}>
            <div className="role-icon"><User size={32} /></div>
            <h3>Patient</h3>
            <p>I want to track my oral health and view my reports.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
