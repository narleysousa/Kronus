import React from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { KronusLogo } from '../constants';
import { PinInput } from './PinInput';
import { ThemeToggle } from './ThemeToggle';

interface LoginViewProps {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  rememberLogin: boolean;
  setRememberLogin: (v: boolean) => void;
  authError: string;
  onLogin: () => void;
  onGoToRegister: () => void;
  onForgotPassword: () => void;
}

const isEmailValid = (email: string): boolean => {
  const trimmed = email.trim();
  return trimmed.length >= 5 && trimmed.includes('@') && trimmed.includes('.');
};

export const LoginView: React.FC<LoginViewProps> = ({
  loginEmail,
  setLoginEmail,
  pin,
  setPin,
  rememberLogin,
  setRememberLogin,
  authError,
  onLogin,
  onGoToRegister,
  onForgotPassword,
}) => {
  const canSubmit = pin.length >= 4 && isEmailValid(loginEmail);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative">
      <ThemeToggle compact dropdownPosition="down" className="absolute top-4 right-4 z-10" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="p-8 text-center bg-indigo-600 text-white">
          <div className="flex justify-center mb-4">
            <KronusLogo className="w-20 h-20 text-indigo-200" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kronus</h1>
          <p className="text-indigo-100 mt-2 opacity-90">Gestão de Ponto Inteligente</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              aria-describedby={authError ? 'login-error' : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 text-center">Digite seu PIN de 4 dígitos</label>
            <PinInput value={pin} onChange={setPin} aria-label="PIN de acesso" />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <input
              id="remember-login"
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Lembrar login
          </label>

          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            Esqueci minha senha
          </button>

          {authError && (
            <div id="login-error" className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={20} aria-hidden />
            Entrar no Sistema
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-600" />
            <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-sm">ou</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-600" />
          </div>

          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-semibold py-3 rounded-xl border border-slate-200 dark:border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={18} aria-hidden />
            Criar Nova Conta
          </button>
        </form>
      </div>
    </div>
  );
};
