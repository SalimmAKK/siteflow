import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  NotebookPen,
  CloudSun,
  Users as UsersIcon,
  Wrench,
  Plus,
  FolderKanban,
  CalendarDays,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { addDiaryEntry, listDiaryEntriesByProject } from '@/lib/siteDiary';
import type { Project, SiteDiaryEntry, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const WEATHER_OPTIONS = ['Clear', 'Sunny', 'Cloudy', 'Overcast', 'Rain', 'Windy', 'Dusty', 'Hot'];

export const SiteDiary: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [entries, setEntries] = useState<SiteDiaryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weatherCondition, setWeatherCondition] = useState('Clear');
  const [crewPresent, setCrewPresent] = useState('');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load the user's projects (scoped exactly like Projects.tsx / Tasks.tsx)
  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];

    const projectsRef = collection(db, 'projects');
    const q = user.role === 'manager'
      ? query(projectsRef, where('managerId', '==', user.uid))
      : query(projectsRef, where('teamMemberIds', 'array-contains', user.uid));
    unsubs.push(onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
      data.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setProjects(data);
      setSelectedProjectId(prev => prev || data[0]?.id || '');
    }));

    const usersRef = collection(db, 'users');
    unsubs.push(onSnapshot(usersRef, (snap) => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
    }));

    return () => unsubs.forEach(u => u());
  }, [user]);

  const loadEntries = async (projectId: string) => {
    if (!projectId) {
      setEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      setEntries(await listDiaryEntriesByProject(projectId));
    } catch (error: any) {
      toast.error('Failed to load diary entries: ' + error.message);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    loadEntries(selectedProjectId);
  }, [selectedProjectId]);

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => map.set(u.uid, u));
    return map;
  }, [allUsers]);

  const authorName = (authorId: string) =>
    authorId === user?.uid ? 'You' : usersById.get(authorId)?.displayName || 'Unknown';

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setWeatherCondition('Clear');
    setCrewPresent('');
    setEquipment('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;
    setIsSubmitting(true);
    try {
      await addDiaryEntry({
        projectId: selectedProjectId,
        date: new Date(date),
        authorId: user.uid,
        weatherCondition,
        crewPresent: Math.max(0, parseInt(crewPresent, 10) || 0),
        equipmentOnSite: equipment.split(',').map(s => s.trim()).filter(Boolean),
        notes: notes.trim(),
      });
      toast.success("Today's entry logged!");
      resetForm();
      await loadEntries(selectedProjectId);
    } catch (error: any) {
      toast.error('Failed to log entry: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Diary</h1>
          <p className="text-muted-foreground mt-1">
            Log daily site conditions — weather, crew, equipment, and notes.
          </p>
        </div>
        {projects.length > 0 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-[260px] h-11 rounded-full bg-card/60 border border-border hover:bg-card transition-colors shadow-sm">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No projects yet</h3>
          <p className="text-muted-foreground max-w-xs mt-2">
            You need a project before you can log site diary entries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log entry form */}
          <Card className="lg:col-span-1 border-border/50 bg-card h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-muted-foreground" />
                Log Today's Entry
              </CardTitle>
              {selectedProject && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{selectedProject.title}</p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Weather</label>
                    <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEATHER_OPTIONS.map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Crew present</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={crewPresent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewPresent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Equipment on site</label>
                  <Input
                    placeholder="e.g. Tower crane, Excavator, Concrete pump"
                    value={equipment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipment(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Separate multiple items with commas.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    placeholder="Progress, deliveries, incidents, blockers..."
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Logging...' : 'Log Entry'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past entries */}
          <div className="lg:col-span-2 space-y-4">
            {loadingEntries ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-xl bg-card animate-pulse border border-border" />
              ))
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <NotebookPen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No entries yet</h3>
                <p className="text-muted-foreground max-w-xs mt-2">
                  Log the first diary entry for this project using the form.
                </p>
              </div>
            ) : (
              entries.map(entry => {
                const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
                return (
                  <Card key={entry.id} className="border-border/50 bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          {format(entryDate, 'EEEE, MMM d, yyyy')}
                        </CardTitle>
                        <Badge className="border bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs font-medium gap-1">
                          <CloudSun className="w-3 h-3" />
                          {entry.weatherCondition}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <UsersIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{entry.crewPresent}</p>
                            <p className="text-[11px] text-muted-foreground">crew present</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground mb-1">equipment on site</p>
                            {entry.equipmentOnSite && entry.equipmentOnSite.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {entry.equipmentOnSite.map((item, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-normal">{item}</Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap border-t border-border/50 pt-3">
                          {entry.notes}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        Logged by <span className="font-medium text-foreground">{authorName(entry.authorId)}</span>
                        {entry.createdAt?.toDate && ` · ${format(entry.createdAt.toDate(), 'MMM d, h:mm a')}`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
