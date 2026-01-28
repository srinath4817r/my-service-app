import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Capacitor } from '@capacitor/core'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const loginWithGoogle = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    const isApp = Capacitor.getPlatform() !== 'web'
    
    const redirectURL = isApp 
      ? 'com.myserviceapp.app://login-callback' 
      : `${window.location.origin}/` 

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectURL,
        skipBrowserRedirect: false
      }
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  // ---------------------------------------------------------
  // 🎨 STYLES (Spinning Google Border + Text)
  // ---------------------------------------------------------
  const styles = `
    /* Base Button Style */
    .google-btn {
      position: relative;
      width: 100%;
      padding: 14px;
      background: white;
      color: #166534; /* Green Text */
      border: 2px solid #166534; /* Green Border */
      border-radius: 12px;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s ease;
      overflow: hidden;
      z-index: 1; /* Keep text on top */
    }

    /* Hover State (Normal) */
    .google-btn:not(.loading):hover {
      background-color: #f0fdf4;
      box-shadow: 0 4px 12px rgba(22, 101, 52, 0.15);
      transform: translateY(-1px);
    }

    /* --- LOADING STATE --- */

    .google-btn.loading {
      border-color: transparent; /* Hide original green border */
      background: transparent;   /* Clear background so we see layers below */
      color: #374151;            /* Switch text to Dark Grey (Google Style) */
      pointer-events: none;      /* Disable clicks */
    }

    /* 1. The Spinning Rainbow Border (Behind everything) */
    .google-btn::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%; width: 200%; height: 200%;
      background: conic-gradient(
        #4285F4, #EA4335, #FBBC05, #34A853, #4285F4
      );
      animation: spin-border 2s linear infinite;
      z-index: -2;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    /* Show spinner when loading */
    .google-btn.loading::before {
      opacity: 1;
    }

    /* 2. The White Background Mask (Inside the border) */
    .google-btn::after {
      content: '';
      position: absolute;
      top: 3px; left: 3px; right: 3px; bottom: 3px; /* 3px thickness */
      background: white;
      border-radius: 9px; /* Slightly tighter radius */
      z-index: -1;
    }

    @keyframes spin-border {
      100% { transform: rotate(360deg); }
    }
  `

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid white',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  }

  return (
    <div style={{
        minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#dcfce7', backgroundImage: 'radial-gradient(#86efac 1px, transparent 1px)',
        backgroundSize: '20px 20px'
    }}>
      <style>{styles}</style>

      <div style={cardStyle}>
        <h2 style={{ marginBottom: '20px', fontSize: '2rem', color: '#166534' }}>Welcome Back</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Continue with Google to access MyService</p>

        {message.text && (
          <div style={{
              padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px',
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#15803d' : '#991b1b'
          }}>
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={loading}
          className={`google-btn ${loading ? 'loading' : ''}`}
        >
          {/* Show Google Logo ONLY when NOT loading */}
          {!loading && (
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
              alt="G" 
              style={{ width: '20px' }} 
            />
          )}

          {/* Change Text Based on State */}
          {loading ? 'Fetching Account...' : 'Continue with Google'}
        </button>

      </div>
    </div>
  )
}