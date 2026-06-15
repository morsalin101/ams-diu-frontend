import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';
import { SidebarProvider, SidebarInset } from './ui/sidebar';

const Layout: React.FC = () => {

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f7fbff]">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto p-5 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
