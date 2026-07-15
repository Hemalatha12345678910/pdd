import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../layout/Logo';
import './Onboarding.css';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/welcome');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className="splash-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={100} className="splash-logo" />
        <h1 className="splash-title" style={{ marginTop: '1.5rem' }}>Smile Guard AI</h1>
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}
