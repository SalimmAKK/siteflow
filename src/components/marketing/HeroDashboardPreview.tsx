import React, { useState } from 'react';
import { FolderKanban, CheckCircle2 } from 'lucide-react';

// Fully self-contained, presentational preview of the dashboard's "Task Queue"
// panel for the marketing hero. Deliberately decoupled from the real app:
// no Firestore, no auth, no hooks beyond local useState. Colors/spacing below
// are copied from src/pages/Dashboard.tsx's dark panel (not imported), so this
// stays illustrative-only while still looking like a real peek into the app.

const BLUEPRINT = '#26456B';
const HAZARD = '#F2B705';
const DANGER = '#DC2626';
const NEUTRAL = '#B8AE97';
const PANEL_BG = '#141417';
const CARD_BG = '#1E1E23';

type MockStatus = 'Todo' | 'In Progress' | 'Completed';

interface MockTask {
  id: string;
  title: string;
  status: MockStatus;
  priority: 'Low' | 'Medium' | 'High';
  /** Days from "today" — negative means overdue. */
  dueOffsetDays: number;
  assignee: string;
  projectName: string;
  description: string;
  checklist: { text: string; completed: boolean }[];
}

// Same flavor of content as src/lib/seedMockData.ts, for a single project.
const MOCK_TASKS: MockTask[] = [
  {
    id: 't1',
    title: 'Submit permit renewal',
    status: 'Todo',
    priority: 'Low',
    dueOffsetDays: -1,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Municipal permit renewal is due — submit the paperwork before the site is flagged for a stop-work order.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: true },
      { text: 'Materials on site', completed: false },
    ],
  },
  {
    id: 't2',
    title: 'Coordinate crane delivery',
    status: 'In Progress',
    priority: 'High',
    dueOffsetDays: 0,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Confirm delivery window with the crane operator and clear the loading dock access route.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: true },
      { text: 'Materials on site', completed: true },
    ],
  },
  {
    id: 't3',
    title: 'Order steel beams',
    status: 'Todo',
    priority: 'Medium',
    dueOffsetDays: 1,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Place the order with the structural steel supplier ahead of the framing phase.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: false },
      { text: 'Materials on site', completed: false },
    ],
  },
  {
    id: 't4',
    title: 'Conduct safety walkthrough',
    status: 'In Progress',
    priority: 'High',
    dueOffsetDays: 2,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Weekly safety walkthrough covering scaffolding, PPE compliance, and site fencing.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: true },
      { text: 'Materials on site', completed: false },
    ],
  },
  {
    id: 't5',
    title: 'Order finishing materials',
    status: 'In Progress',
    priority: 'Medium',
    dueOffsetDays: 3,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Render, paint, and fit-out materials for the loading dock office block.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: false },
      { text: 'Materials on site', completed: false },
    ],
  },
  {
    id: 't6',
    title: 'Install site fencing',
    status: 'Todo',
    priority: 'Low',
    dueOffsetDays: 5,
    assignee: 'Admin',
    projectName: 'Qurtubah Warehouse Expansion',
    description: 'Extend perimeter fencing around the new loading dock excavation.',
    checklist: [
      { text: 'Site supervisor sign-off', completed: false },
      { text: 'Materials on site', completed: true },
    ],
  },
];

const isOverdue = (t: MockTask) => t.status !== 'Completed' && t.dueOffsetDays < 0;

const statusTag = (t: MockTask) => {
  if (isOverdue(t)) return { label: 'Overdue', color: DANGER };
  if (t.status === 'Completed') return { label: 'Completed', color: '#16A34A' };
  if (t.status === 'In Progress') return { label: 'In Progress', color: HAZARD };
  return { label: 'To Do', color: NEUTRAL };
};

const dueLabel = (t: MockTask) => {
  const d = t.dueOffsetDays;
  if (isOverdue(t)) return `Overdue ${Math.abs(d)}d`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
};

const initials = (name: string) =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

type TabKey = 'all' | 'inprogress' | 'overdue';

