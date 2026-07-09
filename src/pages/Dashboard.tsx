import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import {
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  HardHat,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Task } from '@/types';
import { computeSiteHealth, HEALTH_LABELS, HEALTH_COLORS } from '@/lib/siteHealth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  startOfDay,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  subMonths,
  differenceInCalendarDays,
  isSameMonth,
  format,
} from 'date-fns';

// ── Brand accents (mirror --blueprint / --hazard in index.css) ───────────────
const BLUEPRINT = '#26456B';
const HAZARD = '#F2B705';
const DANGER = '#DC2626';
const NEUTRAL = '#B8AE97';

// Dark-panel surfaces
const PANEL_BG = '#141417';
const CARD_BG = '#1E1E23';
const CARD_LINE = 'rgba(255,255,255,0.08)';

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

const initials = (name?: string) =>
  (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const statusTag = (status: string, overdue: boolean) => {
  if (overdue) return { label: 'Overdue', color: DANGER };
  if (status === 'Completed') return { label: 'Completed', color: '#16A34A' };
  if (status === 'In Progress') return { label: 'In Progress', color: HAZARD };
  return { label: 'To Do', color: NEUTRAL };
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Dark-panel state
  const [tab, setTab] = useState<'all' | 'inprogress' | 'overdue'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // ── Real-time data (role-scoped, unchanged query semantics) ────────────────
  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];

    const projectsRef = collection(db, 'projects');
    const pq =
      user.role === 'manager'
        ? query(projectsRef, where('managerId', '==', user.uid))
        : query(projectsRef, where('teamMemberIds', 'array-contains', user.uid));
    unsubs.push(
      onSnapshot(pq, (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Project[]);
        setLoading(false);
      })
    );

    const tasksRef = collection(db, 'tasks');
    const tq =
      user.role === 'manager' ? query(tasksRef) : query(tasksRef, where('assignedUserId', '==', user.uid));
    unsubs.push(
      onSnapshot(tq, (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Task[]);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [user]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const isOverdue = (t: Task) => {
    if (t.status === 'Completed') return false;
    const d = toJsDate(t.dueDate);
    return !!d && d < today;
  };

  // ── Stat-card metrics (all real) ───────────────────────────────────────────
  const stats = useMemo(() => {
    const overdueTasks = tasks.filter(isOverdue);
    const delayedProjects = projects.filter((p) => {
      if (p.status === 'Completed') return false;
      const d = toJsDate(p.dueDate);
      return (!!d && d < today) || p.status === 'On Hold';
    });

    // monthly project creation (last 7 months)
    const months = Array.from({ length: 7 }).map((_, i) => startOfMonth(subMonths(today, 6 - i)));
    const projectsPerMonth = months.map((m) => ({
      key: format(m, 'MMM'),
      count: projects.filter((p) => {
        const d = toJsDate(p.createdAt);
        return !!d && isSameMonth(d, m);
      }).length,
    }));
    const thisMonth = projectsPerMonth[6].count;
    const lastMonth = projectsPerMonth[5].count;
    const projDelta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

    // avg planned duration (createdAt → dueDate)
    const durations = projects
      .map((p) => {
        const c = toJsDate(p.createdAt);
        const d = toJsDate(p.dueDate);
        return c && d ? differenceInCalendarDays(d, c) : null;
      })
      .filter((x): x is number => x !== null && x >= 0);
    const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // cumulative completed tasks per month (upward momentum line)
    const completedLine = months.map((m) => {
      const end = endOfMonth(m);
      const cum = tasks.filter((t) => {
        if (t.status !== 'Completed') return false;
        const d = toJsDate(t.createdAt);
        return !!d && d <= end;
      }).length;
      return { key: format(m, 'MMM'), value: cum };
    });

    // work utilization (completed / in-progress / todo)
    const done = tasks.filter((t) => t.status === 'Completed').length;
    const inprog = tasks.filter((t) => t.status === 'In Progress').length;
    const todo = tasks.filter((t) => t.status === 'Todo').length;
    const totalT = tasks.length;
    const utilPct = totalT ? Math.round((done / totalT) * 100) : 0;

    return {
      delayedCount: delayedProjects.length,
      overdueTaskCount: overdueTasks.length,
      projectsPerMonth,
      thisMonth,
      projDelta,
      avgDays,
      completedLine,
      util: { done, inprog, todo, totalT, utilPct },
    };
  }, [projects, tasks, today]);

  // ── Dark-panel filtering + selection ───────────────────────────────────────
  const chipFiltered = useMemo(() => {
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(today);
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const d = toJsDate(t.dueDate);
        if (dateFilter === 'overdue' && !isOverdue(t)) return false;
        if (dateFilter === 'week' && !(d && d >= today && d <= weekEnd)) return false;
        if (dateFilter === 'month' && !(d && d >= today && d <= monthEnd)) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, statusFilter, dateFilter, today]);

  const tabCounts = {
    all: chipFiltered.length,
    inprogress: chipFiltered.filter((t) => t.status === 'In Progress').length,
    overdue: chipFiltered.filter((t) => isOverdue(t)).length,
  };

  const visibleTasks = useMemo(() => {
    const list = chipFiltered.filter((t) => {
      if (tab === 'inprogress') return t.status === 'In Progress';
      if (tab === 'overdue') return isOverdue(t);
      return true;
    });
    // due soonest first, then by created
    return [...list].sort((a, b) => {
      const da = toJsDate(a.dueDate)?.getTime() ?? Infinity;
      const dbv = toJsDate(b.dueDate)?.getTime() ?? Infinity;
      return da - dbv;
    });
  }, [chipFiltered, tab, today]);

  const selectedTask =
    visibleTasks.find((t) => t.id === selectedTaskId) || visibleTasks[0] || null;

  const activeFilterCount = [projectFilter, statusFilter, dateFilter].filter((v) => v !== 'all').length;

  const dueLabel = (t: Task) => {
    const d = toJsDate(t.dueDate);
    if (!d) return 'No due date';
    const days = differenceInCalendarDays(d, today);
    if (days < 0) return `Overdue ${Math.abs(days)}d`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const chipTrigger =
    'h-11 rounded-full bg-card border border-border shadow-sm px-4 text-sm data-[placeholder]:text-muted-foreground';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-none">
            Site Operations
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Track every project and task across your sites in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="w-11 h-11 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-foreground hover:bg-accent transition-colors"
            title="Filters"
            onClick={() => document.getElementById('task-filters')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/dashboard/projects?action=create')}
            className="h-11 pl-4 pr-5 rounded-full flex items-center gap-2 font-semibold text-sm shadow-sm hover:brightness-95 transition-all"
            style={{ backgroundColor: HAZARD, color: '#5A3E00' }}
          >
            <Plus className="w-5 h-5" />
            Quick Create
          </button>
        </div>
      </div>

      {/* ── Four stat cards with embedded mini-visuals ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 — Delayed Projects */}
        <div className="rounded-3xl border border-border bg-card shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Delayed Projects</span>
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
          </div>
          <p className="text-4xl font-bold text-foreground mt-3">{stats.delayedCount}</p>
          <div
            className="mt-4 rounded-2xl p-4 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(220,38,38,0.15)' }}
            >
              <Clock className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">{stats.overdueTaskCount}</p>
              <p className="text-xs text-muted-foreground mt-1">overdue tasks need attention</p>
            </div>
          </div>
        </div>

        {/* Card 2 — Active This Month (bar chart) */}
        <div className="rounded-3xl border border-border bg-card shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active This Month</span>
            <FolderKanban className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-4xl font-bold text-foreground mt-3">{stats.thisMonth}</p>
          {stats.projDelta !== null && (
            <p
              className="text-xs font-medium mt-1 flex items-center gap-1"
              style={{ color: stats.projDelta >= 0 ? '#16A34A' : DANGER }}
            >
              {stats.projDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(stats.projDelta)}% from last month
            </p>
          )}
          <div className="h-14 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.projectsPerMonth} barCategoryGap="28%">
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {stats.projectsPerMonth.map((_, i) => (
                    <Cell key={i} fill={i === 6 ? BLUEPRINT : '#C9D3DF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3 — Avg. Days to Completion (line chart) */}
        <div className="rounded-3xl border border-border bg-card shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Avg. Days to Completion</span>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-4xl font-bold text-foreground mt-3">
            {stats.avgDays}
            <span className="text-lg font-semibold text-muted-foreground ml-1">days</span>
          </p>
          <div className="h-14 mt-auto pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.completedLine}>
                <Line type="monotone" dataKey="value" stroke={BLUEPRINT} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Tasks delivered over time</p>
        </div>

        {/* Card 4 — Work Utilized (stacked visual) */}
        <div className="rounded-3xl border border-border bg-card shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Work Utilized</span>
            <ListChecks className="w-5 h-5" style={{ color: BLUEPRINT }} />
          </div>
          <p className="text-4xl font-bold text-foreground mt-3">{stats.util.utilPct}%</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.util.done} of {stats.util.totalT} tasks complete</p>
          <div className="mt-auto pt-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {stats.util.totalT > 0 && (
                <>
                  <div style={{ width: `${(stats.util.done / stats.util.totalT) * 100}%`, backgroundColor: BLUEPRINT }} />
                  <div style={{ width: `${(stats.util.inprog / stats.util.totalT) * 100}%`, backgroundColor: HAZARD }} />
                  <div style={{ width: `${(stats.util.todo / stats.util.totalT) * 100}%`, backgroundColor: NEUTRAL }} />
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BLUEPRINT }} />Done {stats.util.done}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD }} />Active {stats.util.inprog}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NEUTRAL }} />To do {stats.util.todo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter chip row ─────────────────────────────────────────────────── */}
      <div id="task-filters" className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          Active filters
          <span
            className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-white text-xs font-semibold"
            style={{ backgroundColor: BLUEPRINT }}
          >
            {activeFilterCount}
          </span>
        </span>
        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v)}>
          <SelectTrigger className={cn(chipTrigger, 'w-[190px]')}>
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className={cn(chipTrigger, 'w-[160px]')}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Todo">To Do</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v)}>
          <SelectTrigger className={cn(chipTrigger, 'w-[170px]')}>
            <SelectValue placeholder="Any date" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="week">Due this week</SelectItem>
            <SelectItem value="month">Due this month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Signature dark panel ────────────────────────────────────────────── */}
      <div className="rounded-[2rem] p-4 md:p-5" style={{ backgroundColor: PANEL_BG }}>
        {/* Panel header + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
          <h2 className="text-lg font-semibold text-white">Task Queue</h2>
          <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            {([
              { key: 'all', label: 'All', count: tabCounts.all },
              { key: 'inprogress', label: 'In Progress', count: tabCounts.inprogress },
              { key: 'overdue', label: 'Overdue', count: tabCounts.overdue },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2.5 min-h-11 rounded-full text-sm font-medium transition-colors',
                  tab === t.key ? 'text-white' : 'text-gray-400 hover:text-white'
                )}
                style={tab === t.key ? { backgroundColor: BLUEPRINT } : undefined}
              >
                {t.label}
                <span
                  className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor: tab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4">
          {/* LEFT — task list */}
          <div className="rounded-3xl p-2 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading tasks…</div>
              ) : visibleTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No tasks match these filters.</div>
              ) : (
                visibleTasks.map((t) => {
                  const selected = selectedTask?.id === t.id;
                  const tag = statusTag(t.status, isOverdue(t));
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors',
                        selected ? '' : 'hover:bg-white/5'
                      )}
                      style={selected ? { backgroundColor: BLUEPRINT } : undefined}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: selected ? 'rgba(255,255,255,0.2)' : '#2E2E36' }}
                      >
                        {initials(t.assignedUserName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                        <p className={cn('text-xs truncate', selected ? 'text-white/70' : 'text-gray-400')}>
                          {dueLabel(t)}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                      >
                        {tag.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — detail pane */}
          <div className="rounded-3xl p-5 md:p-6" style={{ backgroundColor: CARD_BG }}>
            {!selectedTask ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm py-20">
                Select a task to see its details.
              </div>
            ) : (
              <SelectedTaskDetail
                task={selectedTask}
                project={projects.find((p) => p.id === selectedTask.projectId)}
                tasks={tasks}
                today={today}
                onOpen={() => navigate(`/dashboard/tasks?taskId=${selectedTask.id}`)}
                dueLabel={dueLabel(selectedTask)}
                overdue={isOverdue(selectedTask)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Detail pane ────────────────────────────────────────────────────────────
const SubCard: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div className={cn('rounded-2xl p-4', className)} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-2">{label}</p>
    {children}
  </div>
);

const SelectedTaskDetail: React.FC<{
  task: Task;
  project?: Project;
  tasks: Task[];
  today: Date;
  onOpen: () => void;
  dueLabel: string;
  overdue: boolean;
}> = ({ task, project, tasks, today, onOpen, dueLabel, overdue }) => {
  const tag = statusTag(task.status, overdue);
  const checklist = task.checklist || [];
  const doneItems = checklist.filter((c) => c.completed).length;
  const health = project ? computeSiteHealth(project, tasks, today) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Task</span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
            >
              {tag.label}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white leading-tight">{task.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Priority</p>
          <p className="text-sm font-semibold text-white mt-1">{task.priority}</p>
        </div>
      </div>

      {/* Project + assignee row */}
      <div className="grid grid-cols-2 gap-3">
        <SubCard label="Linked project">
          <div className="flex items-center gap-2 min-w-0">
            <FolderKanban className="w-4 h-4 shrink-0" style={{ color: '#8FA6C4' }} />
            <span className="text-sm font-semibold text-white truncate">{task.projectName || 'Unassigned'}</span>
          </div>
          {health && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[health] }} />
              <span className="text-xs text-gray-400">{HEALTH_LABELS[health]}</span>
            </div>
          )}
        </SubCard>
        <SubCard label="Assigned crew">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: BLUEPRINT }}>
              {initials(task.assignedUserName)}
            </div>
            <span className="text-sm font-semibold text-white truncate">{task.assignedUserName || 'Unassigned'}</span>
          </div>
        </SubCard>
      </div>

      {/* Description + checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SubCard label="Description">
          <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
            {task.description || 'No description provided.'}
          </p>
        </SubCard>
        <SubCard label={`Checklist · ${doneItems}/${checklist.length}`}>
          {checklist.length === 0 ? (
            <p className="text-sm text-gray-500">No checklist items.</p>
          ) : (
            <ul className="space-y-1.5">
              {checklist.slice(0, 4).map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <CheckCircle2
                    className="w-4 h-4 shrink-0"
                    style={{ color: c.completed ? '#16A34A' : 'rgba(255,255,255,0.25)' }}
                  />
                  <span className={cn('text-sm truncate', c.completed ? 'text-gray-500 line-through' : 'text-gray-200')}>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SubCard>
      </div>

      {/* Footer summary */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4"
        style={{ borderTop: `1px solid ${CARD_LINE}` }}
      >
        <div className="flex items-center gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Due</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: overdue ? DANGER : '#fff' }}>
              {dueLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Checklist</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {checklist.length ? `${doneItems}/${checklist.length} done` : '—'}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Crew</p>
            <p className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5">
              <HardHat className="w-4 h-4" style={{ color: HAZARD }} />
              {task.assignedUserName?.split(' ')[0] || '—'}
            </p>
          </div>
        </div>
        <button
          onClick={onOpen}
          className="h-11 px-5 rounded-full bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          Open in Tasks
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
