import { Bell, Search, Settings, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ThemeColorSelector } from './ThemeColorSelector';
import { MobileMenu } from './MobileMenu';

interface DashboardHeaderProps {
  onThemeChange: (color: string, gradient: string) => void;
}

export function DashboardHeader({ onThemeChange }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white px-2 md:px-4 py-1 md:py-2 rounded-lg">
            <h1 className="text-sm md:text-lg font-semibold">Admin Panel</h1>
          </div>
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 xl:w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-4">
          <div className="hidden md:block">
            <ThemeColorSelector onColorChange={onThemeChange} />
          </div>
          
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
            <MobileMenu onThemeChange={onThemeChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
