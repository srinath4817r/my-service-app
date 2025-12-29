import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app'; // <--- ADDED THIS IMPORT
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Import your pages
import Login from './pages/Login';
import CustomerHome from './pages/CustomerHome';
import ProviderDashboard from './pages/ProviderDashboard';

// ⚠️ CHANGE THIS NUMBER EVERY TIME YOU BUILD A NEW APK
const CURRENT_APP_VERSION = 2; 

// --- WRAPPER COMPONENT TO HANDLE LOGIC ---
// We moved the logic inside here so we can use 'useNavigate' and 'useLocation'
const AppLogic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [updateRequired, setUpdateRequired] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    checkContext();
    setupBackButton(); // <--- Initialize Back Button
  }, [location]); 

  // --- SMART BACK BUTTON LOGIC ---
  const setupBackButton = () => {
    // Clear old listeners to prevent duplicates
    CapacitorApp.removeAllListeners();

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Define pages where "Back" should EXIT the app
      const exitRoutes = ['/', '/login', '/customer-home', '/provider-dashboard'];
      
      if (exitRoutes.includes(location.pathname)) {
        // If on a main page, exit the app
        CapacitorApp.exitApp();
      } else {
        // If on a sub-page (like Profile), go back one step
        navigate(-1);
      }
    });
  };

  const checkContext = async () => {
    const platform = Capacitor.getPlatform();
    
    // --- FETCH SETTINGS ---
    const { data: settings } = await supabase
      .from('app_settings')
      .select('min_required_version, download_url')
      .single();

    const url = settings?.download_url || '';
    setDownloadUrl(url);

    // --- WEB LOGIC ---
    if (platform === 'web') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) setShowInstallPrompt(true);
      return;
    }

    // --- NATIVE APP LOGIC ---
    if (settings && CURRENT_APP_VERSION < settings.min_required_version) {
      setUpdateRequired(true);
    }
  };

  // --- POPUPS & LOCK SCREENS ---
  if (showInstallPrompt) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2 style={{color: '#166534', marginBottom: '10px'}}>Get the Full Experience</h2>
          <p style={{marginBottom: '20px', color: '#555'}}>
            This looks like a mobile phone. Would you like to download our App for better performance?
          </p>
          <button style={styles.primaryButton} onClick={() => window.location.href = downloadUrl}>Download Android App</button>
          <button style={styles.secondaryButton} onClick={() => setShowInstallPrompt(false)}>Continue in Browser</button>
        </div>
      </div>
    );
  }

  if (updateRequired) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h1 style={{ color: '#166534' }}>Update Required</h1>
          <p style={{ textAlign: 'center', margin: '20px 0' }}>Please update to continue.</p>
          <button style={styles.primaryButton} onClick={() => window.open(downloadUrl, '_system')}>Download Update</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ROUTES ---
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/customer-home" element={<CustomerHome />} />
      <Route path="/provider-dashboard" element={<ProviderDashboard />} />
    </Routes>
  );
};

// --- MAIN EXPORT ---
export default function App() {
  return (
    <Router>
      <AppLogic />
    </Router>
  );
}

// --- STYLES ---
const styles = {
  overlay: {
    height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
  },
  modal: {
    background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  primaryButton: {
    display: 'block', width: '100%', padding: '12px', background: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer'
  },
  secondaryButton: {
    display: 'block', width: '100%', padding: '12px', background: 'transparent', color: '#166534', border: '2px solid #166534', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
  }
};