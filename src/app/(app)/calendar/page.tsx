import { getCurrentSession } from '@/lib/auth';
import { getCalendarEvents } from '@/lib/server/calendar';
import { CalendarPageClient } from '@/components/calendar-page-client';

export default async function CalendarPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);

  const events = await getCalendarEvents(householdId, year, month);

  return <CalendarPageClient year={year} month={month} events={events} />;
}
