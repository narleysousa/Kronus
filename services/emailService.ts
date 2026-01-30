import type { User } from '../types';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

type EmailSendResult = {
  ok: boolean;
  error?: string;
};

const getEmailConfig = () => ({
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined,
});

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_APP_BASE_URL) return import.meta.env.VITE_APP_BASE_URL as string;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

export async function sendRegistrationConfirmationEmail(user: User): Promise<EmailSendResult> {
  const { serviceId, templateId, publicKey } = getEmailConfig();
  if (!serviceId || !templateId || !publicKey) {
    return {
      ok: false,
      error: 'Envio de e-mail não configurado. Configure as variáveis VITE_EMAILJS_* no .env.local.',
    };
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_name: user.name,
      to_email: user.email,
      cpf: user.cpf,
      position: user.position,
      app_name: 'Kronus',
      app_url: getBaseUrl(),
      registered_at: new Date().toLocaleString('pt-BR'),
    },
  };

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Falha ao enviar o e-mail (status ${response.status}).`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: 'Não foi possível enviar o e-mail de confirmação. Verifique sua conexão.',
    };
  }
}
