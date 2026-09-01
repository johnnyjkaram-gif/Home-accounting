'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

interface Result { type: string; label: string; sub: string; href: string }

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="input pl-9"
          placeholder="Search transactions, bills, people..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1.5 card p-1.5 max-h-80 overflow-y-auto z-50 animate-fade-in">
          {results.length === 0 && !loading && <p className="text-sm text-muted-foreground p-3">No matches found.</p>}
          {results.map((r, i) => (
            <button
              key={i}
              className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm hover:bg-muted text-left"
              onMouseDown={() => { router.push(r.href); setOpen(false); setQuery(''); }}
            >
              <span className="truncate">
                <span className="text-muted-foreground mr-2">{r.type}</span>
                {r.label}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
