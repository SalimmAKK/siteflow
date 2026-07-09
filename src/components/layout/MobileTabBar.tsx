import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, NotebookPen, FolderKanban, CheckSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Same destinations as Topbar's pill nav. Below `md`, this fixed bottom bar
// replaces that horizontal nav entirely (more thumb-reachable on a phone than
// a top bar, and standard for installed/app-like PWAs).
const items = [
  { icon: LayoutDashboard, label: 'Home', href: '/dashboard', end: true },
  { icon: Calendar, label: 'Schedule', href: '/dashboard/schedule' },
  { icon: NotebookPen, label: 'Diary', href: '/dashboard/diary' },
  { icon: FolderKanban, label: 'Projects', href: '/dashboard/projects' },
  { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
  { icon: Users, label: 'Team', href: '/dashboard/team' },
];

export const MobileTabBar: React.FC = () => (
  <nav
    className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#18181B] border-t border-black/30 flex items-stretch"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  >
    {items.map((item) => (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
            isActive ? 'text-white' : 'text-gray-400'
          )
        }
        style={({ isActive }: { isActive: boolean }) => (isActive ? { color: '#7CA3D6' } : undefined)}
      >
        <item.icon className="w-5 h-5" />
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);
