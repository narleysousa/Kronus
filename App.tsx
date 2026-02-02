import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, PunchLog, UserRole, DaySummary, PunchType, VacationRange, HolidayRange } from './types';
import { KronusLogo } from './constants';
import { cpfDigits, formatCpfDisplay } from './utils/cpfMask';
import { isWeekend, getDayContribution } from './utils/weekend';
import { isDateInHoliday } from './utils/bankOfHours';
import { buildAuthPassword } from './utils/authPassword';
import {
  deleteKronusDocs,
  getKronusData,
  getLegacyKronusData,
  mergeAndSetKronusData,
  mergeKronusData,
  subscribeKronusData,
  upsertHolidayDoc,
  upsertLogDoc,
  upsertUserDoc,
  upsertVacationDoc,
} from './services/firestoreService';
import {
  createFirebaseUser,
  signInFirebaseUser,
  sendFirebaseVerificationEmail,
  sendFirebasePasswordResetEmail,
  verifyFirebasePasswordResetCode,
  confirmFirebasePasswordReset,
  reloadFirebaseUser,
  getFirebaseCurrentUser,
  getFirebaseAuth,
  updateFirebasePassword,
  signOutFirebase,
  waitForAuthState,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { VerifyEmailView } from './components/VerifyEmailView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardHome } from './components/DashboardHome';
import { HistoryView } from './components/HistoryView';
import { AdminPanel } from './components/AdminPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { DeleteUserPinModal } from './components/DeleteUserPinModal';
import { PersonalCommitmentModal } from './components/PersonalCommitmentModal';
import { MissedJustificationModal } from './components/MissedJustificationModal';
import { VacationModal } from './components/VacationModal';
import { HolidayModal } from './components/HolidayModal';
import { ProductivityDashboard } from './components/ProductivityDashboard';
import { ProfileView } from './components/ProfileView';

type AppView = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password' | 'dashboard' | 'admin' | 'history' | 'productivity' | 'profile';

const MASTER_EMAIL = 'narley_almeida@hotmail.com';

const toLocalDateInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalTimeInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toTimestamp = (date: string, time: string) => new Date(`${date}T${time}`).getTime();

const WEEKDAY_IDS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const formatLongDate = (dateString: string) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const isDateInVacation = (dateString: string, ranges: VacationRange[]) => {
  const value = new Date(`${dateString}T00:00:00`).getTime();
  return ranges.some(range => {
    const start = new Date(`${range.startDate}T00:00:00`).getTime();
    const end = new Date(`${range.endDate}T00:00:00`).getTime();
    return value >= start && value <= end;
  });
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isMasterEmail = (email: string) => normalizeEmail(email) === normalizeEmail(MASTER_EMAIL);

const buildSignature = (data: {
  users: User[];
  logs: PunchLog[];
  vacations: Record<string, VacationRange[]>;
  holidays: Record<string, HolidayRange[]>;
}) => {
  const userSig = data.users
    .map(u => `${u.id}:${u.updatedAt ?? u.createdAt ?? 0}`)
    .sort()
    .join('|');
  const logSig = data.logs
    .map(l => `${l.id}:${l.updatedAt ?? l.timestamp ?? 0}`)
    .sort()
    .join('|');
  const vacationSig = Object.values(data.vacations)
    .flatMap(ranges => ranges ?? [])
    .map(v => `${v.id}:${v.updatedAt ?? v.createdAt ?? 0}`)
    .sort()
    .join('|');
  const holidaySig = Object.values(data.holidays)
    .flatMap(ranges => ranges ?? [])
    .map(h => `${h.id}:${h.updatedAt ?? h.createdAt ?? 0}`)
    .sort()
    .join('|');
  return `${userSig}::${logSig}::${vacationSig}::${holidaySig}`;
};

const findMissingWorkday = (
  user: User,
  userLogs: PunchLog[],
  userVacations: VacationRange[],
  userHolidays: HolidayRange[],
  referenceTimestamp: number
) => {
  const logDates = new Set(userLogs.map(log => log.dateString));
  const referenceDate = new Date(referenceTimestamp);
  const createdAtDate = new Date(`${toLocalDateInput(user.createdAt)}T00:00:00`).getTime();

  for (let offset = 1; ; offset += 1) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() - offset);
    const dayTimestamp = date.getTime();
    if (dayTimestamp < createdAtDate) break;
    const dayId = WEEKDAY_IDS[date.getDay()];
    if (!user.workDays.includes(dayId)) continue;
    const dateString = toLocalDateInput(dayTimestamp);
    if (isDateInVacation(dateString, userVacations)) continue;
    if (isDateInHoliday(dateString, userHolidays)) continue;
    if (!logDates.has(dateString)) {
      return dateString;
    }
  }

  return null;
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<PunchLog[]>([]);
  const [vacations, setVacations] = useState<Record<string, VacationRange[]>>({});
  const [holidays, setHolidays] = useState<Record<string, HolidayRange[]>>({});

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('login');
  const viewRef = useRef<AppView>('login');
  const [pin, setPin] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerFormError, setRegisterFormError] = useState('');
  const [verifyEmailUserId, setVerifyEmailUserId] = useState<string | null>(null);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyEmailError, setVerifyEmailError] = useState('');
  const [verifyEmailNotice, setVerifyEmailNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetPasswordCode, setResetPasswordCode] = useState<string | null>(null);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordChecking, setResetPasswordChecking] = useState(false);
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; log?: PunchLog } | null>(null);
  const confirmDeleteIdRef = useRef<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ userId: string; userName: string } | null>(null);
  const [deleteUserPin, setDeleteUserPin] = useState('');
  const [deleteUserPinError, setDeleteUserPinError] = useState('');
  const [adminRemoveByCpfMessage, setAdminRemoveByCpfMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [personalDate, setPersonalDate] = useState(() => toLocalDateInput(Date.now()));
  const [personalStartTime, setPersonalStartTime] = useState(() => toLocalTimeInput(Date.now()));
  const [personalEndTime, setPersonalEndTime] = useState(() => toLocalTimeInput(Date.now() + 60 * 60 * 1000));
  const [personalError, setPersonalError] = useState('');
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [vacationStartDate, setVacationStartDate] = useState(() => toLocalDateInput(Date.now()));
  const [vacationEndDate, setVacationEndDate] = useState(() => toLocalDateInput(Date.now()));
  const [vacationError, setVacationError] = useState('');
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayStartDate, setHolidayStartDate] = useState(() => toLocalDateInput(Date.now()));
  const [holidayEndDate, setHolidayEndDate] = useState(() => toLocalDateInput(Date.now()));
  const [holidayError, setHolidayError] = useState('');
  const [missedJustificationOpen, setMissedJustificationOpen] = useState(false);
  const [missedJustificationDate, setMissedJustificationDate] = useState('');
  const [missedJustificationReason, setMissedJustificationReason] = useState('Esqueci');
  const [missedJustificationError, setMissedJustificationError] = useState('');
  const [relaxModalOpen, setRelaxModalOpen] = useState(false);
  const [removeByCpfMessage, setRemoveByCpfMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registerEmailNotice, setRegisterEmailNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const firestoreLoadedRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSignatureRef = useRef<string | null>(null);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeLogs = Array.isArray(logs) ? logs : [];
  const usersRef = useRef<User[]>(safeUsers);
  const logsRef = useRef<PunchLog[]>(safeLogs);
  const vacationsRef = useRef<Record<string, VacationRange[]>>(vacations);
  const holidaysRef = useRef<Record<string, HolidayRange[]>>(holidays);

  useEffect(() => {
    usersRef.current = safeUsers;
    logsRef.current = safeLogs;
    vacationsRef.current = vacations;
    holidaysRef.current = holidays;
  }, [safeUsers, safeLogs, vacations, holidays]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setView('reset-password');
      setResetPasswordCode(oobCode);
      setResetPasswordError('');
      setResetPasswordChecking(true);
      verifyFirebasePasswordResetCode(oobCode)
        .then(email => {
          setResetPasswordEmail(email);
        })
        .catch(() => {
          setResetPasswordError('Link inválido ou expirado. Solicite um novo e-mail.');
        })
        .finally(() => {
          setResetPasswordChecking(false);
        });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(users)) {
      setUsers([]);
    }
  }, [users, setUsers]);

  useEffect(() => {
    if (!Array.isArray(logs)) {
      setLogs([]);
    }
  }, [logs, setLogs]);

  useEffect(() => {
    if (safeUsers.length === 0) return;
    if (safeUsers.some(u => u.isMaster)) return;
    const candidate = [...safeUsers].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))[0];
    if (!candidate) return;
    setUsers(prev => prev.map(u => (
      u.id === candidate.id
        ? { ...u, role: UserRole.ADMIN, isMaster: true, updatedAt: Date.now() }
        : u
    )));
  }, [safeUsers, setUsers]);

  useEffect(() => {
    if (!safeUsers.length) return;
    const needsPromotion = safeUsers.some(u => (
      isMasterEmail(u.email) && (u.role !== UserRole.ADMIN || !u.isMaster)
    ));
    if (!needsPromotion) return;
    setUsers(prev => prev.map(u => (
      isMasterEmail(u.email)
        ? { ...u, role: UserRole.ADMIN, isMaster: true, updatedAt: Date.now() }
        : u
    )));
  }, [safeUsers, setUsers]);

  useEffect(() => {
    let mounted = true;
    getKronusData().then((data) => {
      if (!mounted) return;
      if (data) {
        const merged = mergeKronusData(
          {
            users: safeUsers,
            logs: safeLogs,
            vacations,
            holidays,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setVacations(merged.vacations);
        setHolidays(merged.holidays);
      }
      firestoreLoadedRef.current = true;
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.emailVerified) return;
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    subscribeKronusData((data) => {
      if (!mounted) return;
      remoteSignatureRef.current = buildSignature(data);
      const merged = mergeKronusData(
        {
          users: usersRef.current,
          logs: logsRef.current,
          vacations: vacationsRef.current,
          holidays: holidaysRef.current,
        },
        data
      );
      setUsers(merged.users);
      setLogs(merged.logs);
      setVacations(merged.vacations);
      setHolidays(merged.holidays);
      firestoreLoadedRef.current = true;
    }).then(unsub => {
      if (!mounted) {
        unsub();
        return;
      }
      unsubscribe = unsub;
    });
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.id, currentUser?.emailVerified]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        if (!['login', 'verify-email', 'register'].includes(viewRef.current)) {
          setView('login');
        }
        return;
      }

      if (!firebaseUser.emailVerified) {
        const localUser = usersRef.current.find(u => u.email.trim().toLowerCase() === (firebaseUser.email ?? '').toLowerCase());
        if (localUser) {
          setLocalEmailVerified(localUser.id, false);
          openVerifyEmailView(localUser.id, localUser.email);
        } else if (firebaseUser.email) {
          openVerifyEmailView(null, firebaseUser.email);
        }
        setVerifyEmailNotice({
          type: 'error',
          text: 'Seu e-mail ainda não foi verificado. Confirme para continuar.',
        });
        return;
      }

      const data = await getKronusData();
      if (data) {
        const merged = mergeKronusData(
          {
            users: usersRef.current,
            logs: logsRef.current,
            vacations: vacationsRef.current,
            holidays: holidaysRef.current,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setVacations(merged.vacations);
        setHolidays(merged.holidays);
        const user = merged.users.find(u => u.email.trim().toLowerCase() === (firebaseUser.email ?? '').toLowerCase());
        if (user) {
          setLocalEmailVerified(user.id, true);
          setCurrentUser({ ...user, emailVerified: true });
          setView('dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firestoreLoadedRef.current) return;
    const localSignature = buildSignature({
      users: safeUsers,
      logs: safeLogs,
      vacations,
      holidays,
    });
    if (remoteSignatureRef.current && remoteSignatureRef.current === localSignature) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      mergeAndSetKronusData({
        users: safeUsers,
        logs: safeLogs,
        vacations,
        holidays,
      });
      syncTimeoutRef.current = null;
    }, 800);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [safeUsers, safeLogs, vacations, holidays]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const updated = safeUsers.find(u => u.id === currentUser.id);
    if (!updated) {
      setCurrentUser(null);
      setView('login');
      setRegisterEmailNotice(null);
      return;
    }
    if (updated !== currentUser) {
      setCurrentUser(updated);
    }
  }, [safeUsers, currentUser]);

  const userLogs = useMemo(() => {
    if (!currentUser) return [];
    return safeLogs.filter(l => l.userId === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
  }, [safeLogs, currentUser]);

  const setLocalEmailVerified = (userId: string, verified: boolean) => {
    setUsers(prev => prev.map(u => (
      u.id === userId ? { ...u, emailVerified: verified, updatedAt: Date.now() } : u
    )));
  };

  const openVerifyEmailView = (userId: string | null, email: string) => {
    setVerifyEmailUserId(userId);
    setVerifyEmailAddress(email);
    setVerifyEmailError('');
    setVerifyEmailNotice(null);
    setView('verify-email');
  };

  const sendVerificationEmail = async () => {
    setVerifyEmailNotice(null);
    const firebaseUser = getFirebaseCurrentUser();
    if (!firebaseUser) {
      setVerifyEmailNotice({
        type: 'error',
        text: 'Sessão expirada. Faça login novamente para reenviar o e-mail.',
      });
      return;
    }
    const targetUser = verifyEmailUserId ? safeUsers.find(u => u.id === verifyEmailUserId) : null;
    if (targetUser && firebaseUser.email?.toLowerCase() !== targetUser.email.toLowerCase()) {
      setVerifyEmailNotice({
        type: 'error',
        text: 'Sessão não corresponde ao e-mail cadastrado. Faça login novamente.',
      });
      return;
    }
    try {
      await sendFirebaseVerificationEmail(firebaseUser);
      setVerifyEmailNotice({
        type: 'success',
        text: 'E-mail de confirmação enviado. Verifique sua caixa de entrada.',
      });
    } catch {
      setVerifyEmailNotice({
        type: 'error',
        text: 'Não foi possível enviar o e-mail de confirmação.',
      });
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const pendingDate = currentUser.pendingJustification;
    if (!pendingDate) return;
    const alreadyHandled = userLogs.some(log => log.dateString === pendingDate);
    if (alreadyHandled) {
      setUsers(prev => prev.map(u => (
        u.id === currentUser.id ? { ...u, pendingJustification: '', updatedAt: Date.now() } : u
      )));
      return;
    }
    setMissedJustificationDate(pendingDate);
    setMissedJustificationReason('Esqueci');
    setMissedJustificationError('');
    setMissedJustificationOpen(true);
  }, [currentUser, userLogs]);

  const userVacations = useMemo(
    () => (currentUser ? (vacations[currentUser.id] ?? []) : []),
    [vacations, currentUser]
  );

  const userHolidays = useMemo(
    () => (currentUser ? (holidays[currentUser.id] ?? []) : []),
    [holidays, currentUser]
  );

  const summaries: DaySummary[] = useMemo(() => {
    if (!currentUser) return [];
    const grouped = userLogs.reduce((acc, log) => {
      if (!acc[log.dateString]) acc[log.dateString] = [];
      acc[log.dateString].push(log);
      return acc;
    }, {} as Record<string, PunchLog[]>);

    return Object.entries(grouped).map(([date, dayLogs]) => {
      const sorted = [...(dayLogs as PunchLog[])].sort((a, b) => a.timestamp - b.timestamp);
      if (isDateInVacation(date, userVacations)) {
        return {
          date,
          totalHours: 0,
          expectedHours: 0,
          isGoalMet: true,
          logs: sorted,
        };
      }
      if (isDateInHoliday(date, userHolidays)) {
        return {
          date,
          totalHours: 0,
          expectedHours: 0,
          isGoalMet: true,
          logs: sorted,
        };
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
      const isWeekendDay = isWeekend(date);
      const expectedHours = isWeekendDay ? 0 : currentUser.dailyHours;
      return {
        date,
        totalHours,
        expectedHours,
        isGoalMet: isWeekendDay ? true : totalHours >= currentUser.dailyHours,
        logs: sorted
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [userLogs, currentUser, userVacations, userHolidays]);

  const bankOfHours = useMemo(() => {
    if (!currentUser) return 0;
    return summaries.reduce(
      (acc, s) => acc + getDayContribution(s.date, s.totalHours, s.expectedHours),
      0
    );
  }, [summaries, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (bankOfHours < 6) return;
    if (currentUser.relaxNotice) return;
    setRelaxModalOpen(true);
    setUsers(prev => prev.map(u => (
      u.id === currentUser.id ? { ...u, relaxNotice: true, updatedAt: Date.now() } : u
    )));
  }, [bankOfHours, currentUser]);

  const lastWorkLog = useMemo(
    () => userLogs.find(log => log.type === 'IN' || log.type === 'OUT'),
    [userLogs]
  );
  const lastClockInTime = lastWorkLog?.type === 'IN' ? lastWorkLog.timestamp : null;
  const lastSessionDurationMs = useMemo(() => {
    if (!userLogs.length) return null;
    const workLogs = [...userLogs].filter(log => (
      (log.type === 'IN' || log.type === 'OUT') && !isDateInVacation(log.dateString, userVacations) && !isDateInHoliday(log.dateString, userHolidays)
    ));
    const chronological = workLogs.sort((a, b) => a.timestamp - b.timestamp);
    let lastIn: PunchLog | null = null;
    let lastOutDurationMs: number | null = null;
    chronological.forEach(log => {
      if (log.type === 'IN') {
        lastIn = log;
      } else if (log.type === 'OUT' && lastIn) {
        const durationMs = log.timestamp - lastIn.timestamp;
        if (durationMs > 0) {
          lastOutDurationMs = durationMs;
        }
        lastIn = null;
      }
    });
    return lastOutDurationMs;
  }, [userLogs, userVacations, userHolidays]);

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(loginEmail);
    const localUser = safeUsers.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    const localPinMatches = !!localUser && localUser.pin === pin;

    const password = buildAuthPassword(pin);
    let firebaseUser;
    try {
      firebaseUser = await signInFirebaseUser(normalizedEmail, password);
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/user-not-found') {
        try {
          firebaseUser = await createFirebaseUser(normalizedEmail, password);
        } catch {
          setAuthError('Não foi possível criar a conta de autenticação.');
          return;
        }
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError('Habilite o provedor Email/Password no Firebase Auth.');
        return;
      } else if (code === 'auth/wrong-password') {
        setAuthError('E-mail ou PIN incorretos');
        return;
      } else {
        setAuthError('Não foi possível autenticar. Tente novamente.');
        return;
      }
    }

    if (!firebaseUser.emailVerified) {
      if (localUser) {
        setLocalEmailVerified(localUser.id, false);
        openVerifyEmailView(localUser.id, localUser.email);
      } else {
        openVerifyEmailView(null, normalizedEmail);
      }
      setPin('');
      await sendVerificationEmail();
      return;
    }

    setAuthError('');
    let userToLogin = localUser;
    if (!userToLogin || !localPinMatches) {
      // Garantir que o Auth esteja propagado antes de ler o Firestore (token disponível)
      await waitForAuthState();
      let data = await getKronusData({ skipAuthCheck: true });
      if (!data || !data.users.length) {
        data = await getLegacyKronusData();
      }
      if (data) {
        const merged = mergeKronusData(
          {
            users: safeUsers,
            logs: safeLogs,
            vacations,
            holidays,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setVacations(merged.vacations);
        setHolidays(merged.holidays);
        const matchEmail = (e: string) => (e || '').trim().toLowerCase() === normalizedEmail;
        userToLogin = merged.users.find(u => matchEmail(u.email));
        if (!userToLogin && firebaseUser.email) {
          const authEmail = (firebaseUser.email || '').trim().toLowerCase();
          userToLogin = merged.users.find(u => (u.email || '').trim().toLowerCase() === authEmail);
        }
      }
    }

    if (!userToLogin) {
      setAuthError('Usuário não encontrado no banco. Solicite cadastro novamente.');
      return;
    }

    setLocalEmailVerified(userToLogin.id, true);
    setCurrentUser({ ...userToLogin, emailVerified: true });
    setView('dashboard');
    setPin('');
  };

  const handleUpdatePin = async (user: User, newPin: string) => {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, pin: newPin, updatedAt: Date.now() } : u));
    const currentAuthUser = getFirebaseCurrentUser();
    const oldPassword = buildAuthPassword(user.pin);
    const newPassword = buildAuthPassword(newPin);
    try {
      if (!currentAuthUser || currentAuthUser.email?.toLowerCase() !== user.email.toLowerCase()) {
        await signInFirebaseUser(user.email, oldPassword);
      }
      const firebaseUser = getFirebaseCurrentUser();
      if (firebaseUser) {
        await updateFirebasePassword(firebaseUser, newPassword);
      }
    } catch {
      // ignora falhas de sync de senha
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterFormError('');
    setRegisterEmailNotice(null);
    setVerifyEmailNotice(null);
    if (!firestoreLoadedRef.current) {
      setRegisterFormError('Aguarde a sincronização inicial antes de cadastrar.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const cpfRaw = (formData.get('cpf') as string)?.replace(/\D/g, '') || '';
    if (safeUsers.some(u => cpfDigits(u.cpf) === cpfRaw)) {
      setRegisterError('CPF já cadastrado.');
      return;
    }

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const fullName = `${firstName} ${lastName}`.trim();
    const isFirstUser = safeUsers.length === 0;
    const isMasterAdmin = isFirstUser;
    const pin = (formData.get('pin') as string)?.replace(/\D/g, '').slice(0, 4) || '';
    if (pin.length !== 4) {
      setRegisterFormError('O PIN deve ter 4 dígitos numéricos.');
      return;
    }
    const workDays = formData.getAll('workDays') as string[];
    if (!workDays.length) {
      setRegisterFormError('Selecione ao menos um dia de trabalho.');
      return;
    }

    const email = normalizeEmail(String(formData.get('email') ?? ''));
    const isMasterAdminFinal = isMasterAdmin || isMasterEmail(email);
    if (safeUsers.some(u => u.email.trim().toLowerCase() === email)) {
      setRegisterFormError('E-mail já cadastrado.');
      return;
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      name: fullName,
      email,
      cpf: formatCpfDisplay(cpfRaw),
      pin,
      role: isMasterAdminFinal ? UserRole.ADMIN : UserRole.USER,
      isMaster: isMasterAdminFinal,
      emailVerified: false,
      pendingJustification: '',
      relaxNotice: false,
      position: formData.get('position') as string,
      dailyHours: Number(formData.get('dailyHours')),
      workDays,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const password = buildAuthPassword(pin);
    try {
      const firebaseUser = await createFirebaseUser(email, password);
      setUsers(prev => [...prev, newUser]);
      void upsertUserDoc(newUser);
      openVerifyEmailView(newUser.id, newUser.email);
      setLocalEmailVerified(newUser.id, false);
      try {
        await sendFirebaseVerificationEmail(firebaseUser);
        setVerifyEmailNotice({
          type: 'success',
          text: 'E-mail de confirmação enviado. Verifique sua caixa de entrada.',
        });
      } catch {
        setVerifyEmailNotice({
          type: 'error',
          text: 'Conta criada, mas não foi possível enviar o e-mail de confirmação.',
        });
      }
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/email-already-in-use') {
        setRegisterFormError('Este e-mail já está em uso. Faça login para verificar.');
      } else if (code === 'auth/operation-not-allowed') {
        setRegisterFormError('Habilite o provedor Email/Password no Firebase Auth.');
      } else {
        setRegisterFormError('Não foi possível criar a conta de autenticação.');
      }
    }
  };

  const handleVerifyEmail = async () => {
    setVerifyEmailError('');
    let user = verifyEmailUserId ? safeUsers.find(u => u.id === verifyEmailUserId) : null;
    const firebaseUser = getFirebaseCurrentUser();
    if (!firebaseUser) {
      setVerifyEmailError('Sessão expirada. Faça login novamente.');
      return;
    }
    if (user && firebaseUser.email?.toLowerCase() !== user.email.toLowerCase()) {
      setVerifyEmailError('Sessão não corresponde ao e-mail cadastrado. Faça login novamente.');
      return;
    }
    try {
      await reloadFirebaseUser(firebaseUser);
    } catch {
      setVerifyEmailError('Não foi possível validar o e-mail agora.');
      return;
    }
    if (!firebaseUser.emailVerified) {
      setVerifyEmailError('Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada.');
      return;
    }
    if (!user) {
      const data = await getKronusData();
      if (data) {
        const merged = mergeKronusData(
          {
            users: safeUsers,
            logs: safeLogs,
            vacations,
            holidays,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setVacations(merged.vacations);
        setHolidays(merged.holidays);
        user = merged.users.find(u => u.email.trim().toLowerCase() === firebaseUser.email?.toLowerCase());
      }
    }
    if (!user) {
      setVerifyEmailError('Usuário não encontrado no banco. Solicite suporte.');
      signOutFirebase();
      return;
    }
    const verifiedUser: User = {
      ...user,
      emailVerified: true,
      updatedAt: Date.now(),
    };
    setUsers(prev => prev.map(u => u.id === user.id ? verifiedUser : u));
    setCurrentUser(verifiedUser);
    setView('dashboard');
    setVerifyEmailUserId(null);
    setVerifyEmailError('');
    setVerifyEmailNotice(null);
    setRegisterEmailNotice({
      type: 'success',
      text: 'E-mail verificado com sucesso. Bem-vindo ao Kronus!',
    });
  };

  const handleResendVerification = async () => {
    setVerifyEmailError('');
    await sendVerificationEmail();
  };

  const handleRequestPasswordReset = async (email: string) => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
    await sendFirebasePasswordResetEmail(email, { url, handleCodeInApp: true });
  };

  const handleResetPassword = async (pinValue: string) => {
    if (!resetPasswordCode) {
      setResetPasswordError('Link inválido. Solicite um novo e-mail.');
      return;
    }
    setResetPasswordSubmitting(true);
    setResetPasswordError('');
    const email = resetPasswordEmail.trim().toLowerCase();
    if (!email) {
      setResetPasswordError('Link inválido. Solicite um novo e-mail.');
      setResetPasswordSubmitting(false);
      return;
    }
    try {
      const newPassword = buildAuthPassword(pinValue);
      await confirmFirebasePasswordReset(resetPasswordCode, newPassword);
      if (email) {
        await signInFirebaseUser(email, newPassword);
        const data = await getKronusData();
        if (data) {
          const merged = mergeKronusData(
            {
              users: safeUsers,
              logs: safeLogs,
              vacations,
              holidays,
            },
            data
          );
          const target = merged.users.find(u => u.email.trim().toLowerCase() === email);
          if (target) {
            const updatedUser: User = { ...target, pin: pinValue, updatedAt: Date.now() };
            const nextData = {
              ...merged,
              users: merged.users.map(u => (u.id === target.id ? updatedUser : u)),
            };
            setUsers(nextData.users);
            setLogs(nextData.logs);
            setVacations(nextData.vacations);
            setHolidays(nextData.holidays);
            await mergeAndSetKronusData(nextData);
          }
        }
        await signOutFirebase();
      }
      setResetPasswordCode(null);
      setResetPasswordEmail('');
      setLoginEmail(email);
      setPin('');
      setView('login');
    } catch {
      setResetPasswordError('Não foi possível redefinir o PIN. O link pode estar expirado.');
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const handleRemoveByCpf = (cpfInput: string, pinInput: string): void => {
    setRemoveByCpfMessage(null);
    const normalized = cpfDigits(cpfInput);
    if (normalized.length !== 11) {
      setRemoveByCpfMessage({ type: 'error', text: 'Digite um CPF válido com 11 dígitos.' });
      return;
    }
    const user = safeUsers.find(u => cpfDigits(u.cpf) === normalized);
    if (!user) {
      setRemoveByCpfMessage({ type: 'error', text: 'CPF não encontrado.' });
      return;
    }
    if (isMasterEmail(user.email)) {
      setRemoveByCpfMessage({ type: 'error', text: 'Este usuário master não pode ser removido.' });
      return;
    }
    if (user.isMaster && safeUsers.length > 1) {
      setRemoveByCpfMessage({ type: 'error', text: 'Não é possível remover um administrador master enquanto houver outros usuários.' });
      return;
    }
    const pin = pinInput.replace(/\D/g, '').slice(0, 4);
    if (pin.length !== 4) {
      setRemoveByCpfMessage({ type: 'error', text: 'Digite o PIN de 4 dígitos para confirmar.' });
      return;
    }
    if (pin !== user.pin) {
      setRemoveByCpfMessage({ type: 'error', text: 'PIN incorreto. Verifique e tente novamente.' });
      return;
    }
    const logsToDelete = logsRef.current.filter(l => l.userId === user.id).map(l => l.id);
    const vacationsToDelete = (vacationsRef.current[user.id] ?? []).map(v => v.id);
    const holidaysToDelete = (holidaysRef.current[user.id] ?? []).map(h => h.id);
    void deleteKronusDocs({
      users: [user.id],
      logs: logsToDelete,
      vacations: vacationsToDelete,
      holidays: holidaysToDelete,
    });
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setLogs(prev => prev.filter(l => l.userId !== user.id));
    setVacations(prev => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    setHolidays(prev => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    setRemoveByCpfMessage({ type: 'success', text: 'Cadastro removido. Você já pode se cadastrar novamente com este CPF.' });
  };

  const handlePunch = () => {
    if (!currentUser) return;
    const lastPunch = lastWorkLog;
    const type: PunchType = lastPunch?.type === 'IN' ? 'OUT' : 'IN';
    const now = Date.now();
    const todayString = toLocalDateInput(now);
    const hadPunchToday = userLogs.some(log => log.dateString === todayString && (log.type === 'IN' || log.type === 'OUT'));

    const newLog: PunchLog = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      timestamp: now,
      type,
      dateString: todayString,
      updatedAt: now,
    };

    setLogs(prev => [newLog, ...prev]);
    void upsertLogDoc(newLog);

    if (type === 'IN' && !hadPunchToday && !currentUser.pendingJustification) {
      const missingDate = findMissingWorkday(currentUser, userLogs, userVacations, userHolidays, now);
      if (missingDate) {
        setUsers(prev => prev.map(u => (
          u.id === currentUser.id ? { ...u, pendingJustification: missingDate, updatedAt: Date.now() } : u
        )));
      }
    }
  };

  const openPersonalModal = () => {
    const now = Date.now();
    setPersonalDate(toLocalDateInput(now));
    setPersonalStartTime(toLocalTimeInput(now));
    setPersonalEndTime(toLocalTimeInput(now + 60 * 60 * 1000));
    setPersonalError('');
    setPersonalModalOpen(true);
  };

  const personalHours = useMemo(() => {
    if (!personalDate || !personalStartTime || !personalEndTime) return null;
    const startTimestamp = toTimestamp(personalDate, personalStartTime);
    const endTimestamp = toTimestamp(personalDate, personalEndTime);
    if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp) || endTimestamp <= startTimestamp) {
      return null;
    }
    return (endTimestamp - startTimestamp) / (1000 * 60 * 60);
  }, [personalDate, personalStartTime, personalEndTime]);

  const handlePersonalCommitmentSave = () => {
    if (!currentUser) return;
    if (!personalDate || !personalStartTime || !personalEndTime) {
      setPersonalError('Preencha a data e os horários.');
      return;
    }
    const startTimestamp = toTimestamp(personalDate, personalStartTime);
    const endTimestamp = toTimestamp(personalDate, personalEndTime);
    if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
      setPersonalError('Horário inválido.');
      return;
    }
    if (endTimestamp <= startTimestamp) {
      setPersonalError('O horário final deve ser depois do inicial.');
      return;
    }

    const newLog: PunchLog = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      timestamp: startTimestamp,
      endTimestamp,
      type: 'JUSTIFIED',
      justificationKind: 'personal',
      dateString: personalDate,
      updatedAt: Date.now(),
    };

    setLogs(prev => [newLog, ...prev]);
    void upsertLogDoc(newLog);
    setPersonalModalOpen(false);
    setPersonalError('');
  };

  const openVacationModal = () => {
    const today = toLocalDateInput(Date.now());
    setVacationStartDate(today);
    setVacationEndDate(today);
    setVacationError('');
    setVacationModalOpen(true);
  };

  const handleVacationSave = () => {
    if (!currentUser) return;
    if (!vacationStartDate || !vacationEndDate) {
      setVacationError('Informe o período de férias.');
      return;
    }
    const start = new Date(`${vacationStartDate}T00:00:00`).getTime();
    const end = new Date(`${vacationEndDate}T00:00:00`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setVacationError('Datas inválidas.');
      return;
    }
    if (end < start) {
      setVacationError('A data final deve ser depois da inicial.');
      return;
    }

    const range: VacationRange = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      startDate: vacationStartDate,
      endDate: vacationEndDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setVacations(prev => ({
      ...prev,
      [currentUser.id]: [...(prev[currentUser.id] ?? []), range],
    }));
    void upsertVacationDoc(range);
    setVacationModalOpen(false);
    setVacationError('');
  };

  const openHolidayModal = () => {
    const today = toLocalDateInput(Date.now());
    setHolidayStartDate(today);
    setHolidayEndDate(today);
    setHolidayError('');
    setHolidayModalOpen(true);
  };

  const handleHolidaySave = () => {
    if (!currentUser) return;
    if (!holidayStartDate || !holidayEndDate) {
      setHolidayError('Informe o período de feriado/recesso.');
      return;
    }
    const start = new Date(`${holidayStartDate}T00:00:00`).getTime();
    const end = new Date(`${holidayEndDate}T00:00:00`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setHolidayError('Datas inválidas.');
      return;
    }
    if (end < start) {
      setHolidayError('A data final deve ser depois da inicial.');
      return;
    }

    const range: HolidayRange = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setHolidays(prev => ({
      ...prev,
      [currentUser.id]: [...(prev[currentUser.id] ?? []), range],
    }));
    void upsertHolidayDoc(range);
    setHolidayModalOpen(false);
    setHolidayError('');
  };

  const handleMissedJustificationSave = () => {
    if (!currentUser) return;
    if (!missedJustificationDate) return;
    const reason = missedJustificationReason.trim();
    if (!reason) {
      setMissedJustificationError('Informe a justificativa.');
      return;
    }

    const startTimestamp = toTimestamp(missedJustificationDate, '12:00');
    const endTimestamp = toTimestamp(missedJustificationDate, '18:00');
    const newLog: PunchLog = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      timestamp: startTimestamp,
      endTimestamp,
      type: 'JUSTIFIED',
      justification: reason,
      justificationKind: 'missed',
      dateString: missedJustificationDate,
      updatedAt: Date.now(),
    };

    setLogs(prev => [newLog, ...prev]);
    void upsertLogDoc(newLog);
    setUsers(prev => prev.map(u => (
      u.id === currentUser.id ? { ...u, pendingJustification: '', updatedAt: Date.now() } : u
    )));
    setMissedJustificationOpen(false);
    setMissedJustificationError('');
  };

  const deleteLog = (id: string) => {
    void deleteKronusDocs({ logs: [id] });
    setLogs(prev => prev.filter(l => l.id !== id));
    confirmDeleteIdRef.current = null;
    setConfirmDelete(null);
  };

  const openConfirmDeleteLog = (id: string) => {
    confirmDeleteIdRef.current = id;
    setConfirmDelete({ id });
  };

  const promoteToMaster = (userId: string) => {
    if (!currentUser?.isMaster) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: UserRole.ADMIN, isMaster: true, updatedAt: Date.now() } : u));
  };

  const demoteToUser = (userId: string) => {
    if (!currentUser?.isMaster) return;
    const target = safeUsers.find(u => u.id === userId);
    if (target && isMasterEmail(target.email)) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: UserRole.USER, isMaster: false, updatedAt: Date.now() } : u));
  };

  const deleteUser = (userId: string) => {
    const target = safeUsers.find(u => u.id === userId);
    if (target && isMasterEmail(target.email)) return;
    const logsToDelete = logsRef.current.filter(l => l.userId === userId).map(l => l.id);
    const vacationsToDelete = (vacationsRef.current[userId] ?? []).map(v => v.id);
    const holidaysToDelete = (holidaysRef.current[userId] ?? []).map(h => h.id);
    void deleteKronusDocs({
      users: [userId],
      logs: logsToDelete,
      vacations: vacationsToDelete,
      holidays: holidaysToDelete,
    });
    setUsers(prev => prev.filter(u => u.id !== userId));
    setLogs(prev => prev.filter(l => l.userId !== userId));
    setVacations(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setHolidays(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleRequestDeleteUser = (user: User) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    if (isMasterEmail(user.email)) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'Este usuário master não pode ser excluído.' });
      return;
    }
    setAdminRemoveByCpfMessage(null);
    setConfirmDeleteUser({ userId: user.id, userName: user.name });
    setDeleteUserPin('');
    setDeleteUserPinError('');
  };

  const handleRequestDeleteUserByCpf = (cpfInput: string) => {
    setAdminRemoveByCpfMessage(null);
    if (currentUser?.role !== UserRole.ADMIN) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'Apenas Master pode remover usuários.' });
      return;
    }
    const normalized = cpfDigits(cpfInput);
    if (normalized.length !== 11) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'Digite um CPF válido com 11 dígitos.' });
      return;
    }
    const user = safeUsers.find(u => cpfDigits(u.cpf) === normalized);
    if (!user) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'CPF não encontrado.' });
      return;
    }
    if (isMasterEmail(user.email)) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'Este usuário master não pode ser excluído.' });
      return;
    }
    if (user.id === currentUser.id) {
      setAdminRemoveByCpfMessage({ type: 'error', text: 'Você não pode excluir seu próprio usuário.' });
      return;
    }
    setConfirmDeleteUser({ userId: user.id, userName: user.name });
    setDeleteUserPin('');
    setDeleteUserPinError('');
    setAdminRemoveByCpfMessage({ type: 'success', text: `Usuário ${user.name} encontrado. Confirme com seu PIN para excluir.` });
  };

  const handleConfirmDeleteUser = () => {
    if (!confirmDeleteUser || !currentUser || currentUser.role !== UserRole.ADMIN) return;
    const pinStr = String(deleteUserPin ?? '').trim();
    const currentPinStr = String(currentUser.pin ?? '').trim();
    if (pinStr.length !== 4 || pinStr !== currentPinStr) {
      setDeleteUserPinError('PIN incorreto. Tente novamente.');
      return;
    }
    deleteUser(confirmDeleteUser.userId);
    setConfirmDeleteUser(null);
    setDeleteUserPin('');
    setDeleteUserPinError('');
    setAdminRemoveByCpfMessage({ type: 'success', text: `Usuário ${confirmDeleteUser.userName} excluído com sucesso.` });
  };

  const canManageLogsForUser = (actor: User | null, targetUserId: string): boolean => {
    if (!actor) return false;
    if (actor.role === UserRole.ADMIN) return true;
    return actor.id === targetUserId;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const current = usersRef.current.find(u => u.id === userId);
    if (!current) return;
    const baseNext = { ...current, ...updates, updatedAt: Date.now() };
    const next = (isMasterEmail(baseNext.email) || updates.role === UserRole.ADMIN || current.role === UserRole.ADMIN)
      ? { ...baseNext, role: UserRole.ADMIN, isMaster: true }
      : baseNext;
    setUsers(prev => prev.map(u => (u.id === userId ? next : u)));
    void upsertUserDoc(next);
    if (currentUser?.id === userId && updates.pin) {
      const firebaseUser = getFirebaseCurrentUser();
      if (firebaseUser) {
        updateFirebasePassword(firebaseUser, buildAuthPassword(updates.pin)).catch(() => {});
      }
    }
  };

  const updateLog = (logId: string, updates: Partial<PunchLog>) => {
    const existing = logsRef.current.find(l => l.id === logId);
    if (!existing) return;
    if (!canManageLogsForUser(currentUser, existing.userId)) return;
    const next = { ...existing, ...updates, updatedAt: Date.now() };
    setLogs(prev => prev.map(l => l.id === logId ? next : l));
    void upsertLogDoc(next);
  };

  const addLog = (log: PunchLog) => {
    const now = Date.now();
    if (!canManageLogsForUser(currentUser, log.userId)) return;
    const next = { ...log, updatedAt: log.updatedAt ?? now };
    setLogs(prev => [next, ...prev]);
    void upsertLogDoc(next);
  };

  const isClockedIn = lastWorkLog?.type === 'IN';

  if (view === 'login') {
    return (
      <>
        <LoginView
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          pin={pin}
          setPin={setPin}
          authError={authError}
          onLogin={handleLogin}
          onGoToRegister={() => {
            setView('register');
            setAuthError('');
            setRegisterError('');
            setRegisterFormError('');
            setVerifyEmailUserId(null);
            setVerifyEmailAddress('');
            setVerifyEmailError('');
            setVerifyEmailNotice(null);
          }}
          onForgotPassword={() => { setView('forgot-password'); setAuthError(''); }}
        />
      </>
    );
  }

  if (view === 'verify-email') {
    const verifyUser = verifyEmailUserId ? safeUsers.find(u => u.id === verifyEmailUserId) : null;
    const displayEmail = verifyUser?.email ?? verifyEmailAddress;
    const fallbackError = verifyEmailError || (!verifyUser && !displayEmail
      ? 'Usuário não encontrado. Volte ao login e tente novamente.'
      : '');
    return (
      <VerifyEmailView
        userName={verifyUser?.name ?? 'Usuário'}
        email={displayEmail}
        error={fallbackError || undefined}
        notice={verifyEmailNotice}
        onVerify={handleVerifyEmail}
        onResend={handleResendVerification}
        onBack={() => {
          signOutFirebase();
          setView('login');
          setVerifyEmailUserId(null);
          setVerifyEmailAddress('');
          setVerifyEmailError('');
          setVerifyEmailNotice(null);
        }}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <ForgotPasswordView
        users={safeUsers}
        onBack={() => setView('login')}
        onRequestReset={handleRequestPasswordReset}
      />
    );
  }

  if (view === 'reset-password') {
    return (
      <ResetPasswordView
        email={resetPasswordEmail}
        isVerifying={resetPasswordChecking}
        isSubmitting={resetPasswordSubmitting}
        error={resetPasswordError || undefined}
        onSubmit={handleResetPassword}
        onBack={() => {
          setResetPasswordCode(null);
          setResetPasswordEmail('');
          setResetPasswordError('');
          setResetPasswordChecking(false);
          setResetPasswordSubmitting(false);
          setView('login');
        }}
      />
    );
  }

  if (view === 'register') {
    return (
      <RegisterView
        onBack={() => {
          setView('login');
          setRegisterError('');
          setRegisterFormError('');
          setRemoveByCpfMessage(null);
          setVerifyEmailUserId(null);
          setVerifyEmailAddress('');
          setVerifyEmailError('');
          setVerifyEmailNotice(null);
        }}
        onSubmit={handleRegister}
        cpfError={registerError || undefined}
        formError={registerFormError || undefined}
        onRemoveByCpf={handleRemoveByCpf}
        removeByCpfMessage={removeByCpfMessage}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar
        currentUser={currentUser}
        view={view}
        onNavigate={(v) => setView(v)}
        onLogout={() => {
          signOutFirebase();
          setCurrentUser(null);
          setView('login');
          setRegisterEmailNotice(null);
          setVerifyEmailUserId(null);
          setVerifyEmailAddress('');
          setVerifyEmailError('');
          setVerifyEmailNotice(null);
        }}
      />

      <BottomNav
        view={view}
        isAdmin={currentUser?.role === UserRole.ADMIN}
        onNavigate={(v) => setView(v)}
        onLogout={() => {
          signOutFirebase();
          setCurrentUser(null);
          setView('login');
          setRegisterEmailNotice(null);
          setVerifyEmailUserId(null);
          setVerifyEmailAddress('');
          setVerifyEmailError('');
          setVerifyEmailNotice(null);
        }}
      />

      <main className="flex-grow p-4 md:p-10 pb-24 md:pb-10 overflow-y-auto max-w-7xl mx-auto">
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KronusLogo className="w-8 h-8 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">Kronus</span>
          </div>
          <button
            type="button"
            onClick={() => setView('profile')}
            className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-xs hover:opacity-90 transition-opacity"
            aria-label="Abrir meu perfil"
          >
            {currentUser?.name.charAt(0)}
          </button>
        </div>

        {view === 'dashboard' && (
          <>
            <DashboardHome
              currentUser={currentUser}
              lastClockInTime={lastClockInTime}
              lastSessionDurationMs={lastSessionDurationMs}
              lastWorkLogType={lastWorkLog?.type ?? null}
              summaries={summaries}
              bankOfHours={bankOfHours}
              isClockedIn={isClockedIn}
              emailNotice={registerEmailNotice}
              onDismissEmailNotice={() => setRegisterEmailNotice(null)}
              onPunch={handlePunch}
              onGoToHistory={() => setView('history')}
              onOpenPersonalCommitment={openPersonalModal}
              onOpenHoliday={openHolidayModal}
              onOpenVacation={openVacationModal}
              onOpenProductivity={() => setView('productivity')}
            />
          </>
        )}

        {view === 'history' && (
          <HistoryView
            userLogs={userLogs}
            userName={currentUser?.name}
            onConfirmDelete={(id, log) => { confirmDeleteIdRef.current = id; setConfirmDelete({ id, log }); }}
          />
        )}

        {view === 'admin' && currentUser?.role === UserRole.ADMIN && (
          <AdminPanel
            currentUser={currentUser}
            users={safeUsers}
            logs={safeLogs}
            vacations={vacations}
            holidays={holidays}
            onPromoteToMaster={currentUser?.isMaster ? promoteToMaster : undefined}
            onDemoteToUser={currentUser?.isMaster ? demoteToUser : undefined}
            onRequestDeleteUser={handleRequestDeleteUser}
            onRequestDeleteByCpf={handleRequestDeleteUserByCpf}
            removeByCpfMessage={adminRemoveByCpfMessage}
            onConfirmDeleteLog={openConfirmDeleteLog}
            onUpdateUser={updateUser}
            onUpdateLog={updateLog}
            onAddLog={addLog}
          />
        )}

        {view === 'productivity' && (
          <ProductivityDashboard
            summaries={summaries}
            onClose={() => setView('dashboard')}
            embedded
          />
        )}

        {view === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onUpdateUser={updateUser}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir registro"
        message="Deseja realmente excluir este registro de ponto? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          const id = confirmDeleteIdRef.current ?? confirmDelete?.id;
          if (id) deleteLog(id);
        }}
        onCancel={() => { confirmDeleteIdRef.current = null; setConfirmDelete(null); }}
      />

      <ConfirmModal
        open={relaxModalOpen}
        title="Hora de relaxar"
        message="Você acumulou mais de 6h positivas no banco de horas. Está trabalhando demais — é hora de relaxar!"
        confirmLabel="Entendi"
        cancelLabel="Fechar"
        danger={false}
        onConfirm={() => setRelaxModalOpen(false)}
        onCancel={() => setRelaxModalOpen(false)}
      />

      <PersonalCommitmentModal
        open={personalModalOpen}
        date={personalDate}
        startTime={personalStartTime}
        endTime={personalEndTime}
        totalHoursLabel={personalHours !== null ? `${personalHours.toFixed(2)}h` : '--'}
        error={personalError}
        onDateChange={setPersonalDate}
        onStartTimeChange={setPersonalStartTime}
        onEndTimeChange={setPersonalEndTime}
        onConfirm={handlePersonalCommitmentSave}
        onCancel={() => { setPersonalModalOpen(false); setPersonalError(''); }}
      />

      <VacationModal
        open={vacationModalOpen}
        startDate={vacationStartDate}
        endDate={vacationEndDate}
        error={vacationError}
        onStartDateChange={setVacationStartDate}
        onEndDateChange={setVacationEndDate}
        onConfirm={handleVacationSave}
        onCancel={() => { setVacationModalOpen(false); setVacationError(''); }}
      />

      <HolidayModal
        open={holidayModalOpen}
        startDate={holidayStartDate}
        endDate={holidayEndDate}
        error={holidayError}
        onStartDateChange={setHolidayStartDate}
        onEndDateChange={setHolidayEndDate}
        onConfirm={handleHolidaySave}
        onCancel={() => { setHolidayModalOpen(false); setHolidayError(''); }}
      />

      <MissedJustificationModal
        open={missedJustificationOpen}
        dateLabel={missedJustificationDate ? formatLongDate(missedJustificationDate) : ''}
        reason={missedJustificationReason}
        error={missedJustificationError}
        onReasonChange={setMissedJustificationReason}
        onConfirm={handleMissedJustificationSave}
        onCancel={() => setMissedJustificationOpen(false)}
      />

      <DeleteUserPinModal
        open={!!confirmDeleteUser}
        userName={confirmDeleteUser?.userName ?? ''}
        pin={deleteUserPin}
        setPin={setDeleteUserPin}
        error={deleteUserPinError}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => { setConfirmDeleteUser(null); setDeleteUserPin(''); setDeleteUserPinError(''); setAdminRemoveByCpfMessage(null); }}
      />
    </div>
  );
}
