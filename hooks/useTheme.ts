import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'kronus_theme';

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return prefersDark() ? 'dark' : 'light';
}

function applyTheme(effective: EffectiveTheme) {
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [effective, setEffective] = useState<EffectiveTheme>(() => getEffectiveTheme(preference));

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(preference);
    setEffective(effectiveTheme);
    applyTheme(effectiveTheme);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const next = getEffectiveTheme('system');
      setEffective(next);
      applyTheme(next);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [preference]);

  const setTheme = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return { theme: preference, setTheme, effectiveTheme: effective };
}

/** Aplica o tema salvo no carregamento da página (evita flash). Chamar no início do app ou em script inline no HTML. */
export function applyStoredThemeOnLoad() {
  const preference = getStoredPreference();
  const effective = getEffectiveTheme(preference);
  applyTheme(effective);
}
