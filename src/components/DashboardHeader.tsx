import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu, Settings, User } from 'lucide-react';
import { Button } from './ui/button';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { useSidebar } from './ui/sidebar';
import { useMenu } from '../contexts/MenuContext';

interface DashboardHeaderProps {}

const PAGE_TITLE_FALLBACKS: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/result': 'Results',
  '/results': 'Results',
  '/accepted-students': 'Results',
  '/override-selection': 'Override Selection',
  '/examinee-result': 'Override Selection',
  '/student-acceptance-criteria': 'Student Acceptance Criteria',
  '/threshold-management': 'Student Acceptance Criteria',
  '/viva-marks-entry': 'Viva Marks Entry',
  '/viva-marks': 'Viva Marks Entry',
  '/viva-rubrics-management': 'Viva Rubrics Management',
  '/viva-management': 'Viva Rubrics Management',
  '/all-questions': 'All Questions',
  '/create-questions': 'Create Questions',
  '/students': 'Students Management',
  '/exam-schedule': 'Exam Schedule',
  '/users-management': 'Users Management',
  '/role-management': 'Role Management',
  '/menu-management': 'Menu Management',
  '/menu-access-management': 'Menu Access Management',
  '/department-management': 'Department Management',
  '/subject-management': 'Subject Management',
  '/subject-department-mapping': 'Subject Department Mapping',
  '/published-exams': 'Published Exams',
  '/deletequestions': 'Delete Questions(DB)',
  '/blocked-questions': 'Blocked Questions',
  '/my-students': 'My Students',
  '/my-schedule': 'My Schedule',
  '/all-results': 'All Results',
  '/student-assign-teacher-exam': 'Student Assignment Management',
  '/viva-assign': 'Viva Assignment Management',
  '/marks-distribution': 'Marks Distribution Management',
};

const titleFromPath = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean).at(-1);

  if (!segment) {
    return 'Dashboard';
  }

  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function DashboardHeader({}: DashboardHeaderProps) {
  const location = useLocation();
  const { menuItems } = useMenu();
  const { toggleSidebar } = useSidebar();

  const pageTitle = useMemo(() => {
    const pathname = location.pathname;
    const menuMatch = menuItems.find((item) => {
      if (!item.link) {
        return false;
      }

      return item.link === pathname || pathname.startsWith(`${item.link}/`);
    });

    return menuMatch?.label || PAGE_TITLE_FALLBACKS[pathname] || titleFromPath(pathname);
  }, [location.pathname, menuItems]);

  return (
    <header className="flex h-[76px] sm:h-[88px] items-center gap-2 sm:gap-4 border-b border-white/10 bg-gradient-to-r from-[#0D1B4C] to-[#1E3A8A] px-4 sm:px-8 text-white shadow-md">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95 md:hidden"
          >
            <Menu className="h-6 w-6" strokeWidth={2.25} />
          </button>
          <h1 className="truncate py-0.5 text-xl font-semibold leading-[1.3] text-white sm:text-[26px]">
            {pageTitle}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <Button variant="ghost" size="sm" className="relative p-2 text-white hover:bg-white/15 hover:text-white">
            <Bell className="h-5 w-5 md:h-6 md:w-6" />
            <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs bg-white text-[#0D1B4C] hover:bg-white">
              3
            </Badge>
          </Button>
          
          <Button variant="ghost" size="sm" className="hidden p-2 text-white hover:bg-white/15 hover:text-white sm:flex">
            <Settings className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <Avatar className="h-9 w-9 bg-white/10 ring-1 ring-white/20 md:h-11 md:w-11">
              <AvatarImage src="" alt="Admin" />
              <AvatarFallback className="bg-white/15 text-white">
                <User className="h-4 w-4 md:h-5 md:w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-semibold text-white sm:block md:text-base">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
