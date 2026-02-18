import React from 'react';
import { Calendar, X, CheckCircle } from 'lucide-react';

interface PersonalCommitmentModalProps {
  open: boolean;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  totalHoursLabel: string;
  error: string;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PersonalCommitmentModal: React.FC<PersonalCommitmentModalProps> = ({
  open,
  date,
  startTime,
  endTime,
  reason,
  totalHoursLabel,
  error,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onReasonChange,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="personal-commitment-title">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <Calendar size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="personal-commitment-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">Compromissos pessoais</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
              Informe o período da sua liberação. Esse tempo será contabilizado como horas trabalhadas.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">De</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Até</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-700 dark:text-amber-400 font-semibold">Horas consideradas</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">{totalHoursLabel}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Justificativa</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              placeholder="Ex.: Consulta médica, compromisso escolar, etc."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
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
              className="px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle size={18} aria-hidden />
              Registrar liberação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
