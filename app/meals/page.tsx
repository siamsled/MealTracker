import MealsPlanner from '@/components/Meals/MealsPlanner';

export const metadata = {
  title: 'Meals & Milk - MealTracker',
  description: 'Plan daily meals, milk, and special cooking requests before 6:00 AM cutoff.'
};

export default function MealsPage() {
  return <MealsPlanner />;
}
