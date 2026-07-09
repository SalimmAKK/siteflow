import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logActivity } from '@/lib/activity';
import {
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Calendar,
  User as UserIcon,
  FolderKanban,
  Flag,
  Pencil,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Task, Project, TaskStatus, TaskPriority, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, isPast, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { AnimatedList } from '@/components/ui/animated-list';
import { useForecasts } from '@/hooks/useForecasts';
import { riskForDate, type DayRisk } from '@/lib/weather';
import { CloudRain } from 'lucide-react';

// Weather risk for weather-sensitive tasks, keyed by task id. Provided by the
// Tasks page so nested cards can read it without prop-threading.
const WeatherRiskContext = React.createContext<Record<string, DayRisk>>({});

const WeatherWarnBadge: React.FC<{ risk: DayRisk; compact?: boolean }> = ({ risk, compact }) => {
  const isRisky = risk.level === 'risky';
  const color = isRisky ? '#DC2626' : '#F2B705';
  const tip = `${risk.reasons.join(' · ')}${risk.affectedWork.length ? ` — affects ${risk.affectedWork.join(', ')}` : ''}`;
  return (
    <span
      title={tip}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, borderColor: color, backgroundColor: `${color}14` }}
    >
      <CloudRain className="w-3 h-3" />
      {compact ? 'Weather' : isRisky ? 'Weather risk' : 'Weather caution'}
    </span>
  );
};

const priorityColors: Record<TaskPriority, string> = {
  High: 'bg-destructive/10 text-destructive border-destructive/20',
  Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  Todo: <Clock className="w-4 h-4 text-muted-foreground" />,
  'In Progress': <AlertCircle className="w-4 h-4 text-amber-500" />,
  Completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

// ─── Kanban Components ──────────────────────────────────────────────────────

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  priorityColors: Record<TaskPriority, string>;
}

