import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light';
export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

interface AppSettingsValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  formatCurrency: (value: number) => string;
}

const STORAGE_KEY = 'organizai.settings';

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'pt-PT',
};

const DEFAULTS: Omit<AppSettingsValue, 'setTheme' | 'setCurrency' | 'setNotifications' | 'formatCurrency'> = {
  theme: 'dark',
  currency: 'BRL',
  notifications: true,
};

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export const useAppSettings = (): AppSettingsValue => {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within <AppSettingsProvider>');
  return ctx;
};

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULTS.theme);
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULTS.currency);
  const [notifications, setNotificationsState] = useState<boolean>(DEFAULTS.notifications);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme === 'light' || parsed.theme === 'dark') setThemeState(parsed.theme);
        if (['BRL', 'USD', 'EUR'].includes(parsed.currency)) setCurrencyState(parsed.currency);
        if (typeof parsed.notifications === 'boolean') setNotificationsState(parsed.notifications);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  // Apply theme to <html> for CSS variable overrides
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, currency, notifications }));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, currency, notifications }));
  }, [currency, notifications]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const setCurrency = useCallback((c: CurrencyCode) => setCurrencyState(c), []);
  const setNotifications = useCallback((v: boolean) => setNotificationsState(v), []);

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
        style: 'currency',
        currency,
      }).format(value),
    [currency]
  );

  const value = useMemo<AppSettingsValue>(
    () => ({ theme, setTheme, currency, setCurrency, notifications, setNotifications, formatCurrency }),
    [theme, setTheme, currency, setCurrency, notifications, setNotifications, formatCurrency]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};
