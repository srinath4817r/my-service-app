import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function InstantProviderDashboard() {
  const navigate = useNavigate()
  
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('service') 

  const [existingService, setExistingService] = useState(null)
  const [isEditing, setIsEditing] = useState(false) 
  const [customName, setCustomName] = useState('')
  const [description, setDescription] = useState('')
  const [mobile, setMobile] = useState('')
  const [isLive, setIsLive] = useState(false) 
  
  const [waitingUsers, setWaitingUsers] = useState([])
  const [bookings, setBookings] = useState([])
  
  const [pinInput, setPinInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null) // Restored for loading state

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // NEW STATE FOR REJECTION MODAL
  const [showRejectModal, setShowRejectModal] = useState(null); // Stores bookingId
  const rejectionReasons = ["I am busy right now", "Have urgent work", "Too far from my location", "Other reason"];

  // --- LOGIC: CHECK FOR ACTIVE JOBS ---
  const isBusy = bookings.some(b => b.status === 'accepted' || b.status === 'in_progress');
  
  // Get the specific booking that is active to show in the HUB
  const activeBooking = bookings.find(b => b.status === 'accepted' || b.status === 'in_progress');

  // Filter for pending bookings to show in the HUB
  const pendingRequests = bookings.filter(b => b.status === 'pending');

  const styles = `
    html, body { 
      background-color: #064e3b !important; 
      margin: 0; padding: 0; height: 100%; width: 100%; overflow-x: hidden; 
    }
    #root { min-height: 100vh; display: flex; flex-direction: column; background-color: #064e3b; }
    .provider-body { font-family: 'Inter', sans-serif; color: #dcfce7; flex: 1; display: flex; flex-direction: column; }
    .top-bar { background-color: #059669; padding: 1.2rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #064e3b; position: sticky; top: 0; z-index: 1000; }
    .top-bar h1 { font-size: 1.3rem; margin: 0; font-weight: 900; color: #fff; }
    .nav-tabs { display: flex; gap: 10px; margin: 20px auto; background: #065f46; padding: 8px; border-radius: 50px; border: 1px solid #059669; }
    .tab-btn { background: transparent; border: none; color: #a7f3d0; padding: 10px 20px; cursor: pointer; border-radius: 40px; font-weight: 800; position: relative; }
    .tab-btn.active { background: #059669; color: #ffffff; }
    .msg-badge { position: absolute; top: -2px; right: 2px; background: #ef4444; color: white; font-size: 10px; padding: 2px 7px; border-radius: 20px; border: 2px solid #065f46; }
    .main-panel { max-width: 550px; margin: 0 auto; padding: 10px 20px 80px; width: 100%; box-sizing: border-box; }
    .status-card { background: #065f46; border-radius: 20px; padding: 25px; border: 1px solid #059669; display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }
    .live-dot { width: 18px; height: 18px; border-radius: 50%; background: #10b981; animation: blink 1.5s infinite; }
    .offline-dot { width: 18px; height: 18px; border-radius: 50%; background: #ef4444; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .customer-card { background: #065f46; border-radius: 24px; overflow: hidden; margin-bottom: 25px; border: 2px solid #059669; position: relative; }
    .card-img { width: 100%; height: 220px; object-fit: cover; }
    .edit-panel { background: #065f46; border-radius: 24px; padding: 25px; border: 1px solid #059669; margin-top: 20px; }
    .dash-input, .dash-textarea { width: 100%; padding: 16px; border-radius: 12px; border: 1px solid #059669; background: #064e3b; color: #ffffff; margin-bottom: 15px; outline: none; font-weight: 600; box-sizing: border-box; }
    .message-card { border-radius: 16px; padding: 20px; margin-bottom: 12px; transition: 0.3s; }
    .bg-pending { background: #fef3c7; border-left: 10px solid #fbbf24; color: #92400e; }
    .bg-accepted { background: #dcfce7; border-left: 10px solid #10b981; color: #065f46; }
    .bg-rejected { background: #fee2e2; border-left: 10px solid #ef4444; color: #991b1b; }
    .details-box { background: rgba(255,255,255,0.4); padding: 15px; border-radius: 12px; margin: 10px 0; border: 1px solid rgba(0,0,0,0.05); }
    .details-box p { margin: 6px 0; font-size: 0.95rem; font-weight: 700; color: inherit; }
    .save-btn { background: #10b981; color: white; width: 100%; border: none; padding: 18px; border-radius: 40px; font-weight: 900; cursor: pointer; font-size: 1rem; }
    .save-btn:disabled { background: #9ca3af; cursor: not-allowed; opacity: 0.7; }
    .delete-service-btn { background: transparent; color: #f87171; border: 2px solid #f87171; margin-top: 25px; padding: 12px; border-radius: 40px; font-weight: 800; width: 100%; cursor: pointer; }
    .pin-input { background: #fff; border: 2px solid #059669; color: #064e3b; padding: 12px; border-radius: 10px; width: 100%; text-align: center; font-size: 1.3rem; font-weight: 800; margin-bottom: 12px; outline: none; box-sizing: border-box; }
    .toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #dcfce7; color: #064e3b; padding: 16px 32px; border-radius: 50px; z-index: 10001; font-weight: 900; }
    .date-group-header { margin: 30px 0 15px; padding-left: 10px; border-left: 5px solid #10b981; font-weight: 900; color: #86efac; text-transform: uppercase; font-size: 0.9rem; }
    .busy-warning { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 12px; font-weight: 800; font-size: 0.85rem; border: 1px solid #ef4444; margin-bottom: 10px; text-align: center; }
    .btn-explore { background: transparent; border: 1px solid #fff; color: #fff; padding: 6px 15px; border-radius: 20px; font-size: 0.75rem; cursor: pointer; font-weight: 800; margin-right: 10px; }
    
    .notify-waiting-btn { background: #3b82f6; color: white; padding: 12px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; margin-top: 10px; width: 100%; }
    .notify-waiting-btn:disabled { background: #64748b; cursor: not-allowed; opacity: 0.6; }

    /* MODAL STYLES */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
    .modal-content { background: #064e3b; width: 100%; max-width: 400px; border-radius: 25px; padding: 25px; border: 2px solid #059669; }
    .reason-btn { background: #065f46; color: white; width: 100%; border: 1px solid #059669; padding: 15px; border-radius: 15px; margin-bottom: 10px; cursor: pointer; font-weight: 700; text-align: left; }
    .reason-btn:hover { background: #059669; }

    /* NEW STYLES FOR ACTIVE/PENDING JOB SECTION */
    .active-job-header { margin: 20px 0 10px; font-weight: 900; color: #10b981; font-size: 1.1rem; border-bottom: 2px solid #059669; padding-bottom: 5px; }
    .pending-job-header { margin: 20px 0 10px; font-weight: 900; color: #fbbf24; font-size: 1.1rem; border-bottom: 2px solid #fbbf24; padding-bottom: 5px; }
  `;

  useEffect(() => {
    document.body.classList.add('provider-body');
    checkUser();
    // Request permission for system notifications
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    return () => document.body.classList.remove('provider-body');
  }, []);

  const sendNotification = (message, systemTitle = "Instant Hub Alert") => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);

    // Mobile/System Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(systemTitle, { body: message, icon: "/favicon.ico" });
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/') } else { 
        setUser(user); 
        fetchService(user.id); 
        fetchWaitingUsers(user.id);
        fetchBookings(user.id); 
    }
  }

  const handleAccept = async (bookingId) => {
    if (isBusy) {
      sendNotification("⚠️ You are already working on a job!");
      return;
    }

    const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
    if (!error) {
      sendNotification("✅ Booking Accepted!");
      setActiveTab('service'); 
      fetchBookings(user.id);
    }
  };

  const handleReject = (bookingId) => {
    setShowRejectModal(bookingId);
  };

  const confirmRejection = async (reason) => {
    const bookingId = showRejectModal;
    const { error } = await supabase.from('bookings').update({ 
      status: 'rejected',
      rejection_reason: reason 
    }).eq('id', bookingId);

    if (!error) {
      sendNotification("❌ Booking Rejected");
      setShowRejectModal(null);
      fetchBookings(user.id);
    }
  };

  const handleVerifyPin = async (booking) => {
    if (pinInput === booking.start_code) {
      const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);
      if (!error) {
        sendNotification("🔨 Work Started!");
        setPinInput('');
        fetchBookings(user.id);
      }
    } else {
      sendNotification("❌ Invalid PIN!");
    }
  };

  const handleComplete = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    if (!error) {
      sendNotification("🎉 Job Completed! You are now free.");
      fetchBookings(user.id);
      fetchWaitingUsers(user.id); // Enable notify buttons in messages
    }
  };

  // Restored and Fixed Manual notification logic
  const handleNotifyCustomer = async (notificationId, customerName) => {
    setNotifyingId(notificationId); 
    const { error } = await supabase
        .from('notifications')
        .update({ status: 'sent' })
        .eq('id', notificationId);
    
    if (!error) {
        sendNotification(`🚀 ${customerName} notified successfully!`);
        fetchWaitingUsers(user.id);
    } else {
        console.error("Supabase Error:", error.message);
        setToast({ show: true, message: "❌ Failed: " + error.message, type: 'error' });
        setTimeout(() => setToast({ show: false, message: '' }), 3500);
    }
    setNotifyingId(null);
  };

  const handleNavigate = (lat, lng) => {
    if (!lat || !lng) {
      sendNotification("📍 Customer location not available");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const fetchWaitingUsers = async (userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('provider_id', userId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
    
    if (!error) setWaitingUsers(data || []);
  }

  const fetchBookings = async (userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false });

    if (!error) setBookings(data || []);
  };

  // Real-time listener
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === 'INSERT') {
            sendNotification(`🚀 New Service Booking from ${payload.new.job_details?.name || 'Customer'}!`);
          }
          fetchBookings(user.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `provider_id=eq.${user.id}` }, (payload) => {
          sendNotification(`📩 ${payload.new.user_name} is waiting for you!`, "Waiting List Update");
          fetchWaitingUsers(user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [user]);

  const fetchService = async (userId) => {
    const { data } = await supabase.from('services').select('*, service_images(*)').eq('provider_id', userId).maybeSingle()
    if (data) { 
        setExistingService(data);
        setCustomName(data.custom_service_name || ''); 
        setDescription(data.description || '');
        setMobile(data.mobile || '');
        setIsLive(data.is_live); 
        if (data.service_images?.[0]) setImagePreview(data.service_images[0].image_url);
        setIsEditing(false);
    } else { setIsEditing(true); }
    setLoading(false);
  }

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setUploading(true);
    const serviceData = { provider_id: user.id, service_type: 'Instant', custom_service_name: customName, description, mobile, contact_email: user.email };
    const { data, error } = existingService 
        ? await supabase.from('services').update(serviceData).eq('id', existingService.id).select()
        : await supabase.from('services').insert([serviceData]).select();

    if (!error) {
        const serviceId = data[0].id;
        if (imageFile) {
          const fileName = `${Date.now()}_${imageFile.name}`;
          const { error: uploadError } = await supabase.storage.from('service-gallery').upload(fileName, imageFile);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('service-gallery').getPublicUrl(fileName);
            await supabase.from('service_images').delete().eq('service_id', serviceId);
            await supabase.from('service_images').insert([{ service_id: serviceId, image_url: publicUrl }]);
          }
        }
        sendNotification("Hub Data Synced!");
        setIsEditing(false);
        fetchService(user.id);
    }
    setUploading(false);
  }

  const handleDeleteService = async () => {
    if (!window.confirm("Delete Hub Permanently?")) return;
    setUploading(true);
    if (existingService?.id) {
      await supabase.from('service_images').delete().eq('service_id', existingService.id);
      const { error } = await supabase.from('services').delete().eq('id', existingService.id);
      if (!error) {
        sendNotification("Hub Deleted");
        setExistingService(null);
        setIsEditing(true); 
      }
    }
    setUploading(false);
  };

  const toggleLiveStatus = async () => {
    const newStatus = !isLive;
    const { error } = await supabase.from('services').update({ is_live: newStatus }).eq('id', existingService.id);
    if (!error) {
        setIsLive(newStatus);
        if(newStatus) {
            sendNotification("📡 You are now online! Free and waiting customers notified.");
            await supabase.from('notifications').update({ status: 'sent' }).eq('provider_id', user.id).eq('status', 'waiting');
            setWaitingUsers([]); 
        } else {
            sendNotification("🌙 You are now offline.");
        }
    }
  };

  const groupBookingsByDate = (list) => {
    const today = new Date().toDateString();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups = { Today: [], Yesterday: [], Earlier: [] };
    list.forEach(b => {
      const bDate = new Date(b.created_at).toDateString();
      if (bDate === today) groups.Today.push(b);
      else if (bDate === yesterdayStr) groups.Yesterday.push(b);
      else groups.Earlier.push(b);
    });
    return groups;
  }

  if (loading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#064e3b', color:'#fff'}}>Opening Hub...</div>

  const grouped = groupBookingsByDate(bookings);

  return (
    <div className="provider-body">
      <style>{styles}</style>
      
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginTop:0, fontSize:'1.2rem'}}>Select Rejection Reason</h2>
            <p style={{opacity:0.7, fontSize:'0.9rem', marginBottom:'20px'}}>Why are you rejecting this booking?</p>
            {rejectionReasons.map((reason) => (
              <button key={reason} className="reason-btn" onClick={() => confirmRejection(reason)}>
                {reason}
              </button>
            ))}
            <button 
              onClick={() => setShowRejectModal(null)} 
              style={{background:'transparent', border:'none', color:'#f87171', width:'100%', marginTop:'10px', fontWeight:800, cursor:'pointer'}}
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {toast.show && <div className="toast-notification">✅ {toast.message}</div>}
      
      <div className="top-bar">
        <h1>Instant Hub ⚡</h1>
        <div>
            <button className="btn-explore" onClick={() => navigate('/customer-home')}>🔍 Explore</button>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{background:'rgba(237, 16, 16, 0.1)', border:'1px solid #ef4444', color:'#ef4444', padding:'6px 15px', borderRadius:'20px', fontSize:'0.75rem', cursor:'pointer'}}>Logout</button>
        </div>
      </div>

      <div className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>HUB</button>
        <button className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            MESSAGES {waitingUsers.length > 0 && <span className="msg-badge">{waitingUsers.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>BOOKINGS</button>
      </div>

      <div className="main-panel">
        {activeTab === 'service' && (
          <>
            <div className="status-card">
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div className={isLive ? "live-dot" : "offline-dot"}></div>
                <div style={{fontWeight:900, color: isLive ? '#10b981' : '#ef4444', fontSize: '1.1rem'}}>{isLive ? 'SERVICE ONLINE' : 'SERVICE OFFLINE'}</div>
              </div>
              <button onClick={toggleLiveStatus} style={{background: isLive ? '#374151' : '#10b981', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'30px', fontWeight:800, cursor:'pointer'}}>
                {isLive ? 'Go Offline' : 'Go Live Now'}
              </button>
            </div>

            {/* PERSISTENT ACTIVE JOB */}
            {activeBooking && (
                <div className="active-job-container">
                    <div className="active-job-header">🚀 ACTIVE JOB</div>
                    <div className={`message-card bg-accepted`}>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                            📦 {activeBooking.status.toUpperCase()}
                        </div>
                        <div className="details-box">
                            <p>👤 Customer: {activeBooking.job_details?.name || 'User'}</p>
                            <p>📞 Mobile: {activeBooking.job_details?.mobile || 'N/A'}</p>
                            <p>🏢 Building: {activeBooking.job_details?.building || 'N/A'}</p>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={() => handleNavigate(activeBooking.customer_lat, activeBooking.customer_lng)}
                                style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >NAVIGATE TO CUSTOMER 📍</button>
                            {activeBooking.status.toLowerCase() === 'accepted' && (
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '15px' }}>
                                    <input 
                                        type="text" 
                                        className="pin-input" 
                                        placeholder="Enter Customer PIN" 
                                        value={pinInput} 
                                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g,''))} 
                                    />
                                    <button onClick={() => handleVerifyPin(activeBooking)} className="save-btn">
                                        VERIFY PIN & START 🔨
                                    </button>
                                </div>
                            )}
                            {activeBooking.status.toLowerCase() === 'in_progress' && (
                                <button onClick={() => handleComplete(activeBooking.id)} className="save-btn">MARK JOB AS FINISHED ✅</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PENDING REQUESTS SECTION */}
            {pendingRequests.length > 0 && (
              <div className="pending-job-container">
                <div className="pending-job-header">🔔 NEW PENDING REQUESTS ({pendingRequests.length})</div>
                {pendingRequests.map(req => (
                  <div key={req.id} className="message-card bg-pending">
                    <div style={{fontWeight:800}}>👤 Customer: {req.job_details?.name || 'User'}</div>
                    <div className="details-box">
                      <p>📞 {req.job_details?.mobile || 'N/A'}</p>
                      <p>🏢 {req.job_details?.building || 'N/A'}</p>
                    </div>
                    <button 
                      onClick={() => handleNavigate(req.customer_lat, req.customer_lng)}
                      style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, marginBottom: '10px', cursor: 'pointer' }}
                    >NAVIGATE TO CUSTOMER 📍</button>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={() => handleAccept(req.id)} className="save-btn" style={{flex: 1}} disabled={isBusy}>ACCEPT ✅</button>
                      <button onClick={() => handleReject(req.id)} className="save-btn" style={{flex: 1, background: '#ef4444'}}>REJECT ✖</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* HUB CARD */}
            <div className="customer-card">
              {imagePreview ? <img src={imagePreview} className="card-img" alt="Service" /> : <div style={{height:'180px', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center'}}>📸 Photo Not Set</div>}
              <div style={{padding:'20px'}}>
                <h3 style={{margin:0, color: '#fff'}}>{customName || "Service Title"}</h3>
                <p style={{color: '#a7f3d0', marginTop: '10px'}}>{description || "No description set yet..."}</p>
              </div>
              {!isEditing && <button onClick={() => setIsEditing(true)} style={{position:'absolute', top:'15px', right:'15px', background:'#10b981', border:'none', color:'#fff', padding:'8px 15px', borderRadius:'20px', fontWeight:800, cursor:'pointer'}}>Edit ✏️</button>}
            </div>

            {isEditing && (
              <div className="edit-panel">
                <form onSubmit={handleSave}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:700, fontSize:'0.85rem'}}>Update Hub Photo</label>
                  <input type="file" onChange={handleImageChange} style={{marginBottom:'20px', fontSize:'0.8rem'}} />
                  <input className="dash-input" placeholder="Service Hub Name" value={customName} onChange={e => setCustomName(e.target.value)} required />
                  <input className="dash-input" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} required />
                  <textarea className="dash-textarea" placeholder="Full Bio/Description" rows="4" value={description} onChange={e => setDescription(e.target.value)} required />
                  <button type="submit" className="save-btn">{uploading ? 'Processing...' : 'SYNC HUB DATA'}</button>
                  {existingService && (
                    <button type="button" onClick={handleDeleteService} className="delete-service-btn">🗑️ DELETE HUB PERMANENTLY</button>
                  )}
                </form>
              </div>
            )}
          </>
        )}

        {activeTab === 'messages' && (
          <div>
            {waitingUsers.length === 0 ? <p style={{textAlign:'center', opacity:0.5, marginTop: '50px'}}>Inbox is empty. No one is waiting.</p> : 
              waitingUsers.map((item) => (
                <div key={item.id} className="message-card bg-accepted">
                  <div style={{fontWeight:800, fontSize:'1.1rem'}}>👤 {item.user_name || 'Anonymous User'}</div>
                  <div style={{opacity: 0.8, marginTop: '5px'}}>Wants to know when you're available.</div>
                  <div style={{fontSize: '0.75rem', marginTop: '10px', color: '#064e3b'}}>Sent: {new Date(item.created_at).toLocaleTimeString()}</div>
                  
                  {/* Notify Button: Fixed Logic */}
                  <button 
                    className="notify-waiting-btn" 
                    onClick={() => handleNotifyCustomer(item.id, item.user_name)}
                    disabled={isBusy || notifyingId === item.id}
                  >
                    {isBusy ? "Finish current job to notify them" : (notifyingId === item.id ? "Notifying..." : "Notify Him: I am free now 🔔")}
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="page-enter">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: 900, color: '#dcfce7' }}>Job History</h2>
            {bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px', background: '#065f46', borderRadius: '30px', border: '3px dashed #059669' }}>
                <p style={{ color: '#a7f3d0', fontSize: '1.1rem', fontWeight: 800 }}>No bookings received yet.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([label, list]) => (
                list.length > 0 && (
                  <div key={label}>
                    <div className="date-group-header">{label}</div>
                    {list.map((booking) => {
                      const lowerStatus = booking.status.toLowerCase();
                      const isFinished = ['completed', 'cancelled', 'rejected'].includes(lowerStatus);
                      const details = booking.job_details || {};
                      let bgClass = lowerStatus === 'pending' ? 'bg-pending' : (lowerStatus === 'cancelled' || lowerStatus === 'rejected' ? 'bg-rejected' : 'bg-accepted');

                      return (
                        <div key={booking.id} className={`message-card ${bgClass}`}>
                          <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>📦 {booking.status.toUpperCase()}</div>
                          <div className="details-box">
                             <p>👤 Customer: {details.name || 'User'}</p>
                             {!isFinished && (
                               <>
                                 <p>📞 Mobile: {details.mobile || 'N/A'}</p>
                                 <p>🏢 Building: {details.building || 'N/A'}</p>
                               </>
                             )}
                             <p>🗓️ {new Date(booking.created_at).toLocaleString()}</p>
                          </div>
                          {!isFinished && lowerStatus === 'pending' && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => handleAccept(booking.id)} className="save-btn" style={{flex: 1}} disabled={isBusy}>ACCEPT ✅</button>
                                <button onClick={() => handleReject(booking.id)} className="save-btn" style={{flex: 1, background: '#ef4444'}}>REJECT ✖</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}