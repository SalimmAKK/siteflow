import type { Project, Task } from '@/types';

export type SiteHealth = 'on-track' | 'at-risk' | 'delayed';

// ── Thresholds (deliberately simple + demo-explainable) ──────────────────────
// A project counts as AT-RISK when its target date is within this many days.
const AT_RISK_WINDOW_DAYS = 7;
// ...and fewer than this share of its tasks are done.
const ON_TRACK_COMPLETION = 0.75;

const toJsDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * Classify a project's schedule health from real data only.
 *
 * The rules, in plain English (say these out loud in a demo):
 *   1. A closed project (Completed/Archived) is always "on-track".
 *   2. "delayed"  → it has at least one overdue task, OR its target completion
 *                   date has already passed while tasks remain unfinished.
 *   3. "at-risk"  → the target date is within the next 7 days but less than
 *                   75% of its tasks are done (deadline near, progress behind).
 *   4. "on-track" → everything else.
 *
 * `project.dueDate` is used as the target completion date (that is what the
 * create/edit form captures).
 */
export function computeSiteHealth(
  project: Project,
  tasks: Task[],
  now: Date = new Date()
): SiteHealth {
  // 1. Closed projects are done — never flag them.
  if (project.status === 'Completed' || project.status === 'Archived') {
    return 'on-track';
  }

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.status === 'Completed').length;
  const completionRatio = total === 0 ? 0 : completed / total;
  // Only judge "remaining work" when there are tasks to judge.
  const workRemaining = total > 0 && completionRatio < 1;

  const overdueTaskCount = projectTasks.filter((t) => {
    if (t.status === 'Completed') return false;
    const due = toJsDate(t.dueDate);
    return !!due && due < now;
  }).length;

  const targetDate = toJsDate(project.dueDate);

  // 2. Delayed: any overdue task, or the target date passed with work left.
  if (overdueTaskCount > 0) return 'delayed';
  if (targetDate && targetDate < now && workRemaining) return 'delayed';

  // 3. At-risk: target date approaching soon but progress behind.
  if (targetDate && workRemaining) {
    const daysLeft = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= AT_RISK_WINDOW_DAYS && completionRatio < ON_TRACK_COMPLETION) {
      return 'at-risk';
    }
  }

  // 4. Otherwise on-track.
  return 'on-track';
}

// ── Presentation helpers (reuse existing CSS tokens) ─────────────────────────
export const HEALTH_LABELS: Record<SiteHealth, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  delayed: 'Delayed',
};

// blueprint blue = on-track, hazard amber = at-risk, destructive red = delayed.
export const HEALTH_COLORS: Record<SiteHealth, string> = {
  'on-track': 'var(--blueprint)',
  'at-risk': 'var(--hazard)',
  delayed: 'hsl(var(--destructive))',
};
