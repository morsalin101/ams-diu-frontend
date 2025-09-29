import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { menuAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Menu, Plus, Edit, Trash2, Settings, Eye, EyeOff } from 'lucide-react';

interface Menu {
  id: number;
  title: string;
  link: string;
  icon: string;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const availableIcons = [
  { value: 'LayoutDashboard', label: 'Dashboard' },
  { value: 'Plus', label: 'Plus' },
  { value: 'FileText', label: 'File Text' },
  { value: 'Users', label: 'Users' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'UserCheck', label: 'User Check' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Settings', label: 'Settings' },
  { value: 'Menu', label: 'Menu' },
  { value: 'Key', label: 'Key' },
];

export function MenuManagement() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    label: '',
    icon: 'LayoutDashboard',
    link: ''
  });

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      setIsLoading(true);
      const response = await menuAPI.getAllMenus();
      
      // Mock data if API doesn't return data yet
      const mockMenus: Menu[] = [
        {
          id: 1,
          title: 'Dashboard',
          link: '/dashboard',
          icon: 'LayoutDashboard',
          parent_id: null,
          order_index: 1,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          title: 'Create Questions',
          link: '/create-questions',
          icon: 'Plus',
          parent_id: null,
          order_index: 2,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 3,
          title: 'All Questions',
          link: '/all-questions',
          icon: 'FileText',
          parent_id: null,
          order_index: 3,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      setMenus(response?.data || mockMenus);
    } catch (error) {
      console.error('Error loading menus:', error);
      toast.error('Failed to load menus');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      icon: 'LayoutDashboard',
      link: ''
    });
    setEditingMenu(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (menu: Menu) => {
    setFormData({
      label: menu.title,
      icon: menu.icon,
      link: menu.link
    });
    setEditingMenu(menu);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.label.trim() || !formData.link.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const menuData = {
        label: formData.label.trim(),
        icon: formData.icon,
        link: formData.link.trim()
      };

      if (editingMenu) {
        await menuAPI.updateMenu(editingMenu.id, menuData);
        toast.success('Menu updated successfully');
      } else {
        await menuAPI.createMenu(menuData);
        toast.success('Menu created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      loadMenus();
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error(editingMenu ? 'Failed to update menu' : 'Failed to create menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Are you sure you want to delete "${menu.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await menuAPI.deleteMenu(menu.id);
      toast.success('Menu deleted successfully');
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error('Failed to delete menu');
    }
  };

  const toggleMenuStatus = async (menu: Menu) => {
    try {
      await menuAPI.updateMenu(menu.id, {
        ...menu,
        is_active: !menu.is_active
      });
      toast.success(`Menu ${!menu.is_active ? 'activated' : 'deactivated'} successfully`);
      loadMenus();
    } catch (error) {
      console.error('Error updating menu status:', error);
      toast.error('Failed to update menu status');
    }
  };

  const getParentMenuName = (parentId: number | null) => {
    if (!parentId) return 'Root';
    const parentMenu = menus.find(m => m.id === parentId);
    return parentMenu ? parentMenu.title : 'Unknown';
  };

  const getIconLabel = (iconValue: string) => {
    const icon = availableIcons.find(i => i.value === iconValue);
    return icon ? icon.label : iconValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Menu className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600">Create, edit and manage system menus</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Menu
        </Button>
      </div>

      {/* Menus List */}
      <Card>
        <CardHeader>
          <CardTitle>System Menus</CardTitle>
          <CardDescription>All available menus in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading menus...</span>
            </div>
          ) : menus.length === 0 ? (
            <Alert>
              <AlertDescription>No menus found. Create your first menu to get started.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {menus
                .sort((a, b) => a.order_index - b.order_index)
                .map((menu) => (
                  <div
                    key={menu.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      menu.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">#{menu.order_index}</span>
                          <div className={`w-2 h-2 rounded-full ${menu.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{menu.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {getIconLabel(menu.icon)}
                            </Badge>
                            {!menu.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Link: {menu.link}</span>
                            <span>Parent: {getParentMenuName(menu.parent_id)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleMenuStatus(menu)}
                          className="text-gray-600"
                        >
                          {menu.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(menu)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(menu)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto z-50 bg-white border shadow-lg">
          <DialogHeader>
            <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
            <DialogDescription>
              {editingMenu ? 'Update the menu details below.' : 'Fill in the details to create a new menu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Menu label"
                required
              />
            </div>
              <div className="grid gap-2">
                <Label htmlFor="link">Link *</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="/menu-path"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon || "LayoutDashboard"}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingMenu ? 'Update Menu' : 'Create Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}