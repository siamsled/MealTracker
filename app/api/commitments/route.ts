import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord } from '@/lib/db';
import { getHouseholdDateString } from '@/lib/cutoff';

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const { userId, estimatedAmount, targetDate } = body;

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const nowISO = new Date().toISOString();
    const id = `bc-${Date.now()}`;

    // Mark previous active commitments as cancelled or replaced
    db.prepare("UPDATE bazaar_commitments SET status = 'cancelled' WHERE household_id = ? AND status = 'active'").run(household.id);

    // Insert new commitment
    db.prepare(`
      INSERT INTO bazaar_commitments (id, household_id, user_id, target_date, estimated_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id,
      household.id,
      userId,
      targetDate || getHouseholdDateString(),
      estimatedAmount || 1000,
      nowISO
    );

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
    const userName = user?.name || 'Flatmate';

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, 'COMMIT_BAZAAR', 'bazaar_commitments', ?, NULL, ?, ?, ?)
    `).run(
      `aud-${Date.now()}`,
      household.id,
      userId,
      id,
      `Estimated ৳${estimatedAmount}`,
      `${userName} committed to doing next bazaar (৳${estimatedAmount})`,
      nowISO
    );

    return NextResponse.json({ success: true, commitmentId: id, message: 'Bazaar commitment recorded!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const commitmentId = url.searchParams.get('id');
    const actorUserId = url.searchParams.get('userId') || req.cookies.get('mt_user_id')?.value;

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const nowISO = new Date().toISOString();

    if (commitmentId) {
      db.prepare("UPDATE bazaar_commitments SET status = 'cancelled' WHERE id = ?").run(commitmentId);
    } else {
      db.prepare("UPDATE bazaar_commitments SET status = 'cancelled' WHERE household_id = ? AND status = 'active'").run(household.id);
    }

    const actorUser = actorUserId ? db.prepare('SELECT name FROM users WHERE id = ?').get(actorUserId) as { name: string } | undefined : undefined;
    const actorName = actorUser?.name || 'Flatmate';

    db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, 'CANCEL_COMMITMENT', 'bazaar_commitments', ?, 'Active commitment', 'Cancelled', ?, ?)
    `).run(
      `aud-${Date.now()}`,
      household.id,
      actorUserId || 'usr-siam',
      commitmentId || 'active',
      `${actorName} cancelled bazaar commitment`,
      nowISO
    );

    return NextResponse.json({ success: true, message: 'Bazaar commitment cancelled.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
