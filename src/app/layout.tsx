import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: {
    default: 'CabFlow',
    template: '%s | CabFlow'
  },
  description: 'Real-time ride dispatch, driver tracking, and Stripe Connect payments for fleet operators.',
  applicationName: 'CabFlow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CabFlow'
  },
  formatDetection: {
    telephone: false
  },
  manifest: '/manifest.webmanifest',
  authors: [{ name: 'CabFlow' }]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#facc15'
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers mapboxToken={env.NEXT_PUBLIC_MAPBOX_TOKEN || env.MAPBOX_TOKEN || null}>
          {children}
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
