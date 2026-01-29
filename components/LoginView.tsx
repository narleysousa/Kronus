import React from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { KronusLogo } from '../constants';
import { PinInput } from './PinInput';
import { formatCpfDisplay, cpfDigits } from '../utils/cpfMask';

interface LoginViewProps {
  loginCpf: string;
  setLoginCpf: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  authError: string;
  onLogin: () => void;
  onGoToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginCpf,
  setLoginCpf,
  pin,
  setPin,
  rememberMe,
  setRememberMe,
  authError,
  onLogin,
  onGoToRegister,
  onForgotPassword,
}) => {
  const displayCpf = formatCpfDisplay(loginCpf);
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setLoginCpf(raw);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 text-center bg-indigo-600 text-white">
          <div className="flex justify-center mb-4">
            <KronusLogo className="w-20 h-20 text-indigo-200" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kronus</h1>
          <p className="text-indigo-100 mt-2 opacity-90">Gestão de Ponto Inteligente</p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label htmlFor="login-cpf" className="block text-sm font-semibold text-slate-700 mb-2">CPF</label>
            <input
              id="login-cpf"
              type="text"
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
              value={displayCpf}
              onChange={handleCpfChange}
              aria-describedby={authError ? 'login-error' : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-4 text-center">Digite seu PIN de 4 dígitos</label>
            <PinInput value={pin} onChange={setPin} aria-label="PIN de acesso" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-describedby="remember-hint"
            />
            <span id="remember-hint" className="text-sm font-medium text-slate-600">Lembrar CPF neste dispositivo</span>
          </label>

          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Esqueci minha senha
          </button>

          {authError && (
            <div id="login-error" className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onLogin}
            disabled={pin.length < 4 || cpfDigits(loginCpf).length < 11}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={20} aria-hidden />
            Entrar no Sistema
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-slate-400 text-sm">ou</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={18} aria-hidden />
            Criar Nova Conta
          </button>
        </div>
      </div>
    </div>
  );
};
