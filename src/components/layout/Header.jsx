import React, { useEffect, useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Header.css';

export default function Header() {
  const [role, setRole] = useState('doctor');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setRole(user.user_metadata?.role || 'doctor');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/welcome';
  };

  return (
    <header className="header glass-panel">
      <div className="mobile-logo">
        <img src="/logo.png" alt="ProphyDent" className="logo-img" />
      </div>
      
      <button className="icon-btn mobile-logout" onClick={handleLogout} title="Log Out">
        <LogOut size={20} />
      </button>
    </header>
  );
}
