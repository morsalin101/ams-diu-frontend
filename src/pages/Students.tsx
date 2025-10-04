import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, Plus, Edit, Trash2, Search, Mail, User, Calendar, Loader2, RefreshCw, UserPlus, Eye } from 'lucide-react';
import { studentsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  username: string;
  f_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface StudentsProps {
  gradientClass: string;
}

export function Students({ gradientClass }: StudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    f_id: '',
    full_name: '',
    email: ''
  });

  // Load students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Filter students when search term or date filter changes
  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, dateFilter]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await studentsAPI.getAllStudents();
      const studentsData = response.results || response;
      const count = response.count || studentsData.length;
      
      setStudents(studentsData);
      setTotalCount(count);
      toast.success(`Loaded ${count} students`);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.f_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date (today's filter)
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(student => {
        const studentDate = new Date(student.created_at).toISOString().split('T')[0];
        return studentDate === today;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleAddStudent = async () => {
    if (!formData.username || !formData.password || !formData.f_id || !formData.full_name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const newStudent = await studentsAPI.createStudent(formData);
      setStudents(prev => [...prev, newStudent]);
      setTotalCount(prev => prev + 1);
      toast.success('Student added successfully!');
      
      // Reset form and close dialog
      setFormData({
        username: '',
        password: '',
        f_id: '',
        full_name: '',
        email: ''
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent || !formData.username || !formData.f_id || !formData.full_name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Don't send password if it's empty (optional for updates)
      const updateData = formData.password 
        ? formData 
        : { ...formData, password: undefined };
        
      const updatedStudent = await studentsAPI.updateStudent(editingStudent.id, updateData);
      
      setStudents(prev => 
        prev.map(s => s.id === editingStudent.id ? { ...s, ...updatedStudent } : s)
      );
      toast.success('Student updated successfully!');
      
      // Reset form and close dialog
      setFormData({
        username: '',
        password: '',
        f_id: '',
        full_name: '',
        email: ''
      });
      setEditingStudent(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    setDeletingId(id);
    try {
      await studentsAPI.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      setTotalCount(prev => prev - 1);
      toast.success('Student deleted successfully');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      username: student.username,
      password: '', // Don't populate password for security
      f_id: student.f_id,
      full_name: student.full_name,
      email: student.email
    });
    setShowEditDialog(true);
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
      <div className={`bg-gradient-to-r from-[#4C51BF] to-[#667EEA] ${gradientClass} rounded-lg p-4 sm:p-6 text-white`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Students Management</h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Manage student accounts, view profiles, and handle registrations.
        </p>
      </div>

      {/* Search and Actions */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Users className="h-5 w-5 text-blue-600" />
            Search & Actions
          </CardTitle>
          <CardDescription>
            Find students and manage accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Search and Filter */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, username, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Filter</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="today">Today Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>
                      Create a new student account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="student123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="f_id">Student ID *</Label>
                        <Input
                          id="f_id"
                          value={formData.f_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, f_id: e.target.value }))}
                          placeholder="FORM001"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddStudent}
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Student
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={loadStudents}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-800">
            Showing {filteredStudents.length} of {totalCount} students
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Students Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No students found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'No students have been registered yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="border-2 border-gray-200 hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold text-gray-800">
                    {student.full_name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    ID: {student.f_id}
                  </Badge>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Registered {formatDate(student.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Student Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">@{student.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span>Student #{student.id}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#2E3094]/90 hover:to-[#4C51BF]/90"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    onClick={() => openEditDialog(student)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-300 hover:border-blue-400"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteStudent(student.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                    disabled={deletingId === student.id}
                  >
                    {deletingId === student.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_username">Username *</Label>
                <Input
                  id="edit_username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="student123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_f_id">Student ID *</Label>
                <Input
                  id="edit_f_id"
                  value={formData.f_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, f_id: e.target.value }))}
                  placeholder="FORM001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">New Password (optional)</Label>
              <Input
                id="edit_password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditStudent}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Student
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