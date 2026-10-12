import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

// Self-hosted (was next/font/google): the CI deploy build runs outside
// Vercel infra where the Google Fonts fetch fails under Turbopack, so the
// latin variable files live in src/app/fonts and need no network at build.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

const outfit = localFont({
  src: './fonts/outfit-latin.woff2',
  variable: '--font-outfit',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Hope's Corner Check-In",
  description: 'Guest check-in and services management for Hope\'s Corner',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Hope's Corner",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#064e3b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased`}
      >
        <ServiceWorkerRegistration />
        {children}
        <SpeedInsights />
        <Toaster
            position="top-center"
            containerStyle={{ top: 60 }}
            toastOptions={{
              duration: 3000,
              success: {
                duration: 2000,
                style: {
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                },
              },
              error: {
                duration: 4000,
                style: {
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                },
              },
              style: {
                maxWidth: '400px',
                padding: '12px 16px',
                borderRadius: '8px',
              },
            }}
            gutter={8}
        />
      </body>
    </html>
  );
}
