import React from 'react';
import { ArrowLeft, AlertCircle, MailCheck } from 'lucide-react';
import { KronusLogo } from '../constants';
import { maskEmail } from '../utils/emailMask';

interface VerifyEmailViewProps {
  userName: string;
  email: string;
  error?: string;
  notice?: { type: 'success' | 'error'; text: string } | null;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  userName,
  email,
  error,
  notice,
  onVerify,
  onResend,
  onBack,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <KronusLogo className="w-8 h-8 text-indigo-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-800">Confirme seu e-mail</h2>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
            <MailCheck size={18} aria-hidden />
            <div>
              <p className="font-semibold">Olá, {userName.split(' ')[0]}!</p>
              <p>Enviamos um link de verificação para <strong>{maskEmail(email)}</strong>.</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 text-center">
              Clique no link de verificação enviado para o seu e-mail.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onVerify}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all"
              >
                Já confirmei, continuar
              </button>
              <button
                type="button"
                onClick={onResend}
                className="w-full text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Reenviar e-mail de confirmação
              </button>
            </div>
          </div>

          {notice && (
            <div
              className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                notice.type === 'success'
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                  : 'text-amber-700 bg-amber-50 border-amber-100'
              }`}
              role="status"
            >
              <AlertCircle size={16} aria-hidden />
              <span>{notice.text}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* botão principal já está acima */}
        </div>
      </div>
    </div>
  );
};
