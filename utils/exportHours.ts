import { PunchLog } from '../types';
import { formatDurationMs } from './formatDuration';

const UTF8_BOM = '\uFEFF';

function escapeCsvCell(value: string): string {
  const hasSpecial = /[",\n\r]/.test(value);
  if (!hasSpecial) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function getTypeLabel(log: PunchLog): string {
  if (log.type === 'IN') return 'Entrada';
  if (log.type === 'OUT') return 'Saída';
  return log.justificationKind === 'missed' ? 'Justificado' : 'Compromisso pessoal';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

/**
 * Calcula duração por log: para JUSTIFIED = end - start; para OUT = tempo desde último IN.
 */
function buildDurationMap(logs: PunchLog[]): Record<string, number> {
  const map: Record<string, number> = {};
  const workLogs = logs
    .filter(l => l.type === 'IN' || l.type === 'OUT')
    .sort((a, b) => a.timestamp - b.timestamp);
  let lastIn: PunchLog | null = null;
  workLogs.forEach(log => {
    if (log.type === 'IN') {
      lastIn = log;
    } else if (log.type === 'OUT' && lastIn) {
      const durationMs = log.timestamp - lastIn.timestamp;
      if (durationMs > 0) map[log.id] = durationMs;
      lastIn = null;
    }
  });
  logs.forEach(log => {
    if (log.type === 'JUSTIFIED' && log.endTimestamp && log.endTimestamp > log.timestamp) {
      map[log.id] = log.endTimestamp - log.timestamp;
    }
  });
  return map;
}

export interface ExportOptions {
  /** Nome do usuário (coluna extra e nome do arquivo). Se omitido, não inclui coluna "Usuário". */
  userName?: string;
  /** Incluir coluna "Usuário" mesmo com um único usuário (útil para exportação admin). */
  includeUserColumn?: boolean;
}

/**
 * Gera CSV dos registros de ponto para abertura em Excel/LibreOffice.
 * Colunas: Data, [Usuário], Tipo, Horário início, Horário fim, Duração
 */
export function buildHoursCsv(logs: PunchLog[], options: ExportOptions = {}): string {
  const { userName, includeUserColumn = false } = options;
  const durationMap = buildDurationMap(logs);
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);

  const headers = ['Data', ...(userName || includeUserColumn ? ['Usuário'] : []), 'Tipo', 'Horário início', 'Horário fim', 'Duração'];
  const rows = sorted.map(log => {
    const typeLabel = getTypeLabel(log);
    const startTime = formatTime(log.timestamp);
    const endTime = log.type === 'JUSTIFIED' && log.endTimestamp
      ? formatTime(log.endTimestamp)
      : '';
    const duration = durationMap[log.id] !== undefined ? formatDurationMs(durationMap[log.id]) : '';
    const userCell = userName ?? '';
    const cells = [
      formatDate(log.timestamp),
      ...(userName || includeUserColumn ? [userCell] : []),
      typeLabel,
      startTime,
      endTime,
      duration,
    ];
    return cells.map(escapeCsvCell).join(';');
  });

  const sep = ';';
  const headerLine = headers.map(escapeCsvCell).join(sep);
  return UTF8_BOM + headerLine + '\n' + rows.join('\n');
}

/**
 * Dispara o download de um arquivo CSV no navegador.
 */
export function downloadCsv(csvContent: string, baseFilename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseFilename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta os logs para planilha (CSV) e inicia o download.
 */
export function exportHoursToSpreadsheet(
  logs: PunchLog[],
  options: ExportOptions & { filename?: string } = {}
): void {
  const { filename, ...csvOptions } = options;
  const csv = buildHoursCsv(logs, csvOptions);
  const baseName = filename ?? (options.userName
    ? `horas-${options.userName.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`
    : 'meus-registros');
  downloadCsv(csv, baseName);
}
