import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- 1. Service Card Component ---
const ServiceCard = ({ service, onClick, onImageClick }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const timerRef = useRef(null)

  const handleMouseEnter = () => { if (window.innerWidth > 768) { timerRef.current = setTimeout(() => setIsExpanded(true), 500) } }
  const handleMouseLeave = () => { if (timerRef.current) clearTimeout(timerRef.current); setIsExpanded(false) }
  const handleMobileClick = () => { if (window.innerWidth <= 768) setIsExpanded(!isExpanded) }

  const coverImage = service.service_images?.[0]?.image_url
  const galleryImages = service.service_images?.slice(1, 4) || []
  
  const ratings = service.bookings?.filter(b => b.rating) || [];
  const avg = ratings.length > 0 ? (ratings.reduce((a,b)=>a+b.rating,0)/ratings.length).toFixed(1) : null;

  return (
    <div className="card-wrapper" style={{ zIndex: isExpanded ? 50 : 1 }}>
      <div className={`service-card ${isExpanded ? 'expanded' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleMobileClick}>
        <div className="card-main">
          <div className="cover-img">
            {coverImage ? (<img src={coverImage} alt="Cover" onError={(e) => e.target.style.display='none'} onClick={(e) => { e.stopPropagation(); onImageClick(coverImage); }} />) : (<div className="no-image-pattern"><span style={{fontSize:'30px'}}>🛠️</span><span style={{fontSize:'12px', opacity:0.6}}>No Preview</span></div>)}
            {avg && <div style={{position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.9)', padding:'2px 8px', borderRadius:'10px', fontSize:'12px', fontWeight:'bold'}}>★ {avg}</div>}
          </div>
          <div className="card-content">
            <div><h3>{service.service_type === 'Other' ? service.custom_service_name : service.service_type}</h3><p>{service.description ? service.description.substring(0, 50) + '...' : 'No description available'}</p></div>
            <button className="view-btn" onClick={(e) => { e.stopPropagation(); onClick(service.id); }}>View Details</button>
          </div>
        </div>
        <div className="card-gallery">{galleryImages.length > 0 ? (galleryImages.map((img, index) => (<img key={img.id} src={img.image_url} alt="Gallery" onClick={(e) => { e.stopPropagation(); onImageClick(img.image_url); }} />))) : (<div style={{textAlign:'center', opacity:0.5, fontSize:'13px', padding:'10px'}}>No extra photos</div>)}</div>
      </div>
    </div>
  )
}

// --- 2. Main Page ---
export default function CustomerHome() {
  const navigate = useNavigate()
  
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [zoomedImage, setZoomedImage] = useState(null) 
  
  const [activeSection, setActiveSection] = useState('home')
  const [currentUser, setCurrentUser] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')

  const [bookingLoading, setBookingLoading] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)
  const [bookingTab, setBookingTab] = useState('active') 
  const [myBookings, setMyBookings] = useState([])
  const [showBookingForm, setShowBookingForm] = useState(false); 
  
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewBookingId, setReviewBookingId] = useState(null)
  const [ratingInput, setRatingInput] = useState(0)
  const [reviewTextInput, setReviewTextInput] = useState('')

  // 🔔 CUSTOM TOAST STATE
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const [formData, setFormData] = useState({
    name: '', mobile: '', datetime: '', building: '', room: '', landmark: '', locationLat: null, locationLng: null
  })

  useEffect(() => {
    fetchServices()
    checkUser()
    requestNotificationPermission(); // 🔔 Request Permission
    const handleScroll = () => {
      const sections = ['home', 'services', 'provider']; for (const section of sections) { const el = document.getElementById(section); if (el) { const rect = el.getBoundingClientRect(); if (rect.top >= -300 && rect.top <= 300) { setActiveSection(section); break } } }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // --- HELPER: SYSTEM & TOAST NOTIFICATION ---
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  }

  const sendNotification = (message, type = 'success', systemTitle = 'Update') => {
    // 1. In-App Toast
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);

    // 2. Mobile System Notification (If permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(systemTitle, { body: message });
    }
  }

  // --- 🔴 REALTIME LISTENER (CUSTOMER) ---
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('customer-db-changes')
      .on('postgres_changes', 
        { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'bookings',
            filter: `customer_id=eq.${currentUser.id}` 
        }, 
        (payload) => {
            fetchMyBookings(currentUser.id); 
            
            if(payload.new.status === 'accepted') {
                sendNotification("✅ Your booking request was ACCEPTED!", "success", "Booking Confirmed");
            }
            if(payload.new.status === 'in_progress') {
                sendNotification("🔨 Work has started!", "info", "Work Started");
            }
            if(payload.new.status === 'completed') {
                sendNotification("🎉 Job Done! Please Rate your Provider.", "success", "Work Completed");
                setBookingTab('history');
                setShowMyBookings(true);
            }
            // 🔴 Handle Rejection Notification
            if(payload.new.status === 'rejected') {
                sendNotification("❌ Request Declined. Check history for reason.", "error", "Declined");
                setBookingTab('history');
                setShowMyBookings(true);
            }
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [currentUser]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    if(user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if(data) { setEditName(data.full_name); setEditMobile(data.mobile || ''); setFormData(prev => ({ ...prev, name: data.full_name, mobile: data.mobile || '' })) }
      fetchMyBookings(user.id)
    }
  }

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*, service_images(*), bookings(rating, review_text, job_details, created_at)').order('created_at', { ascending: false }).order('id', { foreignTable: 'service_images', ascending: true }) 
    if (data) setServices(data)
  }

  const fetchMyBookings = async (userId) => {
    const uid = userId || currentUser?.id;
    if(!uid) return
    // 🔴 IMPORTANT: Removed strict select to ensure 'rejection_reason' is fetched automatically via '*'
    const { data } = await supabase.from('bookings').select('*, services(service_type, custom_service_name)').eq('customer_id', uid).order('created_at', { ascending: false })
    if(data) setMyBookings(data)
  }

  const handleBookService = async () => {
    if(!currentUser) { sendNotification("Please login to book", "error"); return; }
    setShowBookingForm(true);
  }

  const handleGetLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => { setFormData(prev => ({ ...prev, locationLat: position.coords.latitude, locationLng: position.coords.longitude })); sendNotification("✅ Location Detected!", "success"); },
              (error) => { sendNotification("Error getting location: " + error.message, "error"); }
          );
      } else { sendNotification("Geolocation is not supported.", "error"); }
  }

  // --- SUBMIT BOOKING (WITH LOCATION CHECK) ---
  const finalizeBooking = async (e) => {
    e.preventDefault(); 
    
    // 🔴 1. CHECK LOCATION REQUIREMENT
    if (!formData.locationLat || !formData.locationLng) {
        sendNotification("⚠️ Location is REQUIRED! Please click 'Detect My Exact Location'.", "error");
        return; // STOP HERE
    }

    setShowBookingForm(false); 
    setBookingLoading(true)

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // 🟢 FIXED GOOGLE MAPS LINK URL
    const mapLink = `https://www.google.com/maps?q=${formData.locationLat},${formData.locationLng}`;

    const jobDetails = { 
        name: formData.name, 
        mobile: formData.mobile, 
        time: formData.datetime, 
        building: formData.building, 
        room: formData.room, 
        landmark: formData.landmark, 
        map_link: mapLink 
    };

    const { error } = await supabase.from('bookings').insert([{ 
        customer_id: currentUser.id, 
        provider_id: selectedService.provider_id, 
        service_id: selectedService.id, 
        start_code: pin, 
        status: 'pending', 
        job_details: jobDetails 
    }])

    setBookingLoading(false)
    if(error) { sendNotification("Error: " + error.message, "error") } 
    else { 
        sendNotification("Booking Sent Successfully! 🚀", "success"); 
        setSelectedServiceId(null); 
        fetchMyBookings(currentUser.id); 
        setShowMyBookings(true); 
        setBookingTab('active');
        // Reset form slightly
        setFormData(prev => ({ ...prev, datetime: '', building: '', room: '', landmark: '', locationLat: null, locationLng: null }));
    }
  }

  const openReviewModal = (bookingId) => {
    setReviewBookingId(bookingId); setRatingInput(0); setReviewTextInput(''); setShowReviewModal(true);
  }

  const submitReview = async () => {
    if(ratingInput === 0) { sendNotification("Please select a star rating!", "error"); return; }
    const { error } = await supabase.from('bookings').update({ rating: ratingInput, review_text: reviewTextInput }).eq('id', reviewBookingId);
    if(!error) { sendNotification("Thanks for your feedback! ⭐", "success"); setShowReviewModal(false); fetchMyBookings(currentUser.id); fetchServices(); } else { sendNotification("Error saving review", "error"); }
  }

  const handleCancelBooking = async (bookingId) => {
    if(!confirm("Are you sure you want to cancel this request?")) return;
    setMyBookings(currentBookings => currentBookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    if (error) { sendNotification("Error cancelling.", "error"); fetchMyBookings(currentUser.id); }
  }

  const formatDate = (isoString) => { if(!isoString) return ''; return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  const activeBookingsList = myBookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status));
  // 🔴 Ensure 'rejected' is in the history list
  const historyBookingsList = myBookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));
  const activeBooking = activeBookingsList.length > 0 ? activeBookingsList[0] : null;
  const selectedService = services.find(s => s.id === selectedServiceId)
  const serviceReviews = selectedService?.bookings?.filter(b => b.rating) || [];
  const filteredServices = services.filter(service => service.service_type.toLowerCase().includes(searchTerm.toLowerCase()) || service.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  const userInitial = editName ? editName.charAt(0).toUpperCase() : 'U'

  return (
    <div>
      <style>{`
        /* Original CSS */
        .service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 40px; padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
        .card-wrapper { position: relative; height: 380px; perspective: 1000px; }
        .service-card { position: relative; width: 100%; height: 100%; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: all 0.3s ease; overflow: hidden; display: flex; flex-direction: column; }
        .service-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
        .service-card.expanded { position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; z-index: 99; display: flex; flex-direction: row; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
        .card-main { flex: 1; display: flex; flex-direction: column; height: 100%; }
        .cover-img { height: 200px; width: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .cover-img img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; }
        .card-content { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .card-content h3 { margin: 0 0 10px 0; font-size: 1.2rem; color: #1e293b; }
        .card-content p { font-size: 0.9rem; color: #64748b; margin: 0; }
        .view-btn { margin-top: 15px; padding: 10px; background: #f1f5f9; border: none; border-radius: 8px; color: #334155; font-weight: 600; cursor: pointer; width: 100%; }
        .view-btn:hover { background: #e2e8f0; }
        .card-gallery { display: none; width: 120px; background: #f8fafc; border-left: 1px solid #e2e8f0; padding: 10px; flex-direction: column; gap: 10px; overflow-y: auto; }
        .service-card.expanded .card-gallery { display: flex; }
        .card-gallery img { width: 100%; height: 80px; object-fit: cover; border-radius: 8px; cursor: zoom-in; border: 1px solid #cbd5e1; }
        .search-container { margin: 0 auto; max-width: 600px; position: relative; }
        .search-input { width: 100%; padding: 15px 20px; border-radius: 50px; border: 1px solid #e2e8f0; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); outline: none; }
        .btn { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); border: none; cursor: pointer; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; position:relative; animation: popIn 0.3s ease; }
        @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .image-zoom-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 9999; display: flex; justify-content: center; align-items: center; cursor: pointer; }
        .zoomed-img { max-width: 90%; max-height: 90vh; border-radius: 8px; }
        nav { padding: 20px; display: flex; justify-content: flex-end; align-items: center; }
        nav ul { list-style: none; display: flex; gap: 20px; align-items: center; }
        nav a { text-decoration: none; color: #334155; font-weight: 500; display: flex; align-items: center; gap: 5px; cursor: pointer; }
        .nav-status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; transition: all 0.3s ease; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .nav-pending { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
        .nav-accepted { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .nav-in_progress { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
        .hero-content { text-align: center; padding: 60px 20px; }
        .hero-content h1 { font-size: 3rem; margin-bottom: 10px; color: #0f172a; }
        .gradient-text { background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .status-badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-pending { background: #fef9c3; color: #854d0e; }
        .status-accepted { background: #dcfce7; color: #166534; }
        .status-in_progress { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
        .status-completed { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-rejected { background: #f3f4f6; color: #6b7280; text-decoration: line-through; }
        .pin-box { background: #f1f5f9; padding: 10px; text-align: center; border-radius: 8px; margin-top: 10px; border: 2px dashed #94a3b8; }
        .pin-code { font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a; display: block; }
        .btn-cancel { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%; margin-top: 10px; transition: 0.2s; }
        .btn-cancel:hover { background: #fecaca; }
        .modal-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
        .tab-item { padding: 8px 15px; cursor: pointer; font-weight: 500; color: #64748b; border-radius: 8px; }
        .tab-item.active { background: #f1f5f9; color: #0f172a; font-weight: bold; }
        .history-date { font-size: 12px; color: #94a3b8; margin-top: 5px; }

        .form-label { display: block; margin-bottom: 5px; font-weight: 600; color: #334155; }
        .form-input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 15px; outline: none; }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .location-btn { background: #f59e0b; color: white; padding: 10px; border: none; border-radius: 8px; width: 100%; cursor: pointer; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; gap: 5px; }
        .location-btn.detected { background: #10b981; }

        /* STAR RATING */
        .star-rating { font-size: 30px; cursor: pointer; color: #cbd5e1; transition: color 0.2s; }
        .star-rating.active { color: #f59e0b; }
        .star-rating:hover { color: #fbbf24; }
        
        /* PUBLIC REVIEW SECTION IN MODAL */
        .modal-reviews { margin-top:20px; border-top:1px solid #eee; padding-top:10px; }
        .public-review-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .public-review-header { display: flex; justify-content: space-between; font-size: 0.9rem; color: #1e293b; font-weight: 600; }
        .public-star { color: #f59e0b; font-size: 14px; }
        
        /* 🔔 TOAST NOTIFICATION STYLES */
        .toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; font-weight: 600; display: flex; align-items: center; gap: 10px; animation: slideDown 0.3s ease; }
        .toast-error { background: #ef4444; }
        .toast-info { background: #3b82f6; }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        @media(max-width: 768px) { .service-grid { grid-template-columns: 1fr; padding: 20px; } .service-card.expanded { width: 100%; height: auto; position: relative; top: 0; left: 0; flex-direction: column; } .card-gallery { width: 100%; flex-direction: row; overflow-x: auto; height: 100px; border-left: none; border-top: 1px solid #e2e8f0; } .card-gallery img { width: 80px; height: 80px; } }
      `}</style>
      
      {/* 🔔 CUSTOM TOAST NOTIFICATION COMPONENT */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
           {toast.type === 'success' && '✅'} {toast.type === 'error' && '❌'} {toast.type === 'info' && 'ℹ️'} {toast.message}
        </div>
      )}

      {/* Profile Menu */}
      <div className="profile-container" style={{position:'fixed', top:'20px', left:'20px', zIndex:100}}>
        <div className="profile-btn" style={{width:'40px', height:'40px', background:'#3b82f6', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}} onClick={() => setShowProfileMenu(!showProfileMenu)}>{userInitial}</div>
        {showProfileMenu && (
          <div className="profile-dropdown" style={{position:'absolute', top:'50px', left:'0', background:'white', padding:'10px', boxShadow:'0 5px 15px rgba(0,0,0,0.1)', borderRadius:'8px', width:'150px'}}>
            <button className="dropdown-item" onClick={() => { setShowMyBookings(true); setBookingTab('active'); fetchMyBookings(); setShowProfileMenu(false); }} style={{display:'block', width:'100%', padding:'8px', border:'none', background:'none', textAlign:'left', cursor:'pointer'}}>📅 My Bookings</button>
            <button className="dropdown-item" onClick={() => { setShowMyBookings(true); setBookingTab('history'); fetchMyBookings(); setShowProfileMenu(false); }} style={{display:'block', width:'100%', padding:'8px', border:'none', background:'none', textAlign:'left', cursor:'pointer'}}>📜 History</button>
            <button className="dropdown-item" onClick={() => setIsEditingProfile(true)} style={{display:'block', width:'100%', padding:'8px', border:'none', background:'none', textAlign:'left', cursor:'pointer'}}>✏️ Edit Details</button>
            <button className="dropdown-item" onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{display:'block', width:'100%', padding:'8px', border:'none', background:'none', textAlign:'left', cursor:'pointer', color:'red'}}>🚪 Logout</button>
          </div>
        )}
      </div>

      <nav>
        <ul>
          <li><a href="#home" className={activeSection === 'home' ? 'active' : ''}><span className="nav-icon">🏠</span> Home</a></li>
          <li><a href="#services" className={activeSection === 'services' ? 'active' : ''}><span className="nav-icon">🛠️</span> Services</a></li>
          <li>
            {activeBooking ? (
                <div className={`nav-status-badge nav-${activeBooking.status}`} onClick={() => { setShowMyBookings(true); setBookingTab('active'); }}>
                    {activeBooking.status === 'pending' && "⏳ Booked"}
                    {activeBooking.status === 'accepted' && "✅ Accepted"}
                    {activeBooking.status === 'in_progress' && "🔨 Working"}
                </div>
            ) : (
                <a href="#provider" onClick={() => navigate('/provider-dashboard')}><span className="nav-icon">🤝</span> Join</a>
            )}
          </li>
        </ul>
      </nav>

      <section id="home" className="home">
        <div className="hero-content">
          <h1>Smart Services,<br/><span className="gradient-text">Simplified.</span></h1>
          <p style={{color:'#64748b', fontSize:'1.1rem', marginBottom:'30px'}}>Instantly connect with verified professionals.</p>
          <a href="#services" className="btn">Find a Pro</a>
        </div>
      </section>

      <section id="services" style={{background:'#f8fafc', paddingBottom:'60px'}}>
        <div style={{textAlign:'center', padding:'40px 0'}}>
          <h2 style={{fontSize:'36px', marginBottom:'15px', color:'#0f172a'}}>Our Services</h2>
          <div className="search-container"><input type="text" className="search-input" placeholder="Search services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>
        <div className="service-grid">
          {filteredServices.map(service => (<ServiceCard key={service.id} service={service} onClick={setSelectedServiceId} onImageClick={setZoomedImage} />))}
        </div>
      </section>

      <section id="provider" style={{padding:'60px 20px', textAlign:'center'}}>
        <h2 style={{fontSize:'36px', marginBottom:'20px'}}>Are you a Professional?</h2>
        <p style={{color:'#64748b', marginBottom:'30px'}}>Join our network and grow your business today.</p>
        <button onClick={() => navigate('/provider-dashboard')} className="btn" style={{background:'#0f172a'}}>Join as Provider</button>
      </section>

      {zoomedImage && (<div className="image-zoom-overlay" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="zoomed-img" alt="Full Screen" onClick={(e) => e.stopPropagation()} /><div style={{position:'absolute', top:'20px', right:'20px', color:'white', fontSize:'30px', cursor:'pointer'}}>✖</div></div>)}

      {selectedService && (
        <div className="modal-overlay" onClick={() => setSelectedServiceId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <h2 style={{margin:0}}>{selectedService.service_type === 'Other' ? selectedService.custom_service_name : selectedService.service_type}</h2>
                <button onClick={() => setSelectedServiceId(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer'}}>✖</button>
            </div>
            <p style={{marginBottom:'20px', lineHeight:'1.6', color:'#475569'}}>{selectedService.description || "No specific description provided."}</p>
            <div style={{background:'#f8fafc', padding:'15px', borderRadius:'12px', marginBottom:'20px', border:'1px solid #e2e8f0'}}>
              <p style={{marginBottom:'8px'}}>📞 <strong>Mobile:</strong> {selectedService.mobile}</p>
              <p style={{marginBottom:'8px'}}>✉️ <strong>Email:</strong> {selectedService.contact_email}</p>
              <p style={{marginBottom:'0'}}>⏰ <strong>Hours:</strong> {selectedService.timing}</p>
            </div>
            {selectedService.service_images && selectedService.service_images.length > 0 && (
                <div style={{display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'10px'}}>
                {selectedService.service_images.map(img => (<img key={img.id} src={img.image_url} style={{height:'80px', width:'80px', objectFit:'cover', borderRadius:'10px', border:'1px solid #e2e8f0', cursor: 'zoom-in', flexShrink:0}} onClick={() => setZoomedImage(img.image_url)} alt="Service Detail" />))}
                </div>
            )}
            
            <button onClick={handleBookService} className="btn" disabled={bookingLoading} style={{width:'100%', marginTop:'20px', background: bookingLoading ? '#94a3b8' : '#16a34a', color:'white', padding:'15px', borderRadius:'8px', border:'none', fontSize:'16px', cursor:'pointer'}}>
                {bookingLoading ? "Booking..." : "📅 Book This Service Now"}
            </button>
            
            {/* --- PUBLIC REVIEWS SECTION --- */}
            <div className="modal-reviews">
                <h4 style={{margin:'0 0 10px 0', color:'#334155'}}>Recent Reviews ({serviceReviews.length})</h4>
                {serviceReviews.length === 0 ? (
                    <p style={{color:'#94a3b8', fontStyle:'italic'}}>No reviews yet.</p>
                ) : (
                    <div style={{maxHeight:'200px', overflowY:'auto'}}>
                        {serviceReviews.map((rev, i) => (
                            <div key={i} className="public-review-item">
                                <div className="public-review-header">
                                    <span>{rev.job_details?.name || "Verified Customer"}</span>
                                    <span className="public-star">{'★'.repeat(rev.rating)}</span>
                                </div>
                                <p style={{margin:'5px 0 0 0', fontSize:'0.9rem', color:'#64748b'}}>"{rev.review_text}"</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

          </div>
        </div>
      )}

      {showBookingForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'500px'}}>
            <h3 style={{marginTop:0, marginBottom:'20px'}}>Complete Booking Details</h3>
            <form onSubmit={finalizeBooking}>
                <label className="form-label">Your Name</label>
                <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Who is the contact person?" />
                <label className="form-label">Mobile Number</label>
                <input type="tel" className="form-input" required value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="10-digit number" />
                <label className="form-label">Preferred Date & Time</label>
                <input type="datetime-local" className="form-input" required value={formData.datetime} onChange={e => setFormData({...formData, datetime: e.target.value})} />
                <hr style={{borderTop:'1px solid #eee', margin:'20px 0'}} />
                <h4 style={{margin:'0 0 15px 0', color:'#475569'}}>Address Details</h4>
                <label className="form-label">Building Name / House No</label>
                <input type="text" className="form-input" required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} placeholder="e.g. Sunshine Apartments" />
                <label className="form-label">Flat / Room No</label>
                <input type="text" className="form-input" required value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="e.g. 402, 4th Floor" />
                <label className="form-label">Nearby Landmark</label>
                <input type="text" className="form-input" required value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} placeholder="e.g. Near HDFC Bank" />
                <button type="button" className={`location-btn ${formData.locationLat ? 'detected' : ''}`} onClick={handleGetLocation}>
                    {formData.locationLat ? "✅ Location Captured" : "📍 Detect My Exact Location (GPS)"}
                </button>
                <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <button type="submit" className="btn" style={{flex:1}}>Confirm Booking</button>
                    <button type="button" onClick={() => setShowBookingForm(false)} className="btn" style={{flex:1, background:'#ef4444', boxShadow:'none'}}>Cancel</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="modal-overlay">
            <div className="modal-content" style={{textAlign:'center', maxWidth:'400px'}}>
                <h3>Rate Service Provider</h3>
                <div style={{display:'flex', justifyContent:'center', gap:'10px', margin:'20px 0'}}>
                    {[1,2,3,4,5].map(star => (
                        <span key={star} className={`star-rating ${star <= ratingInput ? 'active' : ''}`} onClick={() => setRatingInput(star)}>★</span>
                    ))}
                </div>
                <textarea className="form-input" style={{height:'80px', resize:'none'}} placeholder="Write a review..." value={reviewTextInput} onChange={e => setReviewTextInput(e.target.value)}></textarea>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn" style={{flex:1}} onClick={submitReview}>Submit Review</button>
                    <button className="btn" style={{flex:1, background:'#94a3b8'}} onClick={() => setShowReviewModal(false)}>Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showMyBookings && (
         <div className="modal-overlay" onClick={() => setShowMyBookings(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h2 style={{margin:0}}>My Bookings</h2>
                    <button onClick={() => setShowMyBookings(false)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer'}}>✖</button>
                </div>
                <div className="modal-tabs">
                    <div className={`tab-item ${bookingTab === 'active' ? 'active' : ''}`} onClick={() => setBookingTab('active')}>Active</div>
                    <div className={`tab-item ${bookingTab === 'history' ? 'active' : ''}`} onClick={() => setBookingTab('history')}>History</div>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    {(bookingTab === 'active' ? activeBookingsList : historyBookingsList).length === 0 ? (
                        <p style={{color:'#9ca3af', textAlign:'center', margin:'20px 0'}}>No {bookingTab} bookings.</p>
                    ) : (
                        (bookingTab === 'active' ? activeBookingsList : historyBookingsList).map(booking => (
                            <div key={booking.id} style={{border:'1px solid #e2e8f0', padding:'15px', borderRadius:'10px'}}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <strong>{booking.services?.service_type === 'Other' ? booking.services?.custom_service_name : booking.services?.service_type}</strong>
                                    <span className={`status-badge status-${booking.status}`}>{booking.status.replace('_', ' ')}</span>
                                </div>
                                <div className="history-date">
                                    {booking.status === 'cancelled' ? 'Cancelled on: ' : 'Booked on: '} 
                                    {formatDate(booking.created_at)}
                                </div>

                                {(booking.status === 'accepted' || booking.status === 'in_progress') && (
                                    <div className="pin-box"><span style={{fontSize:'12px', color:'#64748b'}}>Share this PIN:</span><span className="pin-code">{booking.start_code}</span></div>
                                )}
                                {booking.status === 'pending' && (
                                    <>
                                        <p style={{fontSize:'12px', color:'orange', marginTop:'5px'}}>Waiting for provider...</p>
                                        <button className="btn-cancel" onClick={() => handleCancelBooking(booking.id)}>✖ Cancel Request</button>
                                    </>
                                )}
                                
                                {booking.status === 'completed' && (
                                    <>
                                        <p style={{fontSize:'12px', color:'green', marginTop:'5px', fontWeight:'bold'}}>🎉 Job Completed!</p>
                                        {booking.rating ? (
                                            <div style={{marginTop:'5px', color:'#f59e0b'}}>You Rated: {'★'.repeat(booking.rating)}</div>
                                        ) : (
                                            <button className="btn" style={{padding:'5px 10px', fontSize:'12px', width:'100%', marginTop:'10px', background:'#f59e0b'}} onClick={() => openReviewModal(booking.id)}>Rate Service</button>
                                        )}
                                    </>
                                )}
                                {booking.status === 'cancelled' && <p style={{fontSize:'12px', color:'#991b1b', marginTop:'5px'}}>Request cancelled by you.</p>}
                                
                                {/* 🔴 REJECTION DISPLAY BLOCK */}
                                {booking.status === 'rejected' && (
                                    <div style={{background:'#fef2f2', padding:'10px', borderRadius:'8px', marginTop:'10px', border:'1px solid #fca5a5'}}>
                                        <p style={{margin:0, fontWeight:'bold', color:'#991b1b', fontSize:'14px'}}>❌ Request Declined by Provider</p>
                                        <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'#7f1d1d'}}>
                                            Reason: {booking.rejection_reason || "Provider was not available."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
         </div>
      )}

      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Profile</h2>
            <form onSubmit={async (e) => { e.preventDefault(); if(!currentUser) return; await supabase.from('profiles').update({ full_name: editName, mobile: editMobile }).eq('id', currentUser.id); setIsEditingProfile(false); setShowProfileMenu(false); sendNotification("Updated!", "success"); }} style={{display:'flex', flexDirection:'column', gap:'15px', marginTop:'20px'}}>
              <input type="text" placeholder="Full Name" className="search-input" value={editName} onChange={e => setEditName(e.target.value)} required />
              <input type="text" placeholder="Mobile Number" className="search-input" value={editMobile} onChange={e => setEditMobile(e.target.value)} />
              <div style={{display:'flex', gap:'10px'}}><button type="submit" className="btn" style={{flex:1, marginTop:0}}>Save</button><button type="button" className="btn" style={{flex:1, marginTop:0, background:'#ef4444', boxShadow:'none'}} onClick={() => setIsEditingProfile(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 