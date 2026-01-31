import React, { useMemo, useState } from 'react';
import { X, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import type { DaySummary } from '../types';
import { formatHoursToHms } from '../utils/formatDuration';
import { getDayContribution, isWeekend } from '../utils/weekend';

const PERIODS: { id: string; label: string; days: number }[] = [
  { id: '1', label: '1 dia', days: 1 },
  { id: '7', label: '7 dias', days: 7 },
  { id: '15', label: '15 dias', days: 15 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '60', label: '60 dias', days: 60 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '6m', label: '6 meses', days: 182 },
  { id: '1y', label: '1 ano', days: 365 },
];

function todayString(now: number): string {
  const d = new Date(now);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function cutoffString(now: number, daysAgo: number): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

interface ProductivityDashboardProps {
  summaries: DaySummary[];
  onClose: () => void;
  /** Quando true, exibe como página (com botão Voltar) em vez de modal. */
  embedded?: boolean;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ summaries, onClose, embedded }) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState('30');
  const [now, setNow] = useState(() => Date.now());
  const today = useMemo(() => todayString(now), [now]);
  const selectedPeriod = PERIODS.find(p => p.id === selectedPeriodId) ?? PERIODS[3];

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const { cutoff, daysInPeriod, accumulatedTotal } = useMemo(() => {
    const days = selectedPeriod.days;
    const cutoff = cutoffString(now, days);
    const filtered = summaries.filter(s => s.date >= cutoff && s.date <= today);
    const daysInPeriod = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const total = daysInPeriod.reduce(
      (acc, s) => acc + getDayContribution(s.date, s.totalHours, s.expectedHours),
      0
    );
    return { cutoff, daysInPeriod: daysInPeriod, accumulatedTotal: total };
  }, [summaries, selectedPeriod.days, today, now]);

  const header = (
    <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <TrendingUp size={24} aria-hidden />
        </div>
        <div>
          <h2 id="productivity-title" className="text-xl font-bold text-slate-800">Dashboard de Produtividade</h2>
          <p className="text-sm text-slate-500">Quando as horas foram contabilizadas no banco</p>
        </div>
      </div>
      {embedded ? (
        <button type="button" onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors" aria-label="Voltar ao início">
          <ArrowLeft size={20} />
          Voltar ao Início
        </button>
      ) : (
        <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Fechar">
          <X size={24} />
        </button>
      )}
    </div>
  );

  const content = (
    <div className="p-6 overflow-y-auto flex-1 space-y-6">

          <section>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Período</h3>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPeriodId(p.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    selectedPeriodId === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-indigo-600" aria-hidden />
              <h3 className="font-bold text-slate-800">Acumulado no período ({selectedPeriod.label})</h3>
            </div>
            <p className={`text-4xl font-black ${accumulatedTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {accumulatedTotal >= 0 ? '+' : ''}{formatHoursToHms(accumulatedTotal)}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              De {new Date(cutoff + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(today + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Por dia (ganho ou perda)</h3>
            {daysInPeriod.length === 0 ? (
              <p className="text-slate-400 italic py-4">Nenhum registro neste período.</p>
            ) : (
              <ul className="space-y-2">
                {daysInPeriod.map(s => {
                  const contribution = getDayContribution(s.date, s.totalHours, s.expectedHours);
                  const isWeekendDay = isWeekend(s.date);
                  return (
                    <li
                      key={s.date}
                      className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-800">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                        {isWeekendDay && (
                          <span className="ml-1 text-xs font-semibold text-amber-600" title="Hora extra 1,5x">1,5x</span>
                        )}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">
                          {formatHoursToHms(s.totalHours)} / {isWeekendDay ? '—' : `${s.expectedHours}h`}
                        </span>
                        <span className={`font-bold tabular-nums ${contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {contribution >= 0 ? '+' : ''}{formatHoursToHms(contribution)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
    </div>
  );

  if (embedded) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {header}
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="productivity-title">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {header}
        {content}
      </div>
    </div>
  );
};
