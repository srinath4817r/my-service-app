import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Geolocation } from '@capacitor/geolocation'

// =====================
// HELPERS & CONSTANTS
// =====================
const createAddrId = () => crypto.randomUUID()

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

// --- AUDIO NOTIFICATION ---
const playNotificationSound = () => {
    try {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/positive_ping.ogg');
        audio.play().catch(() => console.log("Audio autoplay blocked by browser"));
    } catch(e) {}
}

// --- 0. ANIMATED ICON DATA (SVG PATHS) ---
const ANIMATED_HOME_ICONS = [
  { name: 'Electrical', path: <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /> },
  { name: 'Plumbing', path: <path d="M12 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /> },
  { name: 'Welding', path: <><path d="M3 17h18" /><path d="M7 17V7h10v10" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></> },
  { name: 'Cleaning', path: <><path d="M4 20h16" /><path d="M7 4l10 10" /><path d="M6 5l3 3" /></> },
  { name: 'AC Service', path: <><rect x="3" y="6" width="18" height="8" rx="2" /><line x1="6" y1="18" x2="18" y2="18" /></> },
  { name: 'Carpentry', path: <><path d="M3 3l18 18" /><path d="M7 7l10 10" /></> },
  { name: 'Painting', path: <><path d="M6 3h12v6H6z" /><path d="M12 9v12" /></> },
  { name: 'Appliance', path: <><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="16" r="1" /></> },
  { name: 'Pest Ctrl', path: <><circle cx="12" cy="8" r="3" /><path d="M5 21c1-4 13-4 14 0" /><path d="M4 10l4 2M20 10l-4 2" /></> },
  { name: 'Gardening', path: <><path d="M12 22V12" /><path d="M12 12c4-2 6-6 6-10-4 0-8 2-10 6-2-4-6-6-10-6 0 4 2 8 6 10" /></> }
];

const ANIMATED_BOOKING_ICONS = [
  { name: 'Bookings', path: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></> },
  { name: 'Schedule', path: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
  { name: 'Status', path: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> },
  { name: 'History', path: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></> }
];

const ANIMATED_PROFILE_ICONS = [
  { name: 'Profile', path: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
  { name: 'Account', path: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
  { name: 'Settings', path: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></> }
];

const ANIMATED_QUICK_ICONS = {
  Instant: [
    { emoji: '🚀', ani: 'ani-rocket' },
    { emoji: '🔴', ani: 'ani-warning' },
    { emoji: '⏳', ani: 'ani-hourglass' }
  ],
  Local: [
    { emoji: '🏃', ani: 'ani-run' },
    { emoji: '📍', ani: 'ani-location' },
    { emoji: '🤝', ani: 'ani-handshake' }
  ],
  Premium: [
    { emoji: '👑', ani: 'ani-star' },
    { emoji: '🎉', ani: 'ani-party' },
    { emoji: '📡', ani: 'ani-satellite' }
  ]
};

const QUICK_REVIEW_WORDS = [ "Excellent service 🌟", "On time ⏰", "Very professional 💼", "Highly recommended 👍", "Polite behavior 🤝", "Great value 💰" ];

// =====================
// LEAFLET MAP COMPONENTS
// =====================
const LeafletBookingMap = ({ lat, lng, onLocationChange }) => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!window.L || mapRef.current) return;
        mapRef.current = window.L.map('booking-map-container').setView([lat, lng], 16);
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mapRef.current);
        
        const customIcon = window.L.divIcon({ html: '<div style="font-size:36px; text-shadow: 0 4px 10px rgba(0,0,0,0.4); animation: pinDrop 0.5s ease-out;">📍</div>', className: '', iconSize: [36, 36], iconAnchor: [18, 36] });
        markerRef.current = window.L.marker([lat, lng], {draggable: true, icon: customIcon}).addTo(mapRef.current);

        markerRef.current.on('dragend', function(e) {
            const pos = markerRef.current.getLatLng();
            onLocationChange(pos.lat, pos.lng);
        });

        return () => { mapRef.current?.remove(); mapRef.current = null; }
    }, []);

    useEffect(() => {
        if (mapRef.current && markerRef.current) {
            mapRef.current.setView([lat, lng]);
            markerRef.current.setLatLng([lat, lng]);
        }
    }, [lat, lng]);

    return <div id="booking-map-container" style={{height: '250px', width: '100%', borderRadius: '12px', border: '2px solid #3b82f6', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}></div>
}

