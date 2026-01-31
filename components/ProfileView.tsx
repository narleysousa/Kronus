import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { WEEK_DAYS } from '../constants';
import { cpfDigits, formatCpfDisplay } from '../utils/cpfMask';

interface ProfileViewProps {
  currentUser: User | null;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  onBack,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [pin, setPin] = useState('');
  const [position, setPosition] = useState('');
  const [dailyHours, setDailyHours] = useState('');
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [pinVisible, setPinVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setEmail(currentUser.email);
    setCpf(cpfDigits(currentUser.cpf));
    setPin(currentUser.pin);
    setPosition(currentUser.position);
    setDailyHours(String(currentUser.dailyHours));
    setWorkDays([...currentUser.workDays]);
  }, [currentUser]);

  if (!currentUser) return null;

  const pinDigits = pin.replace(/\D/g, '').slice(0, 4);
  const canSave =
    name.trim() &&
    email.trim() &&
    pinDigits.length === 4 &&
    position.trim() &&
    dailyHours.trim() &&
    workDays.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const dailyHoursNum = parseFloat(dailyHours.replace(',', '.'));
    if (Number.isNaN(dailyHoursNum) || dailyHoursNum < 0.5 || dailyHoursNum > 24) return;
    onUpdateUser(currentUser.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      cpf: formatCpfDisplay(cpf).replace(/\D/g, ''),
      pin: pinDigits,
      position: position.trim(),
      dailyHours: dailyHoursNum,
      workDays,
      updatedAt: Date.now(),
    });
    onBack();
  };

  const toggleWorkDay = (dayId: string) => {
    setWorkDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Meu perfil</h2>
            <p className="text-slate-500 dark:text-slate-400">Edite seus dados pessoais e de trabalho.</p>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-6 md:p-8">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider mb-6">
          Editar dados do colaborador
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">CPF</label>
            <input
              value={formatCpfDisplay(cpf)}
              onChange={(e) => setCpf(cpfDigits(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">PIN (4 dígitos)</label>
            <div className="flex gap-2 items-center">
              <input
                type={pinVisible ? 'text' : 'password'}
                value={pinDigits}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setPinVisible((v) => !v)}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shrink-0"
                aria-label={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                title={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {pinVisible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cargo</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="Ex.: Desenvolvedor"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Horas diárias</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={dailyHours}
              onChange={(e) => setDailyHours(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="6"
            />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Dias de trabalho</span>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <label
                key={day.id}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors has-[:checked]:bg-indigo-100 dark:has-[:checked]:bg-indigo-900/30 has-[:checked]:border-indigo-300 dark:has-[:checked]:border-indigo-700"
              >
                <input
                  type="checkbox"
                  checked={workDays.includes(day.id)}
                  onChange={() => toggleWorkDay(day.id)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} aria-hidden />
            Voltar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} aria-hidden />
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
};
