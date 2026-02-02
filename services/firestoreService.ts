import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { ensureFirebaseAuth, getFirebaseDb, isFirestoreEnabled } from './firebase';
import { UserRole, type User, type PunchLog, type VacationRange, type HolidayRange } from '../types';

const USERS_COLLECTION = 'users';
const LOGS_COLLECTION = 'logs';
const VACATIONS_COLLECTION = 'vacations';
const HOLIDAYS_COLLECTION = 'holidays';

const LEGACY_COLLECTION = 'kronus';
const LEGACY_DOC_ID = 'appData';

export interface KronusData {
  users: User[];
  logs: PunchLog[];
  vacations: Record<string, VacationRange[]>;
  holidays: Record<string, HolidayRange[]>;
}

interface LegacyKronusData {
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
  vacations: {},
  holidays: {},
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
  const pendingJustification = user.pendingJustification ?? '';
  const relaxNotice = user.relaxNotice ?? false;
  return {
    ...user,
    role,
    isMaster,
    updatedAt,
    emailVerified,
    pendingJustification,
    relaxNotice,
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
    vacations: normalizeVacations(vacations),
    holidays: normalizeHolidays(holidays),
  };
};

const flattenRanges = <T extends { id: string }>(rangesByUser: Record<string, T[]>): T[] => (
  Object.values(rangesByUser).flatMap(ranges => ranges ?? [])
);

const groupRangesByUser = <T extends { id: string; userId: string }>(ranges: T[]): Record<string, T[]> => {
  return ranges.reduce((acc, range) => {
    if (!acc[range.userId]) acc[range.userId] = [];
    acc[range.userId].push(range);
    return acc;
  }, {} as Record<string, T[]>);
};

const readCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map(docSnap => ({
    ...(docSnap.data() as T),
    id: docSnap.id,
  }));
};

const CHUNK_SIZE = 450;

const writeCollection = async <T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> => {
  if (!items.length) return;
  const db = getFirebaseDb();
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK_SIZE).forEach(item => {
      batch.set(doc(db, collectionName, item.id), item, { merge: false });
    });
    await batch.commit();
  }
};

const deleteCollectionDocs = async (collectionName: string, ids: string[]): Promise<void> => {
  if (!ids.length) return;
  const db = getFirebaseDb();
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK_SIZE).forEach(id => {
      batch.delete(doc(db, collectionName, id));
    });
    await batch.commit();
  }
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
    vacations: mergedVacations,
    holidays: mergedHolidays,
  };
}

const convertLegacyData = (legacy: Partial<LegacyKronusData>): KronusData => {
  const pendingJustifications = legacy.pendingJustifications ?? {};
  const relaxNotice = legacy.relaxNotice ?? {};
  const users = (legacy.users ?? []).map(user => ({
    ...user,
    pendingJustification: pendingJustifications[user.id] ?? '',
    relaxNotice: relaxNotice[user.id] ?? false,
  }));
  return normalizeData({
    users,
    logs: legacy.logs ?? [],
    vacations: legacy.vacations ?? {},
    holidays: legacy.holidays ?? {},
  });
};

const buildLegacyData = (data: KronusData): LegacyKronusData => {
  const normalized = normalizeData(data);
  const pendingJustifications: Record<string, string> = {};
  const relaxNotice: Record<string, boolean> = {};
  normalized.users.forEach(user => {
    if (user.pendingJustification) {
      pendingJustifications[user.id] = user.pendingJustification;
    }
    if (user.relaxNotice) {
      relaxNotice[user.id] = true;
    }
  });
  return {
    users: normalized.users,
    logs: normalized.logs,
    pendingJustifications,
    vacations: normalized.vacations,
    holidays: normalized.holidays,
    relaxNotice,
  };
};

const readLegacyData = async (): Promise<KronusData | null> => {
  const db = getFirebaseDb();
  const legacyRef = doc(db, LEGACY_COLLECTION, LEGACY_DOC_ID);
  const legacySnap = await getDoc(legacyRef);
  if (!legacySnap.exists()) return null;
  return convertLegacyData(legacySnap.data() as Partial<LegacyKronusData>);
};

