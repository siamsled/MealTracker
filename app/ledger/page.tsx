import { Suspense } from 'react';
import LedgerView from '@/components/Ledger/LedgerView';

export const metadata = {
  title: 'Permanent Ledger - MealTracker',
  description: 'Continuous chronological accounting ledger for the household.'
};

export default function LedgerPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Ledger...</div>}>
      <LedgerView />
    </Suspense>
  );
}
