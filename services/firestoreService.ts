import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { User, PunchLog, VacationRange } from '../types';

const KRONUS_COLLECTION = 'kronus';
const KRONUS_DOC_ID = 'appData';

export interface KronusData {
  users: User[];
  logs: PunchLog[];
  pendingJustifications: Record<string, string>;
  vacations: Record<string, VacationRange[]>;
  relaxNotice: Record<string, boolean>;
}

const defaultData: KronusData = {
  users: [],
  logs: [],
  pendingJustifications: {},
  vacations: {},
  relaxNotice: {},
};

export async function getKronusData(): Promise<KronusData | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, KRONUS_COLLECTION, KRONUS_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<KronusData>;
    return {
      users: Array.isArray(data?.users) ? data.users : defaultData.users,
      logs: Array.isArray(data?.logs) ? data.logs : defaultData.logs,
      pendingJustifications:
        data?.pendingJustifications && typeof data.pendingJustifications === 'object'
          ? data.pendingJustifications
          : defaultData.pendingJustifications,
      vacations:
        data?.vacations && typeof data.vacations === 'object'
          ? data.vacations
          : defaultData.vacations,
      relaxNotice:
        data?.relaxNotice && typeof data.relaxNotice === 'object'
          ? data.relaxNotice
          : defaultData.relaxNotice,
    };
  } catch (e) {
    console.warn('Firestore getKronusData:', e);
    return null;
  }
}

export async function setKronusData(data: KronusData): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, KRONUS_COLLECTION, KRONUS_DOC_ID);
    await setDoc(ref, data, { merge: false });
  } catch (e) {
    console.warn('Firestore setKronusData:', e);
  }
}
