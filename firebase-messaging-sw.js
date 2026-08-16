importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This must match the exact config from src/js/modules/config.js
firebase.initializeApp({
  apiKey: "AIzaSyASCF3rzBkBIPGbN-W63KgYVPCuZ2hZi7I",
  authDomain: "bustrackernaimur.firebaseapp.com",
  databaseURL: "https://bustrackernaimur-default-rtdb.firebaseio.com",
  projectId: "bustrackernaimur",
  storageBucket: "bustrackernaimur.firebasestorage.app",
  messagingSenderId: "253035446783",
  appId: "1:253035446783:web:58edcbbb0d5453407467ca"
});

const messaging = firebase.messaging();

// Optional: Handle background messages directly
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