const KanbanTask: React.FC<KanbanTaskProps> = ({ task, onClick, priorityColors }) => {
  const weatherRisk = React.useContext(WeatherRiskContext)[task.id];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-card border-2 border-dashed border-border rounded-2xl h-[120px] mb-3"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={cn(
        "bg-card border border-border p-4 rounded-2xl shadow-sm mb-3 cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <Badge className={cn('px-2 py-0.5 font-medium border text-[10px] uppercase tracking-wider', priorityColors[task.priority])}>
          {task.priority}
        </Badge>
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-3 h-3 text-gray-400" />
        </div>
      </div>
      <h4 className="text-sm font-bold text-foreground leading-tight mb-1">{task.title}</h4>
      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
        {task.description}
      </p>
      {weatherRisk && (
        <div className="mb-3">
          <WeatherWarnBadge risk={weatherRisk} compact />
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            {task.assignedUserName?.charAt(0) || 'U'}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{task.assignedUserName?.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Calendar className="w-3 h-3" />
          {task.dueDate ? format((task.dueDate as any).toDate(), 'MMM d') : 'No date'}
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  priorityColors: Record<TaskPriority, string>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, tasks, onTaskClick, priorityColors }) => {
  const { setNodeRef } = useSortable({
    id,
    data: {
      type: 'Column',
    },
  });

  return (
    <div className="flex flex-col min-w-[320px] w-full max-w-[380px] bg-card/60 backdrop-blur-sm rounded-[2rem] border border-border overflow-hidden h-[calc(100vh-320px)] min-h-[500px]">
      <div className="p-5 pb-2 flex items-center justify-between sticky top-0 bg-transparent z-10">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            id === 'Todo' ? 'bg-slate-400' : id === 'In Progress' ? 'bg-amber-400' : 'bg-emerald-400'
          )} />
          <h3 className="font-bold text-foreground tracking-tight">{title}</h3>
          <Badge variant="secondary" className="bg-black/5 text-gray-500 border-none rounded-full px-2 py-0 h-5">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <AnimatedList
          items={tasks}
          containerRef={setNodeRef as any}
          className="flex-1 p-4 pt-2"
          displayScrollbar={false}
          enableArrowNavigation={false} // Disable to avoid conflict with dnd-kit keyboard nav
          renderItem={(task) => (
            <KanbanTask 
              key={task.id} 
              task={task} 
              onClick={onTaskClick}
              priorityColors={priorityColors}
            />
          )}
        />
        {tasks.length === 0 && (
          <div 
            ref={setNodeRef}
            className="flex-1 h-full flex flex-col items-center justify-center text-center opacity-40 py-10"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Drop tasks here</p>
          </div>
        )}
      </SortableContext>
    </div>
  );
};

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  dialogTitle: string;
  dialogDesc: string;
  submitLabel: string;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  projectId: string;
  setProjectId: (v: string) => void;
  projects: Project[];
  assignedUserId: string;
  setAssignedUserId: (v: string) => void;
  projectMembers: User[];
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  status: TaskStatus;
  setStatus: (v: TaskStatus) => void;
  isWeatherSensitive: boolean;
  setIsWeatherSensitive: (v: boolean) => void;
  isEditOpen: boolean;
  isSubmitting: boolean;
}

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  isOpen, onClose, onSubmit, dialogTitle, dialogDesc, submitLabel,
  title, setTitle, description, setDescription, projectId, setProjectId,
  projects, assignedUserId, setAssignedUserId, projectMembers,
  priority, setPriority, dueDate, setDueDate, status, setStatus,
  isWeatherSensitive, setIsWeatherSensitive,
  isEditOpen, isSubmitting
}) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange => !onOpenChange && onClose()}>
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{dialogDesc}</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Task name"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {projectId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To</label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger><SelectValue placeholder="Assign a team member" /></SelectTrigger>
                <SelectContent>
                  {projectMembers.map(m => (
                    <SelectItem key={m.uid} value={m.uid}>{m.displayName} ({m.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={(v: string) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          {isEditOpen && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v: string) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Describe the task..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-3 rounded-md border border-input p-3 cursor-pointer">
            <Checkbox
              checked={isWeatherSensitive}
              onCheckedChange={(v) => setIsWeatherSensitive(v === true)}
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium leading-none">Weather-sensitive work</span>
              <span className="block text-[11px] text-muted-foreground">
                Concrete pour, roofing, or exterior finishing — we'll warn if it's scheduled on a risky-weather day.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Detail panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [dueDate, setDueDate] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [isWeatherSensitive, setIsWeatherSensitive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    if (!user) return;

    // Fetch projects
    const fetchProjects = async () => {
      const projectsRef = collection(db, 'projects');
      const q = user.role === 'manager'
        ? query(projectsRef, where('managerId', '==', user.uid))
        : query(projectsRef, where('teamMemberIds', 'array-contains', user.uid));
      const snapshot = await getDocs(q);
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]);
    };
    fetchProjects();

    // Fetch users (for assignment)
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
    };
    fetchUsers();

    // Realtime tasks
    const tasksRef = collection(db, 'tasks');
    const q = user.role === 'manager'
      ? query(tasksRef)
      : query(tasksRef, where('assignedUserId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      // Sort client-side (avoids needing composite Firestore indexes)
      taskList.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
        const bTime = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setTasks(taskList);
      setLoading(false);

      // Handle deep link
      if (taskIdParam && !selectedTask) {
        const task = taskList.find(t => t.id === taskIdParam);
        if (task) {
          setSelectedTask(task);
          setIsDetailOpen(true);
        }
      }
    }, (error) => {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, taskIdParam]);

  // Ensure assigned user belongs to the selected project
  useEffect(() => {
    if (projectId && assignedUserId) {
      const selectedProject = projects.find(p => p.id === projectId);
      const isMember = selectedProject?.teamMemberIds?.includes(assignedUserId);
      if (!isMember) {
        setAssignedUserId('');
      }
    }
  }, [projectId, projects]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('Medium');
    setStatus('Todo');
    setDueDate('');
    setAssignedUserId(user?.uid || '');
    setIsWeatherSensitive(false);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setProjectId(task.projectId);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate?.toDate ? format(task.dueDate.toDate(), 'yyyy-MM-dd') : '');
    setAssignedUserId(task.assignedUserId);
    setIsWeatherSensitive(!!task.isWeatherSensitive);
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    const project = projects.find(p => p.id === projectId);
    const assignee = allUsers.find(u => u.uid === assignedUserId);
    const selectedDate = dueDate ? startOfDay(new Date(dueDate)) : null;
    const today = startOfDay(new Date());

    if (selectedDate && selectedDate < today) {
      toast.error('Due date cannot be in the past');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        title,
        description,
        projectId,
        projectName: project?.title || '',
        status: 'Todo' as TaskStatus,
        priority,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        assignedUserId,
        assignedUserName: assignee?.displayName || 'Unknown',
        createdAt: Timestamp.now(),
        isWeatherSensitive,
      });

      await logActivity('created', 'task', title, user.uid, user.displayName || undefined);

      // Create notification for assignee
      if (assignedUserId && assignedUserId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: assignedUserId,
          title: 'New Task Assigned',
          message: `${user.displayName || 'A manager'} assigned you a new task: "${title}".`,
          read: false,
          link: '/dashboard/tasks',
          createdAt: Timestamp.now(),
        });
      }

      toast.success('Task created!');
      setIsCreateOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error('Failed to create task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);
    const project = projects.find(p => p.id === projectId);
    const assignee = allUsers.find(u => u.uid === assignedUserId);
    const selectedDate = dueDate ? startOfDay(new Date(dueDate)) : null;
    const today = startOfDay(new Date());

    if (selectedDate && selectedDate < today) {
      toast.error('Due date cannot be in the past');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        title,
        description,
        projectId,
        projectName: project?.title || selectedTask.projectName,
        priority,
        status,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        assignedUserId,
        assignedUserName: assignee?.displayName || selectedTask.assignedUserName,
        isWeatherSensitive,
      });

      if (status === 'Completed' && selectedTask.status !== 'Completed') {
        await logActivity('completed', 'task', title, user!.uid, user!.displayName || undefined);
      } else {
        await logActivity('updated', 'task', title, user!.uid, user!.displayName || undefined);
      }

      // Notify if reassigned
      if (assignedUserId && assignedUserId !== selectedTask.assignedUserId && assignedUserId !== user!.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: assignedUserId,
          title: 'Task Reassigned',
          message: `${user!.displayName || 'A manager'} assigned the task "${title}" to you.`,
          read: false,
          link: '/dashboard/tasks',
          createdAt: Timestamp.now(),
        });
      }

      toast.success('Task updated!');
      setIsEditOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error('Failed to update task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'tasks', selectedTask.id));
      await logActivity('deleted', 'task', selectedTask.title, user!.uid, user!.displayName || undefined);
      toast.success('Task deleted!');
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedTask(null);
    } catch (error: any) {
      toast.error('Failed to delete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
      });

      if (newStatus === 'Completed' && task.status !== 'Completed') {
        await logActivity('completed', 'task', task.title, user!.uid, user!.displayName || undefined);
      } else {
        await logActivity('updated', 'task', task.title, user!.uid, user!.displayName || undefined);
      }
      
      toast.success(`Moved to ${newStatus}`);
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  // ─── DnD Handlers ─────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id;
    const overId = over.id;

    // Check if we dropped on a column or another task
    let newStatus: TaskStatus | null = null;
    
    if (overId === 'Todo' || overId === 'In Progress' || overId === 'Completed') {
      newStatus = overId as TaskStatus;
    } else {
      // Find the status of the task we dropped over
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        await updateTaskStatus(taskId, newStatus);
      }
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const filteredTasks = tasks.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      const aTime = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
      const bTime = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    }
    if (sortBy === 'oldest') {
      const aTime = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
      const bTime = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
      return aTime - bTime;
    }
    if (sortBy === 'due-soon') {
      const aTime = a.dueDate?.toDate?.()?.getTime() || Number.MAX_VALUE;
      const bTime = b.dueDate?.toDate?.()?.getTime() || Number.MAX_VALUE;
      return aTime - bTime;
    }
    if (sortBy === 'priority') {
      const pMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      return pMap[b.priority] - pMap[a.priority];
    }
    return 0;
  });

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setSearchParams({ taskId: task.id });
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedTask(null);
    setSearchParams({});
  };

  const selectedProject = projects.find(p => p.id === projectId);
  const projectMembers = allUsers.filter(u => selectedProject?.teamMemberIds?.includes(u.uid));

  // ─── Weather cross-reference ──────────────────────────────────────────────
  // Fetch forecasts for located projects, then flag weather-sensitive tasks
  // whose due date lands on a risky-weather day.
  const { forecasts } = useForecasts(projects);
  const weatherRiskByTask = useMemo(() => {
    const map: Record<string, DayRisk> = {};
    tasks.forEach(t => {
      if (!t.isWeatherSensitive || !t.dueDate?.toDate) return;
      const dateStr = format(t.dueDate.toDate(), 'yyyy-MM-dd');
      const risk = riskForDate(forecasts[t.projectId], dateStr);
      if (risk) map[t.id] = risk;
    });
    return map;
  }, [tasks, forecasts]);
  const selectedTaskRisk = selectedTask ? weatherRiskByTask[selectedTask.id] : undefined;

  // ─── Checklist Logic ──────────────────────────────────────────────────────
  const addChecklistItem = async () => {
    if (!selectedTask || !newChecklistItem.trim()) return;
    const item = {
      id: crypto.randomUUID(),
      text: newChecklistItem.trim(),
      completed: false
    };
    const updatedChecklist = [...(selectedTask.checklist || []), item];
    try {
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        checklist: updatedChecklist
      });
      setNewChecklistItem('');
    } catch (err) {
      toast.error('Failed to add item');
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!selectedTask) return;
    const updatedChecklist = selectedTask.checklist?.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    try {
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        checklist: updatedChecklist
      });
    } catch (err) {
      toast.error('Failed to update item');
    }
  };
  const removeChecklistItem = async (itemId: string) => {
    if (!selectedTask) return;
    const updatedChecklist = selectedTask.checklist?.filter(item => item.id !== itemId);
    try {
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        checklist: updatedChecklist
      });
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  return (
    <WeatherRiskContext.Provider value={weatherRiskByTask}>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage and track your tasks.</p>
        </div>
        <Button className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-6" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input 
            placeholder="Search tasks..." 
            className="w-full h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Todo">Todo</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="due-soon">Due Soonest</SelectItem>
            <SelectItem value="priority">Highest Priority</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex p-1 bg-card/60 backdrop-blur-md rounded-full border border-border shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200",
              viewMode === 'list' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200",
              viewMode === 'board' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Board
          </button>
        </div>
      </div>

      {/* Kanban Board or Task Table */}
      {viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
            <KanbanColumn 
              id="Todo" 
              title="To Do" 
              tasks={filteredTasks.filter(t => t.status === 'Todo')}
              onTaskClick={openDetail}
              priorityColors={priorityColors}
            />
            <KanbanColumn 
              id="In Progress" 
              title="In Progress" 
              tasks={filteredTasks.filter(t => t.status === 'In Progress')}
              onTaskClick={openDetail}
              priorityColors={priorityColors}
            />
            <KanbanColumn 
              id="Completed" 
              title="Completed" 
              tasks={filteredTasks.filter(t => t.status === 'Completed')}
              onTaskClick={openDetail}
              priorityColors={priorityColors}
            />
          </div>
          
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeTask ? (
              <div className="bg-card border border-border p-4 rounded-2xl shadow-xl scale-105 opacity-90 cursor-grabbing w-[320px]">
                <Badge className={cn('px-2 py-0.5 font-medium border text-[10px] uppercase tracking-wider mb-2', priorityColors[activeTask.priority])}>
                  {activeTask.priority}
                </Badge>
                <h4 className="text-sm font-bold text-foreground mb-1">{activeTask.title}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3">{activeTask.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-black/[0.03]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {activeTask.assignedUserName?.charAt(0) || 'U'}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{activeTask.assignedUserName?.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="border border-border rounded-[2rem] bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Task</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-5">
                        <div className="h-4 bg-secondary animate-pulse rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No tasks found</p>
                      <p className="text-xs mt-1">Create a task or adjust your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                      onClick={() => openDetail(task)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{task.title}</span>
                          {weatherRiskByTask[task.id] && <WeatherWarnBadge risk={weatherRiskByTask[task.id]} compact />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-normal text-xs">
                          {task.projectName || 'Unassigned'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.status}
                          onValueChange={(v: string) => updateTaskStatus(task.id, v as TaskStatus)}
                        >
                          <SelectTrigger className="w-[135px] h-8 border-none bg-transparent hover:bg-secondary transition-colors">
                            <div className="flex items-center gap-2">
                              {statusIcons[task.status]}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Todo">Todo</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn('px-2 py-0.5 font-medium border text-xs', priorityColors[task.priority])}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {task.dueDate?.toDate ? (
                          <span className={cn(
                            isPast(startOfDay(task.dueDate.toDate())) && task.status !== 'Completed'
                              ? 'text-destructive font-medium flex items-center gap-1'
                              : 'text-muted-foreground'
                          )}>
                            {isPast(startOfDay(task.dueDate.toDate())) && task.status !== 'Completed' && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {format(task.dueDate.toDate(), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(task)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setSelectedTask(task); setIsDeleteOpen(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <TaskFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        dialogTitle="Create New Task"
        dialogDesc="Add a new task to your workflow."
        submitLabel="Create Task"
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects}
        assignedUserId={assignedUserId}
        setAssignedUserId={setAssignedUserId}
        projectMembers={projectMembers}
        priority={priority}
        setPriority={setPriority}
        dueDate={dueDate}
        setDueDate={setDueDate}
        status={status}
        setStatus={setStatus}
        isWeatherSensitive={isWeatherSensitive}
        setIsWeatherSensitive={setIsWeatherSensitive}
        isEditOpen={false}
        isSubmitting={isSubmitting}
      />

      {/* Edit Task Dialog */}
      <TaskFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        dialogTitle="Edit Task"
        dialogDesc="Update task details."
        submitLabel="Save Changes"
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects}
        assignedUserId={assignedUserId}
        setAssignedUserId={setAssignedUserId}
        projectMembers={projectMembers}
        priority={priority}
        setPriority={setPriority}
        dueDate={dueDate}
        setDueDate={setDueDate}
        status={status}
        setStatus={setStatus}
        isWeatherSensitive={isWeatherSensitive}
        setIsWeatherSensitive={setIsWeatherSensitive}
        isEditOpen={true}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTask?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Panel */}
      <Dialog open={isDetailOpen} onOpenChange={closeDetail}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={cn('border text-xs', priorityColors[selectedTask.priority])}>
                        {selectedTask.priority}
                      </Badge>
                      <Badge className={cn('border text-xs',
                        selectedTask.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        selectedTask.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      )}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {selectedTaskRisk && (
                  <div
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{
                      borderColor: selectedTaskRisk.level === 'risky' ? '#DC2626' : '#F2B705',
                      backgroundColor: `${selectedTaskRisk.level === 'risky' ? '#DC2626' : '#F2B705'}12`,
                    }}
                  >
                    <CloudRain
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: selectedTaskRisk.level === 'risky' ? '#DC2626' : '#F2B705' }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Weather {selectedTaskRisk.level === 'risky' ? 'risk' : 'caution'} on the scheduled day
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedTaskRisk.reasons.join(' · ')}
                        {selectedTaskRisk.affectedWork.length > 0 && ` — risky for ${selectedTaskRisk.affectedWork.join(', ')}.`}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTask.description && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-sm leading-relaxed">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FolderKanban className="w-3 h-3" /> Project
                    </div>
                    <p className="text-sm font-medium">{selectedTask.projectName || 'Unassigned'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserIcon className="w-3 h-3" /> Assigned to
                    </div>
                    <p className="text-sm font-medium">{selectedTask.assignedUserName || 'Unassigned'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Due Date
                    </div>
                    <p className="text-sm font-medium">
                      {selectedTask.dueDate?.toDate ? format(selectedTask.dueDate.toDate(), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Flag className="w-3 h-3" /> Priority
                    </div>
                    <p className="text-sm font-medium">{selectedTask.priority}</p>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-tasks</h4>
                  <div className="space-y-2">
                    {selectedTask.checklist?.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 group p-2 hover:bg-secondary/20 rounded-xl transition-colors">
                        <button 
                          onClick={() => toggleChecklistItem(item.id)}
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border bg-card"
                          )}
                        >
                          {item.completed && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <span className={cn(
                          "text-sm flex-1",
                          item.completed ? "text-muted-foreground line-through decoration-emerald-500/50" : "text-foreground"
                        )}>
                          {item.text}
                        </span>
                        <button 
                          onClick={() => removeChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Add sub-task..."
                        className="h-9 rounded-full bg-secondary/30 border-none"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                      />
                      <Button 
                        size="icon" 
                        className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground"
                        onClick={addChecklistItem}
                        disabled={!newChecklistItem.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setIsDetailOpen(false); openEditDialog(selectedTask); }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setIsDetailOpen(false); setIsDeleteOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </WeatherRiskContext.Provider>
  );
};
