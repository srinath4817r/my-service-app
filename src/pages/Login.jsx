import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('customer') 
  const [isSignUp, setIsSignUp] = useState(false) 
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const roleParam = params.get('role')
    if (roleParam === 'provider') {
      setIsSignUp(true) 
      setRole('provider') 
    }
  }, [location])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // Sign Up
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        alert(error.message)
      } else {
        const { error: profileError } = await supabase.from('profiles')
          .insert([{ id: data.user.id, full_name: fullName, role: role, email: email }])
        
        if (profileError) alert("Error creating profile: " + profileError.message)
        else {
          alert('Signup successful! Please log in.')
          setIsSignUp(false)
        }
      }
    } else {
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        alert(error.message)
      } else {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (profile?.role === 'provider') navigate('/provider-dashboard')
        else navigate('/customer-home')
      }
    }
    setLoading(false)
  }

  // GREEN BACKGROUND CONTAINER
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#dcfce7', /* LIGHT GREEN COLOR */
      backgroundImage: 'radial-gradient(#86efac 1px, transparent 1px)', 
      backgroundSize: '20px 20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid white',
        padding: '40px',
        borderRadius: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '2rem', color: '#166534' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <input 
              type="text" placeholder="Full Name" className="search-input"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required 
            />
          )}

          <input 
            type="email" placeholder="Email Address" className="search-input"
            value={email} onChange={(e) => setEmail(e.target.value)} required 
          />

          <input 
            type="password" placeholder="Password" className="search-input"
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />

          {isSignUp && (
            <div style={{textAlign:'left'}}>
              <label style={{display:'block', marginBottom:'5px', color:'#166534', fontWeight:'bold'}}>I want to:</label>
              <select 
                value={role} onChange={(e) => setRole(e.target.value)} 
                className="search-input" style={{cursor:'pointer'}}
              >
                <option value="customer">Hire Professionals (Customer)</option>
                <option value="provider">Offer Services (Provider)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn" style={{ marginTop: '10px', width: '100%', background: '#166534' }}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
        </form>

        <p style={{ marginTop: '20px', color: '#166534' }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"} 
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}