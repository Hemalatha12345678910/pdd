import React from 'react';
import Logo from './Logo';
import './Header.css';

export default function Header() {
  return (
    <header className="header glass-panel">
      <div className="mobile-logo">
        <Logo size={32} />
        <div className="mobile-logo-text">
          <h2>Smile Guard AI</h2>
          <span className="mobile-ai-badge">AI</span>
        </div>
      </div>
    </header>
  );
}
