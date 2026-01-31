import React from 'react';
import { CalendarDays, X, CheckCircle } from 'lucide-react';

interface HolidayModalProps {
  open: boolean;
  startDate: string;
  endDate: string;
  error: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  open,
  startDate,
  endDate,
  error,
  onStartDateChange,
  onEndDateChange,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="holiday-title">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <CalendarDays size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="holiday-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">Feriados e recesso</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
              Informe o período de feriado ou recesso. Esses dias serão abonados (não contam como dia de trabalho).
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{error}</p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} aria-hidden />
            Registrar feriado/recesso
          </button>
        </div>
      </div>
    </div>
  );
};
