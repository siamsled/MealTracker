import MealsPlanner from '@/components/Meals/MealsPlanner';

export const metadata = {
  title: 'My Meals - MealTracker',
  description: 'Plan daily meal counts and special cooking requests before 6:00 AM cutoff.'
};

export default function MealsPage() {
  return <MealsPlanner />;
}
