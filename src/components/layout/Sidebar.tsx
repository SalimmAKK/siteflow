import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  PlusCircle,
  Calendar,
  NotebookPen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Schedule', href: '/dashboard/schedule' },
  { icon: NotebookPen, label: 'Site Diary', href: '/dashboard/diary' },
  { icon: FolderKanban, label: 'Projects', href: '/dashboard/projects' },
  { icon: CheckSquare, label: 'My Tasks', href: '/dashboard/tasks' },
  { icon: Users, label: 'Team', href: '/dashboard/team' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

import { Logo } from '../Logo';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        "bg-[#18181B] text-gray-200 border-none h-screen md:h-[calc(100vh-2rem)] flex flex-col transition-all duration-300 z-50 fixed md:sticky top-0 md:top-4 w-64 md:rounded-[2rem] shadow-xl",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Logo className="h-8 text-white" />
        </div>

        {user?.role === 'manager' && (
          <Button
            className="w-full justify-start gap-2 mb-6 rounded-full bg-[#2E2E32] text-white hover:bg-[#3E3E42] border-none"
            size="sm"
            onClick={() => navigate('/dashboard/projects?action=create')}
          >
            <PlusCircle className="w-4 h-4" />
            New Project
          </Button>
        )}

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                isActive 
                  ? "bg-[#2E2E32] text-white" 
                  : "text-gray-400 hover:bg-[#2E2E32]/50 hover:text-white"
              )}
              onClick={onClose}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[#2E2E32]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-full text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  </>
);
};
