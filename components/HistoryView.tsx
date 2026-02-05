import React, { useMemo, useState } from 'react';
import { History, Trash2, FileSpreadsheet, Edit2, Save, X } from 'lucide-react';
import { PunchLog, PunchType } from '../types';
import { formatDurationMs } from '../utils/formatDuration';
import { exportHoursToSpreadsheet } from '../utils/exportHours';

interface HistoryViewProps {
  userLogs: PunchLog[];
  /** Nome do usuário (para nome do arquivo na exportação). */
  userName?: string;
  canDelete?: (log: PunchLog) => boolean;
  canEdit?: (log: PunchLog) => boolean;
  onConfirmDelete: (id: string, log: PunchLog) => void;
  onUpdateLog: (id: string, updates: Partial<PunchLog>) => void;
}

interface LogDraft {
  date: string;
  time: string;
  endTime?: string;
  type: PunchType;
}

const getLogTypeInfo = (log: PunchLog) => {
  if (log.type === 'IN') {
    return {
      label: 'Entrada',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      dotClass: 'bg-emerald-500',
    };
  }
  if (log.type === 'OUT') {
    return {
      label: 'Saída',
      badgeClass: 'bg-rose-100 text-rose-700',
      dotClass: 'bg-rose-500',
    };
  }
  const label = log.justificationKind === 'missed' ? 'Justificado' : 'Compromisso pessoal';
  return {
    label,
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
  };
};

