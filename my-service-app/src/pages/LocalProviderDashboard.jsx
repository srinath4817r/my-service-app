import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- 0. PRE-DEFINED TELANGANA/HYDERABAD AREAS ---
const HYD_AREAS = [
  "Ameerpet", "Attapur", "Amberpet", "Abids", "Alwal", "Adibatla",
  "Banjara Hills", "Begumpet", "Bowenpally", "Bachupally", "Balanagar", "Bandlaguda",
  "Chandanagar", "Chanda Nagar", "Charminar", "Cyber Towers",
  "Dilsukhnagar", "Domalguda",
  "Ecil", "Erragadda",
  "Financial District", "Film Nagar",
  "Gachibowli", "Gandipet", "Ghatkesar", "Gudimalkapur",
  "Hitech City", "Hafeezpet", "Himayatnagar", "Habsiguda", "Hayathnagar",
  "Jubilee Hills", "Jeedimetla",
  "Kondapur", "Kukatpally", "Kothaguda", "Koti", "Khairatabad", "Kompally", "Kachiguda",
  "Lingampally", "L.B. Nagar", "Lakdikapul",
  "Madhapur", "Miyapur", "Manikonda", "Mehdipatnam", "Malkajgiri", "Moosapet", "Malakpet",
  "Nanakramguda", "Nizampet", "Nagole", "Nampally", "Narayanguda",
  "Old City", "Osman Nagar",
  "Pragathi Nagar", "Patancheru", "Punjagutta",
  "Raidurg", "Ramanthapur", "Ramnagar",
  "Secunderabad", "Sanath Nagar", "Shaikpet", "Shamshabad", "Suchitra", "Sainikpuri", "Somajiguda",
  "Tolichowki", "Tarnaka", "Trimulgherry",
  "Uppal",
  "Vanasthalipuram",
  "Warangal", "West Marredpally",
  "Yousufguda"
];