export async function getKronusData(): Promise<KronusData | null> {
  try {
    if (!(await canUseFirestore())) return null;
    let users: User[] = [];
    let logs: PunchLog[] = [];
    let vacationsList: VacationRange[] = [];
    let holidaysList: HolidayRange[] = [];
    try {
      [users, logs, vacationsList, holidaysList] = await Promise.all([
        readCollection<User>(USERS_COLLECTION),
        readCollection<PunchLog>(LOGS_COLLECTION),
        readCollection<VacationRange>(VACATIONS_COLLECTION),
        readCollection<HolidayRange>(HOLIDAYS_COLLECTION),
      ]);
    } catch (error) {
      console.warn('Firestore collections read failed, tentando legado:', error);
      const legacyData = await readLegacyData();
      return legacyData ? normalizeData(legacyData) : null;
    }

    const data = normalizeData({
      users,
      logs,
      vacations: groupRangesByUser(vacationsList),
      holidays: groupRangesByUser(holidaysList),
    });

    const hasAnyData = data.users.length || data.logs.length || vacationsList.length || holidaysList.length;
    if (hasAnyData) return data;

    const legacyData = await readLegacyData();
    if (!legacyData) return data;
    if (legacyData.users.length || legacyData.logs.length) {
      await setKronusData(legacyData);
    }
    return legacyData;
  } catch (e) {
    console.warn('Firestore getKronusData:', e);
    return null;
  }
}

export async function setKronusData(
  data: KronusData,
  options: { remoteData?: KronusData | null; prune?: boolean } = {}
): Promise<void> {
  try {
    if (!(await canUseFirestore())) return;
    const normalized = normalizeData(data);
    if (options.prune && options.remoteData) {
      const remote = normalizeData(options.remoteData);
      const localUserIds = new Set(normalized.users.map(u => u.id));
      const localLogIds = new Set(normalized.logs.map(l => l.id));
      const localVacationIds = new Set(flattenRanges(normalized.vacations).map(v => v.id));
      const localHolidayIds = new Set(flattenRanges(normalized.holidays).map(h => h.id));
      const usersToDelete = remote.users.filter(u => !localUserIds.has(u.id)).map(u => u.id);
      const logsToDelete = remote.logs.filter(l => !localLogIds.has(l.id)).map(l => l.id);
      const vacationsToDelete = flattenRanges(remote.vacations).filter(v => !localVacationIds.has(v.id)).map(v => v.id);
      const holidaysToDelete = flattenRanges(remote.holidays).filter(h => !localHolidayIds.has(h.id)).map(h => h.id);
      await deleteCollectionDocs(USERS_COLLECTION, usersToDelete);
      await deleteCollectionDocs(LOGS_COLLECTION, logsToDelete);
      await deleteCollectionDocs(VACATIONS_COLLECTION, vacationsToDelete);
      await deleteCollectionDocs(HOLIDAYS_COLLECTION, holidaysToDelete);
    }
    await writeCollection<User>(USERS_COLLECTION, normalized.users);
    await writeCollection<PunchLog>(LOGS_COLLECTION, normalized.logs);
    await writeCollection<VacationRange>(VACATIONS_COLLECTION, flattenRanges(normalized.vacations));
    await writeCollection<HolidayRange>(HOLIDAYS_COLLECTION, flattenRanges(normalized.holidays));
  } catch (e) {
    console.warn('Firestore setKronusData:', e);
    try {
      const legacyData = buildLegacyData(data);
      const db = getFirebaseDb();
      await setDoc(doc(db, LEGACY_COLLECTION, LEGACY_DOC_ID), legacyData, { merge: false });
    } catch (legacyError) {
      console.warn('Firestore setKronusData legado:', legacyError);
    }
  }
}

export async function mergeAndSetKronusData(localData: KronusData): Promise<void> {
  try {
    if (!(await canUseFirestore())) return;
    const remoteData = await getKronusData();
    const normalized = normalizeData(localData);
    await setKronusData(normalized, { remoteData, prune: true });
  } catch (e) {
    console.warn('Firestore mergeAndSetKronusData:', e);
  }
}
