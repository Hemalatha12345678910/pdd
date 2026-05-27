import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div className="splash-content">
        <img src="/logo.png" alt="ProphyDent AI" className="splash-logo" />
        <h1 className="splash-title">ProphyDent AI</h1>
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}
