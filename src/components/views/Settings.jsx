import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Shield, Save, CheckCircle, Loader2, User, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Settings.css';

export default function Settings() {
  const [theme, setTheme] = useState('light');
  
  // Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  // Profile
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('male');
  const [avatar, setAvatar] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('prophydent-theme') || 'light';
    setTheme(savedTheme);

    // Load user profile
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '');
        setFullName(user.user_metadata?.full_name || '');
        setMobile(user.user_metadata?.mobile || '');
        setAddress(user.user_metadata?.address || '');
        setGender(user.user_metadata?.gender || 'male');
        setAvatar(user.user_metadata?.avatar || '');
      }
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('prophydent-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setAvatar(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setIsUpdatingProfile(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          mobile: mobile,
          address: address,
          gender: gender,
          avatar: avatar
        }
      });

      if (updateError) throw updateError;
      setProfileMsg("Profile updated successfully!");
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setProfileErr(err.message || "Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');

    if (password !== confirmPassword) {
      setPasswordErr("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setPasswordErr("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setPasswordMsg("Password updated successfully!");
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setPasswordErr(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="settings-page fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-muted">Manage your app preferences and account security.</p>
        </div>
      </div>

      <div className="settings-container">
        
        {/* Profile Section */}
        <section className="settings-section glass-panel">
          <div className="section-header">
            <div className="icon-wrap bg-primary-light">
              <User size={24} className="text-primary"/>
            </div>
            <div>
              <h2>Personal Information</h2>
              <p className="text-muted">Manage your profile details and contact information.</p>
            </div>
          </div>
          
          <div className="settings-content">
            <form onSubmit={handleUpdateProfile} className="password-form" style={{ maxWidth: '600px' }}>
              <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <label>Profile Photo</label>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-bg-card)', border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => document.getElementById('settingsAvatarUpload').click()}>
                  {avatar ? (
                    <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', color: 'var(--color-text-muted)' }}>+</span>
                  )}
                </div>
                <input id="settingsAvatarUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>

              <div className="profile-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={email} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}/>
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit', background: 'var(--color-bg-main)', color: 'var(--color-text-main)' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              
              {profileErr && <div className="alert alert-error">{profileErr}</div>}
              {profileMsg && <div className="alert alert-success">{profileMsg}</div>}

              <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
                {isUpdatingProfile ? <><Loader2 size={16} className="spinner mr-2"/> Saving...</> : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="settings-section glass-panel">
          <div className="section-header">
            <div className="icon-wrap bg-primary-light">
              {theme === 'dark' ? <Moon size={24} className="text-primary"/> : <Sun size={24} className="text-primary"/>}
            </div>
            <div>
              <h2>Appearance</h2>
              <p className="text-muted">Customize how the application looks on your device.</p>
            </div>
          </div>
          
          <div className="settings-content">
            <div className="setting-row">
              <div>
                <h4>Dark Mode</h4>
                <p className="text-muted text-sm">Switch to a darker theme to reduce eye strain in low-light environments.</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={theme === 'dark'} 
                  onChange={toggleTheme}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="settings-section glass-panel">
          <div className="section-header">
            <div className="icon-wrap" style={{ background: '#fef2f2' }}>
              <Shield size={24} style={{ color: '#ef4444' }}/>
            </div>
            <div>
              <h2>Account Security</h2>
              <p className="text-muted">Update your password to keep your account secure.</p>
            </div>
          </div>
          
          <div className="settings-content">
            <form onSubmit={handleUpdatePassword} className="password-form">
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              
              {passwordErr && <div className="alert alert-error">{passwordErr}</div>}
              {passwordMsg && <div className="alert alert-success">{passwordMsg}</div>}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isUpdatingPassword || !password}
              >
                {isUpdatingPassword ? <><Loader2 size={16} className="spinner mr-2"/> Updating...</> : 'Update Password'}
              </button>
            </form>
          </div>
        </section>

        {/* Logout Section */}
        <section className="settings-section glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div className="section-header">
            <div className="icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <LogOut size={24} style={{ color: '#ef4444' }}/>
            </div>
            <div>
              <h2 style={{ color: '#ef4444' }}>Sign Out</h2>
              <p className="text-muted">Securely log out of your account on this device.</p>
            </div>
          </div>
          
          <div className="settings-content">
            <button 
              className="btn btn-primary" 
              style={{ background: '#ef4444', border: 'none', width: 'fit-content', padding: '0.75rem 2rem' }}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/welcome';
              }}
            >
              Sign Out
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
