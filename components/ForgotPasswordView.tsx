import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, MailCheck } from 'lucide-react';
import { KronusLogo } from '../constants';
import { formatCpfDisplay, cpfDigits } from '../utils/cpfMask';
import { maskEmail } from '../utils/emailMask';
import { User } from '../types';

interface ForgotPasswordViewProps {
  users: User[];
  onBack: () => void;
  onRequestReset: (email: string) => Promise<void>;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  users,
  onBack,
  onRequestReset,
}) => {
  const [cpfOrEmail, setCpfOrEmail] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const displayCpfOrEmail = cpfOrEmail.includes('@')
    ? cpfOrEmail
    : formatCpfDisplay(cpfOrEmail.replace(/\D/g, ''));

  const handleCpfOrEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCpfOrEmail(v.includes('@') ? v : v.replace(/\D/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setError('');

    const raw = cpfOrEmail.includes('@')
      ? cpfOrEmail.trim().toLowerCase()
      : cpfDigits(cpfOrEmail);

    const found = users.find(u =>
      cpfOrEmail.includes('@')
        ? u.email.trim().toLowerCase() === raw
        : cpfDigits(u.cpf) === raw
    );

    if (!found) {
      setError('CPF ou e-mail não encontrado.');
      return;
    }

    setStatus('sending');
    try {
      await onRequestReset(found.email);
      setTargetEmail(found.email);
      setStatus('sent');
    } catch {
      setError('Não foi possível enviar o e-mail de redefinição.');
      setStatus('idle');
    }
  };

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
            <h2 className="text-lg font-bold text-slate-800">Esqueci minha senha</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <p className="text-slate-600 text-sm">
            Informe o CPF ou o e-mail cadastrado para receber um link de redefinição de PIN.
          </p>
          <div>
            <label htmlFor="forgot-cpf-email" className="block text-sm font-semibold text-slate-700 mb-2">CPF ou E-mail</label>
            <input
              id="forgot-cpf-email"
              type="text"
              placeholder="000.000.000-00 ou email@exemplo.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
              value={displayCpfOrEmail}
              onChange={handleCpfOrEmailChange}
              aria-describedby={error ? 'forgot-error' : undefined}
            />
          </div>

          {status === 'sent' && targetEmail && (
            <div className="flex items-start gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100" role="status">
              <MailCheck size={16} aria-hidden />
              <span>Enviamos um link de redefinição para <strong>{maskEmail(targetEmail)}</strong>. Verifique sua caixa de entrada.</span>
            </div>
          )}

          {error && (
            <div id="forgot-error" className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>
      </div>
    </div>
  );
};
