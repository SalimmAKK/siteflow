import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import {
  Users as UsersIcon,
  Search,
  Mail,
  FolderKanban,
  CheckSquare,
  UserPlus,
  UserMinus
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { User, Project, Task, Invitation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Team: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add member dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Member detail dialog
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];

    // Fetch all users (for team display)
    const usersRef = collection(db, 'users');
    unsubs.push(onSnapshot(usersRef, (snap) => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
      setLoading(false);
    }));

    // Fetch projects
    const projectsRef = collection(db, 'projects');
    const pq = user.role === 'manager'
      ? query(projectsRef, where('managerId', '==', user.uid))
      : query(projectsRef, where('teamMemberIds', 'array-contains', user.uid));
    unsubs.push(onSnapshot(pq, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]);
    }));

    // Fetch tasks
    const tasksRef = collection(db, 'tasks');
    unsubs.push(onSnapshot(tasksRef, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
    }));

    // Fetch pending invitations (if manager)
    if (user.role === 'manager') {
      const invRef = collection(db, 'invitations');
      const iq = query(invRef, where('invitedBy', '==', user.uid), where('status', '==', 'pending'));
      unsubs.push(onSnapshot(iq, (snap) => {
        setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Invitation[]);
      }));
    }

    return () => unsubs.forEach(u => u());
  }, [user]);

  const getMemberStats = (memberId: string) => {
    const memberTasks = tasks.filter(t => t.assignedUserId === memberId);
    const memberProjects = projects.filter(p => p.teamMemberIds?.includes(memberId));
    const activeTasks = memberTasks.filter(t => t.status !== 'Completed');
    const completedTasks = memberTasks.filter(t => t.status === 'Completed');
    return { memberTasks, memberProjects, activeTasks, completedTasks };
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !memberEmail) return;
    setIsSubmitting(true);
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', memberEmail));
      const snap = await getDocs(q);

      const targetProject = projects.find(p => p.id === selectedProjectId);

      if (snap.empty) {
        // Create pending invitation
        
        // Check if already invited
        const existingInvRef = collection(db, 'invitations');
        const invQ = query(
          existingInvRef, 
          where('email', '==', memberEmail), 
          where('projectId', '==', selectedProjectId),
          where('status', '==', 'pending')
        );
        const invSnap = await getDocs(invQ);
        if (!invSnap.empty) {
          toast.error(`An invitation for ${memberEmail} to this project is already pending.`);
          setIsSubmitting(false);
          return;
        }

        await addDoc(collection(db, 'invitations'), {
          email: memberEmail,
          projectId: selectedProjectId,
          projectName: targetProject?.title || 'Unknown Project',
          invitedBy: user?.uid || 'unknown',
          invitedByName: user?.displayName || 'Manager',
          status: 'pending',
          createdAt: Timestamp.now()
        });

        // Send Email using EmailJS
        try {
          if (import.meta.env.VITE_EMAILJS_SERVICE_ID && import.meta.env.VITE_EMAILJS_TEMPLATE_ID && import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
            await emailjs.send(
              import.meta.env.VITE_EMAILJS_SERVICE_ID,
              import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
              {
                to_email: memberEmail,
                manager_name: user?.displayName || 'A Manager',
                project_name: targetProject?.title || 'a project',
                signup_link: window.location.origin + '/register'
              },
              import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );
          } else {
            console.warn("EmailJS environment variables are missing. Email not sent.");
          }
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          toast.error("Invitation saved, but failed to send the email.");
        }

        toast.success(`Invitation sent to ${memberEmail}! They will be added to the project once they register.`);
        setIsAddOpen(false);
        setMemberEmail('');
        setSelectedProjectId('');
        setIsSubmitting(false);
        return;
      }

      const memberDoc = snap.docs[0];
      const memberId = memberDoc.id;

      // Check if already a member
      if (targetProject?.teamMemberIds?.includes(memberId)) {
        toast.error(`${memberDoc.data().displayName || memberEmail} is already in this project.`);
        setIsSubmitting(false);
        return;
      }

      // Add to project
      await updateDoc(doc(db, 'projects', selectedProjectId), {
        teamMemberIds: arrayUnion(memberId),
      });

      toast.success(`${memberDoc.data().displayName || memberEmail} added to the project!`);
      setIsAddOpen(false);
      setMemberEmail('');
      setSelectedProjectId('');
    } catch (error: any) {
      toast.error('Failed to add member: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, 'invitations', inviteId), {
        status: 'cancelled'
      });
      toast.success('Invitation cancelled');
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveMember = async (projectId: string, memberId: string, memberName: string) => {
    if (user?.role !== 'manager') return;
    try {
      // Remove from project
      await updateDoc(doc(db, 'projects', projectId), {
        teamMemberIds: arrayRemove(memberId),
      });

      // Unassign tasks belonging to this project that were assigned to the user
      const projectTasks = tasks.filter(t => t.projectId === projectId && t.assignedUserId === memberId);
      for (const task of projectTasks) {
        await updateDoc(doc(db, 'tasks', task.id), {
          assignedUserId: '',
          assignedUserName: 'Unassigned',
        });
      }

      toast.success(`${memberName} removed from project and unassigned from related tasks.`);
    } catch (error: any) {
      toast.error('Failed to remove member: ' + error.message);
    }
  };

  const openMemberDetail = (member: User) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  };

  const filteredMembers = members.filter(
    m =>
      m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
  ];

  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">Manage your team members and assignments.</p>
        </div>
        {user?.role === 'manager' && (
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Add Member to Project
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          className="pl-10 h-10"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-xl bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <UsersIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No team members found</h3>
          <p className="text-muted-foreground max-w-xs mt-2">
            {searchQuery ? 'Try a different search term.' : 'Members will appear here once they register.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member, i) => {
            const stats = getMemberStats(member.uid);
            return (
              <Card
                key={member.uid}
                className="hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer group border-border/50"
                onClick={() => openMemberDetail(member)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Avatar className="w-16 h-16 mb-4">
                    <AvatarFallback className={cn('text-xl font-bold text-white', getAvatarColor(i))}>
                      {member.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {member.displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize text-[10px]">
                    {member.role}
                  </Badge>
                  <div className="flex gap-4 mt-4 w-full">
                    <div className="flex-1 p-2 rounded-lg bg-secondary/50 text-center">
                      <p className="text-lg font-bold">{stats.activeTasks.length}</p>
                      <p className="text-[10px] text-muted-foreground">Tasks</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-secondary/50 text-center">
                      <p className="text-lg font-bold">{stats.memberProjects.length}</p>
                      <p className="text-[10px] text-muted-foreground">Projects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Invitations List (only for managers) */}
      {user?.role === 'manager' && invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            Pending Invitations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <Card key={inv.id} className="border-border/50 border-dashed bg-secondary/10">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">Invited to: {inv.projectName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background">Pending</Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 w-fit h-7 text-xs"
                    onClick={() => handleCancelInvite(inv.id)}
                  >
                    Cancel Invite
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Member to Project</DialogTitle>
            <DialogDescription>
              Enter the email of a registered user to add them to a project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Member Email</label>
                <Input
                  type="email"
                  placeholder="member@example.com"
                  value={memberEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMemberEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !selectedProjectId}>
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedMember && (() => {
            const stats = getMemberStats(selectedMember.uid);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className={cn('text-xl font-bold text-white', getAvatarColor(0))}>
                        {selectedMember.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-lg">{selectedMember.displayName}</DialogTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {selectedMember.email}
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 py-4">
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <p className="text-2xl font-bold">{stats.activeTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Active Tasks</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <p className="text-2xl font-bold">{stats.completedTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center">
                    <p className="text-2xl font-bold">{stats.memberProjects.length}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                </div>

                {stats.memberProjects.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FolderKanban className="w-4 h-4" /> Assigned Projects
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {stats.memberProjects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{p.title}</span>
                            <span className="text-[10px] text-muted-foreground">{p.status}</span>
                          </div>
                          {user?.role === 'manager' && p.managerId === user.uid && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(p.id, selectedMember.uid, selectedMember.displayName || 'Member')}
                              title="Remove from project"
                            >
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.activeTasks.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" /> Active Tasks
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {stats.activeTasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <span className="text-sm">{t.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={cn('text-[10px] border',
                              t.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            )}>
                              {t.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
