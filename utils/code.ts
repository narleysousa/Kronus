const CODE_LENGTH = 6;

export const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Gera um código numérico de 6 dígitos para 2FA / recuperação.
 */
export function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function isCodeExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}
