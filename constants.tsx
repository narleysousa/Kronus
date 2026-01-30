
import React from 'react';

export const KronusLogo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    {/* Átomo: 3 órbitas elípticas — traço suave e pontas arredondadas */}
    <ellipse cx="50" cy="50" rx="40" ry="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" transform="rotate(0 50 50)" opacity="0.95" />
    <ellipse cx="50" cy="50" rx="40" ry="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" transform="rotate(60 50 50)" opacity="0.95" />
    <ellipse cx="50" cy="50" rx="40" ry="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" transform="rotate(120 50 50)" opacity="0.95" />
    {/* Mostrador do relógio — contorno principal */}
    <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="2.8" />
    {/* Marcações das horas (12, 3, 6, 9) */}
    <line x1="50" y1="26" x2="50" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="74" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="50" y1="74" x2="50" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="26" y1="50" x2="30" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Ponteiros (10:10) — ponteiro dos minutos mais longo e fino */}
    <path d="M50 50 L50 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M50 50 L64 40" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    {/* Núcleo do átomo = eixo do relógio */}
    <circle cx="50" cy="50" r="4.5" fill="currentColor" />
  </svg>
);

/** Semana: domingo a sábado (para exibição em formulários). */
export const WEEK_DAYS = [
  { id: 'Dom', label: 'Domingo' },
  { id: 'Seg', label: 'Segunda' },
  { id: 'Ter', label: 'Terça' },
  { id: 'Qua', label: 'Quarta' },
  { id: 'Qui', label: 'Quinta' },
  { id: 'Sex', label: 'Sexta' },
  { id: 'Sab', label: 'Sábado' },
];

/** Hora limite (0–24) do dia para o usuário bater o ponto: prazo de 6h desde 00:00. */
export const PUNCH_DEADLINE_HOUR = 6;

export const LOCAL_STORAGE_KEYS = {
  USERS: 'kronus_users',
  LOGS: 'kronus_logs',
  REMEMBER_CPF: 'kronus_remember_cpf',
  PENDING_JUSTIFICATIONS: 'kronus_pending_justifications',
  VACATIONS: 'kronus_vacations',
  RELAX_NOTICE: 'kronus_relax_notice',
  SESSION_USER_ID: 'kronus_session_user_id',
} as const;
