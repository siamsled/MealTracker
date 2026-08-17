import HistoryView from '@/components/History/HistoryView';

export const metadata = {
  title: 'History & Reports - MealTracker',
  description: 'Day-by-day historical inspector and derived monthly reports over the continuous ledger.'
};

export default function HistoryPage() {
  return <HistoryView />;
}
