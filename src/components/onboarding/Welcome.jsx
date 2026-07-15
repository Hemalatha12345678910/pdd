import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Logo from '../layout/Logo';
import './Onboarding.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="onboarding-screen">
      <div className="welcome-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Logo size={90} className="welcome-logo" />
        <h1 style={{ marginTop: '1.2rem' }}>Welcome to Smile Guard AI</h1>
        <p className="welcome-subtitle">Precision Prevention, Powered by AI</p>
        
        <button className="btn btn-primary btn-large mt-8" onClick={() => navigate('/role')}>
          Get Started <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>
    </div>
  );
}
