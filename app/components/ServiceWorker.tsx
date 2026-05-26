'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const hostname = window.location.hostname.toLowerCase();
    const isPreviewLikeHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app');

    if (isPreviewLikeHost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames
            .filter((cacheName) => cacheName.startsWith('think-q-kpi-tracker'))
            .forEach((cacheName) => {
              void caches.delete(cacheName);
            });
        });
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('Service Worker registered:', reg))
      .catch((err) => console.log('Service Worker registration failed:', err));
  }, []);

  return null;
}




