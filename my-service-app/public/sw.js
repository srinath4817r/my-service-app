// Service Worker for KhenayaaS
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Forces the waiting service worker to become the active one
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Allows the service worker to take control of the page immediately
  });
  
  self.addEventListener('fetch', (event) => {
    // This allows the app to handle network requests (like Supabase) correctly
    event.respondWith(fetch(event.request));
  });