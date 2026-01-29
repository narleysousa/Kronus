import type { User, PunchLog, VacationRange } from '../types';

const isDateInVacation = (dateString: string, ranges: VacationRange[]) => {
  const value = new Date(`${dateString}T00:00:00`).getTime();
  return ranges.some(range => {
    const start = new Date(`${range.startDate}T00:00:00`).getTime();
    const end = new Date(`${range.endDate}T00:00:00`).getTime();
    return value >= start && value <= end;
  });
};

/**
 * Calcula o banco de horas de um usuário (acumulado: total trabalhado - esperado por dia).
 * Positivo = horas a mais; negativo = horas a menos.
 */
export function computeBankOfHours(
  user: User,
  userLogs: PunchLog[],
  userVacations: VacationRange[]
): number {
  const grouped = userLogs.reduce((acc, log) => {
    if (!acc[log.dateString]) acc[log.dateString] = [];
    acc[log.dateString].push(log);
    return acc;
  }, {} as Record<string, PunchLog[]>);

  return Object.entries(grouped).reduce((bank, [date, dayLogs]) => {
    const sorted = [...dayLogs].sort((a, b) => a.timestamp - b.timestamp);
    if (isDateInVacation(date, userVacations)) {
      return bank + (0 - 0); // dia de férias: 0h trabalhadas, 0h esperadas
    }
    const punchLogs = sorted.filter(log => log.type === 'IN' || log.type === 'OUT');
    let totalMs = 0;
    for (let i = 0; i < punchLogs.length - 1; i += 2) {
      if (punchLogs[i].type === 'IN' && punchLogs[i + 1]?.type === 'OUT') {
        totalMs += punchLogs[i + 1].timestamp - punchLogs[i].timestamp;
      }
    }
    const justifiedMs = sorted
      .filter(log => log.type === 'JUSTIFIED' && typeof log.endTimestamp === 'number')
      .reduce((acc, log) => {
        const endTimestamp = log.endTimestamp ?? log.timestamp;
        if (endTimestamp > log.timestamp) {
          return acc + (endTimestamp - log.timestamp);
        }
        return acc;
      }, 0);
    totalMs += justifiedMs;
    const totalHours = totalMs / (1000 * 60 * 60);
    const expectedHours = user.dailyHours;
    return bank + (totalHours - expectedHours);
  }, 0);
}
