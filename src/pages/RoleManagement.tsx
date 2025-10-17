  import { useState, useEffect } from 'react';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
  import { Button } from '../components/ui/button';
  import { Input } from '../components/ui/input';
  import { Label } from '../components/ui/label';
  import { Badge } from '../components/ui/badge';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from '../components/ui/dialog';
  import { Shield, Plus, Edit, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
  import { roleAPI } from '../services/api';
  import toast from 'react-hot-toast';

  interface Role {
    id: number;
    role_name: string;
  }

  interface RoleManagementProps {
    gradientClass: string;
  }

  export function RoleManagement({ gradientClass }: RoleManagementProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
      role_name: ''
    });

    useEffect(() => {
      loadRoles();
    }, []);

    const loadRoles = async () => {
      setIsLoading(true);
      try {
        const response = await roleAPI.getAllRoles();
        const rolesData = response.data || response;
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading roles:', error);
        toast.error('Failed to load roles');
      } finally {
        setIsLoading(false);
      }
    };

    const handleCreateRole = async () => {
      if (!formData.role_name.trim()) {
        toast.error('Please enter a role name');
        return;
      }

      setIsCreating(true);
      try {
        const response = await roleAPI.createRole({
          role_name: formData.role_name.trim()
        });
        
        toast.success('Role created successfully!');
        setFormData({ role_name: '' });
        setShowCreateDialog(false);
        loadRoles();
      } catch (error: any) {
        console.error('Error creating role:', error);
        toast.error(error.message || 'Failed to create role');
      } finally {
        setIsCreating(false);
      }
    };

    const handleEditRole = (role: Role) => {
      setEditingRole(role);
      setFormData({ role_name: role.role_name });
      setShowEditDialog(true);
    };

    const handleUpdateRole = async () => {
      if (!editingRole || !formData.role_name.trim()) {
        toast.error('Please enter a valid role name');
        return;
      }

      setIsUpdating(true);
      try {
        await roleAPI.updateRole(editingRole.id, {
          role_name: formData.role_name.trim()
        });
        
        toast.success('Role updated successfully!');
        setShowEditDialog(false);
        setEditingRole(null);
        setFormData({ role_name: '' });
        loadRoles();
      } catch (error: any) {
        console.error('Error updating role:', error);
        toast.error(error.message || 'Failed to update role');
      } finally {
        setIsUpdating(false);
      }
    };

    const handleDeleteRole = async (roleId: number, roleName: string) => {
      if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
        return;
      }

      setIsDeleting(roleId);
      try {
        await roleAPI.deleteRole(roleId);
        toast.success('Role deleted successfully!');
        loadRoles();
      } catch (error: any) {
        console.error('Error deleting role:', error);
        toast.error(error.message || 'Failed to delete role');
      } finally {
        setIsDeleting(null);
      }
    };

    const resetForm = () => {
      setFormData({ role_name: '' });
      setEditingRole(null);
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className={`bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-lg p-4 sm:p-6 text-white`}>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Role Management</h1>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Manage system roles and permissions for your application.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Shield className="h-5 w-5 text-blue-600" />
                  System Roles
                </CardTitle>
                <CardDescription>
                  Manage and configure user roles in the system
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={loadRoles} variant="outline" size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            
                  <DialogTrigger asChild>
                    <Button size="sm" className={`bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white hover:opacity-90`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent >
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Add a new role to the system. Enter a unique role name.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="role_name">Role Name</Label>
                        <Input
                          id="role_name"
                          placeholder="Enter role name (e.g., admin, moderator)"
                          value={formData.role_name}
                          onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowCreateDialog(false);
                            resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateRole}
                          disabled={isCreating || !formData.role_name.trim()}
                          className={`bg-gradient-to-r ${gradientClass}`}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Role
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading roles...</p>
                </div>
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No roles found</h3>
                <p className="text-gray-600 mb-4">Create your first role to get started.</p>
                <Button onClick={() => setShowCreateDialog(true)} className={`bg-gradient-to-r ${gradientClass}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Role
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Role Name</TableHead>
                    <TableHead className="text-center w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{role.id}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{role.role_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id, role.role_name)}
                            disabled={isDeleting === role.id}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            {isDeleting === role.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role information. Changes will be applied immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit_role_name">Role Name</Label>
                <Input
                  id="edit_role_name"
                  placeholder="Enter role name"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateRole()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateRole}
                  disabled={isUpdating || !formData.role_name.trim()}
                  className={`bg-gradient-to-r ${gradientClass}`}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Role
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }