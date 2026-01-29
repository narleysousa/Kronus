import React, { useMemo } from 'react';
import { History, Trash2 } from 'lucide-react';
import { PunchLog } from '../types';
import { formatDurationMs } from '../utils/formatDuration';

interface HistoryViewProps {
  userLogs: PunchLog[];
  onConfirmDelete: (id: string, log: PunchLog) => void;
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
  const label = log.justificationKind === 'missed' ? 'Justificado' : 'Liberação';
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

export const HistoryView: React.FC<HistoryViewProps> = ({ userLogs, onConfirmDelete }) => {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Histórico Detalhado</h2>
        <p className="text-slate-500">Acompanhe entradas, saídas e liberações registradas no sistema.</p>
      </header>

    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Horário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {userLogs.map(log => {
              const typeInfo = getLogTypeInfo(log);
              return (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">
                    {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${typeInfo.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full block ${typeInfo.dotClass}`} aria-hidden />
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    <span>{formatLogTime(log)}</span>
                    {durationMap[log.id] !== undefined && (
                      <span className="ml-2 text-emerald-600 font-bold text-xs">+{formatDurationMs(durationMap[log.id])}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(log.id, log)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-lg"
                      aria-label={`Excluir registro de ${typeInfo.label.toLowerCase()} em ${new Date(log.timestamp).toLocaleString('pt-BR')}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {userLogs.map(log => {
          const typeInfo = getLogTypeInfo(log);
          return (
            <div key={log.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {new Date(log.timestamp).toLocaleDateString('pt-BR')} · {formatLogTime(log, false)}
                  {durationMap[log.id] !== undefined && (
                    <span className="ml-2 text-emerald-600 font-bold text-xs">+{formatDurationMs(durationMap[log.id])}</span>
                  )}
                </p>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${typeInfo.badgeClass}`}>
                  {typeInfo.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onConfirmDelete(log.id, log)}
                className="p-2 text-slate-300 hover:text-rose-500 rounded-lg shrink-0"
                aria-label="Excluir registro"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      {userLogs.length === 0 && (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
            <History size={48} aria-hidden />
          </div>
          <p className="text-slate-400 font-medium">Você ainda não possui batidas registradas.</p>
        </div>
      )}
    </div>
    </div>
  );
};
