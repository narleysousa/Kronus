import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemePreference } from '../hooks/useTheme';

const OPTIONS: { value: ThemePreference; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

interface ThemeToggleProps {
  /** Compacto: só ícone e dropdown; padrão: lista vertical com rótulos (para Sidebar). */
  compact?: boolean;
  /** No modo compacto: posição do dropdown ('up' = acima do botão, 'down' = abaixo). */
  dropdownPosition?: 'up' | 'down';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, dropdownPosition = 'up', className = '' }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const currentOption = OPTIONS.find(o => o.value === theme) ?? OPTIONS[2];
  const CurrentIcon = currentOption.Icon;

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          aria-label="Alterar tema"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <CurrentIcon size={22} />
        </button>
        {open && (
          <div
            className={`absolute left-0 py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg min-w-[140px] ${
              dropdownPosition === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
            }`}
            role="menu"
          >
            {OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                  theme === value
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={ref}>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 mb-1">Tema</span>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all w-full text-left ${
            theme === value
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Icon size={20} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
};