export default function LocalProviderDashboard() {
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
  
  // --- PREFERRED AREAS STATE ---
  const [preferredAreas, setPreferredAreas] = useState([])
  const [areaInput, setAreaInput] = useState('')
  const [filteredSuggestions, setFilteredSuggestions] = useState([]) // For dropdown

  const [waitingUsers, setWaitingUsers] = useState([]) 
  const [bookings, setBookings] = useState([])
  
  const [pinInput, setPinInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null)

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // --- REJECTION MODAL ---
  const [showRejectModal, setShowRejectModal] = useState(null); 
  const rejectionReasons = ["Fully Booked", "Location Too Far", "Service Not Available", "Other"];

  // --- DELETE HUB MODAL STATE ---
  const [showDeleteHubModal, setShowDeleteHubModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(10);

  // --- LOGIC: CHECK FOR ACTIVE JOBS ---
  const isBusy = bookings.some(b => b.status === 'accepted' || b.status === 'in_progress');
  const activeBooking = bookings.find(b => b.status === 'accepted' || b.status === 'in_progress');
  const pendingRequests = bookings.filter(b => b.status === 'pending');

  // --- STYLES ---
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
    .delete-service-btn { background: transparent; color: #f87171; border: 2px solid #f87171; margin-top: 25px; padding: 12px; border-radius: 40px; font-weight: 800; width: 100%; cursor: pointer; transition: all 0.2s; }
    .delete-service-btn:hover { background: rgba(248, 113, 113, 0.1); }
    .pin-input { background: #fff; border: 2px solid #059669; color: #064e3b; padding: 12px; border-radius: 10px; width: 100%; text-align: center; font-size: 1.3rem; font-weight: 800; margin-bottom: 12px; outline: none; box-sizing: border-box; }
    .toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #dcfce7; color: #064e3b; padding: 16px 32px; border-radius: 50px; z-index: 10001; font-weight: 900; }
    .date-group-header { margin: 30px 0 15px; padding-left: 10px; border-left: 5px solid #10b981; font-weight: 900; color: #86efac; text-transform: uppercase; font-size: 0.9rem; }
    .btn-explore { background: transparent; border: 1px solid #fff; color: #fff; padding: 6px 15px; border-radius: 20px; font-size: 0.75rem; cursor: pointer; font-weight: 800; margin-right: 10px; }
    .notify-waiting-btn { background: #3b82f6; color: white; padding: 12px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; margin-top: 10px; width: 100%; }
    .notify-waiting-btn:disabled { background: #64748b; cursor: not-allowed; opacity: 0.6; }
    
    /* MODAL STYLES */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
    .modal-content { background: #064e3b; width: 100%; max-width: 400px; border-radius: 25px; padding: 25px; border: 2px solid #059669; text-align: center; }
    .reason-btn { background: #065f46; color: white; width: 100%; border: 1px solid #059669; padding: 15px; border-radius: 15px; margin-bottom: 10px; cursor: pointer; font-weight: 700; text-align: left; }
    .reason-btn:hover { background: #059669; }
    
    /* ACTIVE/PENDING */
    .active-job-header { margin: 20px 0 10px; font-weight: 900; color: #10b981; font-size: 1.1rem; border-bottom: 2px solid #059669; padding-bottom: 5px; }
    .pending-job-header { margin: 20px 0 10px; font-weight: 900; color: #fbbf24; font-size: 1.1rem; border-bottom: 2px solid #fbbf24; padding-bottom: 5px; }

    /* AREA TAGS STYLES */
    .area-input-group { display: flex; gap: 10px; margin-bottom: 5px; position: relative; }
    .add-area-btn { background: #34d399; border: none; padding: 0 20px; border-radius: 12px; color: #064e3b; font-weight: 800; cursor: pointer; white-space: nowrap; }
    .area-tags-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; justify-content: center; }
    .area-tag { background: #059669; color: white; padding: 6px 12px; border-radius: 15px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #34d399; font-weight: 600; }
    .remove-tag { cursor: pointer; font-weight: bold; color: #a7f3d0; font-size: 1.1rem; line-height: 0.8; }
    .remove-tag:hover { color: #fff; }
    
    /* SUGGESTIONS LIST */
    .suggestions-list { position: absolute; top: 100%; left: 0; width: 100%; max-height: 150px; overflow-y: auto; background: #065f46; border: 1px solid #059669; border-radius: 10px; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .suggestion-item { padding: 10px; cursor: pointer; color: #dcfce7; border-bottom: 1px solid #064e3b; font-size: 0.9rem; font-weight: 600; }
    .suggestion-item:hover { background: #059669; color: white; }

    /* DELETE MODAL SPECIFIC */
    .delete-timer { font-size: 3rem; font-weight: 900; color: #f87171; margin: 15px 0; }
    .delete-confirm-btn { background: #ef4444; color: white; width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: 800; cursor: pointer; font-size: 1.1rem; }
    .delete-confirm-btn:disabled { background: #7f1d1d; cursor: not-allowed; opacity: 0.5; }
  `;

  useEffect(() => {
    document.body.classList.add('provider-body');
    checkUser();
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    return () => document.body.classList.remove('provider-body');
  }, []);

  const sendNotification = (message, systemTitle = "Local Hub Alert") => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
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

  // --- ACTIONS ---

  const handleAccept = async (bookingId) => {
    if (isBusy) {
      sendNotification("⚠️ Finish your current active job first!");
      return;
    }
    const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
    if (!error) {
      sendNotification("✅ Job Accepted! Head to location.");
      setActiveTab('service'); 
      fetchBookings(user.id);
    }
  };

  const handleReject = (bookingId) => {
    setShowRejectModal(bookingId);
  };

  const confirmRejection = async (reason) => {
    const bookingId = showRejectModal;
    const { error } = await supabase.from('bookings').update({ status: 'rejected', rejection_reason: reason }).eq('id', bookingId);
    if (!error) {
      sendNotification("❌ Job Rejected");
      setShowRejectModal(null);
      fetchBookings(user.id);
    }
  };

  const handleVerifyPin = async (booking) => {
    if (pinInput === booking.start_code) {
      const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);
      if (!error) {
        sendNotification("🔨 Local Service Started!");
        setPinInput('');
        fetchBookings(user.id);
      }
    } else {
      sendNotification("❌ Wrong PIN!");
    }
  };

  const handleComplete = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    if (!error) {
      sendNotification("🎉 Job Done! Payment will reflect shortly.");
      fetchBookings(user.id);
    }
  };

  const handleNotifyCustomer = async (notificationId, customerName) => {
    setNotifyingId(notificationId); 
    const { error } = await supabase.from('notifications').update({ status: 'sent' }).eq('id', notificationId);
    if (!error) {
        sendNotification(`🚀 ${customerName} notified!`);
        fetchWaitingUsers(user.id);
    } 
    setNotifyingId(null);
  };

  const handleNavigate = (lat, lng) => {
    if (!lat || !lng) { sendNotification("📍 Location missing"); return; }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  };

  // --- AREA TAGS HELPERS (UPDATED WITH AUTOCOMPLETE) ---
  
  // Filter suggestions when user types
  const handleAreaInputChange = (e) => {
    const val = e.target.value;
    setAreaInput(val);
    
    if (val.trim().length > 0) {
        const matches = HYD_AREAS.filter(area => 
            area.toLowerCase().includes(val.toLowerCase()) && 
            !preferredAreas.includes(area) // Don't show already added
        );
        setFilteredSuggestions(matches.slice(0, 5)); // Limit to 5 suggestions
    } else {
        setFilteredSuggestions([]);
    }
  };

  const addArea = (val) => {
    const cleanVal = val.trim();
    if (cleanVal) {
        if (!preferredAreas.some(area => area.toLowerCase() === cleanVal.toLowerCase())) {
            setPreferredAreas([...preferredAreas, cleanVal]);
            setAreaInput('');
            setFilteredSuggestions([]);
        } else {
            sendNotification("⚠️ Area already added!");
        }
    }
  };

  const handleAreaKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        addArea(areaInput);
    }
  };

  const handleRemoveArea = (areaToRemove) => {
    setPreferredAreas(preferredAreas.filter(a => a !== areaToRemove));
  };

  // --- DELETE HUB LOGIC (COUNTDOWN + VOICE) ---
  const initDeleteHub = () => {
    setShowDeleteHubModal(true);
    setDeleteCountdown(10);
    
    // VOICE WARNING
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance("Are you sure you want to delete your service permanently?");
        window.speechSynthesis.speak(msg);
    }
  };

  // Countdown Effect
  useEffect(() => {
    let timer;
    if (showDeleteHubModal && deleteCountdown > 0) {
        timer = setTimeout(() => setDeleteCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showDeleteHubModal, deleteCountdown]);

  const confirmDeleteHub = async () => {
    if(!existingService) return;
    setUploading(true); 
    
    const { error } = await supabase.from('services').delete().eq('id', existingService.id);
    
    if (!error) {
        sendNotification("🗑️ Service Deleted Permanently.");
        setExistingService(null);
        setCustomName('');
        setDescription('');
        setMobile('');
        setPreferredAreas([]);
        setIsLive(false);
        setIsEditing(true); 
        setShowDeleteHubModal(false);
    } else {
        sendNotification("Error deleting service: " + error.message);
    }
    setUploading(false);
  };

  // --- DATA FETCHING ---

  const fetchWaitingUsers = async (userId) => {
    const { data, error } = await supabase.from('notifications')
      .select('*').eq('provider_id', userId).eq('status', 'waiting').order('created_at', { ascending: false });
    if (!error) setWaitingUsers(data || []);
  }

  const fetchBookings = async (userId) => {
    const { data, error } = await supabase.from('bookings')
      .select('*').eq('provider_id', userId).order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
  };

  // --- REALTIME LISTENER ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('local-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === 'INSERT') {
            sendNotification(`🔔 New Local Booking: ${payload.new.job_details?.name || 'Customer'}!`);
          }
          fetchBookings(user.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `provider_id=eq.${user.id}` }, (payload) => {
          sendNotification(`📩 New Enquiry from ${payload.new.user_name}`, "Enquiry Update");
          fetchWaitingUsers(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [user]);

  const fetchService = async (userId) => {
    const { data } = await supabase.from('services')
        .select('*, service_images(*)')
        .eq('provider_id', userId)
        .eq('service_type', 'Local') 
        .maybeSingle()
        
    if (data) { 
        setExistingService(data);
        setCustomName(data.custom_service_name || ''); 
        setDescription(data.description || '');
        setMobile(data.mobile || '');
        setPreferredAreas(data.preferred_areas || []); 
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
    
    if (preferredAreas.length < 5) {
        sendNotification("⚠️ Please add at least 5 preferred work areas.", "Requirements");
        return;
    }

    setUploading(true);
    const serviceData = { 
        provider_id: user.id, 
        service_type: 'Local', 
        custom_service_name: customName, 
        description, 
        mobile, 
        contact_email: user.email,
        preferred_areas: preferredAreas
    };
    
    const { data, error } = existingService 
        ? await supabase.from('services').update(serviceData).eq('id', existingService.id).select()
        : await supabase.from('services').insert([serviceData]).select();

    if (!error) {
        const serviceId = data[0].id;
        if (imageFile) {
          const fileName = `local_${Date.now()}_${imageFile.name}`;
          const { error: uploadError } = await supabase.storage.from('service-gallery').upload(fileName, imageFile);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('service-gallery').getPublicUrl(fileName);
            await supabase.from('service_images').delete().eq('service_id', serviceId);
            await supabase.from('service_images').insert([{ service_id: serviceId, image_url: publicUrl }]);
          }
        }
        sendNotification("Local Hub Synced!");
        setIsEditing(false);
        fetchService(user.id);
    } else {
        console.error(error);
        sendNotification("Error saving service: " + error.message);
    }
    setUploading(false);
  }

  const toggleLiveStatus = async () => {
    const newStatus = !isLive;
    const { error } = await supabase.from('services').update({ is_live: newStatus }).eq('id', existingService.id);
    if (!error) {
        setIsLive(newStatus);
        sendNotification(newStatus ? "📡 You are Open for Business!" : "🌙 Local Service Closed.");
    }
  };

  // --- MOBILE BACK HANDLER ---
  useEffect(() => {
    const handlePopState = (event) => {
        if (showDeleteHubModal) setShowDeleteHubModal(false);
        else if (showRejectModal) setShowRejectModal(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showDeleteHubModal, showRejectModal]);

  const groupBookingsByDate = (list) => {
    const today = new Date().toDateString();
    const groups = { Today: [], Earlier: [] };
    list.forEach(b => {
      const bDate = new Date(b.created_at).toDateString();
      if (bDate === today) groups.Today.push(b);
      else groups.Earlier.push(b);
    });
    return groups;
  }

  if (loading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#064e3b', color:'#fff'}}>Loading Local Hub...</div>

  const grouped = groupBookingsByDate(bookings);

  return (
    <div className="provider-body">
      <style>{styles}</style>
      
      {/* DELETE HUB MODAL */}
      {showDeleteHubModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginTop:0, color:'#f87171'}}>⚠️ DANGER ZONE</h2>
            <p style={{color:'#d1d5db'}}>Are you sure you want to delete this service permanently? This cannot be undone.</p>
            
            <div className="delete-timer">{deleteCountdown}</div>
            
            <button 
                className="delete-confirm-btn" 
                disabled={deleteCountdown > 0} 
                onClick={confirmDeleteHub}
            >
                {deleteCountdown > 0 ? `Wait ${deleteCountdown}s` : "YES, DELETE PERMANENTLY"}
            </button>
            
            <button onClick={() => setShowDeleteHubModal(false)} style={{background:'transparent', border:'none', color:'#d1d5db', width:'100%', marginTop:'15px', fontWeight:800, cursor:'pointer'}}>CANCEL</button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginTop:0, fontSize:'1.2rem'}}>Reject Job?</h2>
            {rejectionReasons.map((reason) => (
              <button key={reason} className="reason-btn" onClick={() => confirmRejection(reason)}>
                {reason}
              </button>
            ))}
            <button onClick={() => setShowRejectModal(null)} style={{background:'transparent', border:'none', color:'#f87171', width:'100%', marginTop:'10px', fontWeight:800, cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {toast.show && <div className="toast-notification">✅ {toast.message}</div>}
      
      <div className="top-bar">
        <h1>Local Hub 🏠</h1>
        <div>
            <button className="btn-explore" onClick={() => navigate('/customer-home')}>🔍 Explore</button>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{background:'rgba(237, 16, 16, 0.1)', border:'1px solid #ef4444', color:'#ef4444', padding:'6px 15px', borderRadius:'20px', fontSize:'0.75rem', cursor:'pointer'}}>Logout</button>
        </div>
      </div>

      <div className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>MY SHOP</button>
        <button className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            ENQUIRIES {waitingUsers.length > 0 && <span className="msg-badge">{waitingUsers.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>JOBS</button>
      </div>

      <div className="main-panel">
        {activeTab === 'service' && (
          <>
            <div className="status-card">
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div className={isLive ? "live-dot" : "offline-dot"}></div>
                <div style={{fontWeight:900, color: isLive ? '#10b981' : '#ef4444', fontSize: '1.1rem'}}>{isLive ? 'SHOP OPEN' : 'SHOP CLOSED'}</div>
              </div>
              <button onClick={toggleLiveStatus} style={{background: isLive ? '#374151' : '#10b981', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'30px', fontWeight:800, cursor:'pointer'}}>
                {isLive ? 'Close Shop' : 'Open Shop'}
              </button>
            </div>

            {/* ACTIVE JOB CARD */}
            {activeBooking && (
                <div className="active-job-container">
                    <div className="active-job-header">🔨 CURRENT JOB</div>
                    <div className={`message-card bg-accepted`}>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                            📦 {activeBooking.status.toUpperCase()}
                        </div>
                        <div className="details-box">
                            <p>👤 Customer: {activeBooking.job_details?.name || 'User'}</p>
                            <p>📞 {activeBooking.job_details?.mobile || 'N/A'}</p>
                            <p>📍 {activeBooking.job_details?.building || 'Location'}</p>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={() => handleNavigate(activeBooking.customer_lat, activeBooking.customer_lng)}
                                style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >NAVIGATE TO LOCATION 📍</button>
                            
                            {activeBooking.status === 'accepted' && (
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '15px' }}>
                                    <input 
                                        type="text" className="pin-input" placeholder="Ask Cust for PIN" 
                                        value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g,''))} 
                                    />
                                    <button onClick={() => handleVerifyPin(activeBooking)} className="save-btn">START WORK 🔨</button>
                                </div>
                            )}
                            {activeBooking.status === 'in_progress' && (
                                <button onClick={() => handleComplete(activeBooking.id)} className="save-btn">COMPLETE JOB ✅</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && (
              <div className="pending-job-container">
                <div className="pending-job-header">🔔 NEW REQUESTS ({pendingRequests.length})</div>
                {pendingRequests.map(req => (
                  <div key={req.id} className="message-card bg-pending">
                    <div style={{fontWeight:800}}>👤 {req.job_details?.name || 'Customer'}</div>
                    <div className="details-box">
                        <p>📞 {req.job_details?.mobile || 'No Mobile'}</p>
                        <p>🏢 {req.job_details?.building || 'Address/Location Not Provided'}</p>
                        {req.job_details?.note && <p>📝 Note: {req.job_details?.note}</p>}
                    </div>
                    
                    <button 
                      onClick={() => handleNavigate(req.customer_lat, req.customer_lng)}
                      style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, marginBottom: '10px', cursor: 'pointer' }}
                    >
                      VIEW LOCATION ON MAP 📍
                    </button>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={() => handleAccept(req.id)} className="save-btn" disabled={isBusy}>ACCEPT ✅</button>
                      <button onClick={() => handleReject(req.id)} className="save-btn" style={{background: '#ef4444'}}>REJECT ✖</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SERVICE EDIT CARD */}
            <div className="customer-card">
              {imagePreview ? <img src={imagePreview} className="card-img" alt="Local Shop" /> : <div style={{height:'180px', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center'}}>📸 Add Shop Photo</div>}
              <div style={{padding:'20px'}}>
                <h3 style={{margin:0, color: '#fff'}}>{customName || "Local Service Name"}</h3>
                <p style={{color: '#a7f3d0', marginTop: '10px'}}>{description || "Describe your local services..."}</p>
                <div style={{marginTop:'15px', display:'flex', flexWrap:'wrap', gap:'5px', justifyContent: 'center'}}>
                    {preferredAreas.length > 0 ? (
                        preferredAreas.map(a => <span key={a} style={{background:'rgba(255,255,255,0.2)', padding:'4px 8px', borderRadius:'10px', fontSize:'0.75rem', color:'#fff'}}>{a}</span>)
                    ) : (
                        <span style={{fontSize:'0.8rem', opacity:0.7}}>No preferred areas set</span>
                    )}
                </div>
              </div>
              {!isEditing && <button onClick={() => setIsEditing(true)} style={{position:'absolute', top:'15px', right:'15px', background:'#10b981', border:'none', color:'#fff', padding:'8px 15px', borderRadius:'20px', fontWeight:800, cursor:'pointer'}}>Edit ✏️</button>}
            </div>

            {isEditing && (
              <div className="edit-panel">
                <form onSubmit={handleSave}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:700, fontSize:'0.85rem'}}>Update Shop Photo</label>
                  <input type="file" onChange={handleImageChange} style={{marginBottom:'20px', fontSize:'0.8rem'}} />
                  <input className="dash-input" placeholder="Shop / Service Name" value={customName} onChange={e => setCustomName(e.target.value)} required />
                  <input className="dash-input" placeholder="Contact Mobile" value={mobile} onChange={e => setMobile(e.target.value)} required />
                  <textarea className="dash-textarea" placeholder="Description of services offered..." rows="4" value={description} onChange={e => setDescription(e.target.value)} required />
                  
                  {/* --- AREA TAGS INPUT (SMART SEARCH) --- */}
                  <label style={{display:'block', marginBottom:'8px', fontWeight:700, fontSize:'0.85rem'}}>Preferred Work Areas (Min 5)</label>
                  <div className="area-input-group">
                    <input 
                        className="dash-input" 
                        style={{marginBottom:0}}
                        placeholder="Type Area (e.g. Kondapur)..." 
                        value={areaInput} 
                        onChange={handleAreaInputChange}
                        onKeyDown={handleAreaKeyDown} 
                    />
                    <button type="button" onClick={() => addArea(areaInput)} className="add-area-btn">ADD</button>
                    
                    {/* AUTOCOMPLETE DROPDOWN */}
                    {filteredSuggestions.length > 0 && (
                        <div className="suggestions-list">
                            {filteredSuggestions.map((suggestion) => (
                                <div key={suggestion} className="suggestion-item" onClick={() => addArea(suggestion)}>
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  <div className="area-tags-container">
                    {preferredAreas.map(area => (
                        <span key={area} className="area-tag">
                            {area} 
                            <span className="remove-tag" onClick={() => handleRemoveArea(area)}>×</span>
                        </span>
                    ))}
                  </div>

                  <button type="submit" className="save-btn">{uploading ? 'Processing...' : 'SAVE LOCAL HUB'}</button>
                </form>
              </div>
            )}

            {/* DELETE BUTTON */}
            {existingService && !isEditing && (
                <button onClick={initDeleteHub} className="delete-service-btn">🗑️ Delete This Service Permanently</button>
            )}
          </>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div>
            {waitingUsers.length === 0 ? <p style={{textAlign:'center', opacity:0.5, marginTop: '50px'}}>No enquiries yet.</p> : 
              waitingUsers.map((item) => (
                <div key={item.id} className="message-card bg-accepted">
                  <div style={{fontWeight:800, fontSize:'1.1rem'}}>👤 {item.user_name}</div>
                  <div style={{opacity: 0.8, marginTop: '5px'}}>Sent an enquiry regarding your service.</div>
                  <button 
                    className="notify-waiting-btn" 
                    onClick={() => handleNotifyCustomer(item.id, item.user_name)}
                    disabled={notifyingId === item.id}
                  >
                    {notifyingId === item.id ? "Sending..." : "Reply: I'm Available 🔔"}
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {/* BOOKINGS HISTORY TAB */}
        {activeTab === 'inbox' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: 900, color: '#dcfce7' }}>Job History</h2>
            {bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px', background: '#065f46', borderRadius: '30px', border: '3px dashed #059669' }}>
                <p style={{ color: '#a7f3d0', fontSize: '1.1rem', fontWeight: 800 }}>No jobs yet.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([label, list]) => (
                list.length > 0 && (
                  <div key={label}>
                    <div className="date-group-header">{label}</div>
                    {list.map((booking) => (
                        <div key={booking.id} className={`message-card ${booking.status === 'completed' ? 'bg-accepted' : 'bg-pending'}`}>
                          <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>📦 {booking.status.toUpperCase()}</div>
                          <div className="details-box">
                             <p>👤 Customer: {booking.job_details?.name}</p>
                             <p>🗓️ {new Date(booking.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                    ))}
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