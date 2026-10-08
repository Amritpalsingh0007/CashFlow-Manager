import { Serwist } from 'serwist';

// Register the service worker if in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const serwist = new Serwist({
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

  serwist.register();
}