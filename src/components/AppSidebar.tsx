import { LayoutDashboard, Plus, FileText } from 'lucide-react';
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
  ];

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      {/* Logo Header Section */}
      <div className="h-16 flex items-center px-6 bg-[#4C51BF] text-white border-b border-[#3d42a6] shrink-0">
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileText className="w-4 h-4 text-[#4C51BF]" />
          </div>
          <h1 className="font-bold text-lg text-white drop-shadow-sm truncate min-w-0">
            Admin Panel
          </h1>
        </div>
      </div>
      
      <SidebarContent className="bg-white">
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.id)}
                      isActive={isActive}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-[#4C51BF] text-white shadow-sm border-none' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 bg-transparent'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span className={`ml-3 ${isActive ? 'text-white font-medium' : 'text-gray-700'}`}>{item.title}</span>
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
