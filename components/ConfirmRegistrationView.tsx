import React from 'react';
import { Mail, ShieldCheck, X } from 'lucide-react';
import { KronusLogo } from '../constants';
import { CodeInput } from './CodeInput';
import { maskEmail } from '../utils/emailMask';

interface ConfirmRegistrationViewProps {
  email: string;
  code: string;
  setCode: (val: string) => void;
  demoCode: string;
  error: string;
  onConfirm: () => void;
  onResend: () => void;
  onCancel: () => void;
}

export const ConfirmRegistrationView: React.FC<ConfirmRegistrationViewProps> = ({
  email,
  code,
  setCode,
  demoCode,
  error,
  onConfirm,
  onResend,
  onCancel,
}) => {
  const maskedEmail = maskEmail(email);

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <KronusLogo className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" aria-hidden />
              <h2 className="text-lg font-bold text-slate-800">Confirmar cadastro</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Cancelar e voltar ao cadastro"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-slate-600">
            Enviamos um e-mail de confirmação de cadastro para <strong>{maskedEmail}</strong>. Digite o código de 6 dígitos abaixo para ativar sua conta.
          </p>

          <div className="space-y-2">
            <CodeInput value={code} onChange={setCode} aria-label="Código de confirmação" />
            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
            <span>Para demonstração, seu código é: <strong className="font-mono text-slate-700">{demoCode}</strong></span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Confirmar e entrar
            </button>
            <button
              type="button"
              onClick={onResend}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              Reenviar código
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
