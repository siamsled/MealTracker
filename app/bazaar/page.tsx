import { Suspense } from 'react';
import BazaarView from '@/components/Bazaar/BazaarView';

export const metadata = {
  title: 'Bazaar & Expenses - MealTracker',
  description: 'Household food pool expenses, bazaar purchases, and corrections.'
};

export default function BazaarPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Bazaar...</div>}>
      <BazaarView />
    </Suspense>
  );
}
