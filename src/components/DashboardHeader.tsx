import { Bell, Settings, User } from 'lucide-react';
import { Button } from './ui/button';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MobileMenu } from './MobileMenu';
import { SidebarTrigger } from './ui/sidebar';

interface DashboardHeaderProps {}

export function DashboardHeader({}: DashboardHeaderProps) {
  return (
    <header className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 sm:px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <SidebarTrigger className="md:hidden" />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Button variant="ghost" size="sm" className="relative p-1 md:p-2">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-xs">
              3
            </Badge>
          </Button>
          
          <Button variant="ghost" size="sm" className="p-1 md:p-2 hidden sm:flex">
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          
          <div className="flex items-center gap-1 md:gap-2">
            <Avatar className="h-6 w-6 md:h-8 md:w-8">
              <AvatarImage src="" alt="Admin" />
              <AvatarFallback>
                <User className="h-3 w-3 md:h-4 md:w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xs md:text-sm font-medium hidden sm:block">Admin User</span>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
