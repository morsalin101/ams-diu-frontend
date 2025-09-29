import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { roleAPI, menuAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, Menu, Plus, Trash2, Settings, Eye, Edit, Trash, FileEdit } from 'lucide-react';

interface Role {
  id: number;
  role_name: string;
  description: string;
  created_at: string;
}

interface Menu {
  id: number;
  title: string;
  link: string;
  icon: string;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
}

interface RoleMenu {
  menu_id: number;
  menu_title: string;
  permissions: {
    read: boolean;
    write: boolean;
    edit: boolean;
    delete: boolean;
  };
}

interface RoleMenusResponse {
  role_id: number;
  role_name: string;
  menus: RoleMenu[];
}

export function RoleMenuManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleMenus, setRoleMenus] = useState<RoleMenusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Load roles and menus on component mount
  useEffect(() => {
    loadRoles();
    loadAllMenus();
  }, []);

  // Load role menus when role is selected
  useEffect(() => {
    if (selectedRole) {
      loadRoleMenus(selectedRole);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    try {
      const response = await roleAPI.getAllRoles();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const loadAllMenus = async () => {
    try {
      // Since we don't have a getAllMenus endpoint, we'll use a placeholder
      // In real implementation, you'd have an endpoint to get all available menus
      const mockMenus: Menu[] = [
        { id: 1, title: 'Dashboard', link: '/dashboard', icon: 'LayoutDashboard', parent_id: null, order_index: 1, is_active: true },
        { id: 2, title: 'Create Questions', link: '/create-questions', icon: 'Plus', parent_id: null, order_index: 2, is_active: true },
        { id: 3, title: 'All Questions', link: '/all-questions', icon: 'FileText', parent_id: null, order_index: 3, is_active: true },
        { id: 4, title: 'Students', link: '/students', icon: 'Users', parent_id: null, order_index: 4, is_active: true },
        { id: 5, title: 'Exam Schedule', link: '/exam-schedule', icon: 'Calendar', parent_id: null, order_index: 5, is_active: true },
        { id: 6, title: 'Users Management', link: '/users-management', icon: 'UserCheck', parent_id: null, order_index: 6, is_active: true },
        { id: 7, title: 'Role Management', link: '/role-management', icon: 'Shield', parent_id: null, order_index: 7, is_active: true },
      ];
      setAllMenus(mockMenus);
    } catch (error) {
      console.error('Error loading menus:', error);
      toast.error('Failed to load menus');
    }
  };

  const loadRoleMenus = async (roleId: number) => {
    try {
      setIsLoading(true);
      const response = await menuAPI.getRoleMenus(roleId);
      
      console.log('Role menus API response:', response); // Debug log
      
      // Handle different response formats
      let menusArray = [];
      if (Array.isArray(response)) {
        menusArray = response;
      } else if (response && Array.isArray(response.data)) {
        menusArray = response.data;
      } else if (response && response.menus && Array.isArray(response.menus)) {
        menusArray = response.menus;
      } else {
        console.warn('Unexpected API response format:', response);
        menusArray = [];
      }
      
      // Transform API response to expected format
      const transformedMenus = menusArray.map((item: any) => ({
        menu_id: item.menu_details?.id || item.id,
        menu_title: item.menu_details?.label || item.title || item.label,
        permissions: typeof item.permissions === 'string' 
          ? JSON.parse(item.permissions) 
          : item.permissions || { read: false, write: false, edit: false, delete: false }
      }));
      
      const roleMenusData: RoleMenusResponse = {
        role_id: roleId,
        role_name: roles.find(r => r.id === roleId)?.role_name || '',
        menus: transformedMenus
      };
      
      setRoleMenus(roleMenusData);
    } catch (error) {
      console.error('Error loading role menus:', error);
      toast.error('Failed to load role menus');
      
      // Fallback to empty state
      const mockRoleMenus: RoleMenusResponse = {
        role_id: roleId,
        role_name: roles.find(r => r.id === roleId)?.role_name || '',
        menus: []
      };
      setRoleMenus(mockRoleMenus);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignMenu = async (menuId: number, permissions: any) => {
    if (!selectedRole) return;

    try {
      setIsAssigning(true);
      const menuAssignments = [
        {
          menu_id: menuId,
          permissions: permissions
        }
      ];
      
      const response = await menuAPI.assignMenusToRole(selectedRole, menuAssignments);

      if (response.success) {
        toast.success('Menu assigned successfully');
        loadRoleMenus(selectedRole);
      }
    } catch (error) {
      console.error('Error assigning menu:', error);
      toast.error('Failed to assign menu');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMenu = async (menuId: number) => {
    if (!selectedRole) return;

    try {
      const response = await menuAPI.removeMenuFromRole(selectedRole, menuId);
      if (response.success) {
        toast.success('Menu removed successfully');
        loadRoleMenus(selectedRole);
      }
    } catch (error) {
      console.error('Error removing menu:', error);
      toast.error('Failed to remove menu');
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'read': return <Eye className="w-3 h-3" />;
      case 'write': return <Plus className="w-3 h-3" />;
      case 'edit': return <Edit className="w-3 h-3" />;
      case 'delete': return <Trash className="w-3 h-3" />;
      default: return null;
    }
  };

  const isMenuAssigned = (menuId: number) => {
    return roleMenus?.menus.some(rm => rm.menu_id === menuId) || false;
  };

  const getMenuPermissions = (menuId: number) => {
    const roleMenu = roleMenus?.menus.find(rm => rm.menu_id === menuId);
    return roleMenu?.permissions || { read: false, write: false, edit: false, delete: false };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Menu Management</h1>
          <p className="text-gray-600">Assign and manage menu access for different roles</p>
        </div>
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Select Role
          </CardTitle>
          <CardDescription>Choose a role to manage its menu access</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedRole?.toString() || ''}
            onValueChange={(value) => setSelectedRole(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role to manage" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>{role.role_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {role.description}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Menu Management */}
      {selectedRole && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Menus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="w-5 h-5" />
                Available Menus
              </CardTitle>
              <CardDescription>All system menus that can be assigned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allMenus.map((menu) => {
                const assigned = isMenuAssigned(menu.id);
                const permissions = getMenuPermissions(menu.id);

                return (
                  <div
                    key={menu.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      assigned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Menu className="w-4 h-4" />
                        <span className="font-medium">{menu.title}</span>
                        {assigned && <Badge className="text-xs bg-green-100 text-green-800">Assigned</Badge>}
                      </div>
                      {assigned ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveMenu(menu.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      ) : (
                        <MenuAssignForm
                          menuId={menu.id}
                          onAssign={handleAssignMenu}
                          isAssigning={isAssigning}
                        />
                      )}
                    </div>

                    {assigned && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Permissions:</span>
                        {Object.entries(permissions).map(([permission, enabled]) => (
                          <div
                            key={permission}
                            className={`flex items-center gap-1 px-2 py-1 rounded ${
                              enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {getPermissionIcon(permission)}
                            <span className="capitalize">{permission}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Assigned Menus Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Menu Summary
              </CardTitle>
              <CardDescription>
                Menus assigned to {roles.find(r => r.id === selectedRole)?.role_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2">Loading...</span>
                </div>
              ) : roleMenus && roleMenus.menus.length > 0 ? (
                <div className="space-y-3">
                  {roleMenus.menus.map((roleMenu) => (
                    <div key={roleMenu.menu_id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{roleMenu.menu_title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMenu(roleMenu.menu_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(roleMenu.permissions).map(([permission, enabled]) => (
                          enabled && (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {getPermissionIcon(permission)}
                              <span className="ml-1 capitalize">{permission}</span>
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No menus have been assigned to this role yet. Use the form on the left to assign menus.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Component for assigning menu with permissions
interface MenuAssignFormProps {
  menuId: number;
  onAssign: (menuId: number, permissions: any) => void;
  isAssigning: boolean;
}

function MenuAssignForm({ menuId, onAssign, isAssigning }: MenuAssignFormProps) {
  const [permissions, setPermissions] = useState({
    read: false,
    write: false,
    edit: false,
    delete: false
  });
  const [showForm, setShowForm] = useState(false);

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: checked
    }));
  };

  const handleAssign = () => {
    onAssign(menuId, permissions);
    setShowForm(false);
    setPermissions({ read: false, write: false, edit: false, delete: false });
  };

  if (!showForm) {
    return (
      <Button size="sm" onClick={() => setShowForm(true)}>
        <Plus className="w-3 h-3 mr-1" />
        Assign
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-white">
      <div className="text-sm font-medium">Select Permissions:</div>
      <div className="space-y-2">
        {Object.entries(permissions).map(([permission, checked]) => (
          <div key={permission} className="flex items-center space-x-2">
            <Checkbox
              id={`${menuId}-${permission}`}
              checked={checked}
              onCheckedChange={(checked) => handlePermissionChange(permission, !!checked)}
            />
            <label
              htmlFor={`${menuId}-${permission}`}
              className="text-sm flex items-center gap-1 cursor-pointer"
            >
              {getPermissionIcon(permission)}
              <span className="capitalize">{permission}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAssign} disabled={isAssigning}>
          {isAssigning ? 'Assigning...' : 'Assign'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Helper function for permission icons (duplicate from parent component)
function getPermissionIcon(permission: string) {
  switch (permission) {
    case 'read': return <Eye className="w-3 h-3" />;
    case 'write': return <Plus className="w-3 h-3" />;
    case 'edit': return <Edit className="w-3 h-3" />;
    case 'delete': return <Trash className="w-3 h-3" />;
    default: return null;
  }
}