import React from 'react';
import { AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { PinInput } from './PinInput';

interface DeleteUserPinModalProps {
  open: boolean;
  userName: string;
  pin: string;
  setPin: (v: string) => void;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteUserPinModal: React.FC<DeleteUserPinModalProps> = ({
  open,
  userName,
  pin,
  setPin,
  error,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const isValid = pin.length === 4;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="delete-user-pin-title">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="delete-user-pin-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">Excluir usuário</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
              Para excluir <strong>{userName}</strong>, digite seu PIN de administrador para confirmar.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">Seu PIN (4 dígitos)</label>
            <div className="flex justify-center">
              <PinInput value={pin} onChange={setPin} aria-label="PIN do administrador" />
            </div>
            {error && (
              <p className="mt-2 text-center text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{error}</p>
            )}
          </div>

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
              disabled={!isValid}
              className="px-4 py-2.5 rounded-xl font-semibold text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ShieldCheck size={18} aria-hidden />
              Confirmar e excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
