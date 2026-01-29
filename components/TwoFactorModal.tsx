import React from 'react';
import { ShieldCheck, X, Mail } from 'lucide-react';
import { CodeInput } from './CodeInput';
import { maskEmail } from '../utils/emailMask';

interface TwoFactorModalProps {
  open: boolean;
  email: string;
  code: string;
  setCode: (v: string) => void;
  demoCode: string;
  error: string;
  onConfirm: () => void;
  onResend: () => void;
  onCancel: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  open,
  email,
  code,
  setCode,
  demoCode,
  error,
  onConfirm,
  onResend,
  onCancel,
}) => {
  if (!open) return null;

  const masked = maskEmail(email);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="2fa-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-indigo-100 text-indigo-600">
            <ShieldCheck size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="2fa-title" className="text-lg font-bold text-slate-800">Verificação em duas etapas</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Enviamos um código de 6 dígitos para <strong>{masked}</strong>. Digite abaixo para continuar.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">Código de verificação</label>
            <CodeInput value={code} onChange={setCode} aria-label="Código" />
            <p className="mt-2 text-center text-xs text-slate-500">
              <Mail size={12} className="inline mr-1" aria-hidden />
              Para demonstração, seu código é: <strong className="font-mono">{demoCode}</strong>
            </p>
            {error && (
              <p className="mt-2 text-center text-sm text-rose-600 font-medium" role="alert">{error}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={onResend}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Reenviar código
            </button>
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
              disabled={code.length !== 6}
              className="px-4 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verificar e entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
