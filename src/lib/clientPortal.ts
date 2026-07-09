import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Project, Task } from '@/types';

// Collection holding public-safe *projections* of projects. This is the ONLY
// publicly-readable collection — the real `projects` collection stays locked to
// authenticated users. Each doc is keyed by an unguessable shareToken and
// contains only client-appropriate fields (see PortalSnapshot). Firestore rules
// cannot filter fields on a read, so exposing safe fields *requires* a separate
// projection like this rather than opening the project doc itself.
export const SHARE_COLLECTION = 'sharedProjects';

export interface PortalActivityItem {
  label: string;
  status: string;
  date: string | null; // ISO string
}

export interface PortalSnapshot {
  projectName: string;
  status: string;
  progress: number; // 0-100
  currentPhase: string;
  upcomingMilestone: string;
  upcomingMilestoneDate: string | null; // ISO string
  recentActivity: PortalActivityItem[];
  updatedAt: any;
}

/** Generate a random, unguessable bearer token used as the share doc id. */
export function generateShareToken(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  // Fallback: two base36 chunks (~20 chars of entropy)
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const toMs = (v: any): number => (v?.toDate ? v.toDate().getTime() : 0);
const toISO = (v: any): string | null => (v?.toDate ? v.toDate().toISOString() : null);

/**
 * Build the public-safe projection from a project + its tasks. Deliberately
 * excludes anything client-inappropriate: no team member IDs/names, no manager
 * identity, no budget figures, no internal notes. Only high-level progress.
 */
export function buildPortalSnapshot(project: Project, tasks: Task[]): PortalSnapshot {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const total = projectTasks.length;
  const done = projectTasks.filter((t) => t.status === 'Completed').length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const inProgress = projectTasks.filter((t) => t.status === 'In Progress');
  let currentPhase: string;
  if (project.status === 'Completed') currentPhase = 'Project complete';
  else if (project.status === 'On Hold') currentPhase = 'Temporarily on hold';
  else if (inProgress.length > 0) currentPhase = inProgress[0].title;
  else if (total > 0 && done === total) currentPhase = 'Final review';
  else if (total > 0) currentPhase = 'Getting started';
  else currentPhase = 'Planning';

  const upcoming = projectTasks
    .filter((t) => t.status !== 'Completed' && !!t.dueDate?.toDate)
    .sort((a, b) => toMs(a.dueDate) - toMs(b.dueDate))[0];

  const recentActivity: PortalActivityItem[] = [...projectTasks]
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
    .slice(0, 5)
    .map((t) => ({ label: t.title, status: t.status, date: toISO(t.createdAt) }));

  return {
    projectName: project.title,
    status: project.status,
    progress,
    currentPhase,
    upcomingMilestone: upcoming ? upcoming.title : 'To be scheduled',
    upcomingMilestoneDate: upcoming ? toISO(upcoming.dueDate) : null,
    recentActivity,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Ensure the project has a shareToken (persisting a new one if missing), then
 * write/refresh its public projection. Returns the token. Requires an
 * authenticated caller (guarded by Firestore rules).
 */
export async function publishShareSnapshot(project: Project, tasks: Task[]): Promise<string> {
  let token = project.shareToken;
  if (!token) {
    token = generateShareToken();
    await updateDoc(doc(db, 'projects', project.id), { shareToken: token });
  }
  await setDoc(doc(db, SHARE_COLLECTION, token), buildPortalSnapshot(project, tasks));
  return token;
}

/** Absolute URL a client can open without authentication. */
export const shareUrl = (token: string): string => `${window.location.origin}/share/${token}`;
