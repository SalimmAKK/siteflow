import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import {
  Plus,
  MoreVertical,
  Calendar,
  Users as UsersIcon,
  Search,
  FolderKanban,
  Pencil,
  Trash2,
  Clock,
  CheckSquare,
  Link2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Project, ProjectStatus, Task, User } from '@/types';
import { computeSiteHealth, HEALTH_LABELS, HEALTH_COLORS, type SiteHealth } from '@/lib/siteHealth';
import { generateShareToken, publishShareSnapshot, shareUrl } from '@/lib/clientPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<ProjectStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'On Hold': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Archived: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export const Projects: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [dueDate, setDueDate] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    const projectsRef = collection(db, 'projects');
    const q = user.role === 'manager'
      ? query(projectsRef, where('managerId', '==', user.uid))
      : query(projectsRef, where('teamMemberIds', 'array-contains', user.uid));

    unsubs.push(onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
      // Sort client-side (avoids needing composite Firestore indexes)
      data.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setProjects(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
      setLoading(false);
    }));

    // Fetch all users to display in member selection
    const usersRef = collection(db, 'users');
    unsubs.push(onSnapshot(usersRef, (snap) => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
    }));

    // Fetch all tasks relevant to user to count them per project
    const tasksRef = collection(db, 'tasks');
    const tq = user.role === 'manager' 
      ? query(tasksRef) 
      : query(tasksRef, where('assignedUserId', '==', user.uid));
    
    unsubs.push(onSnapshot(tq, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
    }));

    return () => unsubs.forEach(u => u());
  }, [user]);

  // Handle deep link from sidebar "New Project" button
  useEffect(() => {
    if (searchParams.get('action') === 'create' && user?.role === 'manager') {
      resetForm();
      setIsCreateOpen(true);
      setSearchParams({});
    }
  }, [searchParams, user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('Active');
    setDueDate('');
    setLat('');
    setLng('');
    setTeamMemberIds(user ? [user.uid] : []);
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setTitle(project.title);
    setDescription(project.description);
    setStatus(project.status);
    setDueDate(project.dueDate?.toDate ? format(project.dueDate.toDate(), 'yyyy-MM-dd') : '');
    setLat(typeof project.lat === 'number' ? String(project.lat) : '');
    setLng(typeof project.lng === 'number' ? String(project.lng) : '');
    setTeamMemberIds(project.teamMemberIds || (user ? [user.uid] : []));
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const shareToken = generateShareToken();
      const parsedLat = lat.trim() === '' ? null : Number(lat);
      const parsedLng = lng.trim() === '' ? null : Number(lng);
      const docRef = await addDoc(collection(db, 'projects'), {
        title,
        description,
        status,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        managerId: user.uid,
        managerName: user.displayName,
        teamMemberIds: teamMemberIds,
        createdAt: Timestamp.now(),
        shareToken,
        lat: Number.isFinite(parsedLat) ? parsedLat : null,
        lng: Number.isFinite(parsedLng) ? parsedLng : null,
      });

      // Publish the initial public-safe projection so the client link resolves
      // immediately. Best-effort — never block project creation on it.
      try {
        await publishShareSnapshot(
          { id: docRef.id, title, status, shareToken } as Project,
          tasks
        );
      } catch (err) {
        console.error('Failed to publish client portal snapshot:', err);
      }

      await logActivity('created', 'project', title, user.uid, user.displayName || undefined);

      toast.success('Project created successfully!');
      setIsCreateOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error('Failed to create project: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      const parsedLat = lat.trim() === '' ? null : Number(lat);
      const parsedLng = lng.trim() === '' ? null : Number(lng);
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        title,
        description,
        status,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        teamMemberIds: teamMemberIds,
        lat: Number.isFinite(parsedLat) ? parsedLat : null,
        lng: Number.isFinite(parsedLng) ? parsedLng : null,
      });
      await logActivity('updated', 'project', title, user!.uid, user!.displayName || undefined);
      toast.success('Project updated successfully!');
      setIsEditOpen(false);
      resetForm();
      setSelectedProject(null);
    } catch (error: any) {
      toast.error('Failed to update project: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      // Delete the project itself
      batch.delete(doc(db, 'projects', selectedProject.id));

      // Cascade: delete all tasks belonging to this project
      const tasksSnap = await getDocs(
        query(collection(db, 'tasks'), where('projectId', '==', selectedProject.id))
      );
      tasksSnap.docs.forEach(d => batch.delete(d.ref));

      await batch.commit();
      await logActivity('deleted', 'project', selectedProject.title, user!.uid, user!.displayName || undefined);

      toast.success(`Project and ${tasksSnap.size} task${tasksSnap.size !== 1 ? 's' : ''} deleted.`);
      setIsDeleteOpen(false);
      setSelectedProject(null);
    } catch (error: any) {
      toast.error('Failed to delete project: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyClientLink = async (project: Project) => {
    setIsCopyingLink(true);
    try {
      // Refresh the public-safe projection with current progress, then copy the link.
      const token = await publishShareSnapshot(project, tasks);
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success('Client link copied to clipboard');
    } catch (error: any) {
      toast.error('Failed to copy client link: ' + (error?.message || 'unknown error'));
    } finally {
      setIsCopyingLink(false);
    }
  };

  // Compute schedule health once per project (recomputes when projects/tasks change)
  const healthByProject = useMemo(() => {
    const map = new Map<string, SiteHealth>();
    projects.forEach(p => map.set(p.id, computeSiteHealth(p, tasks)));
    return map;
  }, [projects, tasks]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesHealth = healthFilter === 'all' || healthByProject.get(p.id) === healthFilter;
    return matchesSearch && matchesStatus && matchesHealth;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'manager' ? 'Create and manage your projects.' : 'View your assigned projects.'}
          </p>
        </div>
        {user?.role === 'manager' && (
          <Button className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-6" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-12 h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
            <SelectValue placeholder="All Health" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="on-track">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS['on-track'] }} />
                On track
              </span>
            </SelectItem>
            <SelectItem value="at-risk">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS['at-risk'] }} />
                At risk
              </span>
            </SelectItem>
            <SelectItem value="delayed">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS['delayed'] }} />
                Delayed
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">
            {searchQuery || statusFilter !== 'all' || healthFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-muted-foreground max-w-xs mt-2">
            {searchQuery || statusFilter !== 'all' || healthFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first project to start managing tasks and team members.'}
          </p>
          {user?.role === 'manager' && !searchQuery && statusFilter === 'all' && healthFilter === 'all' && (
            <Button variant="outline" className="mt-6 rounded-full" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              Get Started
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const health = healthByProject.get(project.id) ?? 'on-track';
            return (
            <Card
              key={project.id}
              className="group hover:shadow-lg transition-all duration-300 border-border/50 border-l-4 bg-card overflow-hidden flex flex-col cursor-pointer"
              style={{ borderLeftColor: HEALTH_COLORS[health] }}
              onClick={() => { setSelectedProject(project); setIsDetailOpen(true); }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('border text-xs font-medium', statusColors[project.status])}>
                      {project.status}
                    </Badge>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                      title={`Schedule health: ${HEALTH_LABELS[health]}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[health] }} />
                      {HEALTH_LABELS[health]}
                    </span>
                  </div>
                  {user?.role === 'manager' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setIsDetailOpen(false); openEditDialog(project); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => { setIsDetailOpen(false); setSelectedProject(project); setIsDeleteOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1 mt-2">
                  {project.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {project.description}
                </p>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {project.teamMemberIds.slice(0, 3).map((id, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold"
                      >
                        {id.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {project.teamMemberIds.length > 3 && (
                      <div className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                        +{project.teamMemberIds.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                    <CheckSquare className="w-3 h-3" />
                    {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border/30 bg-secondary/5">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {project.createdAt?.toDate
                      ? format(project.createdAt.toDate(), 'MMM d, yyyy')
                      : 'Recently'}
                  </div>
                  {project.dueDate?.toDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Due {format(project.dueDate.toDate(), 'MMM d')}
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          )})}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a new project for your team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g. Al Nakheel Villa Complex"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="Briefly describe the project goal..."
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={(v: string) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Site Location <span className="text-muted-foreground font-normal">(optional — enables weather forecast)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" step="any" placeholder="Latitude (e.g. 24.7136)" value={lat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLat(e.target.value)} />
                  <Input type="number" step="any" placeholder="Longitude (e.g. 46.6753)" value={lng} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLng(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Members</label>
                <div className="flex flex-wrap gap-2">
                  {allUsers.map(u => {
                    const isSelected = teamMemberIds.includes(u.uid);
                    return (
                      <Badge 
                        key={u.uid} 
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => {
                           if (u.uid === user?.uid) return;
                           if (isSelected) setTeamMemberIds(prev => prev.filter(id => id !== u.uid));
                           else setTeamMemberIds(prev => [...prev, u.uid]);
                        }}
                      >
                        {u.displayName} {u.uid === user?.uid && '(You)'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={(v: string) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Site Location <span className="text-muted-foreground font-normal">(optional — enables weather forecast)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" step="any" placeholder="Latitude (e.g. 24.7136)" value={lat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLat(e.target.value)} />
                  <Input type="number" step="any" placeholder="Longitude (e.g. 46.6753)" value={lng} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLng(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Members</label>
                <div className="flex flex-wrap gap-2">
                  {allUsers.map(u => {
                    const isSelected = teamMemberIds.includes(u.uid);
                    return (
                      <Badge 
                        key={u.uid} 
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => {
                           if (u.uid === user?.uid) return;
                           if (isSelected) setTeamMemberIds(prev => prev.filter(id => id !== u.uid));
                           else setTeamMemberIds(prev => [...prev, u.uid]);
                        }}
                      >
                        {u.displayName} {u.uid === user?.uid && '(You)'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProject?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedProject && (() => {
            const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
            const activeCount = projectTasks.filter(t => t.status !== 'Completed').length;
            const completedCount = projectTasks.filter(t => t.status === 'Completed').length;
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={cn('border text-xs font-medium', statusColors[selectedProject.status])}>
                      {selectedProject.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Created {selectedProject.createdAt?.toDate ? format(selectedProject.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                    </div>
                  </div>
                  <DialogTitle className="text-2xl">{selectedProject.title}</DialogTitle>
                  <DialogDescription className="text-base whitespace-pre-wrap mt-2">
                    {selectedProject.description}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50 my-2">
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold">{activeCount}</p>
                    <p className="text-sm text-muted-foreground mt-1">Active Tasks</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold">{completedCount}</p>
                    <p className="text-sm text-muted-foreground mt-1">Completed</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" /> 
                      Team Members ({selectedProject.teamMemberIds.length})
                    </h4>
                  </div>
                  
                  {selectedProject.dueDate?.toDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Due Date: <span className="font-medium text-foreground">{format(selectedProject.dueDate.toDate(), 'MMMM d, yyyy')}</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6 sm:justify-between gap-2">
                  {user?.role === 'manager' ? (
                    <>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleCopyClientLink(selectedProject)}
                        disabled={isCopyingLink}
                      >
                        <Link2 className="w-4 h-4" />
                        {isCopyingLink ? 'Copying...' : 'Copy client link'}
                      </Button>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setIsDetailOpen(false); openEditDialog(selectedProject); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => { setIsDetailOpen(false); setIsDeleteOpen(true); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </div>
                    </>
                  ) : null}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
