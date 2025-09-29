import { LayoutDashboard, Plus, FileText, Calendar, Users, UserCheck, LogOut, Shield, Settings, Menu, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import logoImage from '../assets/logo.png';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
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

// Icon mapping for dynamic menu items
const iconMap: { [key: string]: any } = {
  'LayoutDashboard': LayoutDashboard,
  'Plus': Plus,
  'FileText': FileText,
  'Users': Users,
  'Calendar': Calendar,
  'UserCheck': UserCheck,
  'Shield': Shield,
  'Settings': Settings,
  'Menu': Menu,
  'Key': Key,
};

export function AppSidebar({ currentPage, onPageChange, gradientClass, logo }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [userRole, setUserRole] = useState('');

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // Load user menus dynamically
  useEffect(() => {
    const loadUserMenus = async () => {
      if (!user) return;
      
      try {
        setIsLoadingMenus(true);
        const response = await menuAPI.getUserMenus();
        
        if (response.success) {
          // Transform API response to menu items format
          let dynamicMenuItems = response.data.map((menu: any) => ({
            id: menu.id,
            title: menu.title,
            icon: iconMap[menu.icon] || LayoutDashboard,
            link: menu.link,
            permissions: menu.permissions,
            // Convert link to page id (remove leading slash)
            pageId: menu.link?.replace('/', '') || `menu-${menu.id}`,
          }));

          // Check if user is super admin to show role menu management
          const isSuperAdmin = user?.role_details?.role_name?.toLowerCase() === 'super admin' || 
                             user?.role_details?.role_name?.toLowerCase() === 'superadmin' ||
                             response.role?.toLowerCase() === 'super admin' ||
                             response.role?.toLowerCase() === 'superadmin';
          
          // Add role menu management for super admin if not already in API response
          const hasRoleMenuManagement = dynamicMenuItems.some(item => item.pageId === 'role-menu-management');
          if (isSuperAdmin && !hasRoleMenuManagement) {
            dynamicMenuItems.push({
              id: 'role-menu-management',
              title: 'Role Menu Mapping',
              icon: Settings,
              link: '/role-menu-management',
              permissions: { read: true, write: true, edit: true, delete: true },
              pageId: 'role-menu-management',
            });
          }
          
          setMenuItems(dynamicMenuItems);
          setUserRole(response.role || '');
        }
      } catch (error) {
        console.error('Error loading user menus:', error);
        toast.error('Failed to load menu items');
        
        // Fallback to default menus if API fails
        const baseMenus = [
          {
            id: 1,
            title: 'Dashboard',
            icon: LayoutDashboard,
            pageId: 'dashboard',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 2,
            title: 'Create Questions',
            icon: Plus,
            pageId: 'create-questions',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 3,
            title: 'All Questions',
            icon: FileText,
            pageId: 'all-questions',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 4,
            title: 'Students',
            icon: Users,
            pageId: 'students',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 5,
            title: 'Exam Schedule',
            icon: Calendar,
            pageId: 'exam-schedule',
            permissions: { read: true, write: true, edit: true, delete: true }
          }
        ];

        // Add super admin menus if user is super admin
        const isSuperAdmin = user?.role_details?.role_name?.toLowerCase() === 'super admin' || 
                           user?.role_details?.role_name?.toLowerCase() === 'superadmin';
        
        const superAdminMenus = [
          {
            id: 6,
            title: 'Users Management',
            icon: UserCheck,
            pageId: 'users-management',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 7,
            title: 'Role Management',
            icon: Shield,
            pageId: 'role-management',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 8,
            title: 'Menu Management',
            icon: Menu,
            pageId: 'menu-management',
            permissions: { read: true, write: true, edit: true, delete: true }
          },
          {
            id: 9,
            title: 'Menu Access Management',
            icon: Key,
            pageId: 'menu-access-management',
            permissions: { read: true, write: true, edit: true, delete: true }
          }
        ];

        const fallbackMenus = isSuperAdmin ? [...baseMenus, ...superAdminMenus] : baseMenus;
        setMenuItems(fallbackMenus);
      } finally {
        setIsLoadingMenus(false);
      }
    };

    loadUserMenus();
  }, [user]);

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
              {isLoadingMenus ? (
                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span>Loading menu...</span>
                  </div>
                </SidebarMenuItem>
              ) : (
                menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onPageChange(item.pageId)}
                        isActive={currentPage === item.pageId}
                        className={currentPage === item.pageId ? `bg-gradient-to-r ${gradientClass} text-white` : ''}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
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
                  <p className="text-xs text-gray-500 truncate">{userRole || user?.role_details?.role_name}</p>
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
