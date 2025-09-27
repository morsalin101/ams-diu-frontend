import { LayoutDashboard, Plus, FileText, Calendar, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  gradientClass: string;
  logo?: {
    src?: string;
    alt?: string;
    title?: string;
  };
}

export function AppSidebar({ currentPage, onPageChange, gradientClass, logo }: AppSidebarProps) {
  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      id: 'dashboard',
    },
    {
      title: 'Create Questions',
      icon: Plus,
      id: 'create-questions',
    },
    {
      title: 'All Questions',
      icon: FileText,
      id: 'all-questions',
    },
    {
      title: 'Students',
      icon: Users,
      id: 'students',
    },
    {
      title: 'Exam Schedule',
      icon: Calendar,
      id: 'exam-schedule',
    },
  ];

  return (
    <Sidebar className="border-r-2 border-indigo-500">
      {/* Logo Header Section - Custom header with forced visibility */}
      <div className={`h-16 flex items-center px-6 bg-gradient-to-r ${gradientClass} text-white border-b border-white-200 shrink-0`}>
        <div className="flex items-center gap-3 w-full min-w-0">
          {logo?.src ? (
            <img 
              src={logo.src} 
              alt={logo.alt || 'Logo'} 
              className="h-8 w-8 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
            </div>
          )}
          <h1 className="font-bold text-lg text-white drop-shadow-sm truncate min-w-0">
            {logo?.title || 'Admin Panel'}
          </h1>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.id)}
                      isActive={currentPage === item.id}
                      className={currentPage === item.id ? `bg-gradient-to-r ${gradientClass} text-white` : ''}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
