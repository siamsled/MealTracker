import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';

export async function POST() {
  try {
    seedDatabase();
    return NextResponse.json({ success: true, message: 'Database reseeded successfully with full August 2026 data!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
