import React from 'react';
import { Clock, History, ChevronRight, TrendingUp, Calendar } from 'lucide-react';
import { User, DaySummary } from '../types';
import { formatDurationMs, formatHoursToHms } from '../utils/formatDuration';

interface DashboardHomeProps {
  currentUser: User | null;
  lastClockInTime: number | null;
  lastSessionDurationMs: number | null;
  lastWorkLogType: 'IN' | 'OUT' | null;
  summaries: DaySummary[];
  bankOfHours: number;
  isClockedIn: boolean;
  onPunch: () => void;
  onGoToHistory: () => void;
  onOpenPersonalCommitment: () => void;
  onOpenVacation: () => void;
  onOpenProductivity: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  currentUser,
  lastClockInTime,
  lastSessionDurationMs,
  lastWorkLogType,
  summaries,
  bankOfHours,
  isClockedIn,
  onPunch,
  onGoToHistory,
  onOpenPersonalCommitment,
  onOpenVacation,
  onOpenProductivity,
}) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">
          Olá, {currentUser?.name.split(' ')[0]} 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenPersonalCommitment}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 text-sm font-bold transition-colors"
        >
          <Calendar size={18} aria-hidden />
          Compromissos pessoais
        </button>
        <button
          type="button"
          onClick={onOpenVacation}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-sm font-bold transition-colors"
        >
          <Calendar size={18} aria-hidden />
          Férias
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 px-3 py-1 rounded-full text-indigo-100 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-400/30">
              Status Atual
            </div>
            <h3 className="text-4xl font-bold mb-2">
              {isClockedIn ? 'Você está trabalhando' : 'Ponto não batido'}
            </h3>
            <p className="text-indigo-100 text-lg opacity-80">
              {isClockedIn
                ? `Início do turno às ${lastClockInTime ? new Date(lastClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}`
                : 'Bata o ponto para iniciar sua jornada de hoje.'}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onPunch}
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 border-8 transition-all hover:scale-105 active:scale-95 shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/50 ${isClockedIn ? 'bg-red-500 border-red-400/50 hover:bg-red-600' : 'bg-emerald-500 border-emerald-400/50 hover:bg-emerald-600'}`}
              aria-label={isClockedIn ? 'Registrar saída' : 'Registrar entrada'}
            >
              <Clock
                size={40}
                className={isClockedIn ? 'animate-spin [animation-duration:3s]' : 'animate-pulse'}
                aria-hidden
              />
              <span className="font-black text-xl">{isClockedIn ? 'SAÍDA' : 'ENTRADA'}</span>
            </button>
            {lastWorkLogType === 'OUT' && lastSessionDurationMs !== null && (
              <p className="text-indigo-100 text-sm font-semibold mt-3">
                Você codou {formatDurationMs(lastSessionDurationMs)} na última vez.
              </p>
            )}
          </div>
        </div>

        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" aria-hidden />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-800">Banco de Horas</h4>
            <button
              type="button"
              onClick={onOpenProductivity}
              className={`p-2 rounded-lg transition-colors hover:opacity-90 ${bankOfHours >= 0 ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
              aria-label="Abrir dashboard de produtividade"
            >
              <TrendingUp size={20} />
            </button>
          </div>
          <div className="space-y-1">
            <span className={`text-5xl font-black ${bankOfHours >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {bankOfHours >= 0 ? '+' : ''}{formatHoursToHms(bankOfHours)}
            </span>
            <p className="text-slate-400 text-sm font-medium">Acúmulo total no período</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">Meta Diária</span>
            <span className="text-slate-800 font-bold">{currentUser?.dailyHours}h / dia</span>
          </div>
        </div>
      </div>
    </div>

    <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm" aria-labelledby="resumo-title">
      <div className="flex items-center justify-between mb-6">
        <h4 id="resumo-title" className="font-bold text-slate-800 flex items-center gap-2">
          <History size={20} className="text-indigo-600" aria-hidden />
          Resumo Diário
        </h4>
        <button type="button" onClick={onGoToHistory} className="text-indigo-600 text-sm font-bold hover:underline">
          Ver tudo
        </button>
      </div>
      <div className="space-y-4">
        {summaries.slice(0, 5).map(s => (
          <div key={s.date} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
              <p className="text-xs text-slate-400 font-medium">{s.logs.length} registros</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{formatHoursToHms(s.totalHours)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${s.isGoalMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {s.isGoalMet ? 'Meta OK' : 'Meta Baixa'}
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-300" aria-hidden />
            </div>
          </div>
        ))}
        {summaries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 italic">Nenhum registro encontrado ainda.</p>
          </div>
        )}
      </div>
    </section>
  </div>
);
