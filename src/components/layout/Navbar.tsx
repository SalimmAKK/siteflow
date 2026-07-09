import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, FolderKanban, CheckSquare, Users, Plus, Mail, Calendar } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import type { AppNotification } from '@/types';

export const Navbar: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string; }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!isSearchOpen || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const sq = searchQuery.toLowerCase();
        const found: any[] = [];

        // Projects
        const projectsRef = collection(db, 'projects');
        const pq = user?.role === 'manager'
          ? query(projectsRef, where('managerId', '==', user?.uid))
          : query(projectsRef, where('teamMemberIds', 'array-contains', user?.uid));
        const pSnap = await getDocs(pq);
        pSnap.forEach(doc => {
          const data = doc.data();
          if (data.title.toLowerCase().includes(sq) || data.description.toLowerCase().includes(sq)) {
            found.push({ type: 'project', id: doc.id, title: data.title, subtitle: 'Project • ' + data.status });
          }
        });

        // Tasks
        const tasksRef = collection(db, 'tasks');
        const tq = user?.role === 'manager'
          ? query(tasksRef)
          : query(tasksRef, where('assignedUserId', '==', user?.uid));
        const tSnap = await getDocs(tq);
        tSnap.forEach(doc => {
          const data = doc.data();
          if (data.title.toLowerCase().includes(sq) || data.description.toLowerCase().includes(sq)) {
            found.push({ type: 'task', id: doc.id, title: data.title, subtitle: 'Task • ' + data.status });
          }
        });

        // Team
        const usersRef = collection(db, 'users');
        const uSnap = await getDocs(usersRef);
        uSnap.forEach(doc => {
          const data = doc.data();
          if (data.displayName?.toLowerCase().includes(sq) || data.email?.toLowerCase().includes(sq)) {
            found.push({ type: 'user', id: doc.id, title: data.displayName || 'Unnamed', subtitle: 'User • ' + data.role });
          }
        });

        setResults(found.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
      notifs.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleResultClick = (res: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (res.type === 'project') navigate('/dashboard/projects');
    else if (res.type === 'task') navigate('/dashboard/tasks');
    else navigate('/dashboard/team');
  };

  return (
    <header className="h-20 bg-transparent sticky top-0 z-10 flex items-center">
      <div className="w-full h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle */}
        <div className="flex items-center sm:w-1/4">
          <button 
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl relative hidden sm:block">
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-muted flex items-center justify-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input 
            placeholder="Search projects, tasks, or team..." 
            className="pl-12 pr-4 rounded-full bg-card/60 backdrop-blur-md border border-border hover:bg-card/80 transition-colors h-11 w-full shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-foreground placeholder:text-muted-foreground cursor-pointer focus-visible:ring-1 focus-visible:ring-ring"
            readOnly
            onClick={() => setIsSearchOpen(true)}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:w-auto">
          {/* Quick Create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 h-10 pl-3 pr-3 sm:pr-4 rounded-full bg-[var(--hazard)] text-[var(--hazard-ink)] font-medium text-sm hover:brightness-95 transition-all shadow-sm"
                title="Quick Create"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Create</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Create new</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/projects?action=create')}>
                <FolderKanban className="w-4 h-4 mr-2 text-muted-foreground" />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/tasks')}>
                <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                New Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/schedule')}>
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                New Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Messages */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-10 h-10 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors shadow-sm"
                title="Messages"
              >
                <Mail className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Messages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center text-muted-foreground text-sm">
                No messages yet
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-destructive border-2 border-background rounded-full animate-pulse" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className="flex flex-col items-start p-3 cursor-pointer gap-1"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <p className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className={`text-xs ${!n.read ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                      {n.message}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-card p-1 pr-3 rounded-full border border-border shadow-sm">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold leading-none text-foreground">{user?.displayName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => auth.signOut()} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Global Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input 
              autoFocus
              placeholder="Search projects, tasks, or team..." 
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {!searchQuery.trim() ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Start typing to search globally...</div>
            ) : isSearching ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No results found for "{searchQuery}"</div>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleResultClick(res)}
                    className="flex items-center gap-4 w-full p-3 rounded-2xl hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {res.type === 'project' ? <FolderKanban className="w-5 h-5 text-muted-foreground" /> : 
                       res.type === 'task' ? <CheckSquare className="w-5 h-5 text-muted-foreground" /> : 
                       <Users className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{res.title}</p>
                      <p className="text-xs text-muted-foreground">{res.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