// 🔥 NEW: SWIGGY STYLE LIVE MAP COMPONENT
const LeafletLiveMap = ({ id, pLat, pLng, cLat, cLng }) => {
    const mapRef = useRef(null);
    const pMarkerRef = useRef(null);
    const lineRef = useRef(null);

    useEffect(() => {
        if (!window.L || mapRef.current) return;
        
        // Disable scroll zoom so it doesn't interrupt user scrolling on mobile
        mapRef.current = window.L.map(`live-map-${id}`, { zoomControl: false, scrollWheelZoom: false }).setView([cLat, cLng], 14);
        
        // Clean map: Light mode, ONLY roads, no labels
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mapRef.current);
        
        const homeIcon = window.L.divIcon({ html: '<div style="font-size:30px; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">🏠</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
        // The bike icon gets the smooth-glide CSS class
        const bikeIcon = window.L.divIcon({ html: '<div style="font-size:36px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3)); transform: scaleX(-1);">🛵</div>', className: 'bike-pulse smooth-glide', iconSize: [36, 36], iconAnchor: [18, 18] });

        window.L.marker([cLat, cLng], {icon: homeIcon}).addTo(mapRef.current);
        pMarkerRef.current = window.L.marker([pLat, pLng], {icon: bikeIcon}).addTo(mapRef.current);

        // Draw dashed blue routing line between them
        lineRef.current = window.L.polyline([[pLat, pLng], [cLat, cLng]], {
            color: '#3b82f6', 
            weight: 4, 
            dashArray: '8, 8', 
            opacity: 0.8,
            lineCap: 'round'
        }).addTo(mapRef.current);

        // Auto-frame perfectly around both markers
        mapRef.current.fitBounds([[pLat, pLng], [cLat, cLng]], { padding: [40, 40], maxZoom: 17 });

        return () => { mapRef.current?.remove(); mapRef.current = null; }
    }, [id]);

    // 🔥 Update live when provider moves 🔥
    useEffect(() => {
        if (mapRef.current && pMarkerRef.current && lineRef.current) {
            pMarkerRef.current.setLatLng([pLat, pLng]);
            lineRef.current.setLatLngs([[pLat, pLng], [cLat, cLng]]);
            // Gently re-frame as they move closer
            mapRef.current.fitBounds([[pLat, pLng], [cLat, cLng]], { padding: [40, 40], maxZoom: 18, animate: true, duration: 1.5 });
        }
    }, [pLat, pLng, cLat, cLng]);

    return <div id={`live-map-${id}`} style={{height: '280px', width: '100%', borderRadius: '12px', zIndex: 1, border: '2px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}></div>
}

// --- 1. Service Card Component ---
const ServiceCard = ({ service, onClick, onImageClick, onNotifyClick, currentUser }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const clickTimer = useRef(null)
  const navigate = useNavigate()

  const coverImage = service.service_images?.[0]?.image_url
  const galleryImages = service.service_images?.slice(1, 4) || []

  const handleMouseEnter = () => { if (window.innerWidth > 768 && galleryImages.length > 0) setIsExpanded(true); }
  const handleMouseLeave = () => { setIsExpanded(false); }
  const handleMobileClick = () => { if (window.innerWidth <= 768 && galleryImages.length > 0) setIsExpanded(!isExpanded); }

  const handleMediaClick = (e, imgUrl) => {
    e.stopPropagation();
    if (clickTimer.current) {
        clearTimeout(clickTimer.current); clickTimer.current = null;
        onImageClick(imgUrl); 
    } else {
        clickTimer.current = setTimeout(() => {
            clickTimer.current = null; onClick(service.id); 
        }, 250); 
    }
  }
    
  const ratings = service.bookings?.filter(b => b.rating) || [];
  const avg = ratings.length > 0 ? (ratings.reduce((a,b)=>a+b.rating,0)/ratings.length).toFixed(1) : null;

  const myActiveBooking = currentUser && service.bookings?.find(b => b.customer_id === currentUser.id && ['accepted', 'in_progress', 'pending'].includes(b.status));

  const isClosedManually = service.is_available === false;
  const isInstantOrLocal = service.service_type === 'Instant' || service.service_type === 'Local';
  const isOffline = isInstantOrLocal && !service.is_live;
  
  const isBusyWithSomeoneElse = !myActiveBooking && service.bookings?.some(b => {
      if (b.status === 'in_progress') return true;
      if (b.status === 'accepted') {
          const jobTime = b.job_details?.time ? new Date(b.job_details.time).getTime() : 0;
          const now = new Date().getTime();
          const diffHours = (jobTime - now) / (1000 * 60 * 60);
          return diffHours <= 2 && diffHours > -12; 
      }
      return false;
  });

  const isOwner = currentUser && service.provider_id === currentUser.id;

  const displayReason = service.close_reason && service.close_reason.length > 30 ? service.close_reason.substring(0, 30) + '...' : service.close_reason;

  return (
    <div className="card-wrapper" style={{ opacity: (!myActiveBooking && (isOffline || isBusyWithSomeoneElse || isClosedManually)) ? 0.8 : 1 }}>
      <div className={`service-card ${isExpanded ? 'expanded' : ''} ${galleryImages.length > 0 ? 'has-gallery' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleMobileClick}>
        <div className="card-main">
          <div className="cover-img">
            {coverImage ? (
              <>
                <img src={coverImage} alt="Cover" style={{ filter: (!myActiveBooking && (isOffline || isBusyWithSomeoneElse || isClosedManually)) ? 'grayscale(100%)' : 'none' }} onError={(e) => e.target.style.display='none'} onClick={(e) => handleMediaClick(e, coverImage)} />
                <div className="zoom-hint">Double-tap to Zoom</div>
              </>
            ) : (
              <div className="no-image-pattern"><span style={{fontSize:'30px'}} className="ani-hammer">🔨</span><span style={{fontSize:'12px', opacity:0.6}}>No Preview</span></div>
            )}
            {avg && <div style={{position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.9)', padding:'2px 8px', borderRadius:'10px', fontSize:'12px', fontWeight:'bold', color: '#000'}}><span className="ani-star">⭐</span> {avg}</div>}
            
            {isOwner && <div style={{position:'absolute', top:'10px', left:'10px', background:'#3b82f6', color:'white', padding:'4px 10px', borderRadius:'8px', fontSize:'10px', fontWeight:'900', zIndex:10}}>YOU OWN THIS</div>}

            {myActiveBooking ? (
              <div style={{position:'absolute', bottom:0, width:'100%', background:'rgba(16, 185, 129, 0.95)', color:'white', fontSize:'12px', textAlign:'center', padding:'6px 0', fontWeight: 'bold'}}>
                {myActiveBooking.status === 'pending' ? '⏳ Request Sent' : '✅ Provider Accepted!'}
              </div>
            ) : isClosedManually ? (
              <div style={{position:'absolute', bottom:0, width:'100%', background:'rgba(239, 68, 68, 0.95)', color:'white', fontSize:'11px', textAlign:'center', padding:'4px 0', fontWeight: 'bold'}}>
                ⏸️ Closed: {displayReason || 'Temporarily'}
              </div>
            ) : isOffline ? (
              <div style={{position:'absolute', bottom:0, width:'100%', background:'rgba(0,0,0,0.6)', color:'white', fontSize:'11px', textAlign:'center', padding:'4px 0', fontWeight: 'bold'}}>
                Offline Currently
              </div>
            ) : isBusyWithSomeoneElse ? (
              <div style={{position:'absolute', bottom:0, width:'100%', background:'rgba(220, 38, 38, 0.9)', color:'white', fontSize:'11px', textAlign:'center', padding:'4px 0', fontWeight: 'bold'}}>
                <span className="ani-warning">🔴</span> Currently engaged
              </div>
            ) : null}

          </div>
          <div className="card-content">
            <div>
              <h3>{service.service_type === 'Other' ? service.custom_service_name : service.service_type}</h3>
              <p>{service.description ? service.description.substring(0, 50) + '...' : 'No description available'}</p>
            </div>
            
            {isOwner ? (
                <button className="view-btn" style={{background:'#eff6ff', color:'#2563eb', border:'1px solid #dbeafe', boxShadow:'0 4px 0 #bfdbfe'}} onClick={(e) => { e.stopPropagation(); navigate(service.service_type === 'Instant' ? '/instant-provider-dashboard' : '/local-provider-dashboard'); }}>Manage Hub</button>
            ) : myActiveBooking ? (
                <button className="view-btn notify-btn" style={{background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', fontWeight:'800', boxShadow: '0 4px 0 #047857'}} onClick={(e) => { e.stopPropagation(); onClick(service.id); }}>Track Status</button>
            ) : isClosedManually || isOffline ? (
                <button className="view-btn notify-btn" style={{background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', boxShadow: '0 4px 0 #94a3b8'}} onClick={(e) => { e.stopPropagation(); onNotifyClick(service, 'offline'); }}>🔔 Notify When Open</button>
            ) : isBusyWithSomeoneElse ? (
              <button className="view-btn notify-btn" style={{background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', fontWeight:'800', boxShadow: '0 4px 0 #b91c1c'}} onClick={(e) => { e.stopPropagation(); onNotifyClick(service, 'busy'); }}><span className="ani-warning">🔴</span> Engaged: Notify me</button>
            ) : (
              <button className="view-btn" onClick={(e) => { e.stopPropagation(); onClick(service.id); }}>View Details</button>
            )}
          </div>
        </div>
        
        {galleryImages.length > 0 && (
            <div className="card-gallery">
                {galleryImages.map((img) => (
                    <img key={img.id} src={img.image_url} alt="Gallery" onClick={(e) => handleMediaClick(e, img.image_url)} />
                ))}
            </div>
        )}
      </div>
    </div>
  )
}

// --- 2. Main Page ---
export default function CustomerHome() {
  const navigate = useNavigate()
    
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [activeTab, setActiveTab] = useState('home') 
  const [animIndex, setAnimIndex] = useState(0);
  
  const [darkMode, setDarkMode] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [zoomedImage, setZoomedImage] = useState(null) 
    
  const [activeSection, setActiveSection] = useState('home')
  const [currentUser, setCurrentUser] = useState(null)
  const [googleUser, setGoogleUser] = useState({ name: '', avatar: '' }) 
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')

  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [newAddrData, setNewAddrData] = useState({ building: '', room: '', landmark: '', lat: null, lng: null })

  const [bookingLoading, setBookingLoading] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)
  const [bookingTab, setBookingTab] = useState('active') 
  const [myBookings, setMyBookings] = useState([])
  const [showBookingForm, setShowBookingForm] = useState(false); 
    
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewBookingId, setReviewBookingId] = useState(null)
  const [ratingInput, setRatingInput] = useState(0)
  const [reviewTextInput, setReviewTextInput] = useState('')
  
  const [issueBookingId, setIssueBookingId] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelBookingId, setCancelBookingId] = useState(null)
  const [cancelReasonType, setCancelReasonType] = useState('Changed my mind')
  const [cancelCustomReason, setCancelCustomReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const [displayLocation, setDisplayLocation] = useState("Tap to detect location");
  const [isLocating, setIsLocating] = useState(false);

  const [formData, setFormData] = useState({
    name: '', mobile: '', datetime: '', building: '', room: '', landmark: '', locationLat: null, locationLng: null
  })

  // INJECT LEAFLET GLOBALLY FOR MAPS
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setLeafletLoaded(true);
    document.head.appendChild(js);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mediaQuery.matches);
    const handler = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
        if (zoomedImage) setZoomedImage(null);
        else if (showReviewModal) setShowReviewModal(false);
        else if (showCancelModal) setShowCancelModal(false);
        else if (showBookingForm) setShowBookingForm(false);
        else if (isEditingProfile) setIsEditingProfile(false);
        else if (showMyBookings) setShowMyBookings(false);
        else if (selectedServiceId) setSelectedServiceId(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedServiceId, showBookingForm, isEditingProfile, showMyBookings, showReviewModal, showCancelModal, zoomedImage]);

  const openModal = (setter, value) => {
    window.history.pushState(null, ""); 
    setter(value);
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); 
    return now.toISOString().slice(0, 16);
  };
  const getMaxDateTime = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); 
    maxDate.setMinutes(maxDate.getMinutes() - maxDate.getTimezoneOffset());
    return maxDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    const interval = setInterval(() => { setAnimIndex((prev) => prev + 1); }, 2200); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchServices()
    checkUser()
    requestNotificationPermission()
    handleAutoLocation();

    const dataChannel = supabase
      .channel('dashboard-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchServices())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${currentUser?.id}` }, (payload) => { 
          fetchServices(); fetchMyBookings(currentUser?.id); 
          
          if(payload.new.status === 'accepted') {
              playNotificationSound();
              sendNotification("✅ Your booking request was ACCEPTED!", "success", "Booking Confirmed");
          }
          if(payload.new.status === 'completed' && payload.old.status !== 'completed') {
              playNotificationSound();
              sendNotification("🎉 The provider marked the job as Done!", "success", "Work Completed");
              if(isMobile) { setActiveTab('bookings'); setBookingTab('history'); } else { openModal(setShowMyBookings, true); setBookingTab('history'); }
          }
      })
      .subscribe();

    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)

    const handleScroll = () => {
      if (window.innerWidth <= 768) return; 
      const sections = ['home', 'services', 'provider']; 
      for (const section of sections) { 
          const el = document.getElementById(section); 
          if (el) { 
              const rect = el.getBoundingClientRect(); 
              if (rect.top >= -300 && rect.top <= 300) { setActiveSection(section); break } 
          } 
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
          window.removeEventListener('resize', handleResize)
          window.removeEventListener('scroll', handleScroll)
          supabase.removeChannel(dataChannel);
    }
  }, [currentUser?.id])

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') await Notification.requestPermission();
  }

  const sendNotification = (message, type = 'success', systemTitle = 'Update') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    if ('Notification' in window && Notification.permission === 'granted') new Notification(systemTitle, { body: message });
  }

  const handleNotifyMe = async (service, type = 'offline') => {
    if (!currentUser) { sendNotification("Please login to set alerts", "error"); return; }
    
    const customMsg = type === 'busy' 
      ? "Waiting for your current job to finish. I need your service next." 
      : "Wants to know when you're available.";

    const { error } = await supabase.from('notifications').insert([{
      user_id: currentUser.id, provider_id: service.provider_id, user_name: editName || googleUser.name,
      status: 'waiting', custom_message: customMsg
    }]);

    if (!error) { sendNotification(`🔔 Alert set! We'll notify the provider that you are waiting.`, "success"); } else { sendNotification(`Failed to set alert: ${error.message}`, "error"); }
  }

  const saveCurrentAddressToProfile = async () => {
    if (!formData.building || !formData.locationLat) { sendNotification("⚠️ Address & location required", "error"); return; }
    if (savedAddresses.length >= 4) { sendNotification("❌ Max 4 addresses allowed", "error"); return; }

    const isDuplicate = savedAddresses.some(addr => addr.building.toLowerCase().trim() === formData.building.toLowerCase().trim() && addr.room.toLowerCase().trim() === formData.room.toLowerCase().trim());
    if (isDuplicate) return; 

    const newAddr = { id: createAddrId(), building: formData.building, room: formData.room, landmark: formData.landmark, lat: formData.locationLat, lng: formData.locationLng };
    const newList = [...savedAddresses, newAddr];
    const { error } = await supabase.from('profiles').update({ saved_addresses: newList, updated_at: new Date() }).eq('id', currentUser.id);

    if (!error) { setSavedAddresses(newList); sendNotification("Address saved!", "success"); } else { sendNotification(`Failed to save: ${error.message}`, "error"); }
  };

  const addNewAddressDirectly = async () => {
    if (!newAddrData.building || !newAddrData.lat) { sendNotification("⚠️ Building & GPS required", "error"); return; }
    if (savedAddresses.length >= 4) { sendNotification("❌ Max 4 addresses allowed", "error"); return; }

    const isDuplicate = savedAddresses.some(addr => addr.building.toLowerCase().trim() === newAddrData.building.toLowerCase().trim() && addr.room.toLowerCase().trim() === newAddrData.room.toLowerCase().trim());
    if (isDuplicate) { sendNotification("⚠️ This address is already saved!", "error"); return; }

    const newAddr = { id: createAddrId(), building: newAddrData.building, room: newAddrData.room, landmark: newAddrData.landmark, lat: newAddrData.lat, lng: newAddrData.lng };
    const newList = [...savedAddresses, newAddr];

    const { error } = await supabase.from('profiles').update({ saved_addresses: newList, updated_at: new Date() }).eq('id', currentUser.id);

    if (!error) {
        setSavedAddresses(newList); sendNotification("New address added successfully!", "success");
        setIsAddingAddress(false); setNewAddrData({ building: '', room: '', landmark: '', lat: null, lng: null });
    } else { sendNotification(`Failed to save: ${error.message}`, "error"); }
  }

  const deleteSavedAddress = async (id) => {
    if(!confirm("Delete this address?")) return;
    const newList = savedAddresses.filter(a => a.id !== id);
    const { error } = await supabase.from('profiles').update({ saved_addresses: newList, updated_at: new Date() }).eq('id', currentUser.id);
    if(!error) { setSavedAddresses(newList); sendNotification("Address removed", "info"); } else { sendNotification("Failed to delete", "error"); }
  };

  const checkAreaValidity = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      if (!data || !data.address) return { isValid: false, detectedName: "Karimnagar" };
      const addr = data.address;
      
      const poi = addr.amenity || addr.building || addr.shop || addr.tourism || addr.historic || addr.office || null;
      const locality = addr.village || addr.hamlet || addr.town || addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || null;
      const road = addr.road || addr.street || addr.path || null;
      const mandal = addr.county || addr.subdistrict || null;
      const district = addr.city || addr.state_district || addr.municipality || "Karimnagar";

      let headerText = "";
      if (locality && district) headerText = `${locality}, ${district}`;
      else if (locality && mandal) headerText = `${locality}, ${mandal}`;
      else if (road && mandal) headerText = `${road}, ${mandal}`;
      else if (mandal && district) headerText = `${mandal}, ${district}`;
      else if (road && district) headerText = `${road}, ${district}`;
      else headerText = district;

      const formLandmark = [poi, locality, road, mandal].filter(Boolean).join(", ");
      return { isValid: true, matchedArea: formLandmark || district, detectedName: headerText };
    } catch (error) { return { isValid: false, detectedName: "Karimnagar" }; }
  }

  const handleAutoLocation = async () => {
    if (isLocating) return; 
    setIsLocating(true);
    
    const processPosition = async (lat, lng) => {
       const check = await checkAreaValidity(lat, lng);
       requestAnimationFrame(() => {
         setDisplayLocation(check.detectedName);
         if (check.isValid) { setFormData(prev => ({ ...prev, locationLat: lat, locationLng: lng, landmark: check.matchedArea })); }
         setIsLocating(false);
       });
    };

    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      await processPosition(position.coords.latitude, position.coords.longitude);
    } catch (e) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => processPosition(pos.coords.latitude, pos.coords.longitude),
          () => { setDisplayLocation("Karimnagar"); setIsLocating(false); }
        );
      } else { setDisplayLocation("GPS Not Supported"); setIsLocating(false); }
    }
  }

  const handleGetLocation = async () => {
    sendNotification("📡 Detecting location...", "info");
    const processPosition = async (lat, lng) => {
       const check = await checkAreaValidity(lat, lng);
       setFormData(prev => ({ ...prev, locationLat: lat, locationLng: lng, landmark: `${check.matchedArea} (GPS)` }));
       sendNotification(`✅ Location found: ${check.matchedArea}`, "success");
    };

    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      await processPosition(position.coords.latitude, position.coords.longitude);
    } catch (e) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => processPosition(pos.coords.latitude, pos.coords.longitude), () => sendNotification("📍 Please enable location permissions", "error"));
      } else { sendNotification("❌ GPS not supported", "error"); }
    }
  }

  const handleGetLocationForNewAddr = async () => {
    sendNotification("📡 Verifying location...", "info");
    const processPosition = async (lat, lng) => {
       const check = await checkAreaValidity(lat, lng);
       setNewAddrData(prev => ({ ...prev, lat: lat, lng: lng, landmark: `${check.matchedArea}` }));
       sendNotification(`✅ Location Verified: ${check.matchedArea}`, "success");
    };

    try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        await processPosition(position.coords.latitude, position.coords.longitude);
    } catch (e) {
        if ("geolocation" in navigator) { navigator.geolocation.getCurrentPosition((pos) => processPosition(pos.coords.latitude, pos.coords.longitude), () => sendNotification("📍 Allow location access.", "error"));
        } else { sendNotification("❌ GPS not supported.", "error"); }
    }
  }

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/'); return }
    const user = session.user
    setCurrentUser(user)
    const gName = user.user_metadata?.full_name || ''
    const gAvatar = user.user_metadata?.avatar_url || ''
    setGoogleUser({ name: gName, avatar: gAvatar })
  
    let { data, error } = await supabase.from('profiles').select('id, full_name, saved_addresses').eq('id', user.id).limit(1).maybeSingle()
  
    if (!data && !error) {
        const newProfile = { id: user.id, full_name: gName, saved_addresses: [] };
        const { data: created } = await supabase.from('profiles').insert([newProfile]).select('id, full_name, saved_addresses').single();
        if (created) data = created;
    }
    if (error) return;
  
    const profileName = data?.full_name || gName;
    const profileAddr = Array.isArray(data?.saved_addresses) ? data.saved_addresses : [];

    setEditName(profileName); setEditMobile(''); setSavedAddresses(profileAddr);
    setFormData(prev => ({ ...prev, name: profileName, mobile: '' }))
    fetchMyBookings(user.id)
  }

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*, service_images(*), bookings(customer_id, status, rating, review_text, job_details, created_at)').order('created_at', { ascending: false }).order('id', { foreignTable: 'service_images', ascending: true }) 
    if (data) setServices(data)
  }

  const fetchMyBookings = async (userId) => {
    const uid = userId || currentUser?.id;
    if(!uid) return
    const { data } = await supabase.from('bookings').select('*, services(service_type, custom_service_name, mobile)').eq('customer_id', uid).order('created_at', { ascending: false })
    if(data) setMyBookings(data)
  }

  const handleBookService = async () => {
    if(!currentUser) { sendNotification("Please login to book", "error"); return; }
    if (selectedService.is_available === false) { sendNotification("⚠️ This service is currently closed by the provider.", "error"); return; }

    const myActive = selectedService.bookings?.find(b => b.customer_id === currentUser.id && ['accepted', 'in_progress'].includes(b.status));
    if (!myActive) {
      const isActuallyBusy = selectedService.bookings?.some(b => {
          if (b.status === 'in_progress') return true;
          if (b.status === 'accepted') {
              const jobTime = b.job_details?.time ? new Date(b.job_details.time).getTime() : 0;
              const diffHours = (jobTime - new Date().getTime()) / (1000 * 60 * 60);
              return diffHours <= 2 && diffHours > -12; 
          }
          return false;
      });

      if (isActuallyBusy) {
        sendNotification("⚠️ Provider is currently engaged with another customer! Please wait.", "error");
        setSelectedServiceId(null); return;
      }
    }
    openModal(setShowBookingForm, true); 
  }

  const finalizeBooking = async (e) => {
    e.preventDefault(); 
    if (!formData.locationLat || !formData.locationLng) { sendNotification("⚠️ Location is REQUIRED (Use GPS Check)!", "error"); return; }
    if (isSavingAddress) { await saveCurrentAddressToProfile(); }

    setShowBookingForm(false); setBookingLoading(true)
    
    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const jobDetails = { name: formData.name, mobile: formData.mobile, time: formData.datetime, building: formData.building, room: formData.room, landmark: formData.landmark };

      const { error } = await supabase.from('bookings').insert([{ 
          customer_id: currentUser.id, provider_id: selectedService.provider_id, service_id: selectedService.id, 
          start_code: pin, status: 'pending', job_details: jobDetails, customer_lat: formData.locationLat, customer_lng: formData.locationLng
      }])

      if(error) throw error;
      sendNotification("Booking Sent Successfully! 🚀", "success"); 
      setSelectedServiceId(null); fetchMyBookings(currentUser.id); 
      if(isMobile) { setActiveTab('bookings'); setBookingTab('active'); } else { openModal(setShowMyBookings, true); setBookingTab('active'); }
      setFormData(prev => ({ ...prev, datetime: '', building: '', room: '', landmark: '', locationLat: null, locationLng: null }));
      setIsSavingAddress(false);
    } catch (err) { sendNotification("Error: " + err.message, "error"); } finally { setBookingLoading(false); }
  }

  const openReviewModal = (bookingId) => { setReviewBookingId(bookingId); setRatingInput(0); setReviewTextInput(''); openModal(setShowReviewModal, true); }
  const handleQuickWord = (word) => { setReviewTextInput(prev => prev ? `${prev}, ${word}` : word); };

  const submitReview = async () => {
    if(ratingInput === 0) { sendNotification("Please select a star rating!", "error"); return; }
    const { error } = await supabase.from('bookings').update({ rating: ratingInput, review_text: reviewTextInput }).eq('id', reviewBookingId);
    if(!error) { sendNotification("Thanks for your feedback! ⭐", "success"); setShowReviewModal(false); fetchMyBookings(currentUser.id); fetchServices(); } else { sendNotification("Error saving review", "error"); }
  }

  const openCustomerCancelModal = (bookingId) => {
      setCancelBookingId(bookingId); setCancelReasonType('Changed my mind'); setCancelCustomReason(''); openModal(setShowCancelModal, true);
  }

  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    const finalReason = cancelReasonType === 'Other' ? cancelCustomReason : cancelReasonType;
    if(cancelReasonType === 'Other' && !cancelCustomReason.trim()) { alert("Please type a reason."); setCancelLoading(false); return; }
    
    const { error } = await supabase.from('bookings').update({ status: 'cancelled', rejection_reason: `Customer Cancelled: ${finalReason}` }).eq('id', cancelBookingId);

    if (!error) { 
        sendNotification("Booking Cancelled successfully.", "info"); 
        fetchMyBookings(currentUser.id); setShowCancelModal(false); 
    } else { sendNotification("Error cancelling request.", "error"); }
    setCancelLoading(false);
  }

  const formatDate = (isoString) => { if(!isoString) return ''; return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  const activeBookingsList = myBookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status));
  const historyBookingsList = myBookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));
  const activeBooking = activeBookingsList.length > 0 ? activeBookingsList[0] : null;
  const selectedService = services.find(s => s.id === selectedServiceId)
  const filteredServices = services.filter(service => service.service_type.toLowerCase().includes(searchTerm.toLowerCase()) || service.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  const userInitial = editName ? editName.charAt(0).toUpperCase() : 'U'
  const isCurrentServiceActive = selectedService && activeBookingsList.some(b => b.service_id === selectedService.id);

  // =====================
  // 🔥 SWIGGY TRACKER UI
  // =====================
  const renderLiveTracker = (booking) => {
      const { provider_lat, provider_lng, customer_lat, customer_lng } = booking;
      
      if (!provider_lat || !provider_lng) {
          return (
              <div className="tracker-waiting-box">
                  <span className="ani-satellite" style={{fontSize: '24px', marginBottom: '10px'}}>📡</span>
                  <p style={{margin:0, fontWeight:'600'}}>Waiting for provider's GPS signal...</p>
                  <small style={{opacity:0.7}}>They will appear here once they start the journey.</small>
              </div>
          )
      }

      const distance = calculateDistance(provider_lat, provider_lng, customer_lat, customer_lng);
      const etaMins = Math.ceil((distance / 20) * 60) || 1;

      return (
          <div className="live-tracker-container">
              <div className="tracker-header">
                  <div>
                    <h4 style={{margin: 0, color: '#047857', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span className="ani-run">🛵</span> Provider is on the way!
                    </h4>
                    <p style={{margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-sub)'}}>Est. Arrival Time: <strong>{etaMins} Mins</strong></p>
                  </div>
                  <div className="eta-badge">{distance.toFixed(1)} km</div>
              </div>

              {/* 🔥 CUSTOM LEAFLET MAP INJECTION 🔥 */}
              {leafletLoaded && <LeafletLiveMap id={booking.id} pLat={provider_lat} pLng={provider_lng} cLat={customer_lat} cLng={customer_lng} />}
          </div>
      )
  }

  const renderBookingList = () => (
    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
        {(bookingTab === 'active' ? activeBookingsList : historyBookingsList).length === 0 ? (
            <div style={{textAlign:'center', padding:'40px 20px', color: darkMode ? '#94a3b8' : '#94a3b8'}}>
                <span className="ani-mailbox" style={{fontSize:'40px', display:'block', marginBottom:'10px'}}>📭</span>
                <p>No {bookingTab} bookings found.</p>
            </div>
        ) : (
            (bookingTab === 'active' ? activeBookingsList : historyBookingsList).map(booking => {
                const jobTime = booking.job_details?.time ? new Date(booking.job_details.time).getTime() : 0;
                const now = new Date().getTime();
                const diffHours = jobTime ? (jobTime - now) / (1000 * 60 * 60) : 999;
                const isWithin5Hours = diffHours < 5 && diffHours > -12;
                const isJourneyStarted = !!booking.provider_lat || booking.status === 'in_progress';

                return (
                    <div key={booking.id} className="booking-card-ui">
                        <div className="booking-header">
                            <span className="booking-service-name">{booking.services?.service_type === 'Other' ? booking.services?.custom_service_name : booking.services?.service_type}</span>
                            <span className={`booking-status-badge status-${booking.status}`}>{booking.status === 'in_progress' ? 'Working...' : booking.status.replace('_', ' ')}</span>
                        </div>
                        <div className="booking-body">
                            <div className="booking-row"><span className="ani-calendar">🗓️</span> <span>{formatDate(booking.created_at)}</span></div>
                            {booking.status === 'pending' && <div className="booking-row text-orange"><span className="ani-hourglass">⏳</span> <span>Waiting for acceptance...</span></div>}
                        </div>
                        <div className="booking-footer">
                            
                            {(booking.status === 'accepted' || booking.status === 'in_progress') && (
                                <>
                                    <div className="pin-container"><span className="pin-label">Start PIN:</span><span className="pin-value">{booking.start_code}</span></div>
                                    {renderLiveTracker(booking)}
                                    
                                    {/* 🔥 CALL PROVIDER BUTTON 🔥 */}
                                    <a href={`tel:${booking.services?.mobile}`} style={{textDecoration: 'none'}}>
                                        <button className="action-btn" style={{background: '#2563eb', color: 'white', marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                            <svg className="info-svg" viewBox="0 0 24 24" style={{color:'white', margin:0, width:'20px', height:'20px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                            Call Provider
                                        </button>
                                    </a>
                                </>
                            )}
                            
                            {booking.status === 'pending' && (
                                <button className="action-btn btn-cancel-ui" onClick={() => openCustomerCancelModal(booking.id)}>Cancel Request</button>
                            )}

                            {booking.status === 'accepted' && (
                                isJourneyStarted ? (
                                    <button className="action-btn btn-cancel-ui" disabled style={{opacity: 0.5, cursor: 'not-allowed', padding: '12px 5px', fontSize: '0.8rem', marginTop: '10px'}}>
                                        🚫 Provider is on the way (Cannot Cancel)
                                    </button>
                                ) : isWithin5Hours ? (
                                    <button className="action-btn btn-cancel-ui" disabled style={{opacity: 0.5, cursor: 'not-allowed', padding: '12px 5px', fontSize: '0.8rem', marginTop: '10px'}}>
                                        🚫 Cannot Cancel (Starts within 5 hrs)
                                    </button>
                                ) : (
                                    <button className="action-btn btn-cancel-ui" style={{marginTop: '10px'}} onClick={() => openCustomerCancelModal(booking.id)}>Cancel Booking</button>
                                )
                            )}

                            {/* 🔥 COMPLETION VERIFICATION FLOW 🔥 */}
                            {booking.status === 'completed' && !booking.rating && (
                                <div style={{background: 'var(--bg-body)', padding: '15px', borderRadius: '12px', border: '1px solid #16a34a', marginTop: '10px'}}>
                                    <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#166534'}}>The provider marked this job as Done.</p>
                                    {issueBookingId === booking.id ? (
                                        <div style={{background: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px dashed #d97706'}}>
                                            <p style={{margin: '0 0 10px 0', fontSize: '13px', color: '#b45309'}}>Please contact the provider to resolve the issue:</p>
                                            <a href={`tel:${booking.services?.mobile}`} style={{textDecoration:'none'}}><button className="action-btn" style={{background: '#d97706', color:'white', marginBottom: '10px'}}>📞 Call Provider</button></a>
                                            <button className="action-btn" onClick={() => setIssueBookingId(null)} style={{background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)'}}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-sub)'}}>Did they complete the work successfully?</p>
                                            <div style={{display: 'flex', gap: '10px'}}>
                                                <button className="action-btn" style={{flex: 1, background: '#16a34a', color:'white', margin:0}} onClick={() => openReviewModal(booking.id)}>✅ Yes, Rate Them</button>
                                                <button className="action-btn" style={{flex: 1, background: '#ef4444', color:'white', margin:0}} onClick={() => setIssueBookingId(booking.id)}>❌ No, I need help</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {booking.status === 'completed' && booking.rating && <div className="rated-badge">You Rated: {'★'.repeat(booking.rating)}</div>}
                            {booking.status === 'rejected' && <div className="rejection-box"><strong className="ani-prohibited">🚫</strong> <strong>Declined:</strong> {booking.rejection_reason || "Provider busy."}</div>}
                            {booking.status === 'cancelled' && booking.rejection_reason && <div className="rejection-box" style={{background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-sub)'}}>ℹ️ {booking.rejection_reason}</div>}
                        </div>
                    </div>
                )
            })
        )}
    </div>
  )

  const hasPending = activeBookingsList.some(b => b.status === 'pending');
  const hasActive = activeBookingsList.some(b => ['accepted', 'in_progress'].includes(b.status));
  const currentFloatingBooking = activeBookingsList.find(b => ['accepted', 'in_progress'].includes(b.status));
  let bookingLabel = hasPending ? 'Pending' : (hasActive ? 'Active' : 'Bookings');

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <style>{`
        /* --- THEME VARIABLES --- */
        :root {
            --bg-body: #f8fafc;
            --bg-card: #ffffff;
            --text-main: #1e293b;
            --text-sub: #64748b;
            --border-color: #e2e8f0;
            --input-bg: #ffffff;
            --nav-bg: rgba(255, 255, 255, 0.95);
            --shadow-color: rgba(0,0,0,0.05);
        }
        .dark-mode {
            --bg-body: #0f172a;
            --bg-card: #1e293b;
            --text-main: #f1f5f9;
            --text-sub: #94a3b8;
            --border-color: #334155;
            --input-bg: #334155;
            --nav-bg: rgba(30, 41, 59, 0.95);
            --shadow-color: rgba(0,0,0,0.4);
        }

        body { background-color: var(--bg-body); color: var(--text-main); transition: background-color 0.3s, color 0.3s; }
        .app-container { min-height: 100vh; background-color: var(--bg-body); }
        
        /* 🔥 NEW SVG ANIMATION STYLES 🔥 */
        .info-svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; margin-right: 8px; flex-shrink: 0; color: #3b82f6; }
        .svg-phone path { stroke-dasharray: 8; animation: dashMove 1s linear infinite; }
        @keyframes dashMove { to { stroke-dashoffset: -16; } }
        .svg-mail { animation: floatMail 2s ease-in-out infinite; }
        @keyframes floatMail { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .svg-clock .hands { transform-origin: 12px 12px; animation: spinClock 2s linear infinite; }
        @keyframes spinClock { to { transform: rotate(360deg); } }

        /* 🔥 SWIGGY HEADER STYLES 🔥 */
        .swiggy-header { position: sticky; top: 0; left: 0; width: 100%; background: var(--bg-card); padding: 12px 16px; z-index: 2000; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: all 0.3s ease; }
        .loc-icon-box { font-size: 24px; color: #e11d48; animation: bounce 2s infinite; }
        .loc-info { flex: 1; display: flex; flex-direction: column; cursor: pointer; }
        .loc-label { font-size: 10px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; }
        .loc-value-wrapper { width: 150px; overflow: hidden; white-space: nowrap; mask-image: linear-gradient(to right, black 85%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); display: flex; align-items: center; }
        .scroll-text { display: inline-block; font-size: 14px; font-weight: 700; color: var(--text-main); animation: scrollText 5s linear infinite alternate; padding-right: 10px; }
        @keyframes scrollText { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(min(0px, calc(150px - 100%))); } }
        .arrow-down { font-size: 10px; color: var(--text-sub); transition: transform 0.2s; margin-left: 4px; }
        .loc-info:active .arrow-down { transform: rotate(180deg); }
        .profile-icon-header { width: 38px; height: 38px; border-radius: 50%; overflow: hidden; border: 2px solid #e2e8f0; background: #f1f5f9; flex-shrink: 0; cursor: pointer; }

        /* 🔥 GLOBAL 3D BUTTON STYLES 🔥 */
        button, .btn, .view-btn, .action-btn, .location-btn { border-radius: 50px !important; transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1); position: relative; transform: translateY(0); box-shadow: 0 4px 0 rgba(0,0,0,0.2); font-weight: 700 !important; text-transform: uppercase; letter-spacing: 0.5px; border: none; cursor: pointer; }
        button:active, .btn:active, .view-btn:active, .action-btn:active, .location-btn:active { transform: translateY(4px) !important; box-shadow: 0 0 0 rgba(0,0,0,0) !important; }
        .btn { background: #3b82f6; box-shadow: 0 4px 0 #1d4ed8; color: white; padding: 12px 30px; display: inline-block; text-decoration: none; }
        .view-btn { padding: 10px; width: 100%; margin-top: 15px; color: #3b82f6; background: #eff6ff; box-shadow: 0 4px 0 #bfdbfe; }
        .action-btn { padding: 12px; width: 100%; font-size: 0.9rem; }
        .btn-cancel-ui { background: #fee2e2; color: #991b1b; box-shadow: 0 4px 0 #fecaca; }
        .btn-rate-ui { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: white; box-shadow: 0 4px 0 #b45309; }
        .location-btn { background: #f59e0b; color: white; padding: 10px; width: 100%; display: flex; justify-content: center; align-items: center; gap: 5px; box-shadow: 0 4px 0 #d97706; }
        .location-btn.detected { background: #10b981; box-shadow: 0 4px 0 #047857; }
        
        .service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 40px; padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
        .card-wrapper { position: relative; height: 420px; z-index: 1; }
        .service-card { position: absolute; top: 0; left: 0; width: 100%; height: 420px; background: var(--bg-card); border-radius: 20px; box-shadow: 0 10px 30px var(--shadow-color); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--border-color); z-index: 10; }
        .service-card.has-gallery:hover, .service-card.expanded.has-gallery { height: auto; min-height: 420px; transform: scale(1.05); z-index: 100; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .card-main { flex: 1; display: flex; flex-direction: column; height: 100%; }
        .cover-img { height: 200px; min-height: 200px; width: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; cursor: pointer; }
        .cover-img img { width: 100%; height: 100%; object-fit: cover; }
        .zoom-hint { position: absolute; bottom: 25px; right: 10px; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 4px 10px; border-radius: 20px; pointer-events: none; opacity: 0; transition: opacity 0.3s ease; }
        .service-card:hover .zoom-hint { opacity: 1; }
        .card-content { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; color: var(--text-main); }
        .card-content h3 { margin: 0 0 10px 0; font-size: 1.2rem; color: var(--text-main); }
        .card-content p { font-size: 0.9rem; color: var(--text-sub); margin: 0; }
        .card-gallery { display: flex; gap: 10px; padding: 0 20px; max-height: 0; opacity: 0; overflow-x: auto; flex-wrap: nowrap; transform-origin: top center; transform: rotateX(-90deg); transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .service-card.has-gallery:hover .card-gallery, .service-card.expanded.has-gallery .card-gallery { max-height: 100px; opacity: 1; padding-bottom: 20px; transform: rotateX(0deg); }
        .card-gallery img { width: 70px; height: 70px; object-fit: cover; border-radius: 8px; flex-shrink: 0; border: 1px solid var(--border-color); cursor: zoom-in; }
        
        .search-container { margin: 0 auto; max-width: 600px; position: relative; }
        .search-input { width: 100%; padding: 15px 20px; border-radius: 50px; border: 1px solid var(--border-color); font-size: 16px; box-shadow: 0 4px 6px -1px var(--shadow-color); outline: none; background: var(--bg-card); color: var(--text-main); }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        
        .star-rating { font-size: 30px; cursor: pointer; color: var(--border-color); transition: color 0.2s; }
        .star-rating.active { color: #f59e0b; }
        .star-rating.active:hover { color: #d97706; }
        .star-rating:hover { color: #fbbf24; }
        
        .quick-words-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; justify-content: center; }
        .quick-word-chip { background: var(--bg-body); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-weight: 600; }
        .quick-word-chip:hover { background: #eff6ff; border-color: #3b82f6; color: #2563eb; }
        .quick-word-chip:active { transform: scale(0.95); }
        
        .toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 14px 28px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); z-index: 99999; font-weight: 700; display: flex; align-items: center; gap: 10px; animation: slideDown 0.3s ease; }
        .toast-error { background: #ef4444; }
        .toast-info { background: #3b82f6; }
        
        .dropdown-item-style { display: block; width: 100%; padding: 10px 12px; border: none; background: none; text-align: left; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--text-sub); border-radius: 8px; transition: background 0.2s; }
        .dropdown-item-style:hover { background: var(--bg-body); }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        
        .booking-card-ui { background: var(--bg-card); border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px var(--shadow-color); border: 1px solid var(--border-color); transition: transform 0.2s ease; }
        .booking-card-ui:active { transform: scale(0.99); }
        .booking-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--bg-body); }
        .booking-service-name { font-size: 1.1rem; font-weight: 700; color: var(--text-main); }
        .booking-status-badge { font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-pending { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
        .status-accepted { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .status-in_progress { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        .status-completed { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .status-cancelled { background: #fef2f2; color: #b91c1c; }
        .status-rejected { background: #f3f4f6; color: #64748b; text-decoration: line-through; }
        .booking-body { display: flex; flexDirection: column; gap: 8px; margin-bottom: 15px; }
        .booking-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-sub); }
        .text-orange { color: #d97706; font-weight: 500; }
        .booking-footer { display: flex; flex-direction: column; gap: 10px; }
        
        .pin-container { background: var(--bg-body); border: 2px dashed var(--border-color); padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .pin-label { font-size: 0.8rem; color: var(--text-sub); font-weight: 600; }
        .pin-value { font-size: 1.2rem; font-weight: 800; color: var(--text-main); letter-spacing: 2px; }
        .rated-badge { text-align: center; color: #d97706; font-weight: 600; background: #fffbeb; padding: 8px; border-radius: 8px; }
        .rejection-box { background: #fef2f2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 0.85rem; border: 1px solid #fecaca; }
        
        /* 🔥 LEAFLET MAP TRANSITIONS & ANIMATIONS 🔥 */
        .leaflet-marker-icon { transition: transform 1.5s linear !important; }
        @keyframes bounceBike { 0% { transform: translateY(0); } 50% { transform: translateY(-5px); } 100% { transform: translateY(0); } }
        .bike-pulse { animation: bounceBike 0.8s ease-in-out infinite; }
        @keyframes pinDrop { 0% { transform: translateY(-20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

        .modal-tabs { display: flex; background: var(--bg-body); padding: 4px; border-radius: 12px; margin-bottom: 20px; }
        .tab-item { flex: 1; text-align: center; padding: 10px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; color: var(--text-sub); cursor: pointer; transition: all 0.2s ease; }
        .tab-item.active { background: var(--bg-card); color: var(--text-main); shadow: 0 2px 5px rgba(0,0,0,0.05); }
        
        .page-enter { animation: fadeScale 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .floating-status-badge { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--bg-card); color: var(--text-main); padding: 8px 20px; border-radius: 30px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 5px 15px rgba(0,0,0,0.1); border: 1px solid var(--border-color); z-index: 999; display: flex; align-items: center; gap: 8px; animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUpFade { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        
        .mobile-nav-bar { position: fixed; bottom: 0; left: 0; width: 100%; height: 75px; background: var(--nav-bg); backdrop-filter: blur(20px); border-top: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-around; align-items: center; z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.03); padding-bottom: env(safe-area-inset-bottom); }
        .mobile-nav-item { background: none; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-sub); position: relative; transition: all 0.2s ease; width: 70px; cursor: pointer; }
        .mobile-nav-item:active { transform: scale(0.9); }
        .mobile-nav-item.active { color: #3b82f6; }
        .anim-icon-box { position: relative; width: 24px; height: 24px; margin-bottom: 4px; }
        .anim-icon { position: absolute; inset: 0; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transform: scale(0.6) rotate(-10deg); transition: opacity 0.6s ease, transform 0.6s cubic-bezier(.4,0,.2,1); }
        .anim-icon.active { opacity: 1; transform: scale(1) rotate(0deg); }
        .anim-icon.exit { opacity: 0; transform: scale(0.6) rotate(10deg); }
        .nav-label-span { font-size: 10px; font-weight: 600; opacity: 0.8; transition: opacity 0.3s ease; }
        .mobile-nav-item.active .nav-label-span { opacity: 1; font-weight: 700; }
        
        .quick-actions-container { padding: 10px 20px 20px 20px; display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .quick-actions-container::-webkit-scrollbar { display: none; } 
        .quick-card { flex: 0 0 auto; width: 130px; background: var(--bg-card); border-radius: 16px; padding: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid var(--border-color); transition: transform 0.2s ease; cursor: pointer; }
        .quick-card:active { transform: scale(0.95); }
        .quick-icon-circle { width: 44px; height: 44px; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .instant-bg { background: #fff1f2; color: #e11d48; }
        .local-bg { background: #f0fdf4; color: #16a34a; }
        .quick-card span { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-main); }
        .quick-card small { font-size: 0.7rem; color: var(--text-sub); }
        .google-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
        .saved-addr-card { background: var(--bg-body); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); }
        
        nav ul { list-style: none; display: flex; gap: 20px; align-items: center; background: var(--bg-card); padding: 10px 25px; border-radius: 50px; border: 1px solid var(--border-color); box-shadow: 0 4px 20px var(--shadow-color); }
        nav a { text-decoration: none; color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 5px; cursor: pointer; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; perspective: 1500px; }
        .modal-content { background: var(--bg-card); width: 100%; max-width: 500px; border-radius: 16px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; position:relative; color: var(--text-main); transform-origin: left center; animation: bookPageTurn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes bookPageTurn { from { transform: rotateY(-90deg) scale(0.9); opacity: 0; } to { transform: rotateY(0deg) scale(1); opacity: 1; } }
        
        .image-zoom-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 99999; display: flex; justify-content: center; align-items: center; cursor: pointer; }
        .zoomed-img { max-width: 90%; max-height: 90vh; border-radius: 8px; }
        
        .nav-status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; transition: all 0.3s ease; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .nav-pending { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
        .nav-accepted { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .nav-in_progress { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
        
        .hero-content { text-align: center; padding: 60px 20px; }
        .hero-content h1 { font-size: 3rem; margin-bottom: 10px; color: var(--text-main); }
        .gradient-text { background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .form-label { display: block; margin-bottom: 5px; font-weight: 600; color: var(--text-main); }
        .form-input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 15px; outline: none; background: var(--input-bg); color: var(--text-main); }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        
        .no-services { text-align: center; padding: 60px 20px; grid-column: 1 / -1; }
        .no-services h3 { font-size: 1.5rem; color: var(--text-main); margin-bottom: 10px; }
        .no-services p { color: var(--text-sub); font-size: 1rem; max-width: 400px; margin: 0 auto; }
        
        @media(max-width: 768px) { 
            .service-grid { grid-template-columns: 1fr; padding: 20px; } 
            .service-card.has-gallery:hover, .service-card.expanded.has-gallery { height: auto; transform: none; box-shadow: 0 10px 30px var(--shadow-color); z-index: 10; }
        }

        .emoji { display: inline-block; }
        .ani-warning { animation: warningPulse 1s infinite; display: inline-block; }
        @keyframes warningPulse { 0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 0, 0, 0)); } 50% { transform: scale(1.2); filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.8)); } 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 0, 0, 0)); } }
        .ani-mailbox { animation: sway 2s ease-in-out infinite; transform-origin: bottom center; display: inline-block; }
        @keyframes sway { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        .ani-run { animation: sprint 0.6s infinite alternate ease-in-out; display: inline-block; }
        @keyframes sprint { from { transform: translateY(0) skewX(0deg); } to { transform: translateY(-3px) skewX(-15deg); } }
        .ani-satellite { animation: float 3s ease-in-out infinite; display: inline-block; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .ani-prohibited { animation: shakeNo 0.5s ease-in-out infinite; display: inline-block; }
        @keyframes shakeNo { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .ani-location { animation: pinDrop 1.5s ease-out infinite; transform-origin: bottom center; display: inline-block; }
        .ani-cross { animation: pulseBig 1.5s infinite; display: inline-block; }
        @keyframes pulseBig { 0% { transform: scale(1); } 50% { transform: scale(1.3); opacity: 0.8; } 100% { transform: scale(1); } }
        .ani-rocket { animation: launch 0.2s infinite; display: inline-block; }
        @keyframes launch { 0% { transform: translate(1px, 1px) rotate(0deg); } 25% { transform: translate(-1px, -2px) rotate(-1deg); } 50% { transform: translate(-2px, 0px) rotate(1deg); } 75% { transform: translate(2px, 1px) rotate(0deg); } 100% { transform: translate(1px, -1px) rotate(0deg); } }
        .ani-party { animation: tada 1.2s ease-in-out infinite; display: inline-block; }
        @keyframes tada { 0% { transform: scale(1); } 10%, 20% { transform: scale(0.9) rotate(-3deg); } 30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); } 40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); } 100% { transform: scale(1) rotate(0); } }
        .ani-hammer { animation: hammerHit 1.5s infinite; transform-origin: bottom right; display: inline-block; }
        @keyframes hammerHit { 0% { transform: rotate(0deg); } 30% { transform: rotate(45deg); } 50% { transform: rotate(-45deg); } 60% { transform: rotate(-45deg) scale(1.1); } 100% { transform: rotate(0deg); } }
        .ani-hourglass { animation: flip 3s infinite; display: inline-block; }
        @keyframes flip { 0% { transform: rotate(0); } 40% { transform: rotate(180deg); } 100% { transform: rotate(180deg); } }
        .ani-multiply { animation: spin 2s linear infinite; display: inline-block; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .ani-calendar { animation: wobble 2s infinite; display: inline-block; }
        @keyframes wobble { 0% { transform: perspective(400px) rotateY(0); } 50% { transform: perspective(400px) rotateY(20deg); } 100% { transform: perspective(400px) rotateY(0); } }
        .ani-trash { animation: trashToss 1.5s infinite; display: inline-block; }
        @keyframes trashToss { 0% { transform: rotate(0); } 25% { transform: rotate(15deg); } 50% { transform: rotate(-15deg); } 100% { transform: rotate(0); } }
        .ani-star { animation: twinkle 1.5s infinite alternate; display: inline-block; }
        @keyframes twinkle { 0% { transform: scale(1); opacity: 0.5; filter: grayscale(100%); } 100% { transform: scale(1.3) rotate(10deg); opacity: 1; filter: drop-shadow(0 0 10px gold); } }
        .ani-handshake { animation: firmShake 2s ease-in-out infinite; display: inline-block; }
        @keyframes firmShake { 0% { transform: translateY(0) rotate(0); } 10% { transform: translateY(2px) rotate(-5deg); } 20% { transform: translateY(-2px) rotate(5deg); } 30% { transform: translateY(2px) rotate(-5deg); } 40% { transform: translateY(-2px) rotate(5deg); } 50% { transform: translateY(0) rotate(0); } 100% { transform: translateY(0) rotate(0); } }
        .ani-door { animation: doorExit 2s ease-in-out infinite; display: inline-block; }
        @keyframes doorExit { 0% { transform: translateX(0) scale(1); opacity: 1; } 30% { transform: translateX(-3px) scale(0.95); } 60% { transform: translateX(10px) scale(1.1); opacity: 0; } 61% { transform: translateX(-10px) scale(0.8); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
        .ani-arrow { animation: pointLeft 1s infinite; display: inline-block; }
        @keyframes pointLeft { 0% { transform: translateX(0); } 50% { transform: translateX(-10px); } 100% { transform: translateX(0); } }
      `}</style>
      
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' && '✅'} {toast.type === 'error' && <span className="ani-cross">❌</span>} {toast.type === 'info' && 'ℹ️'} {toast.message}
        </div>
      )}

      {/* 🔴 CUSTOMER CANCEL MODAL UI */}
      {showCancelModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{marginTop:0, borderBottom:'1px solid #ef4444', paddingBottom:'10px', color: '#ef4444'}}>Cancel Booking</h3>
                <p style={{fontSize:'0.9rem', color:'var(--text-sub)'}}>Please tell us why you are cancelling:</p>
                <div style={{margin:'20px 0'}}>
                    {['Changed my mind', 'Found someone else', 'Rescheduling', 'Other'].map(reason => (
                        <div key={reason} className={`reason-option ${cancelReasonType === reason ? 'selected' : ''}`} 
                             onClick={() => setCancelReasonType(reason)}
                             style={{
                                display: 'block', padding: '12px', background: cancelReasonType === reason ? '#fee2e2' : 'var(--bg-body)', 
                                color: cancelReasonType === reason ? '#991b1b' : 'var(--text-main)',
                                border: `1px solid ${cancelReasonType === reason ? '#ef4444' : 'var(--border-color)'}`, 
                                borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', fontWeight: cancelReasonType === reason ? 'bold' : 'normal'
                             }}>
                            {reason}
                        </div>
                    ))}
                    {cancelReasonType === 'Other' && (
                        <textarea className="dash-textarea form-input" placeholder="Please type your reason here..." value={cancelCustomReason} onChange={(e) => setCancelCustomReason(e.target.value)} style={{marginTop:'10px', minHeight:'60px'}} />
                    )}
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="action-btn" style={{background:'#ef4444', color:'white'}} onClick={handleConfirmCancel} disabled={cancelLoading}>
                        {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
                    </button>
                    <button className="action-btn" style={{background:'var(--bg-body)', color:'var(--text-main)', border: '1px solid var(--border-color)'}} onClick={() => setShowCancelModal(false)}>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
      )}

      {isMobile ? (
        <div className="mobile-layout-container" style={{position:'fixed', top:0, left:0, width:'100%', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-body)'}}>
            
            <div className="swiggy-header">
                <div className="loc-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'#e11d48'}}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                </div>
                <div className="loc-info" onClick={handleAutoLocation}>
                    <span className="loc-label">Current Location</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <div className="loc-value-wrapper">
                            <span className="scroll-text">{isLocating ? "Detecting..." : displayLocation}</span> 
                        </div>
                        <span className="arrow-down">▼</span>
                    </div>
                    {!isLocating && displayLocation === "Tap to detect location" && (
                        <span style={{fontSize:'10px', color:'var(--text-sub)'}}>Click here to update</span>
                    )}
                </div>
                <div className="profile-icon-header" onClick={() => setActiveTab('profile')}>
                     {googleUser.avatar ? (
                        <img src={googleUser.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="P" />
                     ) : (
                        <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6', fontWeight:'bold'}}>{userInitial}</div>
                     )}
                </div>
            </div>

            <div id="mobile-scroll-view" style={{flex:1, overflowY:'auto', paddingBottom:'90px', WebkitOverflowScrolling:'touch'}}>
              
              {activeTab === 'home' && (
                <div className="page-enter">
                  <div className="hero-content" style={{padding:'40px 20px 20px 20px'}}>
                    <h1 style={{fontSize:'2.2rem'}}>Smart Services</h1>
                    <p style={{color:'var(--text-sub)'}}>Instantly connect with verified professionals.</p>
                  </div>

                  <div className="quick-actions-container">
                    <div className="quick-card" onClick={() => { setSearchTerm('Instant'); }}>
                      <div className="quick-icon-circle instant-bg">
                        <span className={`emoji ${ANIMATED_QUICK_ICONS.Instant[animIndex % 3].ani}`}>
                            {ANIMATED_QUICK_ICONS.Instant[animIndex % 3].emoji}
                        </span>
                      </div>
                      <span>Instant Service</span>
                      <small>Home Delivery</small>
                    </div>

                    <div className="quick-card" onClick={() => { setSearchTerm('Local'); }}>
                      <div className="quick-icon-circle local-bg">
                        <span className={`emoji ${ANIMATED_QUICK_ICONS.Local[animIndex % 3].ani}`}>
                            {ANIMATED_QUICK_ICONS.Local[animIndex % 3].emoji}
                        </span>
                      </div>
                      <span>Local Boys</span>
                      <small>Fast Support</small>
                    </div>

                    <div className="quick-card" onClick={() => setSearchTerm('Premium')}>
                      <div className="quick-icon-circle" style={{background:'#fffbeb', color:'#f59e0b'}}>
                        <span className={`emoji ${ANIMATED_QUICK_ICONS.Premium[animIndex % 3].ani}`}>
                            {ANIMATED_QUICK_ICONS.Premium[animIndex % 3].emoji}
                        </span>
                      </div>
                      <span>Premium</span>
                      <small>Elite Pros</small>
                    </div>
                  </div>

                  <div className="search-container" style={{padding:'0 20px'}}><input type="text" className="search-input" placeholder="Search services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  
                  <div className="service-grid">
                      {filteredServices.length > 0 ? (
                          filteredServices.map(service => (
                            <ServiceCard key={service.id} service={service} currentUser={currentUser} onClick={(id) => openModal(setSelectedServiceId, id)} onImageClick={(img) => openModal(setZoomedImage, img)} onNotifyClick={handleNotifyMe} />
                          ))
                      ) : (
                          <div className="no-services">
                              <div style={{fontSize:'50px', marginBottom:'20px'}}><span className="ani-hammer">🔨</span></div>
                              <h3>Coming Soon!</h3>
                              <p>We will bring the service provider soon who are professionals.</p>
                          </div>
                      )}
                  </div>
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="page-enter" style={{padding:'20px'}}>
                    <h2 style={{fontSize:'24px', marginBottom:'20px', fontWeight:'800', color:'var(--text-main)'}}>My Bookings</h2>
                    <div className="modal-tabs">
                        <div className={`tab-item ${bookingTab === 'active' ? 'active' : ''}`} onClick={() => setBookingTab('active')}>Active</div>
                        <div className={`tab-item ${bookingTab === 'history' ? 'active' : ''}`} onClick={() => setBookingTab('history')}>History</div>
                    </div>
                    {renderBookingList()}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="page-enter" style={{padding:'20px'}}>
                    <h2 style={{fontSize:'24px', marginBottom:'20px', fontWeight:'800', color:'var(--text-main)'}}>Profile</h2>
                    
                    <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'30px', padding:'20px', background:'var(--bg-card)', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.03)'}}>
                      <div style={{width:'65px', height:'65px', borderRadius:'50%', border:'3px solid #3b82f6', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {googleUser.avatar ? (
                            <img src={googleUser.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="User" />
                        ) : (
                            <span style={{fontSize:'24px', fontWeight:'bold', color:'#3b82f6'}}>{userInitial}</span>
                        )}
                      </div>
                      <div>
                          <h3 style={{margin:0, fontSize:'1.2rem', color: 'var(--text-main)'}}>{editName || googleUser.name || 'User'}</h3>
                          <p style={{margin:0, color:'var(--text-sub)', fontSize:'0.9rem'}}>{currentUser?.email}</p>
                      </div>
                    </div>
                    
                    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                      <button onClick={() => openModal(setIsEditingProfile, true)} style={{padding:'16px', borderRadius:'12px', border:'none', background:'var(--bg-card)', textAlign:'left', fontWeight:'600', display:'flex', justifyContent:'space-between', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.02)', color:'var(--text-main)'}}>
                          <span>✏️ Edit Profile & Addresses</span> <span>→</span>
                      </button>
                      <button onClick={() => navigate('/join-selection')} style={{padding:'16px', borderRadius:'12px', border:'none', background:'var(--bg-card)', textAlign:'left', fontWeight:'600', display:'flex', justifyContent:'space-between', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.02)', color:'var(--text-main)'}}>
                          <span>
                            <span className="ani-handshake">🤝</span> Join as Professional
                          </span> <span>→</span>
                      </button> 
                      <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{padding:'16px', borderRadius:'12px', border:'1px solid #fee2e2', background:'#fef2f2', color:'#991b1b', textAlign:'left', fontWeight:'600', display:'flex', justifyContent:'space-between', marginTop:'20px', cursor:'pointer'}}>
                          <span className="ani-door">🚪 Logout</span> <span className="ani-arrow">→</span>
                      </button>
                    </div>
                </div>
              )}

            </div>

            {currentFloatingBooking && !hasPending && (
                <div className="floating-status-badge" onClick={() => setActiveTab('bookings')}>
                    {currentFloatingBooking.status === 'accepted' ? '✅ Provider Accepted!' : <><span className="ani-hammer">🔨</span> Work in Progress</>}
                </div>
            )}

            <div className="mobile-nav-bar">
              <button 
                  onClick={() => {
                    setActiveTab('home');
                    const container = document.getElementById('mobile-scroll-view');
                    if(container) container.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              >
                  <div className="anim-icon-box">
                    {ANIMATED_HOME_ICONS.map((icon, index) => {
                        let statusClass = '';
                        if (index === animIndex % ANIMATED_HOME_ICONS.length) statusClass = 'active';
                        else if (index === (animIndex - 1 + ANIMATED_HOME_ICONS.length) % ANIMATED_HOME_ICONS.length) statusClass = 'exit';
                        return <svg key={index} className={`anim-icon ${statusClass}`} viewBox="0 0 24 24">{icon.path}</svg>;
                    })}
                  </div>
                  <span className="nav-label-span">
                    {activeTab === 'home' ? ANIMATED_HOME_ICONS[animIndex % ANIMATED_HOME_ICONS.length].name : 'Home'}
                  </span>
                </button>
              
              <button 
                  onClick={() => setActiveTab('bookings')} 
                  className={`mobile-nav-item ${activeTab === 'bookings' ? 'active' : ''} ${hasPending ? 'status-pending' : ''} ${hasActive ? 'status-active' : ''}`}
              >
                <div className="anim-icon-box">
                    {ANIMATED_BOOKING_ICONS.map((icon, index) => {
                        let statusClass = '';
                        if (index === animIndex % ANIMATED_BOOKING_ICONS.length) statusClass = 'active';
                        else if (index === (animIndex - 1 + ANIMATED_BOOKING_ICONS.length) % ANIMATED_BOOKING_ICONS.length) statusClass = 'exit';
                        return <svg key={index} className={`anim-icon ${statusClass}`} viewBox="0 0 24 24">{icon.path}</svg>;
                    })}
                </div>
                <span className="nav-label-span">
                    {activeTab === 'bookings' ? ANIMATED_BOOKING_ICONS[animIndex % ANIMATED_BOOKING_ICONS.length].name : bookingLabel}
                </span>
                {activeBookingsList.length > 0 && <span className="nav-badge">{activeBookingsList.length}</span>}
              </button>
              
              <button 
                  onClick={() => setActiveTab('profile')} 
                  className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              >
                <div className="anim-icon-box">
                    {ANIMATED_PROFILE_ICONS.map((icon, index) => {
                        let statusClass = '';
                        if (index === animIndex % ANIMATED_PROFILE_ICONS.length) statusClass = 'active';
                        else if (index === (animIndex - 1 + ANIMATED_PROFILE_ICONS.length) % ANIMATED_PROFILE_ICONS.length) statusClass = 'exit';
                        return <svg key={index} className={`anim-icon ${statusClass}`} viewBox="0 0 24 24">{icon.path}</svg>;
                    })}
                </div>
                <span className="nav-label-span">
                    {activeTab === 'profile' ? ANIMATED_PROFILE_ICONS[animIndex % ANIMATED_PROFILE_ICONS.length].name : 'Profile'}
                </span>
              </button>
            </div>
        </div>
      ) : (
        <>
            <div className="profile-container" style={{position:'fixed', top:'20px', left:'20px', zIndex:1100}}>
                <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)} 
                    style={{
                        width:'45px', 
                        height:'45px', 
                        borderRadius:'50%', 
                        cursor:'pointer', 
                        overflow:'hidden',
                        display:'flex', 
                        alignItems:'center',
                        justifyContent:'center',
                        background: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '2px solid #3b82f6'
                    }}
                >
                    {googleUser.avatar ? (
                        <img 
                            src={googleUser.avatar} 
                            alt="Profile" 
                            style={{width:'100%', height:'100%', objectFit:'cover'}}
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span style="color:#3b82f6; font-weight:bold">${userInitial}</span>` }}
                        />
                    ) : (
                        <span style={{color:'#3b82f6', fontWeight:'800', fontSize: '18px'}}>{userInitial}</span>
                    )}
                </div>

                {showProfileMenu && (
                <div className="profile-dropdown" style={{position:'absolute', top:'55px', left:'0', background:'var(--bg-card)', padding:'8px', boxShadow:'0 10px 25px rgba(0,0,0,0.15)', borderRadius:'12px', width:'200px', border: '1px solid var(--border-color)'}}>
                    <div style={{padding: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '5px'}}>
                        <p style={{margin:0, fontSize:'13px', fontWeight:'700', color:'var(--text-main)'}}>{editName || googleUser.name}</p>
                        <p style={{margin:0, fontSize:'11px', color:'var(--text-sub)'}}>{currentUser?.email}</p>
                    </div>
                    <button className="dropdown-item-style" onClick={() => { openModal(setShowMyBookings, true); setBookingTab('active'); setShowProfileMenu(false); }}><span className="ani-calendar">📅</span> My Bookings</button>
                    <button className="dropdown-item-style" onClick={() => { openModal(setIsEditingProfile, true); setShowProfileMenu(false); }}>✏️ Profile & Address</button>
                    <button className="dropdown-item-style" onClick={() => { setDarkMode(!darkMode); }}>{darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                    <button className="dropdown-item-style" style={{color:'#ef4444'}} onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>🚪 Logout</button>
                </div>
                )}
            </div>

            <nav>
                <ul>
                <li><a href="#home" className={activeSection === 'home' ? 'active' : ''}><span className="nav-icon">🏠</span> Home</a></li>
                <li><a href="#services" className={activeSection === 'services' ? 'active' : ''}><span className="nav-icon ani-hammer">🛠️</span> Services</a></li>
                <li>
                    {activeBooking ? (
                        <div className={`nav-status-badge nav-${activeBooking.status}`} onClick={() => { openModal(setShowMyBookings, true); setBookingTab('active'); }}>
                            {activeBooking.status === 'pending' && <><span className="ani-hourglass">⏳</span> Booked</>}
                            {activeBooking.status === 'accepted' && "✅ Accepted"}
                            {activeBooking.status === 'in_progress' && <><span className="ani-hammer">🔨</span> Working</>}
                        </div>
                    ) : (
                        <a href="#provider" onClick={() => navigate('/join-selection')}>
                            <span className="ani-handshake">🤝</span> Join
                        </a>
                    )}
                </li>
                </ul>
            </nav>

            <section id="home" className="home">
                <div className="hero-content">
                <h1>Smart Services,<br/><span className="gradient-text">Simplified.</span></h1>
                <p style={{color:'var(--text-sub)', fontSize:'1.1rem', marginBottom:'30px'}}>Instantly connect with verified professionals.</p>
                <a href="#services" className="btn">Find a Pro</a>
                </div>
            </section>

            <section id="services" style={{background:'var(--bg-body)', paddingBottom:'60px'}}>
                <div style={{textAlign:'center', padding:'40px 0'}}>
                <h2 style={{fontSize:'36px', marginBottom:'15px', color:'var(--text-main)'}}>Our Services</h2>
                <div className="search-container"><input type="text" className="search-input" placeholder="Search services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                </div>
                
                <div className="service-grid">
                    {filteredServices.length > 0 ? (
                      filteredServices.map(service => (
                        <ServiceCard key={service.id} service={service} currentUser={currentUser} onClick={(id) => openModal(setSelectedServiceId, id)} onImageClick={(img) => openModal(setZoomedImage, img)} onNotifyClick={handleNotifyMe} />
                      ))
                    ) : (
                      <div className="no-services">
                          <div style={{fontSize:'50px', marginBottom:'20px'}}><span className="ani-hammer">🔨</span></div>
                          <h3>Coming Soon!</h3>
                          <p>We will bring the service provider soon who are professionals.</p>
                      </div>
                    )}
                </div>
            </section>

            {showMyBookings && (
                <div className="modal-overlay" onClick={() => setShowMyBookings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h2 style={{margin:0}}>My Bookings</h2>
                            <button onClick={() => setShowMyBookings(false)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color: 'var(--text-main)'}}><span className="ani-multiply">✖</span></button>
                        </div>
                        <div className="modal-tabs">
                            <div className={`tab-item ${bookingTab === 'active' ? 'active' : ''}`} onClick={() => setBookingTab('active')}>Active</div>
                            <div className={`tab-item ${bookingTab === 'history' ? 'active' : ''}`} onClick={() => setBookingTab('history')}>History</div>
                        </div>
                        {renderBookingList()}
                    </div>
                </div>
            )}
        </>
      )}

      {zoomedImage && (<div className="image-zoom-overlay" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="zoomed-img" alt="Full Screen" onClick={(e) => e.stopPropagation()} /><div style={{position:'absolute', top:'20px', right:'20px', color:'white', fontSize:'30px', cursor:'pointer'}}><span className="ani-multiply">✖</span></div></div>)}

      {selectedService && (
        <div className="modal-overlay" onClick={() => setSelectedServiceId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <h2 style={{margin:0}}>{selectedService.service_type === 'Other' ? selectedService.custom_service_name : selectedService.service_type}</h2>
                <button onClick={() => setSelectedServiceId(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color: 'var(--text-main)'}}><span className="ani-multiply">✖</span></button>
            </div>
            <p style={{marginBottom:'20px', lineHeight:'1.6', color:'var(--text-sub)'}}>{selectedService.description || "No specific description provided."}</p>
            
            <div style={{background:'var(--bg-body)', padding:'15px', borderRadius:'12px', marginBottom:'20px', border:'1px solid var(--border-color)'}}>
              <p style={{marginBottom:'8px', display:'flex', alignItems:'center'}}>
                <svg className="info-svg svg-phone" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <strong>Mobile:</strong> <span style={{marginLeft: '5px'}}>{selectedService.mobile}</span>
              </p>
              
              <p style={{marginBottom:'8px', display:'flex', alignItems:'center'}}>
                <svg className="info-svg svg-mail" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <strong>Email:</strong> <span style={{marginLeft: '5px'}}>{selectedService.contact_email}</span>
              </p>
              
              <p style={{marginBottom:'0', display:'flex', alignItems:'center'}}>
                <svg className="info-svg svg-clock" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polyline className="hands" points="12 6 12 12 16 14" />
                </svg>
                <strong>Hours:</strong> <span style={{marginLeft: '5px'}}>{selectedService.timing}</span>
              </p>
            </div>
            
            {currentUser?.id === selectedService.provider_id ? (
                <div style={{padding:'20px', background:'#f0f9ff', borderRadius:'12px', textAlign:'center'}}>
                    <p style={{color:'#0369a1', fontWeight:700, marginBottom:'10px'}}>This is your serviceListing.</p>
                    <button className="btn" onClick={() => navigate(selectedService.service_type === 'Instant' ? '/instant-provider-dashboard' : '/local-provider-dashboard')}>Manage Service Hub</button>
                </div>
            ) : selectedService.is_available === false ? (
                <div style={{marginTop:'20px', textAlign:'center'}}>
                    <button className="btn" disabled style={{width:'100%', background:'#ef4444', cursor:'not-allowed', opacity: 0.8}}>
                        <span className="ani-cross">⏸️</span> Closed: {selectedService.close_reason ? (selectedService.close_reason.length > 25 ? selectedService.close_reason.substring(0,25) + '...' : selectedService.close_reason) : 'Temporarily'}
                    </button>
                </div>
            ) : isCurrentServiceActive ? (
                <div style={{marginTop:'20px', textAlign:'center'}}>
                    <button className="btn" disabled style={{width:'100%', background:'#94a3b8', cursor:'not-allowed'}}><span className="ani-warning">⚠️</span> Ongoing Service</button>
                </div>
            ) : (
                <button onClick={handleBookService} className="btn" disabled={bookingLoading} style={{width:'100%', marginTop:'20px', background: bookingLoading ? '#94a3b8' : '#16a34a', color:'white', padding:'15px', borderRadius:'8px'}}>
                    {bookingLoading ? "Booking..." : "📅 Book This Service Now"}
                </button>
            )}
          </div>
        </div>
      )}

      {showBookingForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'500px'}}>
            <h3 style={{marginTop:0, marginBottom:'20px'}}>Complete Booking Details</h3>
            
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '20px', background: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label className="form-label" style={{margin:0, color:'#166534'}}><span className="ani-location">📍</span> Pick Saved Address</label>
                    <small style={{cursor:'pointer', color:'#2563eb', fontWeight:'bold'}} onClick={() => { openModal(setIsEditingProfile, true); setShowBookingForm(false); }}>Manage Addresses</small>
                </div>
                <select 
                  className="form-input" 
                  style={{marginBottom:0, cursor:'pointer', marginTop:'5px', border:'1px solid #86efac'}}
                  onChange={(e) => {
                    const addr = savedAddresses.find(a => a.id === e.target.value); 
                    if (addr) {
                      setFormData(prev => ({ ...prev, building: addr.building, room: addr.room, landmark: addr.landmark, locationLat: addr.lat, locationLng: addr.lng }));
                      sendNotification("Address autofilled!", "success");
                    }
                  }}
                >
                  <option value="">-- Tap to Select Address --</option>
                  {savedAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>{addr.building}, {addr.room}</option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={finalizeBooking}>
                <label className="form-label">Your Name</label>
                <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                
                <label className="form-label">Mobile Number</label>
                <input type="tel" className="form-input" required value={formData.mobile} maxLength={10} placeholder="10-digit number" onChange={e => { const val = e.target.value.replace(/\D/g, ''); setFormData({...formData, mobile: val}); }} />

                <label className="form-label">Preferred Date & Time</label>
                <input type="datetime-local" className="form-input" required min={getMinDateTime()} max={getMaxDateTime()} value={formData.datetime} onChange={e => setFormData({...formData, datetime: e.target.value})} />
                
                <h4 style={{margin:'20px 0 10px', color:'var(--text-main)'}}>Service Address</h4>
                
                <button type="button" className={`location-btn ${formData.locationLat ? 'detected' : ''}`} onClick={handleGetLocation}>
                    {formData.locationLat ? "✅ Update Location (GPS)" : "📍 Detect Location (GPS)"}
                </button>

                {/* 🔥 NEW DRAGGABLE MAP FOR BOOKING 🔥 */}
                {leafletLoaded && formData.locationLat && (
                    <div style={{marginBottom: '20px'}}>
                        <p style={{fontSize: '13px', color: 'var(--text-sub)', marginBottom: '5px'}}>📍 Drag the pin to adjust your exact location:</p>
                        <LeafletBookingMap 
                            lat={formData.locationLat} 
                            lng={formData.locationLng} 
                            onLocationChange={(lat, lng) => setFormData(prev => ({...prev, locationLat: lat, locationLng: lng}))} 
                        />
                    </div>
                )}

                <input type="text" className="form-input" placeholder="Building/House No" required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} />
                <input type="text" className="form-input" placeholder="Flat/Room No" required value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                <input type="text" className="form-input" placeholder="Landmark / Area" required value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px'}}>
                  <input type="checkbox" id="save-addr" checked={isSavingAddress} onChange={e => setIsSavingAddress(e.target.checked)} />
                  <label htmlFor="save-addr" style={{fontSize:'13px'}}>Save address for future use</label>
                </div>

                <div style={{display:'flex', gap:'10px'}}>
                    <button type="submit" className="btn" style={{flex:1}}>Confirm</button>
                    <button type="button" onClick={() => setShowBookingForm(false)} className="btn" style={{flex:1, background:'#ef4444'}}>Cancel</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative', overflowY:'auto', maxHeight:'90vh'}}>
            {isAddingAddress ? (
                <div>
                    <h3 style={{marginTop:0, display:'flex', alignItems:'center', gap:'10px'}}>
                        <span onClick={() => setIsAddingAddress(false)} style={{cursor:'pointer', color:'var(--text-main)'}}><span className="ani-arrow">⬅️</span></span> Add New Address
                    </h3>
                    
                    <button type="button" className={`location-btn ${newAddrData.lat ? 'detected' : ''}`} onClick={handleGetLocationForNewAddr}>
                        {newAddrData.lat ? "✅ Location Captured" : "📍 Detect Location (Required)"}
                    </button>

                    <label className="form-label">Building / House Name</label>
                    <input type="text" className="form-input" value={newAddrData.building} onChange={e => setNewAddrData({...newAddrData, building: e.target.value})} placeholder="e.g. Sunshine Apts" />
                    
                    <label className="form-label">Flat / Room No</label>
                    <input type="text" className="form-input" value={newAddrData.room} onChange={e => setNewAddrData({...newAddrData, room: e.target.value})} placeholder="e.g. 101" />
                    
                    <label className="form-label">Landmark</label>
                    <input type="text" className="form-input" value={newAddrData.landmark} onChange={e => setNewAddrData({...newAddrData, landmark: e.target.value})} placeholder="e.g. Near Park" />
                    
                    <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                        <button className="btn" onClick={addNewAddressDirectly} style={{flex:1}}>Save Address</button>
                        <button className="btn" style={{flex:1, background:'#94a3b8'}} onClick={() => setIsAddingAddress(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <form onSubmit={async (e) => { e.preventDefault(); if(!currentUser) return; await supabase.from('profiles').update({ full_name: editName, updated_at: new Date() }).eq('id', currentUser.id); setIsEditingProfile(false); sendNotification("Updated!", "success"); }}>
                    <h2 style={{marginBottom:'20px'}}>Profile & Address</h2>
                    
                    <label className="form-label">Name</label>
                    <input type="text" className="form-input" value={editName} onChange={e => setEditName(e.target.value)} required />
                    
                    <label className="form-label">Mobile</label>
                    <input type="tel" className="form-input" value={editMobile} maxLength={10} onChange={e => setEditMobile(e.target.value.replace(/\D/g, ''))} />
                    
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', margin:'20px 0 10px'}}>
                        <h4 style={{margin:0}}>Saved Addresses ({savedAddresses.length}/4)</h4>
                        <button type="button" onClick={() => setIsAddingAddress(true)} style={{background:'#eff6ff', color:'#2563eb', border:'none', padding:'6px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold', cursor:'pointer'}}>+ Add New</button>
                    </div>
                    
                    <div style={{maxHeight:'200px', overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:'8px', padding:'5px'}}>
                        {savedAddresses.length === 0 ? <p style={{fontSize:'12px', opacity:0.6, padding:'10px', textAlign:'center'}}>No saved addresses.</p> : (
                            savedAddresses.map(addr => (
                            <div key={addr.id} className="saved-addr-card" style={{marginBottom:'5px'}}>
                                <div style={{fontSize:'12px'}}><strong>{addr.building}</strong><br/>{addr.room}</div>
                                <button type="button" onClick={() => deleteSavedAddress(addr.id)} style={{color:'#ef4444', border:'none', background:'none', cursor:'pointer', fontWeight:'bold', fontSize:'14px'}}><span className="ani-trash">🗑️</span></button>
                            </div>
                            ))
                        )}
                    </div>

                    <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                        <button type="submit" className="btn" style={{flex:1}}>Save Info</button>
                        <button type="button" className="btn" style={{flex:1, background:'#94a3b8'}} onClick={() => setIsEditingProfile(false)}>Close</button>
                    </div>
                </form>
            )}
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Rate Service</h3>
            <div style={{textAlign:'center', marginBottom:'20px'}}>
              {[1,2,3,4,5].map(s => <span key={s} className={`star-rating ${ratingInput >= s ? 'active' : ''}`} onClick={() => setRatingInput(s)}>★</span>)}
            </div>
            
            {/* 🔥 QUICK WORDS SECTION 🔥 */}
            <div className="quick-words-container">
                {QUICK_REVIEW_WORDS.map((word, i) => (
                    <span key={i} className="quick-word-chip" onClick={() => handleQuickWord(word)}>
                        {word}
                    </span>
                ))}
            </div>

            <textarea className="form-input" placeholder="Your review..." value={reviewTextInput} onChange={e => setReviewTextInput(e.target.value)} />
            <button className="btn" style={{width:'100%'}} onClick={submitReview}>Submit</button>
          </div>
        </div>
      )}
    </div>
  )
}