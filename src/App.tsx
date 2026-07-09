import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/sonner';
import { ScrollToHash } from '@/components/ScrollToHash';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Landing } from './pages/marketing/Landing';
import { Features } from './pages/marketing/Features';
import { Pricing } from './pages/marketing/Pricing';
import { Contact } from './pages/marketing/Contact';
import { ClientPortal } from './pages/public/ClientPortal';

import { Dashboard } from './pages/Dashboard.tsx';
import { Projects } from './pages/Projects.tsx';
import { Tasks } from './pages/Tasks.tsx';
import { Team } from './pages/Team.tsx';
import { Settings } from './pages/Settings.tsx';
import { Schedule } from './pages/Schedule.tsx';
import { SiteDiary } from './pages/SiteDiary.tsx';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="operion-theme">
      <AuthProvider>
        <BrowserRouter>
          <ScrollToHash />
          <OfflineBanner />
          <InstallPrompt />
          <PWAUpdatePrompt />
          <Toaster />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/share/:token" element={<ClientPortal />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/schedule" element={<Schedule />} />
                <Route path="/dashboard/diary" element={<SiteDiary />} />
                <Route path="/dashboard/projects" element={<Projects />} />
                <Route path="/dashboard/tasks" element={<Tasks />} />
                <Route path="/dashboard/team" element={<Team />} />
                <Route path="/dashboard/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
