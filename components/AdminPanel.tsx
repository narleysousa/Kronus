import React, { useState } from 'react';
import { ShieldCheck, Users, Calendar, Edit2, Trash2, Check, Plus, X, Save } from 'lucide-react';
import { User, UserRole, PunchLog, PunchType } from '../types';
import { WEEK_DAYS } from '../constants';
import { cpfDigits, formatCpfDisplay } from '../utils/cpfMask';

interface AdminPanelProps {
  currentUser: User | null;
  users: User[];
  logs: PunchLog[];
  onPromoteUser: (userId: string) => void;
  onRequestDeleteUser: (user: User) => void;
  onConfirmDeleteLog: (id: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onUpdateLog: (logId: string, updates: Partial<PunchLog>) => void;
  onAddLog: (log: PunchLog) => void;
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
  const label = log.justificationKind === 'missed' ? 'Justificado' : 'Liberação';
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

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  logs,
  onPromoteUser,
  onRequestDeleteUser,
  onConfirmDeleteLog,
  onUpdateUser,
  onUpdateLog,
  onAddLog,
}) => {
  const [editingUserLogs, setEditingUserLogs] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [logDrafts, setLogDrafts] = useState<Record<string, LogDraft>>({});
  const [newLogDrafts, setNewLogDrafts] = useState<Record<string, LogDraft>>({});

  const startEditUser = (user: User) => {
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
    const draft = userDrafts[user.id];
    if (!draft) return;
    const pin = draft.pin.replace(/\D/g, '').slice(0, 4);
    const dailyHours = Number(draft.dailyHours);
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
      if (!draft.endTime) return;
      const endTimestamp = new Date(`${draft.date}T${draft.endTime}`).getTime();
      if (Number.isNaN(timestamp) || Number.isNaN(endTimestamp) || endTimestamp <= timestamp) return;
      onUpdateLog(logId, {
        timestamp,
        endTimestamp,
        type: draft.type,
        dateString: draft.date,
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

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => {
          const isUserAdmin = user.role === UserRole.ADMIN;
          const userLogs = logs.filter(l => l.userId === user.id).sort((a, b) => b.timestamp - a.timestamp);
          const isEditingUser = editingUserId === user.id;
          const draft = isEditingUser ? (userDrafts[user.id] || createUserDraft(user)) : createUserDraft(user);
          const userPinDigits = draft.pin.replace(/\D/g, '').slice(0, 4);
          const canSaveUser = draft.name.trim() && draft.email.trim() && draft.position.trim() && userPinDigits.length === 4 && draft.dailyHours.trim();
          const newLogDraft = newLogDrafts[user.id] || createDefaultLogDraft();

          return (
            <article key={user.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:border-indigo-100 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100" aria-hidden>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      {user.name}
                      {isUserAdmin && <Check size={16} className="text-indigo-500 bg-indigo-50 rounded-full p-0.5" aria-hidden />}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-slate-500 flex items-center gap-1"><Users size={14} aria-hidden /> {user.position}</span>
                      <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} aria-hidden /> {user.dailyHours}h/dia</span>
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
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 transition-all flex items-center gap-2"
                  >
                    <Edit2 size={16} aria-hidden />
                    {isEditingUser ? 'Fechar Edição' : 'Editar Usuário'}
                  </button>
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
                  {!isUserAdmin && (
                    <button
                      type="button"
                      onClick={() => onPromoteUser(user.id)}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 transition-all flex items-center gap-2"
                    >
                      <ShieldCheck size={16} aria-hidden />
                      Tornar ADM
                    </button>
                  )}
                  {currentUser && user.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => onRequestDeleteUser(user)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-bold border border-rose-100 transition-all flex items-center gap-2"
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
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase">PIN (4 dígitos)</label>
                      <input
                        value={userPinDigits}
                        onChange={(e) => updateUserDraft(user.id, { pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        inputMode="numeric"
                        maxLength={4}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
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
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value={UserRole.USER}>Usuário</option>
                        <option value={UserRole.ADMIN}>Administrador</option>
                      </select>
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
                    <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Registros de {user.name}</h5>
                    <button
                      type="button"
                      onClick={() => setNewLogDrafts(prev => ({ ...prev, [user.id]: createDefaultLogDraft() }))}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                    >
                      <Plus size={14} aria-hidden />
                      Resetar formulário
                    </button>
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
