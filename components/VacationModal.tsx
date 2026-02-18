import React, { useEffect, useMemo, useState } from 'react';
import { TreePalm, X, CheckCircle, Edit2, Trash2, Save } from 'lucide-react';
import { VacationRange } from '../types';

interface VacationModalProps {
  open: boolean;
  startDate: string;
  endDate: string;
  error: string;
  ranges?: VacationRange[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onConfirm: () => void;
  onUpdateRange?: (rangeId: string, startDate: string, endDate: string) => void;
  onDeleteRange?: (rangeId: string) => void;
  onCancel: () => void;
}

const toDateTs = (dateString: string) => new Date(`${dateString}T00:00:00`).getTime();

const formatRangeDate = (dateString: string) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR');

const countDays = (startDate: string, endDate: string) => {
  const start = toDateTs(startDate);
  const end = toDateTs(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
};

export const VacationModal: React.FC<VacationModalProps> = ({
  open,
  startDate,
  endDate,
  error,
  ranges = [],
  onStartDateChange,
  onEndDateChange,
  onConfirm,
  onUpdateRange,
  onDeleteRange,
  onCancel,
}) => {
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [manageError, setManageError] = useState('');

  const sortedRanges = useMemo(() => {
    return [...ranges].sort((a, b) => {
      const startDiff = toDateTs(b.startDate) - toDateTs(a.startDate);
      if (startDiff !== 0) return startDiff;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }, [ranges]);

  useEffect(() => {
    if (!open) {
      setEditingRangeId(null);
      setEditStartDate('');
      setEditEndDate('');
      setManageError('');
    }
  }, [open]);

  const openEdit = (range: VacationRange) => {
    setEditingRangeId(range.id);
    setEditStartDate(range.startDate);
    setEditEndDate(range.endDate);
    setManageError('');
  };

  const cancelEdit = () => {
    setEditingRangeId(null);
    setEditStartDate('');
    setEditEndDate('');
    setManageError('');
  };

  const saveEdit = () => {
    if (!editingRangeId) return;
    if (!editStartDate || !editEndDate) {
      setManageError('Informe o período completo para editar.');
      return;
    }
    const start = toDateTs(editStartDate);
    const end = toDateTs(editEndDate);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setManageError('Datas inválidas.');
      return;
    }
    if (end < start) {
      setManageError('A data final deve ser depois da inicial.');
      return;
    }
    onUpdateRange?.(editingRangeId, editStartDate, editEndDate);
    cancelEdit();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="vacation-title">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <TreePalm size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="vacation-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">Registrar férias</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
              Informe o período de férias. Nesses dias, o ponto não contabiliza horas.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{error}</p>
        )}

        {sortedRanges.length > 0 && (
          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Períodos cadastrados</h4>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {sortedRanges.map(range => {
                const isEditing = editingRangeId === range.id;
                const days = countDays(range.startDate, range.endDate);
                return (
                  <div key={range.id} className="rounded-lg border border-slate-200 dark:border-slate-600 p-3 bg-slate-50/70 dark:bg-slate-700/40">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors inline-flex items-center gap-1"
                          >
                            <Save size={14} aria-hidden />
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatRangeDate(range.startDate)}
                            {range.endDate !== range.startDate ? ` → ${formatRangeDate(range.endDate)}` : ''}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {days === 1 ? '1 dia de férias' : `${days} dias de férias`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onUpdateRange && (
                            <button
                              type="button"
                              onClick={() => openEdit(range)}
                              className="p-2 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 rounded-lg transition-colors"
                              aria-label="Editar período de férias"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDeleteRange && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Deseja realmente excluir este período de férias?')) {
                                  onDeleteRange(range.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg transition-colors"
                              aria-label="Excluir período de férias"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {manageError && (
              <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium" role="alert">{manageError}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} aria-hidden />
            Registrar férias
          </button>
        </div>
      </div>
    </div>
  );
};
