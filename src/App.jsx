import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ProviderDashboard from './pages/ProviderDashboard'
import CustomerHome from './pages/CustomerHome'

function App() {
  return (
    <Router>
      <Routes>
        {/* Default page is Login */}
        <Route path="/" element={<Login />} />
        
        {/* Provider Area */}
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        
        {/* Customer Area */}
        <Route path="/customer-home" element={<CustomerHome />} />
      </Routes>
    </Router>
  )
}

export default App