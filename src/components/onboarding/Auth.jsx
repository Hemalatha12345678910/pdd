import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Onboarding.css';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'doctor';
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('male');
  const [avatar, setAvatar] = useState('');

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
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      if (!isLogin && role === 'doctor') {
        if (!email.endsWith('.lmt@prophydent.com')) {
          throw new Error('Unauthorized email domain for clinical registration. Please contact administration.');
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              mobile: mobile,
              address: address,
              gender: gender,
              avatar: avatar
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.session) {
          navigate('/dashboard');
        } else {
          setErrorMsg('Registration successful! Please check your email for a confirmation link.');
        }
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="auth-container fade-in">
        <button className="btn-icon back-btn" onClick={() => navigate('/role')} type="button">
          <ArrowLeft size={24} />
        </button>
        
        <div className="auth-header">
          <img src="/logo.png" alt="Logo" className="small-logo" />
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-muted">
            {role === 'doctor' ? 'Clinical Portal' : 'Patient Portal'}
          </p>
        </div>

        {errorMsg && (
          <div className="error-message" style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '0.9rem', backgroundColor: 'var(--color-danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            {errorMsg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label>Profile Photo</label>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-bg-card)', border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => document.getElementById('avatarUpload').click()}>
                  {avatar ? (
                    <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', color: 'var(--color-text-muted)' }}>+</span>
                  )}
                </div>
                <input id="avatarUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <span className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>Optional</span>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder={role === 'doctor' ? "Dr. Jane Doe" : "Jane Doe"} 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Mobile Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  placeholder="123 Clinical Way, NY" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit', background: 'var(--color-bg-main)', color: 'var(--color-text-main)' }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="jane.doe@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
            />
          </div>
          
          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={20} /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button className="text-link" type="button" onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
            }}>
              {isLogin ? 'Sign up here' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
