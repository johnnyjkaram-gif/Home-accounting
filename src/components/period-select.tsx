'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
];

export function PeriodSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get('period') ?? 'this_month';

  return (
    <select
      className="select w-auto"
      value={current}
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        sp.set('period', e.target.value);
        router.push(`${pathname}?${sp.toString()}`);
      }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
