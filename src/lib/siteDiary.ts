import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { SiteDiaryEntry } from '@/types';

const diaryRef = collection(db, 'diaryEntries');

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

/**
 * Create a new site diary entry. Pass a JS Date for `date`; it is stored as a
 * Firestore Timestamp along with a server-side createdAt for ordering.
 */
export async function addDiaryEntry(
  entry: Omit<SiteDiaryEntry, 'id' | 'date' | 'createdAt'> & { date: Date }
): Promise<string> {
  const docRef = await addDoc(diaryRef, {
    projectId: entry.projectId,
    date: Timestamp.fromDate(entry.date),
    authorId: entry.authorId,
    weatherCondition: entry.weatherCondition,
    crewPresent: entry.crewPresent,
    equipmentOnSite: entry.equipmentOnSite,
    notes: entry.notes,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * List all diary entries for a project, newest first. Sorted client-side to
 * avoid needing a composite Firestore index (matches the Projects.tsx pattern).
 */
export async function listDiaryEntriesByProject(projectId: string): Promise<SiteDiaryEntry[]> {
  const snap = await getDocs(query(diaryRef, where('projectId', '==', projectId)));
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SiteDiaryEntry[];
  entries.sort((a, b) => toMillis(b.date) - toMillis(a.date));
  return entries;
}

/**
 * List a project's diary entries whose date falls within [start, end] (inclusive),
 * newest first. Fetches by project then filters the range client-side so no
 * composite index is required.
 */
export async function listDiaryEntriesByDateRange(
  projectId: string,
  start: Date,
  end: Date
): Promise<SiteDiaryEntry[]> {
  const all = await listDiaryEntriesByProject(projectId);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return all.filter(e => {
    const ms = toMillis(e.date);
    return ms >= startMs && ms <= endMs;
  });
}
