import CookView from '@/components/Cook/CookView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'খালা নির্দেশ - Cook View',
  description: 'Daily cooking plan and Bengali audio instructions for the cook.',
  manifest: '/manifest-cook.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'খালা নির্দেশ'
  }
};

export default function CookPage() {
  return (
    <>
      <head>
        <link rel="manifest" href="/manifest-cook.json" />
        <meta name="apple-mobile-web-app-title" content="খালা নির্দেশ" />
      </head>
      <CookView />
    </>
  );
}
