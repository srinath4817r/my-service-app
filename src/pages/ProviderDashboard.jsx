import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ProviderDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState('service') 

  // --- SERVICE FORM STATES ---
  const [existingService, setExistingService] = useState(null)
  const [isEditing, setIsEditing] = useState(false) 
  const [serviceType, setServiceType] = useState('Plumber')
  const [customName, setCustomName] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [mobile, setMobile] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [images, setImages] = useState([]) 
  const [uploading, setUploading] = useState(false)

  // --- BOOKING STATES ---
  const [bookings, setBookings] = useState([])
  const [pinInput, setPinInput] = useState({}) 
  
  // --- 🔴 REJECTION MODAL STATE ---
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [rejectReasonType, setRejectReasonType] = useState('Distance too far')
  const [rejectCustomReason, setRejectCustomReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)
  
  // --- NOTIFICATION STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // --- SAFE DATE HELPER ---
  const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString();
    } catch (e) { return 'N/A'; }
  }

  const styles = `
    body.provider-body { margin: 0; font-family: 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); color: #ecfdf5; min-height: 100vh; }
    .top-bar { background-color: rgba(0, 0, 0, 0.3); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #059669; backdrop-filter: blur(10px); }
    .top-bar h1 { margin: 0; font-size: 1.5rem; color: #34d399; }
    .nav-tabs { display: flex; gap: 15px; margin: 20px auto; justify-content: center; }
    .tab-btn { background: transparent; border: 1px solid #34d399; color: #34d399; padding: 10px 25px; cursor: pointer; border-radius: 20px; font-weight: 600; transition: all 0.2s; }
    .tab-btn.active { background: #34d399; color: #022c22; box-shadow: 0 0 15px rgba(52, 211, 153, 0.4); }
    .dashboard-grid { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .sidebar-card { background: rgba(6, 78, 59, 0.6); border: 1px solid #059669; border-radius: 12px; padding: 1.5rem; height: fit-content; text-align: center; }
    .status { background: #065f46; color: #34d399; padding: 0.5rem; border-radius: 8px; font-weight: bold; margin-bottom: 1.5rem; display: inline-block; width: 100%; }
    .service-info { margin-bottom: 1.5rem; color: #d1fae5; }
    .main-panel { background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 2rem; border: 1px solid rgba(255, 255, 255, 0.1); }
    .dash-form { display: flex; flex-direction: column; gap: 1.2rem; }
    .dash-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #a7f3d0; }
    .dash-input, .dash-select, .dash-textarea { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #059669; background: rgba(0, 0, 0, 0.2); color: white; font-size: 1rem; outline: none; }
    .dash-input:focus, .dash-select:focus, .dash-textarea:focus { border-color: #34d399; background: rgba(0, 0, 0, 0.4); }
    .dash-textarea { min-height: 100px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .upload-box { border: 2px dashed #059669; padding: 1.5rem; border-radius: 8px; background: rgba(6, 95, 70, 0.3); text-align: center; cursor: pointer; position: relative; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 15px; }
    .img-wrapper { position: relative; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #34d399; }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .delete-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
    .img-wrapper:hover .delete-overlay { opacity: 1; }
    .delete-btn { background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
    .action-btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; margin-bottom: 0.5rem; }
    .action-btn.edit { background-color: #10b981; color: #022c22; }
    .action-btn.delete { background-color: rgba(220, 38, 38, 0.2); color: #fca5a5; border: 1px solid #ef4444; }
    .action-btn.reject { background-color: #ef4444; color: white; border: none; }
    .action-btn.complete { background-color: #3b82f6; color: white; margin-top: 10px; }
    .action-btn.map { background-color: #f59e0b; color: white; margin-top: 5px; }
    .logout { background: transparent; border: 1px solid #34d399; color: #34d399; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
    .inbox-container { max-width: 800px; margin: 0 auto; }
    .inbox-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .refresh-btn { background: transparent; border: 1px solid #34d399; color: #34d399; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 0.9rem; }
    .booking-card { background: rgba(6, 78, 59, 0.6); border: 1px solid #059669; border-radius: 12px; padding: 20px; margin-bottom: 20px; animation: fadeIn 0.5s ease; }
    .booking-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; }
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; }
    .status-pending { background: #fef08a; color: #854d0e; }
    .status-accepted { background: #bbf7d0; color: #14532d; }
    .status-in_progress { background: #bfdbfe; color: #1e3a8a; }
    .status-completed { background: #10b981; color: white; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-rejected { background: #374151; color: #d1d5db; text-decoration: line-through; }
    .pin-input-group { display: flex; gap: 10px; margin-top: 15px; }
    .pin-field { background: rgba(0,0,0,0.3); border: 1px solid #34d399; color: white; padding: 10px; border-radius: 6px; width: 120px; text-align: center; letter-spacing: 3px; font-size: 18px; }
    .job-details-box { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #065f46; font-size: 0.9rem; color: #d1fae5; }
    .job-row { margin-bottom: 5px; display: flex; align-items: flex-start; gap: 10px; }
    .job-icon { min-width: 20px; }
    .review-box { margin-top:10px; background: rgba(255,255,255,0.1); padding:10px; border-radius:8px; }
    .star-display { color: #f59e0b; font-size: 18px; letter-spacing: 2px; }
    .reviews-list-container { margin-top: 30px; border-top: 1px solid #059669; padding-top: 20px; }
    .review-item { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #f59e0b; }
    .review-header { display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem; color:#a7f3d0; }
    
    /* MODAL STYLES */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px); }
    .modal-content { background: #064e3b; border: 1px solid #34d399; width: 90%; max-width: 450px; padding: 25px; border-radius: 12px; color: white; box-shadow: 0 10px 25px rgba(0,0,0,0.5); animation: popIn 0.3s ease; }
    .reason-option { display: block; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid #059669; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
    .reason-option:hover { background: rgba(52, 211, 153, 0.2); }
    .reason-option.selected { background: #34d399; color: #064e3b; font-weight: bold; }
    @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; font-weight: 600; display: flex; align-items: center; gap: 10px; animation: slideDown 0.3s ease; }
    .toast-error { background: #ef4444; }
    .toast-info { background: #3b82f6; }
    @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; padding: 1rem; } .form-row { grid-template-columns: 1fr; } }
  `;

  useEffect(() => {
    document.body.classList.add('provider-body')
    checkUser()
    requestNotificationPermission()
    return () => document.body.classList.remove('provider-body')
  }, [])

  const requestNotificationPermission = async () => {
    try { if ('Notification' in window && Notification.permission !== 'granted') { await Notification.requestPermission(); } } catch(e) { console.error(e) }
  }

  const sendNotification = (message, type = 'success', systemTitle = 'Update') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    try { if ('Notification' in window && Notification.permission === 'granted') { new Notification(systemTitle, { body: message }); } } catch(e) {}
  }

  // --- 🔴 REALTIME LISTENER ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('provider-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, 
        (payload) => {
            setTimeout(() => { fetchBookings(user.id); }, 500);
            if(payload.eventType === 'INSERT') { sendNotification("🔔 New Booking Request Received!", "info", "New Job"); setActiveTab('inbox'); }
            if(payload.eventType === 'UPDATE' && payload.new.status === 'cancelled') { sendNotification("❌ Booking Cancelled", "error", "Cancelled"); }
            if(payload.eventType === 'UPDATE' && payload.new.rating) { fetchBookings(user.id); sendNotification("⭐ New Review!", "success", "Review"); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/') } else { setUser(user); fetchService(user.id); fetchBookings(user.id); }
  }

  const fetchService = async (userId) => {
    const { data, error } = await supabase.from('services').select('*, service_images(*)').eq('provider_id', userId).maybeSingle()
    
    if (data) { 
        setExistingService(data); setServiceType(data.service_type || 'Plumber'); 
        setCustomName(data.custom_service_name || ''); setDescription(data.description || ''); 
        setMobile(data.mobile || ''); setContactEmail(data.contact_email || '');
        if (data.timing && data.timing.includes(' - ')) { const [start, end] = data.timing.split(' - '); setStartTime(start); setEndTime(end); }
        setIsEditing(false) 
    } else { 
        setExistingService(null); // Ensure null for new users
        setIsEditing(true) 
    }
    setLoading(false)
  }

  const fetchBookings = async (userId) => {
    if(!userId) return;
    try {
        const { data } = await supabase.from('bookings').select('*').eq('provider_id', userId).order('created_at', { ascending: false })
        if(data) { setBookings(data); }
    } catch(e) { console.error(e) }
  }

  const handleAcceptBooking = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId)
    if(error) sendNotification("Error: " + error.message, "error"); else { sendNotification("Booking Accepted!", "success"); fetchBookings(user.id); }
  }

  // --- 🔴 REJECT LOGIC START ---
  const openRejectModal = (bookingId) => {
    setSelectedBookingId(bookingId);
    setRejectReasonType('Distance too far'); // Default
    setRejectCustomReason('');
    setShowRejectModal(true);
  }

  const handleConfirmReject = async () => {
    if(!selectedBookingId) return;
    setRejectLoading(true);

    const finalReason = rejectReasonType === 'Other' ? rejectCustomReason : rejectReasonType;

    if(rejectReasonType === 'Other' && !rejectCustomReason.trim()) {
        alert("Please type a reason.");
        setRejectLoading(false);
        return;
    }

    const { error } = await supabase.from('bookings').update({ 
        status: 'rejected', 
        rejection_reason: finalReason 
    }).eq('id', selectedBookingId);

    if (error) {
        sendNotification("Error: " + error.message, "error");
    } else {
        sendNotification("Request Declined.", "info");
        fetchBookings(user.id);
        setShowRejectModal(false);
    }
    setRejectLoading(false);
  }
  // --- 🔴 REJECT LOGIC END ---

  const handleVerifyPin = async (bookingId, correctPin) => {
    if(pinInput[bookingId] === correctPin) {
        const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', bookingId)
        if(!error) { sendNotification("PIN Verified!", "success"); fetchBookings(user.id); }
    } else { sendNotification("Incorrect PIN.", "error"); }
  }
  const handleCompleteJob = async (bookingId) => {
    if(!confirm("Work done?")) return;
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)
    if(!error) { sendNotification("Job Completed!", "success"); fetchBookings(user.id); }
  }

  const handleMobileChange = (e) => { const value = e.target.value.replace(/[^0-9]/g, ''); if (value.length <= 10) setMobile(value); }
  
  const handleDeleteImage = async (imageId) => {
    if(!confirm("Delete?")) return;
    const { error } = await supabase.from('service_images').delete().eq('id', imageId)
    if (!error && existingService) { 
        const updated = (existingService.service_images || []).filter(img => img.id !== imageId); 
        setExistingService({ ...existingService, service_images: updated }); 
    }
  }

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setUploading(true);
    
    const serviceData = { 
        provider_id: user.id, 
        service_type: serviceType, 
        custom_service_name: serviceType === 'Other' ? customName : null, 
        description, 
        timing: `${startTime} - ${endTime}`, 
        mobile, 
        contact_email: contactEmail 
    }

    let data, error;

    // CHECK: If service exists -> UPDATE, Else -> INSERT
    if (existingService && existingService.id) {
        // UPDATE existing record
        const result = await supabase
            .from('services')
            .update(serviceData)
            .eq('id', existingService.id)
            .select();
        data = result.data;
        error = result.error;
    } else {
        // INSERT new record (First Time Listing)
        const result = await supabase
            .from('services')
            .insert([serviceData])
            .select();
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error("Supabase Error:", error);
        if(error.code === '23503' || error.message.includes('foreign key')) {
           sendNotification("Database Error: Please run the SQL command provided to fix permissions.", "error");
        } else {
           sendNotification("Error: " + error.message, "error");
        }
        setUploading(false);
        return;
    }

    const serviceId = data?.[0]?.id;
    
    if (images.length > 0 && serviceId) {
      for (const file of images) {
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
        const { error: uploadError } = await supabase.storage.from('service-gallery').upload(fileName, file);
        if (!uploadError) { 
            const { data: { publicUrl } } = supabase.storage.from('service-gallery').getPublicUrl(fileName); 
            await supabase.from('service_images').insert([{ service_id: serviceId, image_url: publicUrl }]); 
        }
      }
    }
    
    sendNotification('Service saved successfully!', "success"); 
    setUploading(false); 
    window.location.reload();
  }

  const handleDelete = async () => { if(confirm("Delete service?")) { await supabase.from('services').delete().eq('id', existingService.id); window.location.reload() } }
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', color: '#fff'}}>Loading...</div>
  
  const displayName = serviceType === 'Other' ? customName : serviceType
  const displayTiming = existingService?.timing || `${startTime} - ${endTime}`
  const safeBookings = bookings || [];
  const ratedBookings = safeBookings.filter(b => b.rating);
  const avgRating = ratedBookings.length > 0 ? (ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length).toFixed(1) : "New";
  const pendingCount = safeBookings.filter(b => b.status === 'pending').length;

  return (
    <div>
      <style>{styles}</style>
      
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
           {toast.type === 'success' && '✅'} {toast.type === 'error' && '❌'} {toast.type === 'info' && 'ℹ️'} {toast.message}
        </div>
      )}

      {/* 🔴 REJECTION MODAL UI */}
      {showRejectModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{marginTop:0, borderBottom:'1px solid #34d399', paddingBottom:'10px'}}>Decline Request</h3>
                <p style={{fontSize:'0.9rem', color:'#d1fae5'}}>Why are you declining this job? The customer will see this reason.</p>
                
                <div style={{margin:'20px 0'}}>
                    {['Distance too far', 'Time slot not available', 'Service not available currently', 'Emergency / Personal Reason', 'Other'].map(reason => (
                        <div key={reason} className={`reason-option ${rejectReasonType === reason ? 'selected' : ''}`} onClick={() => setRejectReasonType(reason)}>
                            {reason}
                        </div>
                    ))}
                    
                    {rejectReasonType === 'Other' && (
                        <textarea 
                            className="dash-textarea" 
                            placeholder="Please type your reason here..."
                            value={rejectCustomReason}
                            onChange={(e) => setRejectCustomReason(e.target.value)}
                            style={{marginTop:'10px', minHeight:'60px'}}
                        />
                    )}
                </div>

                <div style={{display:'flex', gap:'10px'}}>
                    <button className="action-btn reject" onClick={handleConfirmReject} disabled={rejectLoading}>
                        {rejectLoading ? "Declining..." : "Confirm Decline"}
                    </button>
                    <button className="action-btn" style={{background:'#374151', color:'white'}} onClick={() => setShowRejectModal(false)}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="top-bar">
        <h1>Provider Dashboard</h1>
        <button className="logout" onClick={handleLogout}>Logout</button>
      </div>

      <div className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>🛠️ My Service</button>
        <button className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            📬 Inbox ({pendingCount})
        </button>
      </div>

      {activeTab === 'service' ? (
        <div className="dashboard-grid">
            <div className="sidebar-card">
            {existingService ? (
                <>
                <div className="status">Service Active <span>✔</span></div>
                <div style={{marginBottom:'15px'}}>
                    <div style={{fontSize:'40px', color:'#f59e0b', fontWeight:'bold'}}>{avgRating} ★</div>
                    <div style={{fontSize:'12px', color:'#9ca3af'}}>Average Rating ({ratedBookings.length} reviews)</div>
                </div>
                <div className="service-info">You are listed as:<br/><strong style={{fontSize:'22px', color:'#ffffff'}}>{displayName}</strong></div>
                <button className="action-btn edit" onClick={() => setIsEditing(true)}>Edit Service</button>
                <button className="action-btn delete" onClick={handleDelete}>Delete Service</button>
                </>
            ) : (
                <div className="service-info"><strong>No Service Listed</strong><br/>Fill out the form.</div>
            )}
            </div>
            <div className="main-panel">
            {isEditing ? (
                <form onSubmit={handleSubmit} className="dash-form">
                <h2 style={{color:'white', marginBottom:'10px'}}>{existingService ? 'Edit Details' : 'Create New Service'}</h2>
                <div>
                    <label className="dash-label">Service Type</label>
                    <select className="dash-select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    <option>Plumber</option><option>Electrician</option><option>Carpenter</option><option>Painter</option><option>Cleaning</option><option>Other</option>
                    </select>
                </div>
                {serviceType === 'Other' && (<div><label className="dash-label">Specify Name</label><input type="text" className="dash-input" value={customName} onChange={(e) => setCustomName(e.target.value)} required /></div>)}
                <div><label className="dash-label">Description</label><textarea className="dash-textarea" value={description} onChange={(e) => setDescription(e.target.value)} required></textarea></div>
                <div className="form-row">
                    <div><label className="dash-label">Mobile</label><input type="text" className="dash-input" value={mobile} onChange={handleMobileChange} required /></div>
                    <div><label className="dash-label">Email</label><input type="email" className="dash-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required /></div>
                </div>
                <div className="form-row">
                    <div><label className="dash-label">Start Time</label><input type="time" className="dash-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
                    <div><label className="dash-label">End Time</label><input type="time" className="dash-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
                </div>
                <div style={{marginTop:'10px'}}>
                    <label className="dash-label">Photo Gallery</label>
                    {existingService?.service_images && (
                    <div style={{marginBottom:'15px'}}><p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px'}}>Current Photos:</p>
                        <div className="gallery-grid">{(existingService.service_images || []).map(img => (<div key={img.id} className="img-wrapper"><img src={img.image_url} alt="Service" /><div className="delete-overlay" onClick={() => handleDeleteImage(img.id)}><button type="button" className="delete-btn">Delete 🗑️</button></div></div>))}</div>
                    </div>)}
                    <div className="upload-box"><span style={{display:'block', marginBottom:'5px', color: '#a7f3d0'}}>+ Click to Add New Photos</span><input type="file" multiple accept="image/*" style={{opacity:0, position:'absolute', top:0, left:0, width:'100%', height:'100%', cursor:'pointer'}} onChange={(e) => { if(e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files)]) }} /></div>
                    {images.length > 0 && (<div style={{marginTop:'15px'}}><p style={{fontSize:'12px', color:'#34d399', marginBottom:'5px'}}>New Photos:</p><div className="gallery-grid">{images.map((file, index) => (<div key={index} className="img-wrapper" style={{borderColor:'#facc15'}}><img src={URL.createObjectURL(file)} alt="Preview" /><div className="delete-overlay" onClick={() => setImages(images.filter((_, i) => i !== index))}><button type="button" className="delete-btn" style={{background:'#facc15', color:'black'}}>Remove ✖</button></div></div>))}</div></div>)}
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <button type="submit" className="action-btn edit" disabled={uploading}>{uploading ? 'Saving...' : 'Save Changes'}</button>
                    {existingService && (<button type="button" className="action-btn" style={{background:'#374151', color:'white'}} onClick={() => setIsEditing(false)}>Cancel</button>)}
                </div>
                </form>
            ) : (
                <div style={{width:'100%', textAlign:'left'}}>
                <h2 style={{color:'white', marginBottom:'20px'}}>Service Overview</h2>
                <div style={{background:'rgba(2, 44, 34, 0.6)', padding:'20px', borderRadius:'14px', marginBottom:'20px', border: '1px solid #059669'}}>
                    <p style={{color:'#ecfdf5', lineHeight:'1.6', marginBottom:'15px'}}>{description}</p>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'20px', fontSize:'14px', color:'#86efac'}}><span>📞 {mobile}</span><span>✉️ {contactEmail}</span><span>⏰ {displayTiming}</span></div>
                </div>
                <h3 style={{color:'#bbf7d0', fontSize:'16px', marginBottom:'10px'}}>Uploaded Photos</h3>
                {existingService.service_images && existingService.service_images.length > 0 ? (<div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>{(existingService.service_images || []).map(img => (<img key={img.id} src={img.image_url} alt="Service" style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'10px', border:'1px solid #10b981'}} />))}</div>) : (<p style={{color: '#9ca3af'}}>No images uploaded.</p>)}
                
                <div className="reviews-list-container">
                    <h3 style={{color:'#f59e0b', fontSize:'18px', marginBottom:'15px'}}>Customer Reviews ({ratedBookings.length})</h3>
                    {ratedBookings.length === 0 ? (
                        <p style={{color:'#9ca3af', fontStyle:'italic'}}>No reviews yet.</p>
                    ) : (
                        ratedBookings.map(rev => {
                            const details = rev.job_details || {};
                            return (
                                <div key={rev.id} className="review-item">
                                    <div className="review-header">
                                        <span style={{fontWeight:'bold', color:'white'}}>{details.name || "Customer"}</span>
                                        <span>{safeFormatDate(rev.created_at)}</span>
                                    </div>
                                    <div style={{color:'#f59e0b', marginBottom:'5px'}}>{'★'.repeat(rev.rating)}</div>
                                    <p style={{margin:0, color:'#ecfdf5', fontSize:'0.95rem'}}>"{rev.review_text || 'No comment provided.'}"</p>
                                </div>
                            )
                        })
                    )}
                </div>
                </div>
            )}
            </div>
        </div>
      ) : (
        <div className="inbox-container" style={{padding:'0 20px'}}>
             <div className="inbox-header-row">
                <h2 style={{color:'white', margin:0}}>Booking Requests</h2>
                <button className="refresh-btn" onClick={() => fetchBookings(user?.id)}>🔄 Refresh</button>
             </div>

             {safeBookings.length === 0 ? (<div style={{textAlign:'center', marginTop:'40px', color:'#9ca3af'}}>No bookings found.</div>) : (
                 safeBookings.map(booking => {
                    const details = booking.job_details || {};
                    return (
                        <div key={booking.id} className="booking-card">
                            <div className="booking-header">
                                <div>
                                    <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'white'}}>
                                        {details.name || "Customer"}
                                    </div>
                                    <div style={{color:'#a7f3d0', fontSize:'0.9rem'}}>
                                        {details.mobile || "No Mobile"}
                                    </div>
                                </div>
                                <span className={`status-badge status-${booking.status}`}>{booking.status.replace('_', ' ')}</span>
                            </div>

                            {/* DETAILS & MAP */}
                            <div className="job-details-box">
                                <div className="job-row">
                                    <span className="job-icon">⏰</span> 
                                    <span><strong>Time:</strong> {safeFormatDate(details.time)}</span>
                                </div>
                                <div className="job-row">
                                    <span className="job-icon">🏠</span> 
                                    <span>
                                        <strong>Address:</strong> {details.building || 'N/A'}, {details.room || ''}
                                        <br/>
                                        <span style={{fontSize:'0.85rem', opacity:0.8}}>Landmark: {details.landmark || 'None'}</span>
                                    </span>
                                </div>
                                
                                {details.map_link && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                                    <a href={details.map_link} target="_blank" rel="noreferrer" style={{textDecoration:'none', display:'block', marginTop:'5px'}}>
                                        <button className="action-btn map">📍 View Exact Location on Maps</button>
                                    </a>
                                )}
                            </div>
                            
                            {booking.status === 'completed' && booking.rating && (
                                <div className="review-box">
                                    <div className="star-display">{'★'.repeat(booking.rating)}</div>
                                    {booking.review_text && <p style={{fontSize:'14px', color:'#d1fae5', marginTop:'5px', fontStyle:'italic'}}>"{booking.review_text}"</p>}
                                </div>
                            )}

                            {/* ACTIONS */}
                            {booking.status === 'pending' && (
                                <div style={{textAlign:'right'}}>
                                    <p style={{marginBottom:'10px', color:'#ecfdf5'}}>Customer requested this service.</p>
                                    <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                                        {/* 🔴 DECLINE BUTTON ADDED HERE */}
                                        <button className="action-btn reject" onClick={() => openRejectModal(booking.id)}>Decline</button>
                                        <button className="action-btn edit" style={{width:'auto', margin:0}} onClick={() => handleAcceptBooking(booking.id)}>Accept</button>
                                    </div>
                                </div>
                            )}
                            {booking.status === 'accepted' && (
                                <div>
                                    <p style={{color:'#fde047', marginBottom:'5px'}}>Request Accepted.</p>
                                    <p style={{fontSize:'0.9rem', color:'#d1fae5'}}>Ask customer for PIN when you arrive.</p>
                                    <div className="pin-input-group">
                                        <input type="text" maxLength="4" className="pin-field" placeholder="PIN" onChange={(e) => setPinInput({...pinInput, [booking.id]: e.target.value})} />
                                        <button className="action-btn edit" style={{width:'auto', marginBottom:0}} onClick={() => handleVerifyPin(booking.id, booking.start_code)}>Verify & Start</button>
                                    </div>
                                </div>
                            )}
                            {booking.status === 'in_progress' && (
                                <div style={{background:'rgba(59, 130, 246, 0.2)', padding:'15px', borderRadius:'8px', marginTop:'10px', border:'1px solid #3b82f6'}}>
                                    <p style={{margin:0, fontWeight:'bold', color:'#93c5fd', fontSize:'18px'}}>⚠️ Work in Progress</p>
                                    <p style={{marginTop:'5px', color:'#bfdbfe'}}>Once the job is done, click the button below.</p>
                                    <button className="action-btn complete" onClick={() => handleCompleteJob(booking.id)}>
                                        ✅ Mark Job as Completed
                                    </button>
                                </div>
                            )}
                            {booking.status === 'completed' && (
                                <div style={{background:'rgba(16, 185, 129, 0.2)', padding:'10px', borderRadius:'8px', marginTop:'10px', textAlign:'center'}}>
                                    <p style={{margin:0, fontWeight:'bold', color:'#6ee7b7'}}>🎉 Job Completed Successfully</p>
                                </div>
                            )}
                            {booking.status === 'cancelled' && (
                                <div style={{background:'rgba(239, 68, 68, 0.2)', padding:'10px', borderRadius:'8px', marginTop:'10px', textAlign:'center'}}>
                                    <p style={{margin:0, fontWeight:'bold', color:'#fca5a5'}}>❌ Booking Cancelled by Customer</p>
                                </div>
                            )}
                            {/* 🔴 SHOW REJECTED STATUS */}
                            {booking.status === 'rejected' && (
                                <div style={{background:'rgba(55, 65, 81, 0.5)', padding:'10px', borderRadius:'8px', marginTop:'10px', textAlign:'center', border:'1px solid #4b5563'}}>
                                    <p style={{margin:0, fontWeight:'bold', color:'#d1d5db'}}>🚫 Request Declined</p>
                                    <p style={{margin:'5px 0 0 0', fontSize:'0.85rem', color:'#9ca3af'}}>Reason: {booking.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                    )
                 })
             )}
        </div>
      )}
    </div>
  )
}