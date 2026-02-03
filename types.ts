
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  pin: string;
  role: UserRole;
  isMaster?: boolean;
  emailVerified?: boolean;
  pendingJustification?: string;
  relaxNotice?: boolean;
  position: string;
  dailyHours: number;
  workDays: string[]; // e.g. ["Mon", "Tue"...]
  createdAt: number;
  updatedAt?: number;
}

export type PunchType = 'IN' | 'OUT' | 'JUSTIFIED';

export interface PunchLog {
  id: string;
  userId: string;
  timestamp: number;
  endTimestamp?: number;
  type: PunchType;
  dateString: string; // YYYY-MM-DD
  justification?: string;
  justificationKind?: 'personal' | 'missed';
  deletedAt?: number;
  updatedAt?: number;
}

export interface DaySummary {
  date: string;
  totalHours: number;
  expectedHours: number;
  isGoalMet: boolean;
  logs: PunchLog[];
}

export interface VacationRange {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt?: number;
}

/** Período de feriado ou recesso: dias abonados (não contam como dia de trabalho). */
export interface HolidayRange {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt?: number;
}
