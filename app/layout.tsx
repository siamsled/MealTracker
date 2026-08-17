import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/Layout/AppShell';

export const metadata: Metadata = {
  title: 'MealTracker - Household Food & Contribution Ledger',
  description: 'Continuous household food accounting and meal management system for flatmates and cook.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MealTracker'
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#111418',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
