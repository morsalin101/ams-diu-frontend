import { LayoutDashboard, Plus, FileText, Calendar, Users, UserCheck, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import logoImage from '../assets/logo.png';
import toast from 'react-hot-toast';
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
  const { user, logout, isSuperAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // Base menu items available to all authenticated users
  const baseMenuItems = [
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

  // Additional menu items for super admin
  const superAdminMenuItems = [
    {
      title: 'Users Management',
      icon: UserCheck,
      id: 'users-management',
    },
    {
      title: 'Role Management',
      icon: Shield,
      id: 'role-management',
    },
  ];

  // Combine menu items based on role
  const menuItems = isSuperAdmin ? [...baseMenuItems, ...superAdminMenuItems] : baseMenuItems;

  return (
    <Sidebar className="border-r-2 border-indigo-500">
      {/* Logo Header Section - Custom header with forced visibility */}
      <div className={`h-18 flex items-center px-6 bg-gradient-to-r ${gradientClass} text-white border-b border-white-200 shrink-0`}>
        <div className="flex items-center gap-3 w-full min-w-0">
          <img 
            src={logoImage} 
            alt="Admin Panel Logo" 
            className="h-14 object-contain flex-shrink-0  p-1"
          />
          {/* <h1 className="font-bold text-lg text-white drop-shadow-sm truncate min-w-0">
            Admin Panel
          </h1> */}
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
        
        {/* User Info Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="px-3 py-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.role_details?.role_name}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
