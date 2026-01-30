import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, PunchLog, UserRole, DaySummary, PunchType, VacationRange } from './types';
import { LOCAL_STORAGE_KEYS, KronusLogo } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { cpfDigits, formatCpfDisplay } from './utils/cpfMask';
import { generateCode, CODE_EXPIRY_MS } from './utils/code';
import { buildAuthPassword } from './utils/authPassword';
import { getKronusData, mergeAndSetKronusData, mergeKronusData } from './services/firestoreService';
import {
  createFirebaseUser,
  signInFirebaseUser,
  sendFirebaseVerificationEmail,
  reloadFirebaseUser,
  getFirebaseCurrentUser,
  updateFirebasePassword,
  signOutFirebase,
} from './services/firebase';

import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { VerifyEmailView } from './components/VerifyEmailView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
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
import { ProductivityDashboard } from './components/ProductivityDashboard';

type AppView = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'dashboard' | 'admin' | 'history' | 'productivity';

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

const findMissingWorkday = (
  user: User,
  userLogs: PunchLog[],
  userVacations: VacationRange[],
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
    if (!logDates.has(dateString)) {
      return dateString;
    }
  }

  return null;
};

export default function App() {
  const [users, setUsers] = useLocalStorage<User[]>(LOCAL_STORAGE_KEYS.USERS, []);
  const [logs, setLogs] = useLocalStorage<PunchLog[]>(LOCAL_STORAGE_KEYS.LOGS, []);
  const [pendingJustifications, setPendingJustifications] = useLocalStorage<Record<string, string>>(
    LOCAL_STORAGE_KEYS.PENDING_JUSTIFICATIONS,
    {}
  );
  const [vacations, setVacations] = useLocalStorage<Record<string, VacationRange[]>>(
    LOCAL_STORAGE_KEYS.VACATIONS,
    {}
  );
  const [relaxNotice, setRelaxNotice] = useLocalStorage<Record<string, boolean>>(
    LOCAL_STORAGE_KEYS.RELAX_NOTICE,
    {}
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('login');
  const [pin, setPin] = useState('');
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_EMAIL);
      return saved ? saved : '';
    } catch {
      return '';
    }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return !!localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_EMAIL);
    } catch {
      return false;
    }
  });
  const [authError, setAuthError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerFormError, setRegisterFormError] = useState('');
  const [verifyEmailUserId, setVerifyEmailUserId] = useState<string | null>(null);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyEmailError, setVerifyEmailError] = useState('');
  const [verifyEmailNotice, setVerifyEmailNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; log?: PunchLog } | null>(null);
  const confirmDeleteIdRef = useRef<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ userId: string; userName: string } | null>(null);
  const [deleteUserPin, setDeleteUserPin] = useState('');
  const [deleteUserPinError, setDeleteUserPinError] = useState('');
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [personalDate, setPersonalDate] = useState(() => toLocalDateInput(Date.now()));
  const [personalStartTime, setPersonalStartTime] = useState(() => toLocalTimeInput(Date.now()));
  const [personalEndTime, setPersonalEndTime] = useState(() => toLocalTimeInput(Date.now() + 60 * 60 * 1000));
  const [personalError, setPersonalError] = useState('');
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [vacationStartDate, setVacationStartDate] = useState(() => toLocalDateInput(Date.now()));
  const [vacationEndDate, setVacationEndDate] = useState(() => toLocalDateInput(Date.now()));
  const [vacationError, setVacationError] = useState('');
  const [missedJustificationOpen, setMissedJustificationOpen] = useState(false);
  const [missedJustificationDate, setMissedJustificationDate] = useState('');
  const [missedJustificationReason, setMissedJustificationReason] = useState('Esqueci');
  const [missedJustificationError, setMissedJustificationError] = useState('');
  const [relaxModalOpen, setRelaxModalOpen] = useState(false);
  const [removeByCpfMessage, setRemoveByCpfMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registerEmailNotice, setRegisterEmailNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const firestoreLoadedRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRestoredRef = useRef(false);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

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
    let mounted = true;
    getKronusData().then((data) => {
      if (!mounted) return;
      if (data) {
        const merged = mergeKronusData(
          {
            users: safeUsers,
            logs: safeLogs,
            pendingJustifications,
            vacations,
            relaxNotice,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setPendingJustifications(merged.pendingJustifications);
        setVacations(merged.vacations);
        setRelaxNotice(merged.relaxNotice);
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
    getKronusData().then((data) => {
      if (!mounted || !data) return;
      const merged = mergeKronusData(
        {
          users: safeUsers,
          logs: safeLogs,
          pendingJustifications,
          vacations,
          relaxNotice,
        },
        data
      );
      setUsers(merged.users);
      setLogs(merged.logs);
      setPendingJustifications(merged.pendingJustifications);
      setVacations(merged.vacations);
      setRelaxNotice(merged.relaxNotice);
    });
    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.emailVerified]);

  useEffect(() => {
    if (sessionRestoredRef.current || safeUsers.length === 0) return;
    const sessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
    if (!sessionId) return;
    const user = safeUsers.find(u => u.id === sessionId);
    sessionRestoredRef.current = true;
    if (user) {
      const firebaseUser = getFirebaseCurrentUser();
      if (firebaseUser && firebaseUser.emailVerified && firebaseUser.email?.toLowerCase() === user.email.toLowerCase()) {
        setLocalEmailVerified(user.id, true);
        setCurrentUser({ ...user, emailVerified: true });
        setView('dashboard');
      } else if (firebaseUser && !firebaseUser.emailVerified) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
        setCurrentUser(null);
        setLocalEmailVerified(user.id, false);
        openVerifyEmailView(user.id, user.email);
        setVerifyEmailNotice({
          type: 'error',
          text: 'Seu e-mail ainda não foi verificado. Confirme para continuar.',
        });
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
    }
  }, [safeUsers]);

  useEffect(() => {
    if (!firestoreLoadedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      mergeAndSetKronusData({
        users: safeUsers,
        logs: safeLogs,
        pendingJustifications,
        vacations,
        relaxNotice,
      });
      syncTimeoutRef.current = null;
    }, 800);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [safeUsers, safeLogs, pendingJustifications, vacations, relaxNotice]);

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
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
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
    const pendingDate = pendingJustifications[currentUser.id];
    if (!pendingDate) return;
    const alreadyHandled = userLogs.some(log => log.dateString === pendingDate);
    if (alreadyHandled) {
      setPendingJustifications(prev => {
        const next = { ...prev };
        delete next[currentUser.id];
        return next;
      });
      return;
    }
    setMissedJustificationDate(pendingDate);
    setMissedJustificationReason('Esqueci');
    setMissedJustificationError('');
    setMissedJustificationOpen(true);
  }, [currentUser, pendingJustifications, userLogs, setPendingJustifications]);

  const userVacations = useMemo(
    () => (currentUser ? (vacations[currentUser.id] ?? []) : []),
    [vacations, currentUser]
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
      return {
        date,
        totalHours,
        expectedHours: currentUser.dailyHours,
        isGoalMet: totalHours >= currentUser.dailyHours,
        logs: sorted
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [userLogs, currentUser, userVacations]);

  const bankOfHours = useMemo(() => {
    if (!currentUser) return 0;
    return summaries.reduce((acc, s) => acc + (s.totalHours - s.expectedHours), 0);
  }, [summaries, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (bankOfHours < 6) return;
    if (relaxNotice[currentUser.id]) return;
    setRelaxModalOpen(true);
    setRelaxNotice(prev => ({ ...prev, [currentUser.id]: true }));
  }, [bankOfHours, currentUser, relaxNotice, setRelaxNotice]);

  const lastWorkLog = useMemo(
    () => userLogs.find(log => log.type === 'IN' || log.type === 'OUT'),
    [userLogs]
  );
  const lastClockInTime = lastWorkLog?.type === 'IN' ? lastWorkLog.timestamp : null;
  const lastSessionDurationMs = useMemo(() => {
    if (!userLogs.length) return null;
    const workLogs = [...userLogs].filter(log => (
      (log.type === 'IN' || log.type === 'OUT') && !isDateInVacation(log.dateString, userVacations)
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
  }, [userLogs, userVacations]);

  const handleLogin = async () => {
    const normalizedEmail = loginEmail.trim().toLowerCase();
    const localUser = safeUsers.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    const localPinMatches = !!localUser && localUser.pin === pin;

    if (rememberMe) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REMEMBER_EMAIL, loginEmail.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REMEMBER_EMAIL);
    }

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
      const data = await getKronusData();
      if (data) {
        const merged = mergeKronusData(
          {
            users: safeUsers,
            logs: safeLogs,
            pendingJustifications,
            vacations,
            relaxNotice,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setPendingJustifications(merged.pendingJustifications);
        setVacations(merged.vacations);
        setRelaxNotice(merged.relaxNotice);
        userToLogin = merged.users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
      }
    }

    if (!userToLogin) {
      setAuthError('Usuário não encontrado no banco. Solicite cadastro novamente.');
      return;
    }

    setLocalEmailVerified(userToLogin.id, true);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID, userToLogin.id);
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

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
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
      role: isMasterAdmin ? UserRole.ADMIN : UserRole.USER,
      isMaster: isMasterAdmin,
      emailVerified: false,
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
            pendingJustifications,
            vacations,
            relaxNotice,
          },
          data
        );
        setUsers(merged.users);
        setLogs(merged.logs);
        setPendingJustifications(merged.pendingJustifications);
        setVacations(merged.vacations);
        setRelaxNotice(merged.relaxNotice);
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
    localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID, user.id);
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
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setLogs(prev => prev.filter(l => l.userId !== user.id));
    setPendingJustifications(prev => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    setVacations(prev => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    setRelaxNotice(prev => {
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

    if (type === 'IN' && !hadPunchToday && !pendingJustifications[currentUser.id]) {
      const missingDate = findMissingWorkday(currentUser, userLogs, userVacations, now);
      if (missingDate) {
        setPendingJustifications(prev => ({ ...prev, [currentUser.id]: missingDate }));
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
    setVacationModalOpen(false);
    setVacationError('');
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
    setPendingJustifications(prev => {
      const next = { ...prev };
      delete next[currentUser.id];
      return next;
    });
    setMissedJustificationOpen(false);
    setMissedJustificationError('');
  };

  const deleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    confirmDeleteIdRef.current = null;
    setConfirmDelete(null);
  };

  const openConfirmDeleteLog = (id: string) => {
    confirmDeleteIdRef.current = id;
    setConfirmDelete({ id });
  };

  const promoteUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: UserRole.ADMIN, updatedAt: Date.now() } : u));
  };

  const promoteToMaster = (userId: string) => {
    if (!currentUser?.isMaster) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: UserRole.ADMIN, isMaster: true, updatedAt: Date.now() } : u));
  };

  const demoteToUser = (userId: string) => {
    if (!currentUser?.isMaster) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: UserRole.USER, isMaster: false, updatedAt: Date.now() } : u));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setLogs(prev => prev.filter(l => l.userId !== userId));
    setPendingJustifications(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setVacations(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setRelaxNotice(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleRequestDeleteUser = (user: User) => {
    if (!currentUser?.isMaster) return;
    setConfirmDeleteUser({ userId: user.id, userName: user.name });
    setDeleteUserPin('');
    setDeleteUserPinError('');
  };

  const handleConfirmDeleteUser = () => {
    if (!confirmDeleteUser || !currentUser || !currentUser.isMaster) return;
    if (deleteUserPin !== currentUser.pin) {
      setDeleteUserPinError('PIN incorreto. Tente novamente.');
      return;
    }
    deleteUser(confirmDeleteUser.userId);
    setConfirmDeleteUser(null);
    setDeleteUserPin('');
    setDeleteUserPinError('');
  };

  const canManageLogsForUser = (actor: User | null, targetUserId: string): boolean => {
    if (!actor) return false;
    if (actor.isMaster) return true;
    if (actor.role !== UserRole.ADMIN) return false;
    return actor.id === targetUserId;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      if (u.isMaster) {
        return { ...u, ...updates, role: UserRole.ADMIN, isMaster: true, updatedAt: Date.now() };
      }
      return { ...u, ...updates, updatedAt: Date.now() };
    }));
    if (currentUser?.id === userId && updates.pin) {
      const firebaseUser = getFirebaseCurrentUser();
      if (firebaseUser) {
        updateFirebasePassword(firebaseUser, buildAuthPassword(updates.pin)).catch(() => {});
      }
    }
  };

  const updateLog = (logId: string, updates: Partial<PunchLog>) => {
    setLogs(prev => {
      const existing = prev.find(l => l.id === logId);
      if (!existing) return prev;
      if (!canManageLogsForUser(currentUser, existing.userId)) return prev;
      return prev.map(l => l.id === logId ? { ...l, ...updates, updatedAt: Date.now() } : l);
    });
  };

  const addLog = (log: PunchLog) => {
    const now = Date.now();
    if (!canManageLogsForUser(currentUser, log.userId)) return;
    setLogs(prev => [{ ...log, updatedAt: log.updatedAt ?? now }, ...prev]);
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
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
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
        onSuccess={(userWithNewPin) => {
          if (!userWithNewPin.emailVerified) {
            openVerifyEmailView(userWithNewPin.id, userWithNewPin.email);
            sendVerificationEmail();
            return;
          }
          localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID, userWithNewPin.id);
          setCurrentUser(userWithNewPin);
          setView('dashboard');
        }}
        onUpdatePin={handleUpdatePin}
        generateCode={generateCode}
        codeExpiryMs={CODE_EXPIRY_MS}
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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        currentUser={currentUser}
        view={view}
        onNavigate={(v) => setView(v)}
        onLogout={() => {
          signOutFirebase();
          localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
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
          localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION_USER_ID);
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
            <KronusLogo className="w-8 h-8 text-indigo-600" aria-hidden />
            <span className="text-xl font-bold text-slate-800">Kronus</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs" aria-hidden>
            {currentUser?.name.charAt(0)}
          </div>
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
              onOpenVacation={openVacationModal}
              onOpenProductivity={() => setView('productivity')}
            />
          </>
        )}

        {view === 'history' && (
          <HistoryView
            userLogs={userLogs}
            onConfirmDelete={(id, log) => { confirmDeleteIdRef.current = id; setConfirmDelete({ id, log }); }}
          />
        )}

        {view === 'admin' && currentUser?.role === UserRole.ADMIN && (
          <AdminPanel
            currentUser={currentUser}
            users={safeUsers}
            logs={safeLogs}
            vacations={vacations}
            onPromoteUser={promoteUser}
            onPromoteToMaster={currentUser?.isMaster ? promoteToMaster : undefined}
            onDemoteToUser={currentUser?.isMaster ? demoteToUser : undefined}
            onRequestDeleteUser={handleRequestDeleteUser}
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
        onCancel={() => { setConfirmDeleteUser(null); setDeleteUserPin(''); setDeleteUserPinError(''); }}
      />
    </div>
  );
}
