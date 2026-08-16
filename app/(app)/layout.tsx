'use client';

import * as React from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:pl-64">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
