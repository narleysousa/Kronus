import React from 'react';
import { X } from 'lucide-react';
import { KronusLogo, WEEK_DAYS } from '../constants';
import { formatCpfDisplay } from '../utils/cpfMask';

interface RegisterViewProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  cpfError?: string;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onBack, onSubmit, cpfError }) => {
  const [cpfRaw, setCpfRaw] = React.useState('');
  const displayCpf = formatCpfDisplay(cpfRaw);
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfRaw(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <KronusLogo className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Cadastro Kronus</h2>
          </div>
          <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg" aria-label="Voltar ao login">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="reg-firstName" className="text-sm font-semibold text-slate-700">Nome</label>
            <input id="reg-firstName" name="firstName" required placeholder="Ex: João" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-lastName" className="text-sm font-semibold text-slate-700">Sobrenome</label>
            <input id="reg-lastName" name="lastName" required placeholder="Ex: Silva" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-sm font-semibold text-slate-700">E-mail de Recuperação</label>
            <input id="reg-email" name="email" type="email" required className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-cpf" className="text-sm font-semibold text-slate-700">CPF</label>
            <input
              id="reg-cpf"
              required
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
              value={displayCpf}
              onChange={handleCpfChange}
              aria-invalid={!!cpfError}
              aria-describedby={cpfError ? 'reg-cpf-error' : undefined}
              minLength={11}
            />
            <input type="hidden" name="cpf" value={cpfRaw} />
            {cpfError && <p id="reg-cpf-error" className="text-sm text-rose-600" role="alert">{cpfError}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-position" className="text-sm font-semibold text-slate-700">Cargo / Função</label>
            <input id="reg-position" name="position" required className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-dailyHours" className="text-sm font-semibold text-slate-700">Horas Diárias Contratadas</label>
            <input id="reg-dailyHours" name="dailyHours" type="number" step="0.5" min="0.5" max="24" defaultValue="8" required className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="md:col-span-2 space-y-3">
            <span className="text-sm font-semibold text-slate-700">Dias de Trabalho</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dias de trabalho">
              {WEEK_DAYS.map(day => (
                <label key={day.id} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-indigo-50 transition-colors has-[:checked]:bg-indigo-100 has-[:checked]:border-indigo-300">
                  <input type="checkbox" name="workDays" value={day.id} className="sr-only" defaultChecked={day.id !== 'Sab' && day.id !== 'Dom'} />
                  <span className="text-sm font-medium">{day.id}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
            <label htmlFor="reg-pin" className="block text-center text-sm font-semibold text-slate-700">Defina seu PIN de Acesso (4 dígitos numéricos)</label>
            <div className="flex justify-center">
              <input
                id="reg-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                placeholder="****"
                className="w-40 text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none bg-slate-50"
                aria-describedby="reg-pin-hint"
              />
            </div>
            <p id="reg-pin-hint" className="text-center text-slate-500 text-xs">Apenas números, 4 dígitos.</p>
          </div>

          <div className="md:col-span-2 pt-6">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
              Finalizar Cadastro e Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
