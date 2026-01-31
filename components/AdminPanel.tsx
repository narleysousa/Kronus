import React, { useMemo, useState } from 'react';
import { ShieldCheck, Users, Calendar, Edit2, Trash2, Plus, X, Save, Clock, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { User, UserRole, PunchLog, PunchType, VacationRange, HolidayRange } from '../types';
import { WEEK_DAYS } from '../constants';
import { cpfDigits, formatCpfDisplay } from '../utils/cpfMask';
import { computeBankOfHours } from '../utils/bankOfHours';
import { formatHoursToHms } from '../utils/formatDuration';
import { exportHoursToSpreadsheet } from '../utils/exportHours';

interface AdminPanelProps {
  currentUser: User | null;
  users: User[];
  logs: PunchLog[];
  vacations?: Record<string, VacationRange[]>;
  holidays?: Record<string, HolidayRange[]>;
  onPromoteToMaster?: (userId: string) => void;
  onDemoteToUser?: (userId: string) => void;
  onRequestDeleteUser: (user: User) => void;
  onConfirmDeleteLog: (id: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onUpdateLog: (logId: string, updates: Partial<PunchLog>) => void;
  onAddLog: (log: PunchLog) => void;
  onRequestDeleteByCpf?: (cpf: string) => void;
  removeByCpfMessage?: { type: 'success' | 'error'; text: string } | null;
}

interface UserDraft {
  name: string;
  email: string;
  cpf: string;
  pin: string;
  role: UserRole;
  position: string;
  dailyHours: string;
  workDays: string[];
}

interface LogDraft {
  date: string;
  time: string;
  endTime?: string;
  type: PunchType;
}

const toLocalDateInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalTimeInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const buildEndTime = (date: string, time: string) => {
  const timestamp = new Date(`${date}T${time}`).getTime();
  if (Number.isNaN(timestamp)) return '';
  return toLocalTimeInput(timestamp + 60 * 60 * 1000);
};

const getLogTypeInfo = (log: PunchLog) => {
  if (log.type === 'IN') {
    return { label: 'Entrada', badgeClass: 'bg-emerald-100 text-emerald-700' };
  }
  if (log.type === 'OUT') {
    return { label: 'Saída', badgeClass: 'bg-rose-100 text-rose-700' };
  }
  const label = log.justificationKind === 'missed' ? 'Justificado' : 'Compromisso pessoal';
  return { label, badgeClass: 'bg-amber-100 text-amber-700' };
};

const createUserDraft = (user: User): UserDraft => ({
  name: user.name,
  email: user.email,
  cpf: cpfDigits(user.cpf),
  pin: user.pin,
  role: user.role,
  position: user.position,
  dailyHours: String(user.dailyHours),
  workDays: [...user.workDays],
});

const createLogDraft = (log: PunchLog): LogDraft => ({
  date: toLocalDateInput(log.timestamp),
  time: toLocalTimeInput(log.timestamp),
  endTime: log.type === 'JUSTIFIED'
    ? toLocalTimeInput(log.endTimestamp ?? (log.timestamp + 60 * 60 * 1000))
    : '',
  type: log.type,
});

const createDefaultLogDraft = (): LogDraft => {
  const now = Date.now();
  return {
    date: toLocalDateInput(now),
    time: toLocalTimeInput(now),
    endTime: toLocalTimeInput(now + 60 * 60 * 1000),
    type: 'IN',
  };
};

/** Master = acesso total; usuário comum = só os próprios registros. */
const canManageLogsOf = (currentUser: User | null, targetUser: User): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === UserRole.ADMIN) return true;
  return targetUser.id === currentUser.id;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  logs,
  vacations = {},
  holidays = {},
  onPromoteToMaster,
  onDemoteToUser,
  onRequestDeleteUser,
  onConfirmDeleteLog,
  onUpdateUser,
  onUpdateLog,
  onAddLog,
  onRequestDeleteByCpf,
  removeByCpfMessage,
}) => {
  const bankByUserId = useMemo(() => {
    if (!currentUser?.isMaster) return {};
    const map: Record<string, number> = {};
    users.forEach(user => {
      const userLogs = logs.filter(l => l.userId === user.id);
      const userVacations = vacations[user.id] ?? [];
      const userHolidays = holidays[user.id] ?? [];
      map[user.id] = computeBankOfHours(user, userLogs, userVacations, userHolidays);
    });
    return map;
  }, [currentUser?.isMaster, users, logs, vacations, holidays]);

  const [editingUserLogs, setEditingUserLogs] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [logDrafts, setLogDrafts] = useState<Record<string, LogDraft>>({});
  const [newLogDrafts, setNewLogDrafts] = useState<Record<string, LogDraft>>({});
  const [pinVisible, setPinVisible] = useState(false); // padrão: sempre ocultar
  const [removeCpfRaw, setRemoveCpfRaw] = useState('');

  const handleRemoveCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemoveCpfRaw(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const startEditUser = (user: User) => {
    if (user.isMaster && !currentUser?.isMaster) return;
    setUserDrafts(prev => ({ ...prev, [user.id]: createUserDraft(user) }));
    setEditingUserId(user.id);
  };

  const updateUserDraft = (userId: string, updates: Partial<UserDraft>) => {
    setUserDrafts(prev => ({
      ...prev,
      [userId]: { ...prev[userId], ...updates },
    }));
  };

  const toggleWorkDay = (userId: string, dayId: string) => {
    setUserDrafts(prev => {
      const draft = prev[userId];
      if (!draft) return prev;
      const exists = draft.workDays.includes(dayId);
      const workDays = exists
        ? draft.workDays.filter(day => day !== dayId)
        : [...draft.workDays, dayId];
      return {
        ...prev,
        [userId]: { ...draft, workDays },
      };
    });
  };

  const saveUser = (user: User) => {
    if (user.isMaster && !currentUser?.isMaster) {
      setEditingUserId(null);
      return;
    }
    const draft = userDrafts[user.id];
    if (!draft) return;
    const dailyHours = Number(draft.dailyHours);
    const canEditOwnPin = currentUser?.id === user.id;
    const canChangeMasterPin = currentUser?.isMaster || !user.isMaster;
    const pin = canEditOwnPin && canChangeMasterPin ? draft.pin.replace(/\D/g, '').slice(0, 4) : user.pin;
    onUpdateUser(user.id, {
      name: draft.name.trim(),
      email: draft.email.trim(),
      cpf: formatCpfDisplay(draft.cpf),
      pin,
      role: draft.role,
      position: draft.position.trim(),
      dailyHours: Number.isFinite(dailyHours) ? dailyHours : user.dailyHours,
      workDays: draft.workDays,
    });
    setEditingUserId(null);
  };

  const startEditLog = (log: PunchLog) => {
    setLogDrafts(prev => ({ ...prev, [log.id]: createLogDraft(log) }));
    setEditingLogId(log.id);
  };

  const updateLogDraft = (logId: string, updates: Partial<LogDraft>) => {
    setLogDrafts(prev => ({
      ...prev,
      [logId]: (() => {
        const draft = { ...prev[logId], ...updates };
        if (updates.type === 'JUSTIFIED' && !draft.endTime) {
          draft.endTime = buildEndTime(draft.date, draft.time);
        }
        if (updates.type && updates.type !== 'JUSTIFIED') {
          draft.endTime = '';
        }
        return draft;
      })(),
    }));
  };

  const saveLog = (logId: string) => {
    const draft = logDrafts[logId];
    if (!draft?.date || !draft?.time) return;
    const timestamp = new Date(`${draft.date}T${draft.time}`).getTime();
    if (draft.type === 'JUSTIFIED') {
      const existing = logs.find(log => log.id === logId);
      if (!draft.endTime) return;
      const endTimestamp = new Date(`${draft.date}T${draft.endTime}`).getTime();
      if (Number.isNaN(timestamp) || Number.isNaN(endTimestamp) || endTimestamp <= timestamp) return;
      onUpdateLog(logId, {
        timestamp,
        endTimestamp,
        type: draft.type,
        dateString: draft.date,
        justificationKind: existing?.justificationKind ?? 'personal',
      });
    } else {
      onUpdateLog(logId, {
        timestamp,
        endTimestamp: undefined,
        type: draft.type,
        dateString: draft.date,
      });
    }
    setEditingLogId(null);
  };

  const updateNewLogDraft = (userId: string, updates: Partial<LogDraft>) => {
    setNewLogDrafts(prev => ({
      ...prev,
      [userId]: (() => {
        const draft = { ...prev[userId], ...updates };
        if (updates.type === 'JUSTIFIED' && !draft.endTime) {
          draft.endTime = buildEndTime(draft.date, draft.time);
        }
        if (updates.type && updates.type !== 'JUSTIFIED') {
          draft.endTime = '';
        }
        return draft;
      })(),
    }));
  };

  const addLog = (userId: string) => {
    const draft = newLogDrafts[userId];
    if (!draft?.date || !draft?.time) return;
    const timestamp = new Date(`${draft.date}T${draft.time}`).getTime();
    if (draft.type === 'JUSTIFIED') {
      if (!draft.endTime) return;
      const endTimestamp = new Date(`${draft.date}T${draft.endTime}`).getTime();
      if (Number.isNaN(timestamp) || Number.isNaN(endTimestamp) || endTimestamp <= timestamp) return;
      onAddLog({
        id: crypto.randomUUID(),
        userId,
        timestamp,
        endTimestamp,
        type: draft.type,
        dateString: draft.date,
        justificationKind: 'personal',
      });
    } else {
      onAddLog({
        id: crypto.randomUUID(),
        userId,
        timestamp,
        endTimestamp: undefined,
        type: draft.type,
        dateString: draft.date,
      });
    }
    setNewLogDrafts(prev => ({
      ...prev,
      [userId]: createDefaultLogDraft(),
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel Administrativo</h2>
          <p className="text-slate-500">Gestão de colaboradores e auditoria de registros.</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={18} aria-hidden />
          Modo Administrador
        </div>
      </header>

      {currentUser?.role === UserRole.ADMIN && onRequestDeleteByCpf && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-2">Remover usuário por CPF</h3>
          <p className="text-sm text-slate-500 mb-4">Informe o CPF e confirme a exclusão com seu PIN de administrador.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="admin-remove-cpf" className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
              <input
                id="admin-remove-cpf"
                type="text"
                value={formatCpfDisplay(removeCpfRaw)}
                onChange={handleRemoveCpfChange}
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => onRequestDeleteByCpf(removeCpfRaw)}
              disabled={removeCpfRaw.length < 11}
              className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buscar e excluir
            </button>
          </div>
          {removeByCpfMessage && (
            <p
              className={`mt-3 text-sm font-medium ${
                removeByCpfMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
              role="alert"
            >
              {removeByCpfMessage.text}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => {
          const isUserAdmin = user.role === UserRole.ADMIN;
          const isMasterUser = !!user.isMaster;
          const userLogs = logs.filter(l => l.userId === user.id).sort((a, b) => b.timestamp - a.timestamp);
          const isEditingUser = editingUserId === user.id;
          const draft = isEditingUser ? (userDrafts[user.id] || createUserDraft(user)) : createUserDraft(user);
          const userPinDigits = draft.pin.replace(/\D/g, '').slice(0, 4);
          const canSaveUser = draft.name.trim() && draft.email.trim() && draft.position.trim() && userPinDigits.length === 4 && draft.dailyHours.trim();
          const newLogDraft = newLogDrafts[user.id] || createDefaultLogDraft();
          const canEditUser = !user.isMaster || currentUser?.isMaster;
          const canEditOwnPin = currentUser?.id === user.id;

          return (
            <article key={user.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:border-indigo-100 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100" aria-hidden>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2 flex-wrap">
                      {user.name}
                      {isUserAdmin ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Acesso total">Master</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" title="Usuário comum">Padrão</span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-slate-500 flex items-center gap-1"><Users size={14} aria-hidden /> {user.position}</span>
                      <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} aria-hidden /> {user.dailyHours}h/dia</span>
                      {currentUser?.isMaster && typeof bankByUserId[user.id] === 'number' && (
                        <span className={`text-sm font-medium flex items-center gap-1 ${bankByUserId[user.id] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} title="Banco de horas">
                          <Clock size={14} aria-hidden />
                          Banco: {bankByUserId[user.id] >= 0 ? '+' : ''}{formatHoursToHms(bankByUserId[user.id])}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingUserId === user.id) {
                        setEditingUserId(null);
                      } else {
                        startEditUser(user);
                      }
                    }}
                    disabled={!canEditUser}
                    title={!canEditUser ? 'Somente administrador master pode editar este usuário.' : undefined}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Edit2 size={16} aria-hidden />
                    {isEditingUser ? 'Fechar Edição' : 'Editar Usuário'}
                  </button>
                  {canManageLogsOf(currentUser, user) && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = editingUserLogs === user.id ? null : user.id;
                        setEditingUserLogs(next);
                        if (next) {
                          setNewLogDrafts(prev => prev[user.id] ? prev : { ...prev, [user.id]: createDefaultLogDraft() });
                        } else {
                          setEditingLogId(null);
                        }
                      }}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 transition-all flex items-center gap-2"
                    >
                      <Edit2 size={16} aria-hidden />
                      {editingUserLogs === user.id ? 'Fechar Horas' : 'Ver/Editar Horas'}
                    </button>
                  )}
                  {/* Somente Master pode promover usuário comum a Master */}
                  {currentUser?.isMaster && onPromoteToMaster && user.id !== currentUser.id && !isUserAdmin && (
                    <button
                      type="button"
                      onClick={() => onPromoteToMaster(user.id)}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 rounded-xl text-sm font-bold border border-amber-100 dark:border-amber-800 transition-all flex items-center gap-2"
                      title="Conceder acesso total (Master)"
                    >
                      <ShieldCheck size={16} aria-hidden />
                      Tornar Master
                    </button>
                  )}
                  {currentUser?.isMaster && onDemoteToUser && user.id !== currentUser.id && isUserAdmin && (
                    <button
                      type="button"
                      onClick={() => onDemoteToUser(user.id)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 transition-all flex items-center gap-2"
                      title="Rebaixar a usuário comum"
                    >
                      <Users size={16} aria-hidden />
                      Rebaixar a usuário
                    </button>
                  )}
                  {currentUser?.role === UserRole.ADMIN && user.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => onRequestDeleteUser(user)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-xl text-sm font-bold border border-rose-100 dark:border-rose-800 transition-all flex items-center gap-2"
                      aria-label={`Excluir usuário ${user.name}`}
                    >
                      <Trash2 size={16} aria-hidden />
                      Excluir usuário
                    </button>
                  )}
                </div>
              </div>

              {isEditingUser && (
                <div className="mt-8 pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-2">
                  <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Editar dados do colaborador</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
                      <input
                        value={draft.name}
                        onChange={(e) => updateUserDraft(user.id, { name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">E-mail</label>
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) => updateUserDraft(user.id, { email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                      <input
                        value={formatCpfDisplay(draft.cpf)}
                        onChange={(e) => updateUserDraft(user.id, { cpf: cpfDigits(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    {/* PIN só pode ser alterado pelo próprio usuário */}
                    {!canEditOwnPin ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">PIN (4 dígitos)</label>
                        <p className="text-sm text-slate-500 italic">O PIN só pode ser alterado pelo próprio usuário (via recuperação de senha).</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">PIN (4 dígitos)</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type={pinVisible ? 'text' : 'password'}
                            value={userPinDigits}
                            onChange={(e) => updateUserDraft(user.id, { pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            inputMode="numeric"
                            maxLength={4}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setPinVisible(v => !v)}
                            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                            aria-label={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                            title={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                          >
                            {pinVisible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Cargo</label>
                      <input
                        value={draft.position}
                        onChange={(e) => updateUserDraft(user.id, { position: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Horas diárias</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={draft.dailyHours}
                        onChange={(e) => updateUserDraft(user.id, { dailyHours: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Perfil</label>
                      <select
                        value={draft.role}
                        onChange={(e) => updateUserDraft(user.id, { role: e.target.value as UserRole })}
                        disabled={isUserAdmin}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
                      >
                        <option value={UserRole.USER}>Usuário comum</option>
                        <option value={UserRole.ADMIN}>Master</option>
                      </select>
                      {isUserAdmin && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">Para rebaixar, use o botão &quot;Rebaixar a usuário&quot;.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Dias de trabalho</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map(day => (
                        <label key={day.id} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-indigo-50 transition-colors has-[:checked]:bg-indigo-100 has-[:checked]:border-indigo-300">
                          <input
                            type="checkbox"
                            checked={draft.workDays.includes(day.id)}
                            onChange={() => toggleWorkDay(user.id, day.id)}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{day.id}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 transition-all flex items-center gap-2"
                    >
                      <X size={16} aria-hidden />
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => saveUser(user)}
                      disabled={!canSaveUser}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} aria-hidden />
                      Salvar alterações
                    </button>
                  </div>
                </div>
              )}

              {editingUserLogs === user.id && (
                <div className="mt-8 pt-8 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Registros de {user.name}</h5>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportHoursToSpreadsheet(userLogs, { userName: user.name, includeUserColumn: true })}
                        disabled={userLogs.length === 0}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileSpreadsheet size={14} aria-hidden />
                        Exportar para planilha
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewLogDrafts(prev => ({ ...prev, [user.id]: createDefaultLogDraft() }))}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2"
                      >
                        <Plus size={14} aria-hidden />
                        Resetar formulário
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Adicionar registro manual</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Data</label>
                        <input
                          type="date"
                          value={newLogDraft.date}
                          onChange={(e) => updateNewLogDraft(user.id, { date: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Hora</label>
                        <input
                          type="time"
                          value={newLogDraft.time}
                          onChange={(e) => updateNewLogDraft(user.id, { time: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-slate-200"
                        />
                      </div>
                      {newLogDraft.type === 'JUSTIFIED' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500">Até</label>
                          <input
                            type="time"
                            value={newLogDraft.endTime || ''}
                            onChange={(e) => updateNewLogDraft(user.id, { endTime: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-200"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Tipo</label>
                        <select
                          value={newLogDraft.type}
                          onChange={(e) => updateNewLogDraft(user.id, { type: e.target.value as PunchType })}
                          className="px-3 py-2 rounded-lg border border-slate-200"
                        >
                          <option value="IN">Entrada</option>
                          <option value="OUT">Saída</option>
                          <option value="JUSTIFIED">Liberação</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => addLog(user.id)}
                        disabled={!newLogDraft.date || !newLogDraft.time || (newLogDraft.type === 'JUSTIFIED' && !newLogDraft.endTime)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} aria-hidden />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {userLogs.map(log => {
                      const isEditingLog = editingLogId === log.id;
                      const draftLog = isEditingLog ? (logDrafts[log.id] || createLogDraft(log)) : createLogDraft(log);
                      const canSaveLog = !!draftLog.date && !!draftLog.time && (draftLog.type !== 'JUSTIFIED' || !!draftLog.endTime);
                      const typeInfo = getLogTypeInfo(log);
                      const logTimeLabel = log.type === 'JUSTIFIED' && log.endTimestamp
                        ? `${new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(log.endTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                        : new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={log.id} className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-100 text-sm">
                          {isEditingLog ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="date"
                                value={draftLog.date}
                                onChange={(e) => updateLogDraft(log.id, { date: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-slate-200"
                              />
                              <input
                                type="time"
                                value={draftLog.time}
                                onChange={(e) => updateLogDraft(log.id, { time: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-slate-200"
                              />
                              {draftLog.type === 'JUSTIFIED' && (
                                <input
                                  type="time"
                                  value={draftLog.endTime || ''}
                                  onChange={(e) => updateLogDraft(log.id, { endTime: e.target.value })}
                                  className="px-3 py-2 rounded-lg border border-slate-200"
                                />
                              )}
                              <select
                                value={draftLog.type}
                                onChange={(e) => updateLogDraft(log.id, { type: e.target.value as PunchType })}
                                className="px-3 py-2 rounded-lg border border-slate-200"
                              >
                                <option value="IN">Entrada</option>
                                <option value="OUT">Saída</option>
                                <option value="JUSTIFIED">Liberação</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveLog(log.id)}
                                  disabled={!canSaveLog}
                                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLogId(null)}
                                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="font-bold text-slate-800">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                                <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${typeInfo.badgeClass}`}>
                                  {typeInfo.label}
                                </span>
                                <span className="text-slate-500">{logTimeLabel}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditLog(log)}
                                  className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors shrink-0"
                                  aria-label="Editar registro"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onConfirmDeleteLog(log.id)}
                                  className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors shrink-0"
                                  aria-label="Excluir registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {userLogs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-slate-400 italic">Nenhum registro encontrado para este usuário.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
