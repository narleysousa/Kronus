import React from 'react';
import { TreePalm, X, CheckCircle } from 'lucide-react';

interface VacationModalProps {
  open: boolean;
  startDate: string;
  endDate: string;
  error: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const VacationModal: React.FC<VacationModalProps> = ({
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="vacation-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-emerald-100 text-emerald-600">
            <TreePalm size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="vacation-title" className="text-lg font-bold text-slate-800">Registrar férias</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Informe o período de férias. Nesses dias, o ponto não contabiliza horas.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-600 font-medium" role="alert">{error}</p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} aria-hidden />
            Registrar férias
          </button>
        </div>
      </div>
    </div>
  );
};
