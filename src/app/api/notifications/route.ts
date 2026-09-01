import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getLiveNotifications } from '@/lib/server/notifications';

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await getLiveNotifications(session.user.householdId);
  return NextResponse.json({ notifications });
}
