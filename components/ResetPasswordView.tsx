import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';
import { KronusLogo } from '../constants';
import { PinInput } from './PinInput';
import { maskEmail } from '../utils/emailMask';

interface ResetPasswordViewProps {
  email: string;
  isVerifying: boolean;
  isSubmitting?: boolean;
  error?: string;
  onSubmit: (pin: string) => void;
  onBack: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  email,
  isVerifying,
  isSubmitting = false,
  error,
  onSubmit,
  onBack,
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const pin = newPin.replace(/\D/g, '').slice(0, 4);
    const confirm = confirmPin.replace(/\D/g, '').slice(0, 4);
    if (pin.length !== 4) {
      setLocalError('O PIN deve ter 4 dígitos.');
      return;
    }
    if (pin !== confirm) {
      setLocalError('Os PINs não coincidem.');
      return;
    }
    onSubmit(pin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <KronusLogo className="w-8 h-8 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Redefinir PIN</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 text-sm text-indigo-700 dark:text-indigo-300">
            <KeyRound size={18} aria-hidden />
            <div>
              <p className="font-semibold">Crie um novo PIN de 4 dígitos</p>
              <p>{email ? `Conta: ${maskEmail(email)}` : 'Validando link de redefinição...'}</p>
            </div>
          </div>

          {isVerifying ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">Validando o link, aguarde...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Novo PIN</label>
                <div className="flex justify-center">
                  <PinInput value={newPin} onChange={setNewPin} aria-label="Novo PIN" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirme o PIN</label>
                <div className="flex justify-center">
                  <PinInput value={confirmPin} onChange={setConfirmPin} aria-label="Confirmar PIN" />
                </div>
              </div>
            </>
          )}

          {(localError || error) && (
            <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{localError || error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-60"
          >
            {isSubmitting ? 'Redefinindo...' : 'Redefinir PIN'}
          </button>
        </form>
      </div>
    </div>
  );
};
