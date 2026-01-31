/** Domingo = 0, Sábado = 6. Meta diária só vale de segunda a sexta. */
const WEEKEND_DAY_IDS = [0, 6]; // getDay(): 0 = Dom, 6 = Sab

export function isWeekend(dateString: string): boolean {
  const d = new Date(`${dateString}T00:00:00`).getDay();
  return WEEKEND_DAY_IDS.includes(d);
}

/**
 * Contribuição do dia para o banco de horas.
 * Seg–Sex: totalHours - expectedHours.
 * Sáb/Dom: qualquer hora é extra a 1,5x → totalHours * 1.5
 */
export function getDayContribution(
  dateString: string,
  totalHours: number,
  expectedHours: number
): number {
  if (isWeekend(dateString)) {
    return totalHours * 1.5;
  }
  return totalHours - expectedHours;
}

export const WEEKEND_OVERTIME_MULTIPLIER = 1.5;
