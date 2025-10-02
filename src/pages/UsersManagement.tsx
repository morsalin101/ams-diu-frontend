import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, UserPlus, Edit, Trash2, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { usersAPI, roleAPI, departmentAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  department: string;
  created_at: string;
  role_details: {
    id: number;
    role_name: string;
  };
  department_details?: {
    id: number;
    department_name: string;
    department_shortname: string;
  };
}

interface UsersManagementProps {
  gradientClass: string;
}

export function UsersManagement({ gradientClass }: UsersManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; department_name: string; department_shortname: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 2, // Default to superadmin
    department_id: 0
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadDepartments();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await roleAPI.getAllRoles();
      const rolesData = response.data || response;
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersAPI.getAllUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: 2,
      department_id: departments.length > 0 ? departments[0].id : 0
    });
    setShowUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role_id: user.role_details.id,
      department_id: user.department_details?.id || (departments.length > 0 ? departments[0].id : 0)
    });
    setShowUserDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error('Username and email are required');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        const updateData = {
          username: formData.username,
          email: formData.email,
          role_id: formData.role_id,
          ...(formData.password.trim() && { password: formData.password })
        };
        await usersAPI.updateUser(editingUser.id, updateData);
        toast.success('User updated successfully!');
      } else {
        // Create user
        await usersAPI.createUser(formData);
        toast.success('User created successfully!');
      }
      
      setShowUserDialog(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error?.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setDeletingId(userId);
    try {
      await usersAPI.deleteUser(userId);
      toast.success('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-lg p-4 sm:p-6 text-white`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Users Management</h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Manage user accounts and their roles in the system.
        </p>
      </div>

      {/* Actions Bar */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-800">
                Total Users: {users.length}
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={loadUsers}
                disabled={isLoading}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button
                onClick={handleCreateUser}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#2E3094]/90 hover:to-[#4C51BF]/90"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No users found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first user.</p>
          <Button onClick={handleCreateUser} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </Card>
      ) : (
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">User</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Department</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Created</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.username}</p>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">{user.email}</td>
                      <td className="p-4">
                        {user.department_details ? (
                          <div>
                            <p className="font-medium text-gray-800">{user.department_details.department_shortname}</p>
                            <p className="text-xs text-gray-500">{user.department_details.department_name}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500">{user.department || 'N/A'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={user.role_details.role_name === 'superadmin' ? 'default' : 'secondary'}
                          className={user.role_details.role_name === 'superadmin' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-500 hover:bg-gray-600'
                          }
                        >
                          {user.role_details.role_name}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleEditUser(user)}
                            variant="outline"
                            size="sm"
                            className="border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600"
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Create New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information and role' : 'Add a new user to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingUser && <span className="text-sm text-gray-500">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? 'Enter new password (optional)' : 'Enter password'}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: parseInt(value) }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.department_shortname} - {department.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: parseInt(value) }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowUserDialog(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingUser ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingUser ? 'Update User' : 'Create User'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}