const formatLogTime = (log: PunchLog, includeSeconds = true) => {
  const timeOptions: Intl.DateTimeFormatOptions = includeSeconds
    ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' };
  const start = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (log.type === 'JUSTIFIED' && log.endTimestamp) {
    const end = new Date(log.endTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  }
  return new Date(log.timestamp).toLocaleTimeString([], timeOptions);
};

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

const createLogDraft = (log: PunchLog): LogDraft => ({
  date: toLocalDateInput(log.timestamp),
  time: toLocalTimeInput(log.timestamp),
  endTime: log.type === 'JUSTIFIED'
    ? toLocalTimeInput(log.endTimestamp ?? (log.timestamp + 60 * 60 * 1000))
    : '',
  type: log.type,
});

export const HistoryView: React.FC<HistoryViewProps> = ({
  userLogs,
  userName,
  canDelete,
  canEdit,
  onConfirmDelete,
  onUpdateLog,
}) => {
  const durationMap = useMemo(() => {
    const map: Record<string, number> = {};
    userLogs.forEach(log => {
      if (log.type === 'JUSTIFIED' && log.endTimestamp && log.endTimestamp > log.timestamp) {
        map[log.id] = log.endTimestamp - log.timestamp;
      }
    });
    const workLogs = userLogs
      .filter(log => log.type === 'IN' || log.type === 'OUT')
      .sort((a, b) => a.timestamp - b.timestamp);
    let lastIn: PunchLog | null = null;
    workLogs.forEach(log => {
      if (log.type === 'IN') {
        lastIn = log;
      } else if (log.type === 'OUT' && lastIn) {
        const durationMs = log.timestamp - lastIn.timestamp;
        if (durationMs > 0) {
          map[log.id] = durationMs;
        }
        lastIn = null;
      }
    });
    return map;
  }, [userLogs]);

  const [editingLog, setEditingLog] = useState<PunchLog | null>(null);
  const [logDraft, setLogDraft] = useState<LogDraft | null>(null);
  const [editError, setEditError] = useState('');

  const handleExport = () => {
    exportHoursToSpreadsheet(userLogs, { userName, filename: userName ? undefined : 'meus-registros' });
  };

  const openEdit = (log: PunchLog) => {
    setEditingLog(log);
    setLogDraft(createLogDraft(log));
    setEditError('');
  };

  const closeEdit = () => {
    setEditingLog(null);
    setLogDraft(null);
    setEditError('');
  };

  const updateDraft = (updates: Partial<LogDraft>) => {
    setLogDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (updates.type === 'JUSTIFIED' && !next.endTime) {
        next.endTime = buildEndTime(next.date, next.time);
      }
      if (updates.type && updates.type !== 'JUSTIFIED') {
        next.endTime = '';
      }
      return next;
    });
  };

  const saveEdit = () => {
    if (!editingLog || !logDraft) return;
    if (!logDraft.date || !logDraft.time) {
      setEditError('Informe a data e o horário.');
      return;
    }
    const timestamp = new Date(`${logDraft.date}T${logDraft.time}`).getTime();
    if (Number.isNaN(timestamp)) {
      setEditError('Data ou horário inválidos.');
      return;
    }

    if (logDraft.type === 'JUSTIFIED') {
      if (!logDraft.endTime) {
        setEditError('Informe o horário final.');
        return;
      }
      const endTimestamp = new Date(`${logDraft.date}T${logDraft.endTime}`).getTime();
      if (Number.isNaN(endTimestamp) || endTimestamp <= timestamp) {
        setEditError('O horário final deve ser maior que o inicial.');
        return;
      }
      onUpdateLog(editingLog.id, {
        timestamp,
        endTimestamp,
        type: logDraft.type,
        dateString: logDraft.date,
        justificationKind: editingLog.justificationKind ?? 'personal',
      });
    } else {
      onUpdateLog(editingLog.id, {
        timestamp,
        endTimestamp: undefined,
        type: logDraft.type,
        dateString: logDraft.date,
      });
    }
    closeEdit();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Histórico Detalhado</h2>
          <p className="text-slate-500 dark:text-slate-400">Acompanhe entradas, saídas e liberações registradas no sistema.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={userLogs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <FileSpreadsheet size={18} aria-hidden />
          Exportar para planilha
        </button>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Horário</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {userLogs.map(log => {
                const typeInfo = getLogTypeInfo(log);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                      {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${typeInfo.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full block ${typeInfo.dotClass}`} aria-hidden />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <span>{formatLogTime(log)}</span>
                      {durationMap[log.id] !== undefined && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">+{formatDurationMs(durationMap[log.id])}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit?.(log) !== false && (
                          <button
                            type="button"
                            onClick={() => openEdit(log)}
                            className="p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded-lg"
                            aria-label={`Editar registro de ${typeInfo.label.toLowerCase()} em ${new Date(log.timestamp).toLocaleString('pt-BR')}`}
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {canDelete?.(log) !== false && (
                          <button
                            type="button"
                            onClick={() => onConfirmDelete(log.id, log)}
                            className="p-2 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded-lg"
                            aria-label={`Excluir registro de ${typeInfo.label.toLowerCase()} em ${new Date(log.timestamp).toLocaleString('pt-BR')}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {userLogs.map(log => {
            const typeInfo = getLogTypeInfo(log);
            return (
              <div key={log.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {new Date(log.timestamp).toLocaleDateString('pt-BR')} · {formatLogTime(log, false)}
                    {durationMap[log.id] !== undefined && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">+{formatDurationMs(durationMap[log.id])}</span>
                    )}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${typeInfo.badgeClass}`}>
                    {typeInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit?.(log) !== false && (
                    <button
                      type="button"
                      onClick={() => openEdit(log)}
                      className="p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg"
                      aria-label="Editar registro"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  {canDelete?.(log) !== false && (
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(log.id, log)}
                      className="p-2 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg"
                      aria-label="Excluir registro"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {userLogs.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-full text-slate-300 dark:text-slate-500 mb-4">
              <History size={48} aria-hidden />
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-medium">Você ainda não possui batidas registradas.</p>
          </div>
        )}
      </div>
      {editingLog && logDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="edit-log-title">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <Edit2 size={24} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="edit-log-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">Editar registro</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
                  Ajuste a data, horário e tipo do registro selecionado.
                </p>
              </div>
              <button type="button" onClick={closeEdit} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Data</label>
                  <input
                    type="date"
                    value={logDraft.date}
                    onChange={(e) => updateDraft({ date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Horário</label>
                  <input
                    type="time"
                    value={logDraft.time}
                    onChange={(e) => updateDraft({ time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tipo</label>
                  <select
                    value={logDraft.type}
                    onChange={(e) => updateDraft({ type: e.target.value as PunchType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="IN">Entrada</option>
                    <option value="OUT">Saída</option>
                    <option value="JUSTIFIED">Justificado</option>
                  </select>
                </div>
              </div>

              {logDraft.type === 'JUSTIFIED' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Horário final</label>
                  <input
                    type="time"
                    value={logDraft.endTime ?? ''}
                    onChange={(e) => updateDraft({ endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              )}

              {editError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{editError}</p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="px-4 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Save size={18} aria-hidden />
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
