import React from 'react';
import { BarChart3, History, ShieldCheck, LogOut, TrendingUp } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { UserRole } from '../types';

interface BottomNavProps {
  view: 'dashboard' | 'admin' | 'history' | 'productivity' | 'profile';
  isAdmin: boolean;
  onNavigate: (view: 'dashboard' | 'admin' | 'history' | 'productivity' | 'profile') => void;
  onLogout: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ view, isAdmin, onNavigate, onLogout }) => (
  <nav
    className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-4 py-3 flex items-center justify-around safe-area-pb"
    aria-label="Navegação mobile"
  >
    <button
      type="button"
      onClick={() => onNavigate('dashboard')}
      className={`p-2 rounded-xl ${view === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
      aria-label="Início"
      aria-current={view === 'dashboard' ? 'page' : undefined}
    >
      <BarChart3 size={24} />
    </button>
    <button
      type="button"
      onClick={() => onNavigate('history')}
      className={`p-2 rounded-xl ${view === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
      aria-label="Meus Registros"
      aria-current={view === 'history' ? 'page' : undefined}
    >
      <History size={24} />
    </button>
    <button
      type="button"
      onClick={() => onNavigate('productivity')}
      className={`p-2 rounded-xl ${view === 'productivity' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
      aria-label="Banco de Horas (detalhes)"
      aria-current={view === 'productivity' ? 'page' : undefined}
    >
      <TrendingUp size={24} />
    </button>
    {isAdmin && (
      <button
        type="button"
        onClick={() => onNavigate('admin')}
        className={`p-2 rounded-xl ${view === 'admin' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        aria-label="Administração"
        aria-current={view === 'admin' ? 'page' : undefined}
      >
        <ShieldCheck size={24} />
      </button>
    )}
    <button
      type="button"
      onClick={onLogout}
      className="p-2 text-red-400 dark:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
      aria-label="Sair"
    >
      <LogOut size={24} />
    </button>
    <ThemeToggle compact className="shrink-0" />
  </nav>
);
