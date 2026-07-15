import React from 'react';

export default function Logo({ className = "logo-img", size = 40 }) {
  return (
    <img 
      src="./logo.png" 
      alt="Smile Guard AI" 
      className={className} 
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
      }} 
    />
  );
}

