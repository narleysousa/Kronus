/**
 * Mascara o e-mail para exibição (ex: j***o@e***o.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const maskedLocal = local.length <= 2
    ? '*'.repeat(local.length)
    : local[0] + '*'.repeat(Math.max(0, local.length - 2)) + local[local.length - 1];
  const dotIdx = domain.lastIndexOf('.');
  const nameDomain = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain;
  const ext = dotIdx >= 0 ? domain.slice(dotIdx) : '';
  const maskedDomain = nameDomain.length <= 2
    ? '*'.repeat(nameDomain.length) + ext
    : nameDomain[0] + '*'.repeat(Math.max(0, nameDomain.length - 2)) + nameDomain[nameDomain.length - 1] + ext;
  return `${maskedLocal}@${maskedDomain}`;
}
