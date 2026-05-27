import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './Onboarding.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="onboarding-screen">
      <div className="welcome-content fade-in">
        <img src="/logo.png" alt="ProphyDent AI Logo" className="welcome-logo" />
        <h1>Welcome to ProphyDent AI</h1>
        <p className="welcome-subtitle">Precision Prevention, Powered by AI</p>
        
        <button className="btn btn-primary btn-large mt-8" onClick={() => navigate('/role')}>
          Get Started <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>
    </div>
  );
}
