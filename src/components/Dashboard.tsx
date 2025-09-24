import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from './ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { DashboardContent } from './DashboardContent';
import { CreateQuestions } from './CreateQuestions';
import { ThemeColorSelector } from './ThemeColorSelector';
import { MobileMenu } from './MobileMenu';
import { Button } from './ui/button';
import { Bell, Settings, User, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

// Internal component that can access sidebar context
function DashboardContent_({ currentPage, currentGradient }: { currentPage: string; currentGradient: string }) {
  const { open } = useSidebar();

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent gradientClass={currentGradient} />;
      case 'create-questions':
        return <CreateQuestions gradientClass={currentGradient} />;
      default:
        return <DashboardContent gradientClass={currentGradient} />;
    }
  };

  return (
    <>
      {/* Header - Fixed at top with toggle button on the left */}
      <header className="sticky top-0 z-0 w-full border-b bg-white border-gray-200">
        <div className={`${open ? 'max-w-6xl' : 'max-w-7xl'} mx-auto flex h-14 md:h-16 items-center px-3 md:px-6 transition-all duration-300`}>
          {/* Sidebar Toggle Button - Left side of header */}
          <div className="flex items-center mr-4">
            <SidebarTrigger className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="h-6 w-6 text-gray-700" />
            </SidebarTrigger>
          </div>
          
          {/* Title - Centered */}
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-lg md:text-xl">Admin Panel</h1>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme selector - Hidden on mobile */}
            <div className="hidden sm:block">
              <ThemeColorSelector onColorChange={(color: string, gradient: string) => {
                // Update CSS custom properties
                document.documentElement.style.setProperty('--primary', color);
              }} />
            </div>
            
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                3
              </Badge>
            </Button>
            
            {/* Settings - Hidden on mobile */}
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Settings className="h-5 w-5" />
            </Button>
            
            {/* User avatar and name */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="Admin" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">Admin User</span>
            </div>

            {/* Mobile Menu */}
            <MobileMenu onThemeChange={(color: string, gradient: string) => {
              // Update CSS custom properties
              document.documentElement.style.setProperty('--primary', color);
            }} />
          </div>
        </div>
      </header>

      {/* Main Content - Responsive width based on sidebar state */}
      <main className="flex-1 overflow-auto bg-gray-50 min-h-screen pt-4 md:pt-8">
        <div className={`${open ? 'max-w-6xl' : 'max-w-7xl'} mx-auto px-3 md:px-6 pb-4 md:pb-8 transition-all duration-300`}>
          {renderContent()}
        </div>
      </main>
    </>
  );
}

export function Dashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentGradient, setCurrentGradient] = useState('from-[#2E3094] to-[#4C51BF]');

  // Logo configuration - customize this as needed
  const logoConfig = {
    // src: '/path/to/your/logo.png', // Uncomment and add your logo path
    // alt: 'Your Company Logo',
    title: 'Admin Panel', // You can change this title
  };

  const handleThemeChange = (color: string, gradient: string) => {
    setCurrentGradient(gradient);
    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary', color);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          gradientClass={currentGradient}
          logo={logoConfig}
        />
        <SidebarInset className="flex-1">
          <DashboardContent_ currentPage={currentPage} currentGradient={currentGradient} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
