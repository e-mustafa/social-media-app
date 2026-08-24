/* global importScripts, firebase */
// Service worker for background push notifications.
// MUST live at the site root (/firebase-messaging-sw.js) — the browser
// only allows a service worker to control pages at or below its own path.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// same web config as the page — safe to expose, these are public identifiers
firebase.initializeApp({
	apiKey: 'AIzaSyBv_G6M8SicdLb7G1xMPRW44Qiw9P4eUBg',
	authDomain: 'mustafa-notification.firebaseapp.com',
	projectId: 'mustafa-notification',
	storageBucket: 'mustafa-notification.firebasestorage.app',
	messagingSenderId: '914833995126',
	appId: '1:914833995126:web:7b5ed1851f5b8915c33657',
	measurementId: 'G-Z361JC0K9J',
});
const messaging = firebase.messaging();

// fires when a push arrives while the tab is closed or in the background
messaging.onBackgroundMessage((payload) => {
	console.log('[SW] background message:', payload);

	self.registration.showNotification(payload.notification?.title ?? 'Social App', {
		body: payload.notification?.body ?? '',
		data: payload.data,
		requireInteraction: true,
	});
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow('/'));
});