export const HeroDashboardPreview: React.FC = () => {
  const overdueTask = MOCK_TASKS.find(isOverdue) ?? MOCK_TASKS[0];
  const [tab, setTab] = useState<TabKey>('all');
  const [selectedId, setSelectedId] = useState(overdueTask.id);

  const counts = {
    all: MOCK_TASKS.length,
    inprogress: MOCK_TASKS.filter((t) => t.status === 'In Progress').length,
    overdue: MOCK_TASKS.filter(isOverdue).length,
  };

  const visible = [...MOCK_TASKS]
    .filter((t) => {
      if (tab === 'inprogress') return t.status === 'In Progress';
      if (tab === 'overdue') return isOverdue(t);
      return true;
    })
    .sort((a, b) => a.dueOffsetDays - b.dueOffsetDays);

  const selected = visible.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  return (
    <div>
      <div className="eyebrow mono" style={{ marginBottom: '0.7rem' }}>Live preview · Task Queue</div>

      <div className="preview-shell" style={{ padding: '1rem' }}>
        <div className="preview-top" style={{ marginBottom: '0.8rem', paddingBottom: '0.8rem' }}>
          <span className="mono">SiteFlow · Task Queue</span>
          <span className="mono">Illustrative only</span>
        </div>

        <div className="rounded-2xl p-3" style={{ backgroundColor: PANEL_BG }}>
          {/* Tabs */}
          <div
            className="flex items-center gap-1 rounded-full p-1 mb-3 w-fit"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            {(
              [
                { key: 'all', label: 'All', count: counts.all },
                { key: 'inprogress', label: 'In Progress', count: counts.inprogress },
                { key: 'overdue', label: 'Overdue', count: counts.overdue },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: tab === t.key ? '#fff' : '#9CA3AF',
                  backgroundColor: tab === t.key ? BLUEPRINT : 'transparent',
                }}
              >
                {t.label}
                <span
                  className="inline-flex items-center justify-center rounded-full font-semibold"
                  style={{
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    fontSize: '0.6rem',
                    color: '#fff',
                    backgroundColor: tab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Task list */}
          <div
            className="rounded-2xl p-1.5 overflow-y-auto"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', maxHeight: '176px' }}
          >
            {visible.length === 0 ? (
              <div className="text-center py-6" style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                No tasks match this filter.
              </div>
            ) : (
              visible.map((t) => {
                const isSelected = selected?.id === t.id;
                const tag = statusTag(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className="w-full flex items-center gap-2.5 rounded-xl text-left transition-colors mb-1 last:mb-0"
                    style={{
                      padding: '0.5rem 0.6rem',
                      backgroundColor: isSelected ? BLUEPRINT : 'transparent',
                    }}
                  >
                    <span
                      className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
                      style={{
                        width: '26px',
                        height: '26px',
                        fontSize: '0.55rem',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#2E2E36',
                      }}
                    >
                      {initials(t.assignee)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-semibold text-white"
                        style={{ fontSize: '0.78rem' }}
                      >
                        {t.title}
                      </span>
                      <span
                        className="block truncate"
                        style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}
                      >
                        {dueLabel(t)}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-full font-semibold"
                      style={{
                        fontSize: '0.58rem',
                        padding: '0.15rem 0.45rem',
                        color: tag.color,
                        backgroundColor: `${tag.color}22`,
                      }}
                    >
                      {tag.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail card */}
          {selected && (
            <div className="rounded-2xl mt-2 p-3" style={{ backgroundColor: CARD_BG }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="font-semibold uppercase"
                  style={{ fontSize: '0.6rem', letterSpacing: '0.04em', color: '#6B7280' }}
                >
                  Task
                </span>
                <span
                  className="rounded-full font-semibold"
                  style={{
                    fontSize: '0.58rem',
                    padding: '0.1rem 0.4rem',
                    color: statusTag(selected).color,
                    backgroundColor: `${statusTag(selected).color}22`,
                  }}
                >
                  {statusTag(selected).label}
                </span>
              </div>
              <p className="font-bold text-white leading-tight mb-2" style={{ fontSize: '0.9rem' }}>
                {selected.title}
              </p>

              <div className="flex items-center gap-1.5 mb-2 min-w-0">
                <FolderKanban className="w-3 h-3 shrink-0" style={{ color: '#8FA6C4' }} />
                <span className="truncate" style={{ fontSize: '0.68rem', color: '#D1D5DB' }}>
                  {selected.projectName}
                </span>
              </div>

              <p
                className="leading-relaxed mb-2"
                style={{
                  fontSize: '0.7rem',
                  color: '#9CA3AF',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {selected.description}
              </p>

              <ul className="space-y-1">
                {selected.checklist.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2
                      className="w-3 h-3 shrink-0"
                      style={{ color: c.completed ? '#16A34A' : 'rgba(255,255,255,0.25)' }}
                    />
                    <span
                      className="truncate"
                      style={{
                        fontSize: '0.68rem',
                        color: c.completed ? '#6B7280' : '#D1D5DB',
                        textDecoration: c.completed ? 'line-through' : 'none',
                      }}
                    >
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
