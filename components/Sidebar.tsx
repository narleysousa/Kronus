import React from 'react';
import { BarChart3, History, ShieldCheck, LogOut, TrendingUp } from 'lucide-react';
import { KronusLogo } from '../constants';
import { ThemeToggle } from './ThemeToggle';
import { User, UserRole } from '../types';

interface SidebarProps {
  currentUser: User | null;
  view: 'dashboard' | 'admin' | 'history' | 'productivity' | 'profile';
  onNavigate: (view: 'dashboard' | 'admin' | 'history' | 'productivity' | 'profile') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, view, onNavigate, onLogout }) => (
  <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 min-h-screen p-6 hidden lg:flex flex-col gap-8" aria-label="Menu principal">
    <div className="flex items-center gap-3">
      <KronusLogo className="w-10 h-10 text-indigo-600" aria-hidden />
      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">Kronus</span>
    </div>

    <nav className="flex flex-col gap-2" aria-label="Navegação">
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        aria-current={view === 'dashboard' ? 'page' : undefined}
      >
        <BarChart3 size={20} aria-hidden />
        Início
      </button>
      <button
        type="button"
        onClick={() => onNavigate('history')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        aria-current={view === 'history' ? 'page' : undefined}
      >
        <History size={20} aria-hidden />
        Meus Registros
      </button>
      <button
        type="button"
        onClick={() => onNavigate('productivity')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'productivity' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        aria-current={view === 'productivity' ? 'page' : undefined}
      >
        <TrendingUp size={20} aria-hidden />
        Banco de Horas (detalhes)
      </button>
      {(currentUser?.isMaster || currentUser?.role === UserRole.ADMIN) && (
        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'admin' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          aria-current={view === 'admin' ? 'page' : undefined}
        >
          <ShieldCheck size={20} aria-hidden />
          Administração
        </button>
      )}
    </nav>

    <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
      <ThemeToggle />
      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-label="Abrir meu perfil"
      >
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0" aria-hidden>
          {currentUser?.name.charAt(0)}
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser?.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{currentUser?.position}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-left"
      >
        <LogOut size={20} aria-hidden />
        Sair
      </button>
    </div>
  </aside>
);
