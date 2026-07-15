import { Capacitor } from '@capacitor/core';

const DEFAULT_PRODUCTION_URL = import.meta.env.VITE_BACKEND_URL || 'https://pdd-backend-os1e.onrender.com/analyze';
const KEY_BACKEND_URL = 'prophydent-backend-url';

export const getBackendUrl = () => {
  const savedUrl = localStorage.getItem(KEY_BACKEND_URL);
  if (savedUrl) {
    return resolveUrlForPlatform(savedUrl);
  }

  // Smart defaults based on platform
  if (Capacitor.isNativePlatform()) {
    // For native Android apps running in emulator, point to local machine loopback port
    return 'http://10.0.2.2:5000/analyze';
  } else {
    // For web development, fallback to production space or localhost if in development
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isDev ? 'http://localhost:5000/analyze' : DEFAULT_PRODUCTION_URL;
  }
};

export const setBackendUrl = (url) => {
  if (!url) {
    localStorage.removeItem(KEY_BACKEND_URL);
  } else {
    localStorage.setItem(KEY_BACKEND_URL, url.trim());
  }
};

export const resetBackendUrl = () => {
  localStorage.removeItem(KEY_BACKEND_URL);
};

export const resolveUrlForPlatform = (url) => {
  if (!url) return DEFAULT_PRODUCTION_URL;
  
  // If running inside native Android and url points to localhost/127.0.0.1, map to 10.0.2.2
  if (Capacitor.isNativePlatform()) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
  }
  return url;
};
