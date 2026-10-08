'use client';

import { useEffect } from 'react';
import { Serwist } from 'serwist';

export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Initialize Serwist and register the service worker
      if (typeof window !== 'undefined') {
        const serwist = new Serwist({
          // These values should match what's in next.config.ts
          swSrc: '/sw.ts',
          swDest: '/sw.js',
          offlinePage: '/offline',
          precacheEntries: [
            { url: '/', revision: '1' },
            { url: '/manifest.json', revision: '1' },
            { url: '/icons/icon-192.png', revision: '1' },
            { url: '/icons/icon-512.png', revision: '1' }
          ],
          skipWaiting: true,
          clientsClaim: true,
          // Disable in development to prevent conflicts with HMR
          disable: process.env.NODE_ENV !== 'production',
        });

        // Register the service worker
        serwist.register();
      }
    }
  }, []);

  return null;
}