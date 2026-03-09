import React, { useState, useEffect, useRef } from 'react'
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
  
  // 🚀 TRACKING STATE (Persists across reloads)
  const [activeTrackings, setActiveTrackings] = useState(() => JSON.parse(localStorage.getItem('activeTrackings') || '{}'))

  // --- 🔴 REJECTION MODAL STATE ---
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [rejectReasonType, setRejectReasonType] = useState('Distance too far')
  const [rejectCustomReason, setRejectCustomReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // --- 🏪 STORE STATUS STATES (Temporarily Close) ---
  const [isClosed, setIsClosed] = useState(false)
  const [showCloseMenu, setShowCloseMenu] = useState(false)
  const [closeDuration, setCloseDuration] = useState('1 Hour')
  const [customUntilDate, setCustomUntilDate] = useState('') 
  const [closeReason, setCloseReason] = useState('Emergency')
  const [otherReason, setOtherReason] = useState('')
  
  // --- 🛑 DELETE SUGGESTION MODAL STATE ---
  const [showDeleteSuggestion, setShowDeleteSuggestion] = useState(false)

  // --- NOTIFICATION STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // --- 📍 LOCATION TRACKING REFS ---
  const watchIdRef = useRef(null)
  const activeBookingsRef = useRef([])

  // --- SAFE DATE HELPER ---
  const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return 'N/A'; }
  }

  const getMinDateTime = () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
  };
  const getMaxDateTime = () => {
      const max = new Date();
      max.setMonth(max.getMonth() + 1);
      max.setMinutes(max.getMinutes() - max.getTimezoneOffset());
      return max.toISOString().slice(0, 16);
  };

  const handleCustomDateChange = (e) => {
      const selectedDate = new Date(e.target.value);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 1);

      if (selectedDate > maxDate) {
          setShowDeleteSuggestion(true);
          setCustomUntilDate(''); 
      } else {
          setCustomUntilDate(e.target.value);
      }
  };

  // 🎨 STYLES
  const styles = `
    body.provider-body { margin: 0; font-family: 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); color: #ecfdf5; min-height: 100vh; }
    
    .top-bar { background-color: rgba(0, 0, 0, 0.3); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #059669; backdrop-filter: blur(10px); }
    .top-bar h1 { margin: 0; font-size: 1.5rem; color: #34d399; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .top-bar-actions { display: flex; gap: 15px; align-items: center; }

    /* --- 📰 NEWS TICKER (MARQUEE) --- */
    .ticker-wrap { width: 100%; background: rgba(0,0,0,0.5); border-bottom: 1px solid #059669; padding: 10px 0; overflow: hidden; white-space: nowrap; box-sizing: border-box; }
    .ticker-move { display: inline-block; animation: ticker 20s linear infinite; padding-left: 100%; font-size: 0.95rem; color: #fde047; font-weight: 600; letter-spacing: 1px; }
    .ticker-move:hover { animation-play-state: paused; cursor: default; }
    @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-100%, 0, 0); } }

    /* --- 3D TAB BUTTONS --- */
    .nav-tabs { display: flex; gap: 15px; margin: 25px auto; justify-content: center; flex-wrap: wrap; }
    .tab-btn { background: rgba(6, 78, 59, 0.5); border: none; color: #34d399; padding: 12px 25px; cursor: pointer; border-radius: 12px; font-weight: 700; font-size: 1rem; transition: all 0.1s; box-shadow: 0 4px 0 #065f46; transform: translateY(0); }
    .tab-btn:hover { background: rgba(6, 78, 59, 0.8); transform: translateY(-2px); box-shadow: 0 6px 0 #065f46; }
    .tab-btn:active { transform: translateY(2px); box-shadow: 0 0 0 #065f46; }
    .tab-btn.active { background: #34d399; color: #022c22; box-shadow: 0 4px 0 #047857, 0 0 15px rgba(52, 211, 153, 0.4); transform: translateY(-2px); }
    .tab-btn.active:active { transform: translateY(2px); box-shadow: 0 0 0 #047857; }

    /* Stacked Layout */
    .dashboard-layout { display: flex; flex-direction: column; gap: 24px; padding: 20px; max-width: 900px; margin: 0 auto; }
    
    .card-panel { background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; border: 1px solid rgba(52, 211, 153, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,0.2); backdrop-filter: blur(10px); }
    .preview-card { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 95, 70, 0.4)); border: 1px solid #34d399; }
    
    /* --- FORM INPUTS --- */
    .dash-form { display: flex; flex-direction: column; gap: 1.2rem; }
    .dash-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #a7f3d0; }
    .dash-input, .dash-select, .dash-textarea { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #059669; background: rgba(0, 0, 0, 0.2); color: white; font-size: 1rem; outline: none; transition: 0.2s; box-sizing: border-box; }
    .dash-input:focus, .dash-select:focus, .dash-textarea:focus { border-color: #34d399; background: rgba(0, 0, 0, 0.4); box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2); }
    .dash-textarea { min-height: 100px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    
    .upload-box { border: 2px dashed #059669; padding: 1.5rem; border-radius: 8px; background: rgba(6, 95, 70, 0.3); text-align: center; cursor: pointer; position: relative; transition: 0.2s; }
    .upload-box:hover { background: rgba(6, 95, 70, 0.5); border-color: #34d399; }
    
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 15px; }
    .img-wrapper { position: relative; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #34d399; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .delete-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
    .img-wrapper:hover .delete-overlay { opacity: 1; }
    .delete-btn { background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }

    /* --- 🚀 3D ACTION BUTTONS --- */
    .action-btn { padding: 0.9rem 1.5rem; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; width: 100%; margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.9rem; position: relative; transition: all 0.1s ease; transform: translateY(-4px); display: flex; align-items: center; justify-content: center; gap: 10px; box-sizing: border-box; }
    .action-btn:hover { transform: translateY(-6px); filter: brightness(110%); }
    .action-btn:active { transform: translateY(-1px); }
    .action-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

    .action-btn.edit { background-color: #10b981; color: white; box-shadow: 0 5px 0 #047857, 0 10px 10px rgba(0,0,0,0.2); }
    .action-btn.edit:active { box-shadow: 0 2px 0 #047857; }
    .action-btn.delete { background-color: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 5px 0 #450a0a, 0 10px 10px rgba(0,0,0,0.2); }
    .action-btn.delete:active { box-shadow: 0 2px 0 #450a0a; }
    .action-btn.reject { background-color: #ef4444; color: white; box-shadow: 0 5px 0 #991b1b, 0 10px 10px rgba(0,0,0,0.2); }
    .action-btn.reject:active { box-shadow: 0 2px 0 #991b1b; }
    .action-btn.complete { background-color: #3b82f6; color: white; margin-top: 10px; box-shadow: 0 5px 0 #1d4ed8, 0 10px 10px rgba(0,0,0,0.2); }
    .action-btn.complete:active { box-shadow: 0 2px 0 #1d4ed8; }
    .action-btn.map { background-color: #f59e0b; color: white; margin-top: 5px; box-shadow: 0 5px 0 #b45309, 0 10px 10px rgba(0,0,0,0.2); }
    .action-btn.map:active { box-shadow: 0 2px 0 #b45309; }

    /* --- ✨ ICON ANIMATIONS ✨ --- */
    .icon-svg { width: 20px; height: 20px; stroke-width: 2.5; }
    .action-btn.edit:hover .icon-svg { animation: wiggle 0.6s ease-in-out infinite; }
    @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
    .trash-lid { transform-origin: bottom right; transition: transform 0.3s ease; }
    .action-btn.delete:hover .trash-lid { transform: rotate(-30deg) translateY(-2px); }

    .btn-explore { background: #065f46; border: none; color: #34d399; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 700; transition: 0.1s; box-shadow: 0 4px 0 #064e3b; transform: translateY(-2px); }
    .btn-explore:active { transform: translateY(0); box-shadow: 0 0 0 #064e3b; }
    .logout { background: #7f1d1d; border: none; color: #fca5a5; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 700; transition: 0.1s; box-shadow: 0 4px 0 #450a0a; transform: translateY(-2px); }
    .logout:active { transform: translateY(0); box-shadow: 0 0 0 #450a0a; }

    .inbox-container { max-width: 800px; margin: 0 auto; }
    .inbox-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    
    .refresh-btn { background: #064e3b; border: 1px solid #34d399; color: #34d399; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-size: 0.9rem; font-weight: bold; transition: 0.2s; display: flex; align-items: center; gap: 8px; }
    .refresh-btn:hover { background: #34d399; color: #022c22; transform: none !important; }
    .refresh-icon { display: inline-block; transition: transform 0.4s ease; }
    .refresh-btn:hover .refresh-icon { transform: rotate(180deg); }

    .booking-card { background: rgba(6, 78, 59, 0.6); border: 1px solid #059669; border-radius: 12px; padding: 20px; margin-bottom: 20px; animation: fadeIn 0.5s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .booking-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; }
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .status-pending { background: #fef08a; color: #854d0e; }
    .status-accepted { background: #bbf7d0; color: #14532d; }
    .status-in_progress { background: #bfdbfe; color: #1e3a8a; }
    .status-completed { background: #10b981; color: white; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-rejected { background: #374151; color: #d1d5db; text-decoration: line-through; }
    
    .pin-input-group { display: flex; gap: 10px; margin-top: 15px; align-items: flex-end; }
    .pin-field { background: rgba(0,0,0,0.3); border: 2px solid #34d399; color: white; padding: 10px; border-radius: 8px; width: 120px; text-align: center; letter-spacing: 3px; font-size: 20px; font-weight: bold; }
    
    .job-details-box { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #065f46; font-size: 0.9rem; color: #d1fae5; }
    .job-row { margin-bottom: 8px; display: flex; align-items: flex-start; gap: 10px; }
    .job-icon { min-width: 20px; }
    .review-box { margin-top:10px; background: rgba(255,255,255,0.1); padding:10px; border-radius:8px; }
    .star-display { color: #f59e0b; font-size: 18px; letter-spacing: 2px; }
    .reviews-list-container { margin-top: 30px; border-top: 1px solid #059669; padding-top: 20px; }
    .review-item { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #f59e0b; }
    .review-header { display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem; color:#a7f3d0; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(8px); }
    .modal-content { background: #064e3b; border: 1px solid #34d399; width: 90%; max-width: 450px; padding: 25px; border-radius: 16px; color: white; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: popIn 0.3s ease; }
    .reason-option { display: block; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid #059669; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
    .reason-option:hover { background: rgba(52, 211, 153, 0.2); transform: translateX(5px); }
    .reason-option.selected { background: #34d399; color: #064e3b; font-weight: bold; box-shadow: 0 0 10px rgba(52, 211, 153, 0.3); }
    @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; font-weight: 600; display: flex; align-items: center; gap: 10px; animation: slideDown 0.3s ease; }
    .toast-error { background: #ef4444; }
    .toast-info { background: #3b82f6; }
    @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    
    .live-dot { width: 10px; height: 10px; background-color: #ef4444; border-radius: 50%; display: inline-block; animation: pulseLive 1.5s infinite; }
    @keyframes pulseLive { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

    @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
  `;

  useEffect(() => {
    document.body.classList.add('provider-body')
    checkUser()
    return () => document.body.classList.remove('provider-body')
  }, [])

  // --- 📍 CONTINUOUS LIVE LOCATION TRACKING ---
  useEffect(() => {
    activeBookingsRef.current = bookings.filter(b => 
        (b.status === 'accepted' && activeTrackings[b.id]) || 
        b.status === 'in_progress'
    );
    
    if (activeBookingsRef.current.length > 0 && watchIdRef.current === null) {
        if ("geolocation" in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    activeBookingsRef.current.forEach(async (b) => {
                        await supabase.from('bookings').update({
                            provider_lat: latitude,
                            provider_lng: longitude
                        }).eq('id', b.id);
                    });
                },
                (error) => console.error("Location tracking error:", error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        }
    } else if (activeBookingsRef.current.length === 0 && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }
  }, [bookings, activeTrackings]); 

  useEffect(() => {
      return () => {
          if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
          }
      };
  }, []);

  const sendNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  }

  // --- DATABASE SYNC LOGIC FOR CLOSING STORE ---
  const handleCloseStore = async () => {
    let finalDuration = closeDuration;
    if (closeDuration === 'Custom Time') {
        if (!customUntilDate) { sendNotification("Please select a valid date and time.", "error"); return; }
        const dateObj = new Date(customUntilDate);
        finalDuration = `Until ${dateObj.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}`;
    }

    const { error } = await supabase.from('services').update({ is_available: false, close_reason: closeReason === 'Other' ? otherReason : closeReason }).eq('provider_id', user.id);
    if (!error) {
        setIsClosed(true); setShowCloseMenu(false);
        const finalReason = closeReason === 'Other' ? otherReason : closeReason;
        sendNotification(`Store closed ${finalDuration}. Reason: ${finalReason}`, 'info');
        if (closeDuration === 'Custom Time') setCustomUntilDate(finalDuration); 
    } else {
        sendNotification("Failed to close store.", "error");
    }
  };

  const handleReopenStore = async () => {
    const { error } = await supabase.from('services').update({ is_available: true, close_reason: null }).eq('provider_id', user.id);
    if (!error) {
        setIsClosed(false); setCustomUntilDate(''); 
        sendNotification("Store is now Open!", "success");
    } else {
        sendNotification("Failed to open store.", "error");
    }
  };

  // --- 🔴 REALTIME LISTENER ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('provider-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, 
        (payload) => {
            setTimeout(() => { fetchBookings(user.id); }, 500);
            if(payload.eventType === 'INSERT') { sendNotification("🔔 New Booking Request Received!", "info"); setActiveTab('inbox'); }
            if(payload.eventType === 'UPDATE' && payload.new.status === 'cancelled') { sendNotification("❌ Booking Cancelled by Customer", "error"); }
            if(payload.eventType === 'UPDATE' && payload.new.rating) { fetchBookings(user.id); sendNotification("⭐ New Review!", "success"); }
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
        setIsEditing(false);
        if (data.is_available === false) { setIsClosed(true); } else { setIsClosed(false); }
    } else { 
        setExistingService(null); setIsEditing(true) 
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

  // --- 1. ACCEPT BOOKING ---
  const handleAcceptBooking = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId)
    if(!error) { 
        sendNotification("Booking Accepted! Moved to Upcoming tab.", "success"); 
        setActiveTab('upcoming');
        fetchBookings(user.id); 
    } else {
        sendNotification("Error: " + error.message, "error");
    }
  }

  // --- 2. FORCE GPS FETCH & START JOURNEY ---
  const handleStartJourney = async (bookingId) => {
    sendNotification("Requesting GPS location to start journey...", "info");
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Force an immediate Database update so the customer sees it instantly
                await supabase.from('bookings').update({
                    provider_lat: latitude,
                    provider_lng: longitude
                }).eq('id', bookingId);
                
                const newTrackings = { ...activeTrackings, [bookingId]: true };
                setActiveTrackings(newTrackings);
                localStorage.setItem('activeTrackings', JSON.stringify(newTrackings));
                sendNotification("Journey Started! Live GPS active.", "success");
            },
            (error) => {
                sendNotification("⚠️ Please allow Location/GPS access to start the journey!", "error");
            },
            { enableHighAccuracy: true }
        );
    } else {
        sendNotification("GPS is not supported on this device.", "error");
    }
  }

  // --- COMPLETE JOB ---
  const handleCompleteJob = async (bookingId) => {
    if(!confirm("Work done?")) return;
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)
    if(!error) { 
        const newTrackings = { ...activeTrackings };
        delete newTrackings[bookingId];
        setActiveTrackings(newTrackings);
        localStorage.setItem('activeTrackings', JSON.stringify(newTrackings));

        sendNotification("Job Completed! Great work.", "success"); 
        fetchBookings(user.id); 
    }
  }

  const openRejectModal = (bookingId) => {
    setSelectedBookingId(bookingId); setRejectReasonType('Distance too far'); setRejectCustomReason(''); setShowRejectModal(true);
  }

  const handleConfirmReject = async () => {
    if(!selectedBookingId) return;
    setRejectLoading(true);
    const finalReason = rejectReasonType === 'Other' ? rejectCustomReason : rejectReasonType;
    if(rejectReasonType === 'Other' && !rejectCustomReason.trim()) { alert("Please type a reason."); setRejectLoading(false); return; }
    
    const { error } = await supabase.from('bookings').update({ status: 'rejected', rejection_reason: finalReason }).eq('id', selectedBookingId);
    if (error) { sendNotification("Error: " + error.message, "error"); } else { sendNotification("Request Declined.", "info"); fetchBookings(user.id); setShowRejectModal(false); }
    setRejectLoading(false);
  }

  const handleVerifyPin = async (bookingId, correctPin) => {
    if(pinInput[bookingId] === correctPin) {
        const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', bookingId)
        if(!error) { sendNotification("PIN Verified!", "success"); fetchBookings(user.id); }
    } else { sendNotification("Incorrect PIN.", "error"); }
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

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setUploading(true);
    const serviceData = { provider_id: user.id, service_type: serviceType, custom_service_name: serviceType === 'Other' ? customName : null, description, timing: `${startTime} - ${endTime}`, mobile, contact_email: contactEmail }
    let data, error;

    if (existingService && existingService.id) {
        const result = await supabase.from('services').update(serviceData).eq('id', existingService.id).select();
        data = result.data; error = result.error;
    } else {
        const result = await supabase.from('services').insert([serviceData]).select();
        data = result.data; error = result.error;
    }

    if (error) {
        if(error.code === '23503' || error.message.includes('foreign key')) { sendNotification("Database Error: Fix permissions.", "error"); } else { sendNotification("Error: " + error.message, "error"); }
        setUploading(false); return;
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
    setUploading(false); window.location.reload();
  }

  const handleDelete = async () => {
    if (confirm("⚠️ Are you sure? This will permanently delete your service and ALL uploaded photos.")) {
      setLoading(true);
      const { error: imageError } = await supabase.from('service_images').delete().eq('service_id', existingService.id);
      if (imageError) { sendNotification("Error clearing images: " + imageError.message, "error"); setLoading(false); return; }
      const { error: serviceError } = await supabase.from('services').delete().eq('id', existingService.id);
      if (serviceError) { sendNotification("Error deleting service: " + serviceError.message, "error"); } else {
        sendNotification("Service deleted successfully!", "success");
        setExistingService(null); setIsEditing(true); setServiceType('Plumber'); setCustomName(''); setDescription(''); setMobile(''); setContactEmail(''); setImages([]);
      }
      setLoading(false);
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', color: '#fff'}}>Loading...</div>
  
  const displayName = serviceType === 'Other' ? customName : serviceType
  const displayTiming = existingService?.timing || `${startTime} - ${endTime}`
  
  // --- SMART SORTING FOR TABS ---
  const safeBookings = bookings || [];
  const ratedBookings = safeBookings.filter(b => b.rating);
  const avgRating = ratedBookings.length > 0 ? (ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length).toFixed(1) : "New";
  
  // Upcoming Tab: Accepted & In Progress
  const upcomingBookings = safeBookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
  // Inbox Tab: Pending, Completed, Cancelled, Rejected
  const inboxBookings = safeBookings.filter(b => !['accepted', 'in_progress'].includes(b.status));
  
  const pendingCount = inboxBookings.filter(b => b.status === 'pending').length;

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : inboxBookings;

  // 🚨 NEW: CHECK IF PROVIDER IS BUSY TO DISABLE STORE CLOSING & EDITING 🚨
  const isProviderEngaged = safeBookings.some(b => ['accepted', 'in_progress'].includes(b.status));

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
                <p style={{fontSize:'0.9rem', color:'#d1fae5'}}>Why are you declining this job?</p>
                <div style={{margin:'20px 0'}}>
                    {['Distance too far', 'Time slot not available', 'Service not available currently', 'Emergency / Personal Reason', 'Other'].map(reason => (
                        <div key={reason} className={`reason-option ${rejectReasonType === reason ? 'selected' : ''}`} onClick={() => setRejectReasonType(reason)}>
                            {reason}
                        </div>
                    ))}
                    {rejectReasonType === 'Other' && (
                        <textarea className="dash-textarea" placeholder="Please type your reason here..." value={rejectCustomReason} onChange={(e) => setRejectCustomReason(e.target.value)} style={{marginTop:'10px', minHeight:'60px'}} />
                    )}
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="action-btn reject" onClick={handleConfirmReject} disabled={rejectLoading}>
                        {rejectLoading ? "Declining..." : "Confirm Decline"}
                    </button>
                    <button className="action-btn" style={{background:'#374151', color:'white', boxShadow:'0 5px 0 #1f2937'}} onClick={() => setShowRejectModal(false)}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="top-bar">
        <h1>Provider Dashboard</h1>
        <div className="top-bar-actions">
            <button className="btn-explore" onClick={() => navigate('/customer-home')}>🔍 Explore</button>
            <button className="logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* 📰 NEWS TICKER FOR UPCOMING JOBS */}
      {upcomingBookings.length > 0 && (
          <div className="ticker-wrap">
              <div className="ticker-move">
                  {upcomingBookings.map(b => {
                      const t = safeFormatDate(b.job_details?.time);
                      return `🚀 Upcoming Job for ${b.job_details?.name || 'Customer'} on ${t}`;
                  }).join('       ⭐       ')}
              </div>
          </div>
      )}

      <div className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>🛠️ My Service</button>
        <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            📅 Upcoming ({upcomingBookings.length})
        </button>
        <button className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            📬 Inbox ({pendingCount})
        </button>
      </div>

      {activeTab === 'service' ? (
        <div className="dashboard-layout">
            
            {/* 1️⃣ PREVIEW COMES FIRST */}
            {existingService && !isEditing && (
                <div className="card-panel preview-card">
                    <h3 style={{margin: '0 0 15px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px'}}>👀 Customer Preview <span style={{fontSize: '12px', background: '#064e3b', padding: '4px 8px', borderRadius: '12px', color: '#a7f3d0', border: '1px solid #10b981'}}>Live</span></h3>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div>
                            <h2 style={{margin: '0 0 5px 0', color: 'white', fontSize: '24px'}}>{displayName}</h2>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                <span style={{background: isClosed ? '#ef4444' : '#10b981', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}}>{isClosed ? 'Temporarily Closed' : 'Accepting Jobs'}</span>
                                <span style={{color: '#f59e0b', fontWeight: 'bold', fontSize: '14px'}}>★ {avgRating} ({ratedBookings.length})</span>
                            </div>
                            <p style={{color: '#d1fae5', fontSize: '14px', margin: '0 0 10px 0', maxWidth: '500px', lineHeight: '1.5'}}>{description.substring(0, 150)}{description.length > 150 ? '...' : ''}</p>
                        </div>
                        {existingService.service_images && existingService.service_images.length > 0 && (
                            <img src={existingService.service_images[0].image_url} alt="Cover" style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #34d399'}} />
                        )}
                    </div>
                </div>
            )}

            {/* 2️⃣ SERVICE OVERVIEW & REVIEWS */}
            {existingService && !isEditing && (
                <div className="card-panel">
                    <h2 style={{color:'white', marginTop:0, marginBottom:'20px'}}>Service Overview</h2>
                    <div style={{background:'rgba(2, 44, 34, 0.6)', padding:'20px', borderRadius:'14px', marginBottom:'20px', border: '1px solid #059669'}}>
                        <p style={{color:'#ecfdf5', lineHeight:'1.6', marginBottom:'15px'}}>{description}</p>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'20px', fontSize:'14px', color:'#86efac'}}><span>📞 {mobile}</span><span>✉️ {contactEmail}</span><span>⏰ {displayTiming}</span></div>
                    </div>
                    
                    <h3 style={{color:'#bbf7d0', fontSize:'16px', marginBottom:'10px'}}>Uploaded Photos</h3>
                    {existingService.service_images && existingService.service_images.length > 0 ? (<div style={{display:'flex', gap:'12px', flexWrap:'wrap', marginBottom: '20px'}}>{(existingService.service_images || []).map(img => (<img key={img.id} src={img.image_url} alt="Service" style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'10px', border:'1px solid #10b981'}} />))}</div>) : (<p style={{color: '#9ca3af', marginBottom: '20px'}}>No images uploaded.</p>)}
                    
                    <h3 style={{color:'#f59e0b', fontSize:'18px', borderTop: '1px solid #059669', paddingTop: '20px', marginBottom:'15px'}}>Customer Reviews ({ratedBookings.length})</h3>
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
            )}

            {/* 3️⃣ STORE STATUS (CLOSE/OPEN) */}
            {existingService && !isEditing && (
                <div className="card-panel" style={{borderColor: '#f59e0b'}}>
                    <h2 style={{color: '#fcd34d', margin: '0 0 15px 0'}}>🏪 Manage Status</h2>
                    
                    {/* 🚨 PREVENT CLOSING IF ENGAGED 🚨 */}
                    {isProviderEngaged ? (
                        <div style={{background: 'rgba(245, 158, 11, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)'}}>
                            <p style={{color: '#fcd34d', fontSize: '15px', margin: 0, fontWeight: 'bold'}}>
                                ⚠️ You cannot close your store right now because you have active or scheduled jobs. Please complete them first.
                            </p>
                        </div>
                    ) : !isClosed ? (
                        !showCloseMenu ? (
                            <button className="action-btn map" onClick={() => setShowCloseMenu(true)}>⏸️ Temporarily Close Store</button>
                        ) : (
                            <div style={{background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px'}}>
                                <label style={{display: 'block', fontSize: '13px', color: '#a7f3d0', marginBottom: '5px'}}>Duration:</label>
                                <select className="dash-select" style={{marginBottom: '15px'}} value={closeDuration} onChange={e => setCloseDuration(e.target.value)}>
                                    <option>1 Hour</option>
                                    <option>1 Day</option>
                                    <option>1 Month</option>
                                    <option>Custom Time</option>
                                </select>
                                
                                {closeDuration === 'Custom Time' && (
                                    <>
                                        <label style={{display: 'block', fontSize: '13px', color: '#a7f3d0', marginBottom: '5px'}}>Select End Date & Time:</label>
                                        <input 
                                            type="datetime-local" 
                                            className="dash-input" 
                                            style={{marginBottom: '15px', colorScheme: 'dark'}} 
                                            min={getMinDateTime()}
                                            max={getMaxDateTime()}
                                            value={customUntilDate} 
                                            onChange={handleCustomDateChange} 
                                        />
                                    </>
                                )}

                                <label style={{display: 'block', fontSize: '13px', color: '#a7f3d0', marginBottom: '5px'}}>Reason:</label>
                                <select className="dash-select" style={{marginBottom: '15px'}} value={closeReason} onChange={e => setCloseReason(e.target.value)}>
                                    <option>Emergency</option><option>Festival</option><option>Personal</option><option>Other</option>
                                </select>
                                
                                {closeReason === 'Other' && (
                                    <input className="dash-input" style={{marginBottom: '15px'}} placeholder="Type reason..." value={otherReason} onChange={e => setOtherReason(e.target.value)} />
                                )}
                                
                                <div style={{display: 'flex', gap: '15px'}}>
                                    <button className="action-btn edit" style={{flex: 1, margin: 0}} onClick={handleCloseStore}>Confirm</button>
                                    <button className="action-btn delete" style={{flex: 1, margin: 0}} onClick={() => setShowCloseMenu(false)}>Cancel</button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div style={{background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
                            <p style={{color: '#ef4444', fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0'}}>
                                Store is Closed ({closeDuration === 'Custom Time' ? customUntilDate : closeDuration})
                            </p>
                            <p style={{color: '#fca5a5', margin: '0 0 15px 0', fontSize: '14px'}}>Customers cannot see your profile right now.</p>
                            <button className="action-btn edit" style={{margin: 0}} onClick={handleReopenStore}>▶️ Reopen Store</button>
                        </div>
                    )}
                </div>
            )}

            {/* 4️⃣ SETTINGS AT THE LAST (EDIT / DELETE / FORM) */}
            <div className="card-panel">
                <h2 style={{color:'white', marginTop:0, marginBottom:'20px'}}>⚙️ Service Settings</h2>
                
                {/* 🚨 PREVENT EDITING/DELETING IF ENGAGED 🚨 */}
                {isProviderEngaged ? (
                    <div style={{background: 'rgba(245, 158, 11, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)'}}>
                        <p style={{color: '#fcd34d', fontSize: '15px', margin: 0, fontWeight: 'bold'}}>
                            ⚠️ Profile Locked: You cannot edit or delete your service while you have active jobs. Please complete or cancel them first.
                        </p>
                    </div>
                ) : isEditing ? (
                    <form onSubmit={handleSubmit} className="dash-form">
                    <h3 style={{color:'#34d399', margin: '0 0 10px 0'}}>{existingService ? 'Edit Details' : 'Create New Service'}</h3>
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
                    <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
                        <button type="submit" className="action-btn edit" disabled={uploading} style={{margin: 0}}>{uploading ? 'Saving...' : 'Save Changes'}</button>
                        {existingService && (<button type="button" className="action-btn" style={{background:'#374151', color:'white', boxShadow:'0 5px 0 #1f2937', margin: 0}} onClick={() => setIsEditing(false)}>Cancel</button>)}
                    </div>
                    </form>
                ) : (
                    <div>
                        <button className="action-btn edit" onClick={() => setIsEditing(true)}>
                            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit Service Details
                        </button>
                        <button className="action-btn delete" onClick={handleDelete} style={{margin: 0}}>
                            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><g className="trash-lid"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></g><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Delete Entire Service
                        </button>
                    </div>
                )}
            </div>
            
        </div>
      ) : (
        <div className="inbox-container" style={{padding:'0 20px'}}>
             <div className="inbox-header-row">
                <h2 style={{color:'white', margin:0}}>{activeTab === 'upcoming' ? 'Scheduled Jobs' : 'Inbox & Requests'}</h2>
                <button className="refresh-btn" onClick={() => fetchBookings(user?.id)}>
                    <span className="refresh-icon">🔄</span> Refresh
                </button>
             </div>

             {displayBookings.length === 0 ? (<div style={{textAlign:'center', marginTop:'40px', color:'#9ca3af'}}>No bookings found here.</div>) : (
                 displayBookings.map(booking => {
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
                                
                                {details.map_link && ['pending', 'accepted', 'in_progress'].includes(booking.status) && (
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

                            {booking.status === 'pending' && (
                                <div style={{textAlign:'right'}}>
                                    <p style={{marginBottom:'10px', color:'#ecfdf5', textAlign: 'left'}}>Customer requested this service. Please respond.</p>
                                    <div style={{display:'flex', gap:'15px', justifyContent:'space-between', width: '100%'}}>
                                        <button className="action-btn reject" style={{flex: 1, margin: 0}} onClick={() => openRejectModal(booking.id)}>Decline ❌</button>
                                        <button className="action-btn edit" style={{flex: 1, margin: 0}} onClick={() => handleAcceptBooking(booking.id)}>Accept ✔️</button>
                                    </div>
                                </div>
                            )}
                            
                            {booking.status === 'accepted' && (
                                <div>
                                    <p style={{color:'#fde047', marginBottom:'5px', fontWeight: 'bold'}}>Request Accepted.</p>
                                    
                                    {!activeTrackings[booking.id] ? (
                                        // 🚨 UPDATED LOGIC: UNLOCKS 2 HOURS BEFORE 🚨
                                        (() => {
                                            const jobTime = details.time ? new Date(details.time).getTime() : 0;
                                            const now = new Date().getTime();
                                            const diffHours = (jobTime - now) / (1000 * 60 * 60);
                                            
                                            if (diffHours > 2) {
                                                return (
                                                    <div style={{background: 'rgba(255, 255, 255, 0.1)', padding: '15px', borderRadius: '8px', marginTop: '10px', border: '1px solid rgba(255,255,255,0.2)'}}>
                                                        <p style={{margin: 0, fontSize: '14px', color: '#d1fae5', lineHeight: '1.4'}}>
                                                            ⏳ <strong>Scheduled for later.</strong> The "Start Journey" button will unlock <strong>2 hours</strong> before the start time.
                                                        </p>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div style={{marginTop: '15px'}}>
                                                        <button className="action-btn map" onClick={() => handleStartJourney(booking.id)}>
                                                            🚀 Start Journey to Location
                                                        </button>
                                                        <p style={{fontSize: '12px', color: '#a7f3d0', marginTop: '8px', textAlign: 'center'}}>
                                                            Clicking this will trigger GPS tracking.
                                                        </p>
                                                    </div>
                                                );
                                            }
                                        })()
                                    ) : (
                                        // Journey Started State
                                        <div>
                                            <div style={{color: '#34d399', fontSize: '13px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px'}}>
                                                <span className="live-dot"></span> Live GPS Tracking to Customer Active
                                            </div>
                                            <p style={{fontSize:'0.9rem', color:'#d1fae5'}}>Ask customer for PIN when you arrive.</p>
                                            <div className="pin-input-group">
                                                <input type="text" maxLength="4" className="pin-field" placeholder="PIN" onChange={(e) => setPinInput({...pinInput, [booking.id]: e.target.value})} />
                                                <button className="action-btn edit" style={{width:'auto', marginBottom:0}} onClick={() => handleVerifyPin(booking.id, booking.start_code)}>Verify & Start</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {booking.status === 'in_progress' && (
                                <div style={{background:'rgba(59, 130, 246, 0.2)', padding:'15px', borderRadius:'8px', marginTop:'10px', border:'1px solid #3b82f6'}}>
                                    <p style={{margin:0, fontWeight:'bold', color:'#93c5fd', fontSize:'18px'}}>⚠️ Work in Progress</p>
                                    <div style={{color: '#34d399', fontSize: '12px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <span className="live-dot"></span> Location is still tracking
                                    </div>
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
                                    {booking.rejection_reason && <p style={{margin:'5px 0 0 0', fontSize:'0.85rem', color:'#fca5a5'}}>{booking.rejection_reason}</p>}
                                </div>
                            )}
                            
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