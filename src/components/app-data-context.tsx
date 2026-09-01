'use client';

import { createContext, useContext } from 'react';
import type { ReferenceData } from '@/lib/server/reference-data';

const AppDataContext = createContext<ReferenceData | null>(null);

export function AppDataProvider({ data, children }: { data: ReferenceData; children: React.ReactNode }) {
  return <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>;
}

export function useAppData(): ReferenceData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
