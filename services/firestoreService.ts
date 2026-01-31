import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { ensureFirebaseAuth, getFirebaseDb, isFirestoreEnabled } from './firebase';
import { UserRole, type User, type PunchLog, type VacationRange, type HolidayRange } from '../types';

const KRONUS_COLLECTION = 'kronus';
const KRONUS_DOC_ID = 'appData';

export interface KronusData {
  users: User[];
  logs: PunchLog[];
  pendingJustifications: Record<string, string>;
  vacations: Record<string, VacationRange[]>;
  holidays: Record<string, HolidayRange[]>;
  relaxNotice: Record<string, boolean>;
}

const defaultData: KronusData = {
  users: [],
  logs: [],
  pendingJustifications: {},
  vacations: {},
  holidays: {},
  relaxNotice: {},
};

let firestoreReady: boolean | null = null;

async function canUseFirestore(): Promise<boolean> {
  if (!isFirestoreEnabled()) return false;
  if (firestoreReady === true) return true;
  const ok = await ensureFirebaseAuth();
  firestoreReady = ok ? true : null;
  return ok;
}

const mergeById = <T extends { id: string }>(
  local: T[],
  remote: T[],
  getStamp: (item: T) => number
): T[] => {
  const map = new Map<string, T>();
  remote.forEach(item => map.set(item.id, item));
  local.forEach(item => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      return;
    }
    map.set(item.id, getStamp(item) >= getStamp(existing) ? item : existing);
  });
  return Array.from(map.values());
};

const normalizeUsers = (users: User[]): User[] => users.map(user => {
  const role = user.role ?? UserRole.USER;
  const isMaster = role === UserRole.ADMIN ? true : !!user.isMaster;
  const updatedAt = user.updatedAt ?? user.createdAt ?? Date.now();
  const emailVerified = user.emailVerified ?? false;
  return {
    ...user,
    role,
    isMaster,
    updatedAt,
    emailVerified,
  };
});

const normalizeLogs = (logs: PunchLog[]): PunchLog[] => logs.map(log => ({
  ...log,
  updatedAt: log.updatedAt ?? log.timestamp ?? Date.now(),
}));

const normalizeVacations = (vacations: Record<string, VacationRange[]>): Record<string, VacationRange[]> => {
  const normalized: Record<string, VacationRange[]> = {};
  Object.entries(vacations).forEach(([userId, ranges]) => {
    normalized[userId] = (ranges ?? []).map(range => ({
      ...range,
      updatedAt: range.updatedAt ?? range.createdAt ?? Date.now(),
    }));
  });
  return normalized;
};

const normalizeHolidays = (holidays: Record<string, HolidayRange[]>): Record<string, HolidayRange[]> => {
  const normalized: Record<string, HolidayRange[]> = {};
  Object.entries(holidays).forEach(([userId, ranges]) => {
    normalized[userId] = (ranges ?? []).map(range => ({
      ...range,
      updatedAt: range.updatedAt ?? range.createdAt ?? Date.now(),
    }));
  });
  return normalized;
};

const normalizeData = (data: Partial<KronusData> | null | undefined): KronusData => {
  const users = Array.isArray(data?.users) ? data.users : defaultData.users;
  const logs = Array.isArray(data?.logs) ? data.logs : defaultData.logs;
  const vacations =
    data?.vacations && typeof data.vacations === 'object'
      ? data.vacations
      : defaultData.vacations;
  const holidays =
    data?.holidays && typeof data.holidays === 'object'
      ? data.holidays
      : defaultData.holidays;
  return {
    users: normalizeUsers(users),
    logs: normalizeLogs(logs),
    pendingJustifications:
      data?.pendingJustifications && typeof data.pendingJustifications === 'object'
        ? data.pendingJustifications
        : defaultData.pendingJustifications,
    vacations: normalizeVacations(vacations),
    holidays: normalizeHolidays(holidays),
    relaxNotice:
      data?.relaxNotice && typeof data.relaxNotice === 'object'
        ? data.relaxNotice
        : defaultData.relaxNotice,
  };
};

export function mergeKronusData(local: KronusData, remote: KronusData): KronusData {
  const normalizedLocal = normalizeData(local);
  const normalizedRemote = normalizeData(remote);
  const mergedUsers = mergeById(
    normalizedLocal.users,
    normalizedRemote.users,
    (user) => user.updatedAt ?? user.createdAt ?? 0
  );
  const mergedLogs = mergeById(
    normalizedLocal.logs,
    normalizedRemote.logs,
    (log) => log.updatedAt ?? log.timestamp ?? 0
  );
  const mergedVacations: Record<string, VacationRange[]> = {};
  const vacationUserIds = new Set([
    ...Object.keys(normalizedRemote.vacations),
    ...Object.keys(normalizedLocal.vacations),
  ]);
  vacationUserIds.forEach(userId => {
    const localRanges = normalizedLocal.vacations[userId] ?? [];
    const remoteRanges = normalizedRemote.vacations[userId] ?? [];
    mergedVacations[userId] = mergeById(
      localRanges,
      remoteRanges,
      (range) => range.updatedAt ?? range.createdAt ?? 0
    );
  });

  const mergedHolidays: Record<string, HolidayRange[]> = {};
  const holidayUserIds = new Set([
    ...Object.keys(normalizedRemote.holidays),
    ...Object.keys(normalizedLocal.holidays),
  ]);
  holidayUserIds.forEach(userId => {
    const localRanges = normalizedLocal.holidays[userId] ?? [];
    const remoteRanges = normalizedRemote.holidays[userId] ?? [];
    mergedHolidays[userId] = mergeById(
      localRanges,
      remoteRanges,
      (range) => range.updatedAt ?? range.createdAt ?? 0
    );
  });

  return {
    users: mergedUsers,
    logs: mergedLogs,
    pendingJustifications: {
      ...normalizedRemote.pendingJustifications,
      ...normalizedLocal.pendingJustifications,
    },
    vacations: mergedVacations,
    holidays: mergedHolidays,
    relaxNotice: {
      ...normalizedRemote.relaxNotice,
      ...normalizedLocal.relaxNotice,
    },
  };
}

export async function getKronusData(): Promise<KronusData | null> {
  try {
    if (!(await canUseFirestore())) return null;
    const db = getFirebaseDb();
    const ref = doc(db, KRONUS_COLLECTION, KRONUS_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<KronusData>;
    return normalizeData(data);
  } catch (e) {
    console.warn('Firestore getKronusData:', e);
    return null;
  }
}

export async function setKronusData(data: KronusData): Promise<void> {
  try {
    if (!(await canUseFirestore())) return;
    const db = getFirebaseDb();
    const ref = doc(db, KRONUS_COLLECTION, KRONUS_DOC_ID);
    await setDoc(ref, data, { merge: false });
  } catch (e) {
    console.warn('Firestore setKronusData:', e);
  }
}

export async function mergeAndSetKronusData(localData: KronusData): Promise<void> {
  try {
    if (!(await canUseFirestore())) return;
    const db = getFirebaseDb();
    const ref = doc(db, KRONUS_COLLECTION, KRONUS_DOC_ID);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, localData, { merge: false });
        return;
      }
      const remoteData = normalizeData(snap.data() as Partial<KronusData>);
      const merged = mergeKronusData(localData, remoteData);
      tx.set(ref, merged, { merge: false });
    });
  } catch (e) {
    console.warn('Firestore mergeAndSetKronusData:', e);
  }
}
