import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, UserPlus, Edit, Trash2, Loader2, RefreshCw, Eye, EyeOff, Search, Filter, X, RotateCcw } from 'lucide-react';
import { usersAPI, roleAPI, departmentAPI, facultyAPI, facultyDepartmentAPI } from '../services/api';
import PaginationControls from '../components/PaginationControls';
import toast from 'react-hot-toast';

interface FacultyDepartmentMapping {
  id: number;
  faculty: number;
  faculty_name: string;
  faculty_shortname: string;
  department_ids: number[];
}

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
  access_type: string;
  is_global_access: boolean;
  faculty_details?: {
    id: number;
    faculty_name: string;
    faculty_shortname: string;
  };
}

interface UsersManagementProps {
  gradientClass: string;
}

export function UsersManagement({ gradientClass }: UsersManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; department_name: string; department_shortname: string }[]>([]);
  const [faculties, setFaculties] = useState<{ id: number; faculty_name: string; faculty_shortname: string }[]>([]);
  const [facultyMappings, setFacultyMappings] = useState<FacultyDepartmentMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Search and structured filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [accessScopeFilter, setAccessScopeFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 2,
    selected_faculty: 'ALL', // 'ALL' or faculty id string
    selected_department: 'ALL' // 'ALL' or department id string
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRoles();
    loadDepartments();
    loadFaculties();
    loadFacultyMappings();
  }, []);

  const loadFacultyMappings = async () => {
    try {
      const response = await facultyDepartmentAPI.getAllMappings();
      if (Array.isArray(response)) {
        setFacultyMappings(response);
      } else if (response?.success && response?.data) {
        setFacultyMappings(response.data);
      }
    } catch (error) {
      console.error('Error loading faculty mappings:', error);
    }
  };

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

  const loadFaculties = async () => {
    try {
      const response = await facultyAPI.getAllFaculties();
      if (response.success && response.data) {
        setFaculties(response.data);
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
      toast.error('Failed to load faculties');
    }
  };

  const availableFilterDepartments = useMemo(() => {
    if (facultyFilter === 'ALL') return departments;
    const facId = parseInt(facultyFilter);
    const mapping = facultyMappings.find(m => (m as any).faculty_id === facId || m.faculty === facId);
    if (!mapping || !mapping.department_ids) return departments;
    return departments.filter(d => mapping.department_ids.includes(d.id));
  }, [facultyFilter, departments, facultyMappings]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setAccessScopeFilter('ALL');
    setFacultyFilter('ALL');
    setDepartmentFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    roleFilter !== 'ALL' ||
    accessScopeFilter !== 'ALL' ||
    facultyFilter !== 'ALL' ||
    departmentFilter !== 'ALL'
  );

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (accessScopeFilter !== 'ALL') params.access_type = accessScopeFilter;
      if (facultyFilter !== 'ALL') params.faculty = facultyFilter;
      if (departmentFilter !== 'ALL') params.department = departmentFilter;

      const response = await usersAPI.getAllUsers(params);
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

  // Sync users from backend when search/filters change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, accessScopeFilter, facultyFilter, departmentFilter]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, accessScopeFilter, departmentFilter]);

  // Reset department if no longer valid under selected faculty
  useEffect(() => {
    if (facultyFilter !== 'ALL' && departmentFilter !== 'ALL') {
      const exists = availableFilterDepartments.some(d => d.id.toString() === departmentFilter);
      if (!exists) {
        setDepartmentFilter('ALL');
      }
    }
    setCurrentPage(1);
  }, [facultyFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesUsername = (user.username || '').toLowerCase().includes(q);
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesId = user.id.toString().includes(q);
        if (!matchesUsername && !matchesEmail && !matchesId) return false;
      }
      if (roleFilter !== 'ALL') {
        const userRoleId = user.role_details?.id?.toString();
        const userRoleName = user.role_details?.role_name?.toLowerCase();
        if (userRoleId !== roleFilter && userRoleName !== roleFilter.toLowerCase()) {
          return false;
        }
      }
      if (accessScopeFilter !== 'ALL') {
        const access = (user.access_type || '').toUpperCase();
        if (accessScopeFilter === 'GLOBAL') {
          if (!user.is_global_access && access !== 'GLOBAL' && user.role_details?.role_name !== 'superadmin') {
            return false;
          }
        } else if (accessScopeFilter === 'FACULTY') {
          if (access !== 'FACULTY') return false;
        } else if (accessScopeFilter === 'DEPARTMENT') {
          if (access !== 'DEPARTMENT') return false;
        }
      }
      if (facultyFilter !== 'ALL') {
        if (user.faculty_details?.id?.toString() !== facultyFilter) {
          return false;
        }
      }
      if (departmentFilter !== 'ALL') {
        if (user.department_details?.id?.toString() !== departmentFilter) {
          return false;
        }
      }
      return true;
    });
  }, [users, searchTerm, roleFilter, accessScopeFilter, facultyFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: roles.length > 0 ? roles[0].id : 2,
      selected_faculty: 'ALL',
      selected_department: 'ALL'
    });
    setShowUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    let initFaculty = 'ALL';
    let initDepartment = 'ALL';

    const normalizedAccess = (user.access_type || '').toUpperCase();
    if (user.is_global_access || normalizedAccess === 'GLOBAL' || user.role_details?.role_name === 'superadmin') {
      initFaculty = 'ALL';
      initDepartment = 'ALL';
    } else if (normalizedAccess === 'FACULTY' && user.faculty_details?.id) {
      initFaculty = user.faculty_details.id.toString();
      initDepartment = 'ALL';
    } else if (normalizedAccess === 'DEPARTMENT' && user.department_details?.id) {
      initDepartment = user.department_details.id.toString();
      if (user.faculty_details?.id) {
        initFaculty = user.faculty_details.id.toString();
      } else {
        const foundMapping = facultyMappings.find(m => m.department_ids?.includes(user.department_details!.id));
        if (foundMapping) {
          initFaculty = ((foundMapping as any).faculty_id || foundMapping.faculty).toString();
        }
      }
    }

    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role_id: user.role_details.id,
      selected_faculty: initFaculty,
      selected_department: initDepartment
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
      const isGlobal = formData.selected_faculty === 'ALL';
      const isFacultyScope = !isGlobal && formData.selected_department === 'ALL';
      const isDepartmentScope = !isGlobal && formData.selected_department !== 'ALL';

      const access_type = isGlobal ? 'GLOBAL' : (isFacultyScope ? 'FACULTY' : 'DEPARTMENT');
      const is_global_access = isGlobal;
      const faculty_id = isGlobal ? null : parseInt(formData.selected_faculty);
      const department_id = isDepartmentScope ? parseInt(formData.selected_department) : null;

      const payload: any = {
        username: formData.username,
        email: formData.email,
        role_id: formData.role_id,
        access_type,
        is_global_access,
        faculty_id,
        department_id,
        ...(formData.password.trim() ? { password: formData.password } : {})
      };

      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, payload);
        toast.success('User updated successfully!');
      } else {
        await usersAPI.createUser(payload);
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

  const selectedFacultyId = formData.selected_faculty !== 'ALL' ? parseInt(formData.selected_faculty) : null;
  const activeMapping = selectedFacultyId
    ? facultyMappings.find(m => (m.faculty === selectedFacultyId || (m as any).faculty_id === selectedFacultyId))
    : null;
  const availableDepartments = selectedFacultyId && activeMapping
    ? departments.filter(d => activeMapping.department_ids?.includes(d.id))
    : departments;

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {/* Search and Filters Card */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users by name, username, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-10 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-slate-600 hover:text-red-600 hover:border-red-300 flex items-center gap-1.5 h-10 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Role
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Access Scope Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Access Scope</label>
              <Select value={accessScopeFilter} onValueChange={setAccessScopeFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50">
                  <SelectValue placeholder="All Scopes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Scopes</SelectItem>
                  <SelectItem value="GLOBAL">Global Scope</SelectItem>
                  <SelectItem value="FACULTY">Faculty Scope</SelectItem>
                  <SelectItem value="DEPARTMENT">Department Scope</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faculty Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Faculty</label>
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50">
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Faculties</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.faculty_shortname || f.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {availableFilterDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.department_shortname || d.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Badges & Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[11px] font-normal py-0">
                  Filtered
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <span className="text-[11px] text-slate-400">
                {searchTerm && `• Search: "${searchTerm}" `}
                {roleFilter !== 'ALL' && `• Role: ${roles.find(r => r.id.toString() === roleFilter)?.role_name || roleFilter} `}
                {accessScopeFilter !== 'ALL' && `• Scope: ${accessScopeFilter} `}
                {facultyFilter !== 'ALL' && `• Faculty: ${faculties.find(f => f.id.toString() === facultyFilter)?.faculty_shortname || facultyFilter} `}
                {departmentFilter !== 'ALL' && `• Dept: ${departments.find(d => d.id.toString() === departmentFilter)?.department_shortname || departmentFilter} `}
              </span>
            )}
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
      ) : filteredUsers.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Filter className="h-10 w-10 mx-auto mb-3 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No matching users</h3>
          <p className="text-sm text-slate-500 mb-4">No user accounts match the current search or filter criteria.</p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mx-auto">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">User</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Access Scope</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Department</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Created</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
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
                        <Badge 
                          variant={user.role_details?.role_name === 'superadmin' ? 'default' : 'secondary'}
                          className={user.role_details?.role_name === 'superadmin' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-500 hover:bg-gray-600'
                          }
                        >
                          {user.role_details?.role_name || 'No Role'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const access = (user.access_type || '').toUpperCase();
                          if (user.is_global_access || access === 'GLOBAL' || user.role_details?.role_name === 'superadmin') {
                            return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Global Scope</Badge>;
                          }
                          if (access === 'FACULTY') {
                            return (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                                Faculty: {user.faculty_details?.faculty_shortname || user.faculty_details?.faculty_name || 'Assigned'}
                              </Badge>
                            );
                          }
                          if (access === 'DEPARTMENT') {
                            return (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Dept Level
                              </Badge>
                            );
                          }
                          return <Badge variant="outline">Unrestricted</Badge>;
                        })()}
                      </td>
                      <td className="p-4">
                        {user.department_details ? (
                          <div>
                            <p className="font-medium text-gray-800">{user.department_details.department_shortname}</p>
                            <p className="text-xs text-gray-500">{user.department_details.department_name}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            {user.department || (user.is_global_access || (user.access_type || '').toUpperCase() === 'GLOBAL' || user.role_details?.role_name === 'superadmin' 
                              ? 'All (Global)' 
                              : (user.access_type || '').toUpperCase() === 'FACULTY' 
                              ? 'All (Faculty)' 
                              : 'N/A')}
                          </span>
                        )}
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

            {/* Pagination Controls */}
            <PaginationControls
              pagination={{
                count: filteredUsers.length,
                current_page: currentPage,
                total_pages: totalPages,
                page_size: pageSize,
                has_next: currentPage < totalPages,
                has_previous: currentPage > 1,
              }}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel="users"
            />
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
              {editingUser ? 'Update user information and access scope' : 'Add a new user with faculty or department access'}
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
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: parseInt(value) }))}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
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

            {/* Coordinated Faculty Field */}
            <div className="space-y-2">
              <Label htmlFor="faculty_scope">Faculty Scope</Label>
              <Select
                value={formData.selected_faculty}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    selected_faculty: value,
                    selected_department: 'ALL'
                  }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="faculty_scope">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Faculties (Global Access)</SelectItem>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.faculty_shortname} - {faculty.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coordinated Department Field */}
            <div className="space-y-2">
              <Label htmlFor="department_scope">Department Scope</Label>
              <Select
                value={formData.selected_department}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, selected_department: value }));
                }}
                disabled={isSubmitting || formData.selected_faculty === 'ALL'}
              >
                <SelectTrigger id="department_scope">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {formData.selected_faculty === 'ALL'
                      ? 'All Departments (Global Scope)'
                      : 'All Departments in Faculty (Faculty Scope)'}
                  </SelectItem>
                  {availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.department_shortname} - {department.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.selected_faculty === 'ALL'
                  ? 'Global Scope: User has access across all faculties and all departments.'
                  : formData.selected_department === 'ALL'
                  ? 'Faculty Scope: User automatically receives access to all departments in this faculty.'
                  : 'Department Scope: User is strictly restricted to this single department.'}
              </p>
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
