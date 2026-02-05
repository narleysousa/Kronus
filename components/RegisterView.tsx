import React from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { KronusLogo, WEEK_DAYS } from '../constants';
import { formatCpfDisplay } from '../utils/cpfMask';
import { PinInput } from './PinInput';

interface RegisterViewProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  cpfError?: string;
  formError?: string;
  onRemoveByCpf?: (cpf: string, pin: string) => void;
  removeByCpfMessage?: { type: 'success' | 'error'; text: string } | null;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onBack,
  onSubmit,
  cpfError,
  formError,
  onRemoveByCpf,
  removeByCpfMessage,
}) => {
  const [cpfRaw, setCpfRaw] = React.useState('');
  const [removeCpfRaw, setRemoveCpfRaw] = React.useState('');
  const [removePin, setRemovePin] = React.useState('');
  const [pinVisible, setPinVisible] = React.useState(false); // padrão: sempre ocultar
  const displayCpf = formatCpfDisplay(cpfRaw);
  const displayRemoveCpf = formatCpfDisplay(removeCpfRaw);
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfRaw(e.target.value.replace(/\D/g, '').slice(0, 11));
  };
  const handleRemoveCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemoveCpfRaw(e.target.value.replace(/\D/g, '').slice(0, 11));
  };
  const handleRemoveByCpfClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onRemoveByCpf?.(removeCpfRaw, removePin);
  };
  React.useEffect(() => {
    if (removeByCpfMessage?.type === 'success') {
      setRemovePin('');
      setRemoveCpfRaw('');
    }
  }, [removeByCpfMessage]);

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <KronusLogo className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cadastro Kronus</h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-lg"
            aria-label="Voltar ao login"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="reg-firstName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome</label>
            <input
              id="reg-firstName"
              name="firstName"
              required
              placeholder="Ex: João"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-lastName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sobrenome</label>
            <input
              id="reg-lastName"
              name="lastName"
              required
              placeholder="Ex: Silva"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-cpf" className="text-sm font-semibold text-slate-700 dark:text-slate-300">CPF</label>
            <input
              id="reg-cpf"
              required
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
              value={displayCpf}
              onChange={handleCpfChange}
              aria-invalid={!!cpfError}
              aria-describedby={cpfError ? 'reg-cpf-error' : undefined}
              minLength={11}
            />
            <input type="hidden" name="cpf" value={cpfRaw} />
            {cpfError && <p id="reg-cpf-error" className="text-sm text-rose-600 dark:text-rose-400" role="alert">{cpfError}</p>}
          </div>

          {onRemoveByCpf && (
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">CPF já cadastrado? Remova seu cadastro anterior para se cadastrar novamente.</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px]">
                  <label htmlFor="reg-remove-cpf" className="sr-only">CPF para remover</label>
                  <input
                    id="reg-remove-cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-sm"
                    value={displayRemoveCpf}
                    onChange={handleRemoveCpfChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Confirme seu PIN</p>
                <div className="flex justify-center">
                  <PinInput value={removePin} onChange={setRemovePin} aria-label="PIN para remoção" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveByCpfClick}
                disabled={removeCpfRaw.length < 11 || removePin.length < 4}
                className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remover meu cadastro
              </button>
              {removeByCpfMessage && (
                <p
                  className={`text-sm ${removeByCpfMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  role="alert"
                >
                  {removeByCpfMessage.text}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="reg-position" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cargo / Função</label>
            <input
              id="reg-position"
              name="position"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-dailyHours" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Horas Diárias Contratadas</label>
            <input
              id="reg-dailyHours"
              name="dailyHours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              defaultValue="8"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dias de Trabalho</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dias de trabalho">
              {WEEK_DAYS.map(day => (
                <label
                  key={day.id}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors has-[:checked]:bg-indigo-100 dark:has-[:checked]:bg-indigo-900/30 has-[:checked]:border-indigo-300 dark:has-[:checked]:border-indigo-700"
                >
                  <input type="checkbox" name="workDays" value={day.id} className="sr-only" defaultChecked={day.id !== 'Sab' && day.id !== 'Dom'} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day.id}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <label htmlFor="reg-pin" className="block text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Defina seu PIN de Acesso (4 dígitos numéricos)</label>
            <div className="flex justify-center items-center gap-2">
              <input
                id="reg-pin"
                name="pin"
                type={pinVisible ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                placeholder="****"
                className="w-40 text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none bg-slate-50 dark:bg-slate-700 dark:text-slate-100"
                aria-describedby="reg-pin-hint"
              />
              <button
                type="button"
                onClick={() => setPinVisible(v => !v)}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                aria-label={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                title={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {pinVisible ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
              </button>
            </div>
            <p id="reg-pin-hint" className="text-center text-slate-500 dark:text-slate-400 text-xs">Apenas números, 4 dígitos.</p>
          </div>

          <div className="md:col-span-2 pt-6">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
              Finalizar Cadastro
            </button>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Você precisará confirmar seu e-mail para acessar a plataforma.
            </p>
          </div>

          {formError && (
            <div className="md:col-span-2 text-center text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">
              {formError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
