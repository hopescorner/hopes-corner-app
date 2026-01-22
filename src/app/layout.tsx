import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import { Toaster } from 'react-hot-toast';
import { ModalContainer } from '@/components/modals/ModalContainer';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
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
        <NextAuthProvider>
          <ServiceWorkerRegistration />
          {children}
          <ModalContainer />
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
        </NextAuthProvider>
      </body>
    </html>
  );
}
