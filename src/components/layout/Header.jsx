import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="header glass-panel">
      <div className="mobile-logo">
        <img src="./logo.png" alt="Smile Guard AI" className="logo-img" />
        <div className="mobile-logo-text">
          <h2>Smile Guard AI</h2>
          <span className="mobile-ai-badge">AI</span>
        </div>
      </div>
    </header>
  );
}
