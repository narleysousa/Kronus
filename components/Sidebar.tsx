import React from 'react';
import { BarChart3, History, ShieldCheck, LogOut } from 'lucide-react';
import { KronusLogo } from '../constants';
import { User, UserRole } from '../types';

interface SidebarProps {
  currentUser: User | null;
  view: 'dashboard' | 'admin' | 'history';
  onNavigate: (view: 'dashboard' | 'admin' | 'history') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, view, onNavigate, onLogout }) => (
  <aside className="w-72 bg-white border-r border-slate-100 min-h-screen p-6 hidden lg:flex flex-col gap-8" aria-label="Menu principal">
    <div className="flex items-center gap-3">
      <KronusLogo className="w-10 h-10 text-indigo-600" aria-hidden />
      <span className="text-2xl font-black text-slate-800 tracking-tighter">Kronus</span>
    </div>

    <nav className="flex flex-col gap-2" aria-label="Navegação">
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
        aria-current={view === 'dashboard' ? 'page' : undefined}
      >
        <BarChart3 size={20} aria-hidden />
        Início
      </button>
      <button
        type="button"
        onClick={() => onNavigate('history')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'history' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
        aria-current={view === 'history' ? 'page' : undefined}
      >
        <History size={20} aria-hidden />
        Meus Registros
      </button>
      {currentUser?.role === UserRole.ADMIN && (
        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left ${view === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          aria-current={view === 'admin' ? 'page' : undefined}
        >
          <ShieldCheck size={20} aria-hidden />
          Administração
        </button>
      )}
    </nav>

    <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600" aria-hidden>
          {currentUser?.name.charAt(0)}
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="text-sm font-bold text-slate-800 truncate">{currentUser?.name}</span>
          <span className="text-xs text-slate-400 font-medium">{currentUser?.position}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all w-full text-left"
      >
        <LogOut size={20} aria-hidden />
        Sair
      </button>
    </div>
  </aside>
);
