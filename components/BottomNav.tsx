import React from 'react';
import { BarChart3, History, ShieldCheck, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  view: 'dashboard' | 'admin' | 'history';
  isAdmin: boolean;
  onNavigate: (view: 'dashboard' | 'admin' | 'history') => void;
  onLogout: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ view, isAdmin, onNavigate, onLogout }) => (
  <nav
    className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-3 flex items-center justify-around safe-area-pb"
    aria-label="Navegação mobile"
  >
    <button
      type="button"
      onClick={() => onNavigate('dashboard')}
      className={`p-2 rounded-xl ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
      aria-label="Início"
      aria-current={view === 'dashboard' ? 'page' : undefined}
    >
      <BarChart3 size={24} />
    </button>
    <button
      type="button"
      onClick={() => onNavigate('history')}
      className={`p-2 rounded-xl ${view === 'history' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
      aria-label="Meus Registros"
      aria-current={view === 'history' ? 'page' : undefined}
    >
      <History size={24} />
    </button>
    {isAdmin && (
      <button
        type="button"
        onClick={() => onNavigate('admin')}
        className={`p-2 rounded-xl ${view === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
        aria-label="Administração"
        aria-current={view === 'admin' ? 'page' : undefined}
      >
        <ShieldCheck size={24} />
      </button>
    )}
    <button
      type="button"
      onClick={onLogout}
      className="p-2 text-red-400 rounded-xl hover:bg-red-50"
      aria-label="Sair"
    >
      <LogOut size={24} />
    </button>
  </nav>
);
