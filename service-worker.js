// service-worker.js
self.addEventListener('install', (event) => {
    console.log('Service Worker installing.');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
    // You can add fetch event handling if needed
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'location-sync') {
        console.log('Syncing location data in background');
    }
});
