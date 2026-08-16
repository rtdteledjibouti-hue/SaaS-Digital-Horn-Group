'use client';

import * as React from 'react';
import { supabase } from './supabase';
import type { CompanySettings } from './types';

interface SettingsContextValue {
  settings: CompanySettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<CompanySettings | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const { data, error } = await supabase.from('company_settings').select('*').maybeSingle();
    if (error) {
      console.error('Settings load error:', error.message);
      setLoading(false);
      return;
    }
    setSettings(data as CompanySettings | null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return <SettingsContext.Provider value={{ settings, loading, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
