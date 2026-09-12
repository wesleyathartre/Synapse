'use client';

import { useEffect } from 'react';

// Registra o service worker para tornar o app instalável (PWA)
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* silencioso — offline é um plus, não bloqueia o app */
      });
    }
  }, []);
  return null;
}
