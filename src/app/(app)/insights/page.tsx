import { getCurrentSession } from '@/lib/auth';
import { getDashboardData } from '@/lib/server/dashboard';
import { InsightCard } from '@/components/insight-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Sparkles } from 'lucide-react';

export default async function InsightsPage() {
  const session = await getCurrentSession();
  const d = await getDashboardData(session!.user.householdId, 'this_month');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial Insights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Automatically generated from your own transaction history — every insight below is calculated directly from your recorded data, never estimated or fabricated.
        </p>
      </div>

      {d.insights.length === 0 ? (
        <EmptyState icon={Sparkles} title="Not enough data yet" description="Insights need a bit of transaction history to compare against — add income and expenses over a few weeks and check back." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {d.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-2">How insights are calculated</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Category comparisons use this month's spending vs. last month's, only when both months have recorded data.</li>
          <li>The savings projection linearly extrapolates your year-to-date average — it is an estimate, not a guarantee.</li>
          <li>The low-balance warning uses your last 30 days' average daily spending against bills due in the next two weeks.</li>
          <li>Subscription cost totals only include currently active subscriptions.</li>
        </ul>
      </div>
    </div>
  );
}
