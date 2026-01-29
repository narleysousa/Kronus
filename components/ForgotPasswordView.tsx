import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { KronusLogo } from '../constants';
import { PinInput } from './PinInput';
import { CodeInput } from './CodeInput';
import { formatCpfDisplay, cpfDigits } from '../utils/cpfMask';
import { maskEmail } from '../utils/emailMask';
import { User } from '../types';

interface ForgotPasswordViewProps {
  users: User[];
  onBack: () => void;
  onSuccess: (userWithNewPin: User) => void;
  onUpdatePin: (userId: string, newPin: string) => void;
  generateCode: () => string;
  codeExpiryMs: number;
}

type Step = 1 | 2 | 3;

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  users,
  onBack,
  onSuccess,
  onUpdatePin,
  generateCode,
  codeExpiryMs,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [cpfOrEmail, setCpfOrEmail] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [code, setCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [demoCode, setDemoCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const displayCpfOrEmail = cpfOrEmail.includes('@')
    ? cpfOrEmail
    : formatCpfDisplay(cpfOrEmail.replace(/\D/g, ''));

  const handleCpfOrEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCpfOrEmail(v.includes('@') ? v : v.replace(/\D/g, ''));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
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
    const newCode = generateCode();
    setDemoCode(newCode);
    setCodeExpiresAt(Date.now() + codeExpiryMs);
    setUser(found);
    setCode('');
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    if (code.length !== 6) {
      setError('Digite o código de 6 dígitos.');
      return;
    }
    if (code !== demoCode) {
      setError('Código incorreto. Verifique e tente novamente.');
      return;
    }
    if (Date.now() > codeExpiresAt) {
      setError('Código expirado. Solicite um novo código.');
      return;
    }
    setStep(3);
    setNewPin('');
    setConfirmPin('');
    setError('');
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    const pin = newPin.replace(/\D/g, '').slice(0, 4);
    if (pin.length !== 4) {
      setError('O PIN deve ter 4 dígitos.');
      return;
    }
    if (pin !== confirmPin.replace(/\D/g, '').slice(0, 4)) {
      setError('Os PINs não coincidem.');
      return;
    }
    onUpdatePin(user.id, pin);
    onSuccess({ ...user, pin });
  };

  const handleResendCode = () => {
    const newCode = generateCode();
    setDemoCode(newCode);
    setCodeExpiresAt(Date.now() + codeExpiryMs);
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={step === 1 ? onBack : () => { setStep(1); setError(''); setUser(null); }}
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

        <form
          onSubmit={step === 1 ? handleStep1Submit : step === 2 ? handleStep2Submit : handleStep3Submit}
          className="p-8 space-y-6"
        >
          {step === 1 && (
            <>
              <p className="text-slate-600 text-sm">Informe o CPF ou o e-mail cadastrado para receber um código de verificação.</p>
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
            </>
          )}

          {step === 2 && user && (
            <>
              <p className="text-slate-600 text-sm">
                Enviamos um código de 6 dígitos para <strong>{maskEmail(user.email)}</strong>. Digite abaixo.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">Código de verificação</label>
                <CodeInput value={code} onChange={setCode} aria-label="Código" />
                <p className="mt-2 text-center text-xs text-slate-500">
                  Para demonstração, seu código é: <strong className="font-mono">{demoCode}</strong>
                </p>
                <button type="button" onClick={handleResendCode} className="mt-2 w-full text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  Reenviar código
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-slate-600 text-sm">Crie um novo PIN de 4 dígitos e confirme.</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Novo PIN</label>
                <div className="flex justify-center">
                  <PinInput value={newPin} onChange={setNewPin} aria-label="Novo PIN" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirme o PIN</label>
                <div className="flex justify-center">
                  <PinInput value={confirmPin} onChange={setConfirmPin} aria-label="Confirmar PIN" />
                </div>
              </div>
            </>
          )}

          {error && (
            <div id="forgot-error" className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {step === 1 && 'Enviar código'}
            {step === 2 && 'Verificar código'}
            {step === 3 && 'Redefinir PIN e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
