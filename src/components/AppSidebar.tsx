import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu, iconMap } from '../contexts/MenuContext';
import { Button } from './ui/button';
// @ts-ignore
import logoImage from '../assets/logo.png';
import toast from 'react-hot-toast';
import { Link, useLocation } from 'react-router-dom';
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

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { menuItems, isLoading } = useMenu();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <Sidebar className="border-r-2 border-indigo-500" collapsible="icon">
      <div className="h-16 flex items-center px-6 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white border-b border-white-200 shrink-0">
        <div className="flex items-center gap-3 w-full min-w-0">
          <img 
            src={logoImage} 
            alt="Admin Panel Logo" 
            className="h-10 object-contain flex-shrink-0"
          />
        </div>
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span>Loading menu...</span>
                  </div>
                </SidebarMenuItem>
              ) : (
                menuItems.map((item) => {
                  const Icon = iconMap[item.icon] || iconMap['LayoutDashboard'];
                  const isActive = location.pathname === item.link;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={isActive ? 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white hover:bg-gradient-to-r hover:from-[#2E3094] hover:to-[#4C51BF] hover:text-white [&_svg]:text-white' : 'hover:bg-gray-100'}
                      >
                        <Link to={item.link} className={isActive ? 'text-white' : ''}>
                          <Icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                          <span className={isActive ? 'text-white' : ''}>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="px-3 py-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
