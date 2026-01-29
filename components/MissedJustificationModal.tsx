import React from 'react';
import { AlertCircle, X, CheckCircle } from 'lucide-react';

interface MissedJustificationModalProps {
  open: boolean;
  dateLabel: string;
  reason: string;
  error: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MissedJustificationModal: React.FC<MissedJustificationModalProps> = ({
  open,
  dateLabel,
  reason,
  error,
  onReasonChange,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="missed-justification-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-amber-100 text-amber-600">
            <AlertCircle size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="missed-justification-title" className="text-lg font-bold text-slate-800">Justificativa de ausência</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Identificamos ausência de batida em <strong>{dateLabel}</strong>. Informe uma justificativa para registrar o horário padrão (12h às 18h).
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-xs font-semibold text-slate-500 uppercase">Justificativa</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            placeholder="Ex: Esqueci"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none resize-none"
          />
          {error && (
            <p className="text-sm text-rose-600 font-medium" role="alert">{error}</p>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Depois
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} aria-hidden />
            Registrar justificativa
          </button>
        </div>
      </div>
    </div>
  );
};
