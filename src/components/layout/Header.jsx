import React from 'react';
import { Search, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Header.css';

export default function Header() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="header glass-panel">
      <div className="mobile-logo">
        <img src="/logo.png" alt="ProphyDent" className="logo-img" />
      </div>

      <div className="search-bar">
        <Search size={18} className="text-muted" />
        <input type="text" placeholder="Search..." />
      </div>
      
      <button className="icon-btn mobile-logout" onClick={handleLogout} title="Log Out">
        <LogOut size={20} />
      </button>
    </header>
  );
}
