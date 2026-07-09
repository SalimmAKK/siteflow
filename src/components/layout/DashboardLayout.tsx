import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { MobileTabBar } from './MobileTabBar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 pb-24 md:pb-6">
        <Topbar />
        <main>
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
};
