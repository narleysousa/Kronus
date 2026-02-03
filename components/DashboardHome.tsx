import React, { useState, useEffect, useMemo } from 'react';
import { Clock, History, ChevronRight, TrendingUp, Calendar, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { User, DaySummary, VacationRange, HolidayRange } from '../types';
import { WEEK_DAYS, PUNCH_DEADLINE_HOUR } from '../constants';
import { formatDurationMs, formatHoursToHms } from '../utils/formatDuration';
import { isWeekend } from '../utils/weekend';
import { isDateInVacation, isDateInHoliday } from '../utils/bankOfHours';

function todayDateString(now: number): string {
  const d = new Date(now);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayWorkDayId(now: number): string {
  return WEEK_DAYS[new Date(now).getDay()].id;
}

interface DashboardHomeProps {
  currentUser: User | null;
  lastClockInTime: number | null;
  lastSessionDurationMs: number | null;
  lastWorkLogType: 'IN' | 'OUT' | null;
  summaries: DaySummary[];
  bankOfHours: number;
  isClockedIn: boolean;
  userVacations: VacationRange[];
  userHolidays: HolidayRange[];
  emailNotice?: { type: 'success' | 'error'; text: string } | null;
  onDismissEmailNotice?: () => void;
  onPunch: () => void;
  onGoToHistory: () => void;
  onOpenPersonalCommitment: () => void;
  onOpenHoliday: () => void;
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
  emailNotice,
  onDismissEmailNotice,
  onPunch,
  onGoToHistory,
  userVacations,
  userHolidays,
  onOpenPersonalCommitment,
  onOpenHoliday,
  onOpenVacation,
  onOpenProductivity,
}) => {
  const [now, setNow] = useState(() => Date.now());

  const todayStr = useMemo(() => todayDateString(now), [now]);
  const isTodayVacation = useMemo(() => isDateInVacation(todayStr, userVacations), [todayStr, userVacations]);
  const isTodayHoliday = useMemo(() => isDateInHoliday(todayStr, userHolidays), [todayStr, userHolidays]);
  const todaySummary = useMemo(() => summaries.find(s => s.date === todayStr), [summaries, todayStr]);
  const todayWdId = useMemo(() => todayWorkDayId(now), [now]);
  const isTodayWorkDay = useMemo(
    () => !!currentUser?.workDays.includes(todayWdId),
    [currentUser?.workDays, todayWdId]
  );
  const hasPunchedInToday = useMemo(
    () => (todaySummary?.logs?.some(l => l.type === 'IN' || l.type === 'OUT') ?? false),
    [todaySummary?.logs]
  );
  const punchDeadlineMs = useMemo(() => {
    const hour = String(PUNCH_DEADLINE_HOUR).padStart(2, '0');
    return new Date(`${todayStr}T${hour}:00:00`).getTime();
  }, [todayStr]);
  const punchInCountdownMs = useMemo(() => {
    if (!isTodayWorkDay || hasPunchedInToday || now >= punchDeadlineMs) return null;
    return Math.max(0, punchDeadlineMs - now);
  }, [isTodayWorkDay, hasPunchedInToday, now, punchDeadlineMs]);
  const punchDeadlinePassed = useMemo(
    () => isTodayWorkDay && !hasPunchedInToday && now >= punchDeadlineMs,
    [isTodayWorkDay, hasPunchedInToday, now, punchDeadlineMs]
  );

  useEffect(() => {
    const shouldTickFast = isClockedIn || (isTodayWorkDay && !hasPunchedInToday);
    const intervalMs = shouldTickFast ? 1000 : 60000;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [isClockedIn, isTodayWorkDay, hasPunchedInToday]);

  const isTodayWeekend = useMemo(() => isWeekend(todayStr), [todayStr]);
  const { countdownRemainingMs, overtimeMs, isWeekendOvertime } = useMemo(() => {
    if (!isClockedIn || !currentUser || !lastClockInTime) {
      return { countdownRemainingMs: null as number | null, overtimeMs: null as number | null, isWeekendOvertime: false };
    }
    const todayHoursSoFar = (todaySummary?.totalHours ?? 0) + (now - lastClockInTime) / 3600000;
    if (isTodayWeekend) {
      const weekendOvertimeMs = Math.floor(todayHoursSoFar * 1.5 * 3600) * 1000;
      return { countdownRemainingMs: null, overtimeMs: weekendOvertimeMs, isWeekendOvertime: true };
    }
    const goalSeconds = currentUser.dailyHours * 3600;
    const workedSeconds = todayHoursSoFar * 3600;
    const remaining = Math.max(0, Math.floor(goalSeconds - workedSeconds));
    const countdownRemainingMs = remaining * 1000;
    const overtimeMs = workedSeconds >= goalSeconds ? Math.floor(workedSeconds - goalSeconds) * 1000 : null;
    return { countdownRemainingMs, overtimeMs, isWeekendOvertime: false };
  }, [isClockedIn, currentUser, lastClockInTime, todaySummary?.totalHours, now, isTodayWeekend]);

  return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {emailNotice && (
      <div
        className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold ${
          emailNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300'
        }`}
        role="status"
      >
        <div className="flex items-start gap-3">
          {emailNotice.type === 'success' ? (
            <CheckCircle2 size={18} aria-hidden />
          ) : (
            <AlertCircle size={18} aria-hidden />
          )}
          <span>{emailNotice.text}</span>
        </div>
        {onDismissEmailNotice && (
          <button
            type="button"
            onClick={onDismissEmailNotice}
            className="rounded-lg p-1 text-current/70 hover:text-current"
            aria-label="Fechar aviso"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>
    )}
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Olá, {currentUser?.name.split(' ')[0]} 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Hoje é {new Date(now).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenPersonalCommitment}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800 text-sm font-bold transition-colors"
        >
          <Calendar size={18} aria-hidden />
          Compromissos pessoais
        </button>
        <button
          type="button"
          onClick={onOpenHoliday}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
            isTodayHoliday
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 ring-2 ring-amber-400 dark:ring-amber-500'
              : 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
          }`}
        >
          <Calendar size={18} aria-hidden />
          Feriados
        </button>
        <button
          type="button"
          onClick={onOpenVacation}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
            isTodayVacation
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 ring-2 ring-emerald-400 dark:ring-emerald-500'
              : 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
          }`}
        >
          <Calendar size={18} aria-hidden />
          Férias
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/30">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 dark:bg-indigo-900/40 px-3 py-1 rounded-full text-indigo-100 dark:text-indigo-200 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-400/30 dark:border-indigo-500/40">
              Status Atual
            </div>
            <h3 className="text-4xl font-bold mb-2">
              {isTodayVacation
                ? 'Dia de férias'
                : isTodayHoliday
                  ? 'Feriado / recesso'
                  : isClockedIn
                    ? 'Você está trabalhando'
                    : 'Ponto não batido'}
            </h3>
            <p className="text-indigo-100 dark:text-indigo-200 text-lg opacity-90">
              {isTodayVacation
                ? 'Hoje não conta para meta nem banco de horas.'
                : isTodayHoliday
                  ? 'Dia abonado.'
                  : isClockedIn
                    ? `Início do turno às ${lastClockInTime ? new Date(lastClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}`
                    : 'Bata o ponto para iniciar sua jornada de hoje.'}
            </p>
            {!isTodayVacation && !isTodayHoliday && isClockedIn && countdownRemainingMs !== null && overtimeMs === null && countdownRemainingMs > 0 && (
              <p className="mt-3 text-red-400 font-bold text-xl tabular-nums" aria-live="polite">
                Faltam {formatDurationMs(countdownRemainingMs)} para a meta
              </p>
            )}
            {!isTodayVacation && !isTodayHoliday && isClockedIn && overtimeMs !== null && (
              <p className="mt-3 text-emerald-300 font-bold text-xl tabular-nums" aria-live="polite">
                {isWeekendOvertime ? 'Horas extras (1,5x):' : 'Horas extras:'} +{formatDurationMs(overtimeMs)}
              </p>
            )}
            {!isTodayVacation && !isTodayHoliday && !isClockedIn && isTodayWorkDay && !hasPunchedInToday && (
              punchInCountdownMs !== null ? (
                <p className="mt-3 text-amber-200 font-bold text-xl tabular-nums" aria-live="polite">
                  Faltam {formatDurationMs(punchInCountdownMs)} para bater o ponto (prazo: {PUNCH_DEADLINE_HOUR}h)
                </p>
              ) : punchDeadlinePassed ? (
                <p className="mt-3 flex items-center gap-2 text-amber-200 font-bold">
                  <AlertCircle size={20} aria-hidden />
                  Prazo de 6h para bater o ponto já passou. Bata o ponto assim que puder.
                </p>
              ) : null
            )}
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
              <p className="text-indigo-100 dark:text-indigo-200 text-sm font-semibold mt-3">
                Você trabalhou {formatDurationMs(lastSessionDurationMs)} na última vez.
              </p>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4 w-48 h-48 bg-white/10 rounded-full blur-2xl" aria-hidden />
        <div className="absolute bottom-4 left-4 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl" aria-hidden />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Banco de Horas</h4>
            <button
              type="button"
              onClick={onOpenProductivity}
              className={`p-2 rounded-lg transition-colors hover:opacity-90 ${bankOfHours >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30'}`}
              aria-label="Abrir dashboard de produtividade"
            >
              <TrendingUp size={20} />
            </button>
          </div>
          <div className="space-y-1">
            <span className={`text-5xl font-black ${bankOfHours >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {bankOfHours >= 0 ? '+' : ''}{formatHoursToHms(bankOfHours)}
            </span>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Acúmulo total no período</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Meta Diária</span>
            <span className="text-slate-800 dark:text-slate-100 font-bold">{currentUser?.dailyHours}h / dia</span>
          </div>
        </div>
      </div>
    </div>

    <section className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm" aria-labelledby="resumo-title">
      <div className="flex items-center justify-between mb-6">
        <h4 id="resumo-title" className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <History size={20} className="text-indigo-600 dark:text-indigo-400" aria-hidden />
          Resumo Diário
        </h4>
        <button type="button" onClick={onGoToHistory} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">
          Ver tudo
        </button>
      </div>
      <div className="space-y-4">
        {summaries.slice(0, 5).map(s => (
          <div key={s.date} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{s.logs.length} registros</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatHoursToHms(s.totalHours)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${s.isGoalMet ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                  {s.isGoalMet ? 'Meta OK' : 'Meta Baixa'}
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-500" aria-hidden />
            </div>
          </div>
        ))}
        {summaries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 dark:text-slate-500 italic">Nenhum registro encontrado ainda.</p>
          </div>
        )}
      </div>
    </section>
  </div>
  );
};
