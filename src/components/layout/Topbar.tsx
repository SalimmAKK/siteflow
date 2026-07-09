import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  NotebookPen,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  Settings,
  FileText,
} from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { AppNotification, Task } from '@/types';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', end: true },
  { icon: Calendar, label: 'Schedule', href: '/dashboard/schedule' },
  { icon: NotebookPen, label: 'Site Diary', href: '/dashboard/diary' },
  { icon: FolderKanban, label: 'Projects', href: '/dashboard/projects' },
  { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
  { icon: Users, label: 'Team', href: '/dashboard/team' },
];

// Circular utility icon button — 44px minimum tap target (Apple HIG / WCAG).
const IconButton: React.FC<{ label: string; onClick?: () => void; children: React.ReactNode; dot?: boolean }> = ({
  label,
  onClick,
  children,
  dot,
}) => (
  <button
    title={label}
    aria-label={label}
    onClick={onClick}
    className="relative w-11 h-11 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors shadow-sm"
  >
    {children}
    {dot && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border border-card" />}
  </button>
);

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid)), (snap) => {
        const n = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppNotification[];
        n.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
        setNotifications(n);
      })
    );

    const tasksRef = collection(db, 'tasks');
    const tq =
      user.role === 'manager' ? query(tasksRef) : query(tasksRef, where('assignedUserId', '==', user.uid));
    unsubs.push(
      onSnapshot(tq, (snap) => {
        const t = snap.docs.map((d) => d.data()) as Task[];
        setOpenTaskCount(t.filter((x) => x.status !== 'Completed').length);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) await updateDoc(doc(db, 'notifications', n.id), { read: true });
    if (n.link) navigate(n.link);
  };

  return (
    <header className="flex items-center justify-between gap-3">
      {/* Left: logo + counter + pill nav */}
      <div className="flex items-center gap-3 min-w-0">
        <Logo className="h-8 text-foreground shrink-0" />
        <span className="shrink-0 w-11 h-11 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-sm font-bold text-foreground">
          {openTaskCount}
        </span>
        {/* Below md, navigation moves to the fixed MobileTabBar instead. */}
        <nav className="hidden md:flex items-center gap-1 bg-[#18181B] rounded-full p-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                )
              }
              style={({ isActive }: any) => (isActive ? { backgroundColor: 'var(--blueprint)' } : undefined)}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right: utility icons + bell + gear + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <IconButton label="Site Diary" onClick={() => navigate('/dashboard/diary')}>
            <FileText className="w-4 h-4" />
          </IconButton>
          <IconButton label="Schedule" onClick={() => navigate('/dashboard/schedule')}>
            <Calendar className="w-4 h-4" />
          </IconButton>
          <IconButton label="Projects" onClick={() => navigate('/dashboard/projects')}>
            <FolderKanban className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Notifications"
              className="relative w-11 h-11 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors shadow-sm"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border border-card" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">No new notifications</div>
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
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <IconButton label="Settings" onClick={() => navigate('/dashboard/settings')}>
          <Settings className="w-4 h-4" />
        </IconButton>

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full" title="Account">
              <Avatar className="w-11 h-11 border border-border shadow-sm">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold text-foreground leading-tight">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize font-normal">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => auth.signOut()} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
