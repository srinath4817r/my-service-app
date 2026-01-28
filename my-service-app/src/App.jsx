import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app'; 
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// PAGES
import Login from './pages/Login';
import CustomerHome from './pages/CustomerHome';
import ProviderDashboard from './pages/ProviderDashboard'; // ✅ The new Animated Dashboard
import ProviderSelection from './pages/ProviderSelection';
import InstantProviderDashboard from './pages/InstantProviderDashboard';

const CURRENT_APP_VERSION = 2; 

const AppLogic = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitializing, setIsInitializing] = useState(true);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    const setupDeepLinks = async () => {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url);
          const hash = parsed.hash.replace('#', '');
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            checkUserSession(); 
          }
        } catch (e) {
          console.error("Deep link error:", e);
        }
      });
    };

    checkUserSession();
    checkContext();
    setupDeepLinks();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') checkUserSession();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let backListener;
    const setupBackButton = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        const exitRoutes = ['/', '/customer-home', '/provider-dashboard', '/instant-dashboard'];
        if (exitRoutes.includes(location.pathname)) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };
    setupBackButton();
    return () => backListener && backListener.remove();
  }, [location, navigate]);

  // 🛠️ FIXED ROUTING LOGIC
  const checkUserSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const userId = session.user.id;

        const { data: service } = await supabase
          .from('services')
          .select('service_type')
          .eq('provider_id', userId)
          .maybeSingle();

        if (service) {
          if (service.service_type === 'Instant') {
            navigate('/instant-dashboard', { replace: true });
          } 
          // ✅ FIX: Send "Local" providers to the MAIN dashboard now
          else if (service.service_type === 'Local') {
            navigate('/provider-dashboard', { replace: true }); 
          } 
          else {
            navigate('/provider-dashboard', { replace: true });
          }
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

          if (profile?.role === 'provider') {
            navigate('/join-selection', { replace: true });
          } else {
            navigate('/customer-home', { replace: true });
          }
        }
      }
    } catch (e) {
      console.error("Routing Error:", e);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkContext = async () => {
    const platform = Capacitor.getPlatform();
    const { data: settings } = await supabase
      .from('app_settings')
      .select('min_required_version, download_url')
      .single();

    setDownloadUrl(settings?.download_url || '');

    if (platform === 'web') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) setShowInstallPrompt(true);
      return;
    }

    if (settings && CURRENT_APP_VERSION < settings.min_required_version) {
      setUpdateRequired(true);
    }
  };

  if (isInitializing) {
    return (
      <div style={inlineStyles.overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={inlineStyles.loader}></div>
          <p style={{ color: '#166534', fontWeight: 'bold' }}>Detecting Session...</p>
        </div>
      </div>
    );
  }

  if (showInstallPrompt) {
    return (
      <div style={inlineStyles.overlay}>
        <div style={inlineStyles.modal}>
          <h2 style={{ color: '#166534' }}>Get the Full Experience</h2>
          <p style={{ color: '#555', margin: '15px 0' }}>Download the app for better performance.</p>
          <button style={inlineStyles.primaryButton} onClick={() => window.location.href = downloadUrl}>
            Download Android App
          </button>
          <button style={inlineStyles.secondaryButton} onClick={() => setShowInstallPrompt(false)}>
            Continue in Browser
          </button>
        </div>
      </div>
    );
  }

  if (updateRequired) {
    return (
      <div style={inlineStyles.overlay}>
        <div style={inlineStyles.modal}>
          <h2 style={{ color: '#166534' }}>Update Required</h2>
          <p style={{ margin: '15px 0' }}>Please update the app to continue.</p>
          <button style={inlineStyles.primaryButton} onClick={() => window.open(downloadUrl, '_system')}>
            Download Update
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/customer-home" element={<CustomerHome />} />
      
      {/* ✅ MAIN DASHBOARD ROUTE */}
      <Route path="/provider-dashboard" element={<ProviderDashboard />} />
      
      {/* ✅ SAFETY ROUTES: Catch old links/redirects and send them to the new dashboard */}
      <Route path="/local-provider-dashboard" element={<ProviderDashboard />} />
      <Route path="/local-dashboard" element={<ProviderDashboard />} />

      <Route path="/join-selection" element={<ProviderSelection />} />
      <Route path="/instant-dashboard" element={<InstantProviderDashboard />} />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AppLogic />
    </Router>
  );
}

const inlineStyles = {
  overlay: {
    height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0,
    backgroundColor: '#f0fdf4', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
  },
  modal: {
    background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px',
    textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  primaryButton: {
    width: '100%', padding: '12px', background: '#166534', color: 'white', border: 'none',
    borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer'
  },
  secondaryButton: {
    width: '100%', padding: '12px', background: 'transparent', color: '#166534', border: '2px solid #166534',
    borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
  },
  loader: {
    border: '4px solid #f3f3f3', borderTop: '4px solid #166534', borderRadius: '50%',
    width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 15px'
  }
};