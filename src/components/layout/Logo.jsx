import React from 'react';

export default function Logo({ className = "logo-img", size = 40 }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.25))' }}
    >
      {/* Background/Shield Gradient Definition */}
      <defs>
        <linearGradient id="logoShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="logoToothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Futuristic Shield Outline */}
      <path 
        d="M100 15 L170 42 C170 120 125 175 100 185 C75 175 30 120 30 42 Z" 
        fill="url(#logoShieldGrad)" 
        stroke="#60a5fa" 
        strokeWidth="4" 
        strokeLinejoin="round"
      />

      {/* Tech Grid / Connection Lines inside shield */}
      <path d="M60 70 L100 50 L140 70" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
      <path d="M60 120 L100 145 L140 120" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      {/* Cyber/AI Network Nodes */}
      <circle cx="100" cy="50" r="4" fill="#60a5fa" />
      <circle cx="60" cy="70" r="3" fill="#60a5fa" />
      <circle cx="140" cy="70" r="3" fill="#60a5fa" />
      <circle cx="60" cy="120" r="3" fill="#60a5fa" />
      <circle cx="140" cy="120" r="3" fill="#60a5fa" />
      <circle cx="100" cy="145" r="4" fill="#60a5fa" />

      {/* Connection lines to the central tooth */}
      <line x1="100" y1="50" x2="100" y2="70" stroke="#60a5fa" strokeWidth="2" opacity="0.7" />
      <line x1="60" y1="70" x2="80" y2="85" stroke="#60a5fa" strokeWidth="2" opacity="0.7" />
      <line x1="140" y1="70" x2="120" y2="85" stroke="#60a5fa" strokeWidth="2" opacity="0.7" />

      {/* Central Premium White Tooth */}
      <path 
        d="M100 70 
           C80 70, 75 82, 75 92 
           C75 112, 88 120, 88 135 
           L88 142 
           C88 145, 91 148, 94 148 
           L98 148 
           C100 148, 100 142, 100 140
           C100 142, 100 148, 102 148
           L106 148
           C109 148, 112 145, 112 142
           L112 135
           C112 120, 125 112, 125 92
           C125 82, 120 70, 100 70 Z" 
        fill="url(#logoToothGrad)"
        filter="url(#logoGlow)"
      />

      {/* Tooth highlight */}
      <path d="M85 85 C85 80, 90 77, 95 76" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
