import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';
import { SidebarProvider, SidebarInset } from './ui/sidebar';

const Layout: React.FC = () => {

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-gray-100 via-blue-50 to-purple-100">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;