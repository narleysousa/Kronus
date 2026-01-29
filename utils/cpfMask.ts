const CPF_LENGTH = 11;

/**
 * Aplica máscara 000.000.000-00 e retorna apenas dígitos para valor interno.
 */
export function formatCpfDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, CPF_LENGTH);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Retorna apenas os dígitos do CPF (para comparação e persistência).
 */
export function cpfDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, CPF_LENGTH);
}
