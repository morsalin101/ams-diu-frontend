import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, Plus, Edit, Trash2, Search, Loader2, RefreshCw, UserPlus, Eye, X } from 'lucide-react';
import { studentsAPI } from '../services/api';
import { buildAcademicSemesterOptions } from '../lib/semester';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
import toast from 'react-hot-toast';

type AcademicType = 'HSC' | 'DIPLOMA';

interface Student {
  id: number;
  username: string;
  f_id: string;
  full_name: string;
  email: string;
  department_shortname?: string;
  registration_semester: string;
  ssc?: number;
  academic_type?: AcademicType;
  hsc?: number;
  diploma?: number;
  created_at: string;
}

// Default password for new student accounts.
const DEFAULT_STUDENT_PASSWORD = '123';

const createEmptyFormData = () => ({
  username: '',
  password: DEFAULT_STUDENT_PASSWORD,
  f_id: '',
  full_name: '',
  email: '',
  department_shortname: 'CSE',
  registration_semester: '',
  ssc: '',
  academic_type: 'HSC' as AcademicType,
  hsc: '',
  diploma: ''
});

// Last name, symbols/spaces stripped — used for the fallback email.
// Stored/shown when a student is added without an email.
const NOT_ENTERED_EMAIL = 'Not Entered';

const getStudentAcademicType = (student: Student): AcademicType => {
  if (student.academic_type === 'DIPLOMA') {
    return 'DIPLOMA';
  }

  return student.diploma && student.diploma > 0 ? 'DIPLOMA' : 'HSC';
};

const getStudentAcademicLabel = (student: Student) =>
  getStudentAcademicType(student) === 'DIPLOMA' ? 'Diploma' : 'HSC';

const getStudentAcademicValue = (student: Student) =>
  getStudentAcademicType(student) === 'DIPLOMA' ? student.diploma : student.hsc;

const buildStudentPayload = (formData: ReturnType<typeof createEmptyFormData>) => ({
  ...formData,
  // Applicant ID drives both username and f_id (one identifier for applicants).
  f_id: formData.f_id || formData.username,
  // Email is optional; fall back to a clear "Not Entered" marker.
  email: formData.email.trim() || NOT_ENTERED_EMAIL,
  hsc: formData.academic_type === 'HSC' ? formData.hsc : '0',
  diploma: formData.academic_type === 'DIPLOMA' ? formData.diploma : '0',
});

interface StudentsProps {
  gradientClass: string;
}

export function Students({ gradientClass }: StudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftDateFilter, setDraftDateFilter] = useState('all');
  const [appliedDateFilter, setAppliedDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState(createEmptyFormData());
  // Password auto-fills from last name until the admin edits it manually.
  const [passwordAuto, setPasswordAuto] = useState(true);

  // Only current and next year semesters are valid for new student registration.
  const semesterOptions = buildAcademicSemesterOptions({ previousYears: 0, nextYears: 1 });

  const handleAcademicTypeChange = (value: string) => {
    const academicType = value as AcademicType;
    setFormData(prev => ({
      ...prev,
      academic_type: academicType,
      hsc: academicType === 'HSC' ? prev.hsc : '',
      diploma: academicType === 'DIPLOMA' ? prev.diploma : ''
    }));
  };

  const handleAcademicScoreChange = (value: string) => {
    setFormData(prev =>
      prev.academic_type === 'DIPLOMA'
        ? { ...prev, diploma: value }
        : { ...prev, hsc: value }
    );
  };

  useEffect(() => {
    loadStudents();
  }, [page, appliedSearch, appliedDateFilter, reloadKey]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await studentsAPI.getAllStudents({
        page,
        search: appliedSearch || undefined,
        date_filter: appliedDateFilter === 'today' ? 'today' : undefined,
      });
      
      let studentsData = [];
      if (Array.isArray(response)) {
        studentsData = response;
      } else if (response && Array.isArray(response.students)) {
        // Handle the new API format with 'students' array
        studentsData = response.students;
      } else if (response && Array.isArray(response.results)) {
        studentsData = response.results;
      } else if (response && Array.isArray(response.data)) {
        studentsData = response.data;
      } else {
        console.warn('Unexpected API response format:', response);
        studentsData = [];
      }
      
      const nextPagination = paginationFromDrf(response, page);
      const count = nextPagination.count || studentsData.length;
      
      setStudents(studentsData);
      setPagination(nextPagination);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students: ' + ((error as any)?.message || 'Unknown error'));
      // Reset to empty array on error
      setStudents([]);
      setPagination(DEFAULT_PAGINATION);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedDateFilter(draftDateFilter);
    setReloadKey(prev => prev + 1);
  };

  const handleClearSearch = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftDateFilter('all');
    setAppliedDateFilter('all');
    setPage(1);
    setReloadKey(prev => prev + 1);
  };

  const handleAddStudent = async () => {
    const academicScore = formData.academic_type === 'DIPLOMA' ? formData.diploma : formData.hsc;
    if (!formData.username || !formData.password || !formData.full_name || !formData.department_shortname || !formData.registration_semester || !formData.ssc || !academicScore) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await studentsAPI.createStudent(buildStudentPayload(formData));
      toast.success('Student added successfully!');
      
      // Reset form and close dialog
      setFormData(createEmptyFormData());
      setShowAddDialog(false);
      setPage(1);
      setReloadKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    const academicScore = formData.academic_type === 'DIPLOMA' ? formData.diploma : formData.hsc;
    if (!editingStudent || !formData.username || !formData.full_name || !formData.email || !formData.department_shortname || !formData.registration_semester || !formData.ssc || !academicScore) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Don't send password if it's empty (optional for updates)
      const studentPayload = buildStudentPayload(formData);
      const updateData = studentPayload.password
        ? studentPayload
        : { ...studentPayload, password: undefined };
        
      const response = await studentsAPI.updateStudent(editingStudent.id, updateData);
      const updatedStudent = response?.data || response;
      
      setStudents(prev => 
        Array.isArray(prev) ? prev.map(s => s.id === editingStudent.id ? { ...s, ...updatedStudent } : s) : []
      );
      toast.success('Student updated successfully!');
      
      // Reset form and close dialog
      setFormData(createEmptyFormData());
      setEditingStudent(null);
      setShowEditDialog(false);
      setReloadKey(prev => prev + 1);
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
      toast.success('Student deleted successfully');
      setReloadKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (student: Student) => {
    const academicType = getStudentAcademicType(student);
    setEditingStudent(student);
    setPasswordAuto(false); // Editing: keep existing password unless typed.
    setFormData({
      username: student.username || '',
      password: '', // Don't populate password for security
      f_id: student.f_id || '',
      full_name: student.full_name || '',
      email: student.email || '',
      department_shortname: student.department_shortname || '',
      registration_semester: student.registration_semester || '',
      ssc: student.ssc ? student.ssc.toString() : '',
      academic_type: academicType,
      hsc: student.hsc ? student.hsc.toString() : '',
      diploma: student.diploma ? student.diploma.toString() : ''
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (student: Student) => {
    setViewingStudent(student);
    setShowViewDialog(true);
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
      {/* Search and Actions */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="pb-2 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Users className="h-5 w-5 text-blue-600" />
            Search & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-6">
          <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-end">
            {/* Search and Filter */}
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, username, ID, email, or semester..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Filter</label>
                <Select value={draftDateFilter} onValueChange={setDraftDateFilter}>
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
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:w-auto xl:flex">
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full xl:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                type="button"
                onClick={handleClearSearch}
                disabled={isLoading && !appliedSearch && appliedDateFilter === 'all'}
                variant="outline"
                className="w-full xl:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Dialog
                open={showAddDialog}
                onOpenChange={(open) => {
                  if (open) {
                    setFormData(createEmptyFormData());
                    setPasswordAuto(true);
                  }
                  setShowAddDialog(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 xl:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] w-[min(96vw,28rem)] !max-w-[min(96vw,28rem)] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>
                      Create a new student account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Applicant ID *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="APP001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => {
                          const full_name = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            full_name,
                            password: passwordAuto ? DEFAULT_STUDENT_PASSWORD : prev.password,
                          }));
                        }}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Optional — auto-filled if blank"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department_shortname">Department *</Label>
                        <Input
                          id="department_shortname"
                          value={formData.department_shortname}
                          onChange={(e) => setFormData(prev => ({ ...prev, department_shortname: e.target.value }))}
                          placeholder="CSE"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration_semester">Registration Semester *</Label>
                      <Select
                        value={formData.registration_semester}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, registration_semester: value }))}
                      >
                        <SelectTrigger id="registration_semester">
                          <SelectValue placeholder="Select registration semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {semesterOptions.map((semester) => (
                            <SelectItem key={semester} value={semester}>
                              {semester}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="text"
                        value={formData.password}
                        onChange={(e) => {
                          setPasswordAuto(false);
                          setFormData(prev => ({ ...prev, password: e.target.value }));
                        }}
                        placeholder="Defaults to 123"
                      />
                      <p className="text-xs text-gray-500">Defaults to 123. Edit to override.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="ssc">SSC GPA *</Label>
                        <Input
                          id="ssc"
                          type="number"
                          value={formData.ssc}
                          onChange={(e) => setFormData(prev => ({ ...prev, ssc: e.target.value }))}
                          placeholder="5.00"
                          min="0"
                          max="5"
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="academic_type">Academic Type *</Label>
                        <Select
                          value={formData.academic_type}
                          onValueChange={handleAcademicTypeChange}
                        >
                          <SelectTrigger id="academic_type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HSC">HSC</SelectItem>
                            <SelectItem value="DIPLOMA">Diploma</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="academic_score">
                          {formData.academic_type === 'DIPLOMA' ? 'Diploma CGPA *' : 'HSC GPA *'}
                        </Label>
                        <Input
                          id="academic_score"
                          type="number"
                          value={formData.academic_type === 'DIPLOMA' ? formData.diploma : formData.hsc}
                          onChange={(e) => handleAcademicScoreChange(e.target.value)}
                          placeholder={formData.academic_type === 'DIPLOMA' ? '4.00' : '5.00'}
                          min="0"
                          max={formData.academic_type === 'DIPLOMA' ? '4' : '5'}
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
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
                className="w-full xl:w-auto"
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
            Showing {Array.isArray(students) ? students.length : 0} of {totalCount} students
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        </div>
      ) : !Array.isArray(students) || students.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No students found</h3>
          <p className="text-gray-600">
            {appliedSearch || appliedDateFilter !== 'all'
              ? 'No students match this search.'
              : 'No students have been registered yet.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Scores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(Array.isArray(students) ? students : []).map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{student.username} • ID: {student.f_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.email}</div>
                      <div className="text-sm text-gray-500">
                        Registered: {formatDate(student.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {student.department_shortname || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary" className="text-xs">
                        {student.registration_semester || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>SSC: <span className="font-medium">{student.ssc ?? 'N/A'}</span></div>
                        <div>{getStudentAcademicLabel(student)}: <span className="font-medium">{getStudentAcademicValue(student) ?? 'N/A'}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openViewDialog(student)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          title="View Student"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => openEditDialog(student)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                          title="Edit Student"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteStudent(student.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          disabled={deletingId === student.id}
                          title="Delete Student"
                        >
                          {deletingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            isLoading={isLoading}
            itemLabel="students"
          />
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,28rem)] !max-w-[min(96vw,28rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_username">Applicant ID *</Label>
              <Input
                id="edit_username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="APP001"
              />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Label htmlFor="edit_department_shortname">Department *</Label>
                <Input
                  id="edit_department_shortname"
                  value={formData.department_shortname}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_shortname: e.target.value }))}
                  placeholder="CSE"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_registration_semester">Registration Semester *</Label>
              <Select
                value={formData.registration_semester}
                onValueChange={(value) => setFormData(prev => ({ ...prev, registration_semester: value }))}
              >
                <SelectTrigger id="edit_registration_semester">
                  <SelectValue placeholder="Select registration semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit_ssc">SSC GPA *</Label>
                <Input
                  id="edit_ssc"
                  type="number"
                  value={formData.ssc}
                  onChange={(e) => setFormData(prev => ({ ...prev, ssc: e.target.value }))}
                  placeholder="5.00"
                  min="0"
                  max="5"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_academic_type">Academic Type *</Label>
                <Select
                  value={formData.academic_type}
                  onValueChange={handleAcademicTypeChange}
                >
                  <SelectTrigger id="edit_academic_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HSC">HSC</SelectItem>
                    <SelectItem value="DIPLOMA">Diploma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_academic_score">
                  {formData.academic_type === 'DIPLOMA' ? 'Diploma CGPA *' : 'HSC GPA *'}
                </Label>
                <Input
                  id="edit_academic_score"
                  type="number"
                  value={formData.academic_type === 'DIPLOMA' ? formData.diploma : formData.hsc}
                  onChange={(e) => handleAcademicScoreChange(e.target.value)}
                  placeholder={formData.academic_type === 'DIPLOMA' ? '4.00' : '5.00'}
                  min="0"
                  max={formData.academic_type === 'DIPLOMA' ? '4' : '5'}
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
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

      {/* View Student Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,42rem)] !max-w-[min(96vw,42rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Complete information about the student
            </DialogDescription>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                    <p className="break-words text-sm font-medium text-gray-900">{viewingStudent.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Student ID</Label>
                    <p className="break-words text-sm font-medium text-gray-900">{viewingStudent.f_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Username</Label>
                    <p className="break-words text-sm font-medium text-gray-900">@{viewingStudent.username}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Department</Label>
                    <Badge variant="outline">{viewingStudent.department_shortname || 'Not Specified'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Registration Semester</Label>
                    <Badge variant="secondary">{viewingStudent.registration_semester || 'Not Specified'}</Badge>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                  <p className="break-words text-sm font-medium text-gray-900">{viewingStudent.email}</p>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Academic Scores</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium text-blue-700">SSC GPA</Label>
                    <p className="text-2xl font-bold text-blue-600">{viewingStudent.ssc ?? 'N/A'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium text-green-700">
                      {getStudentAcademicLabel(viewingStudent)} {getStudentAcademicType(viewingStudent) === 'DIPLOMA' ? 'CGPA' : 'GPA'}
                    </Label>
                    <p className="text-2xl font-bold text-green-600">{getStudentAcademicValue(viewingStudent) ?? 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">System Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Student Database ID</Label>
                    <p className="break-words text-sm font-medium text-gray-900">#{viewingStudent.id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Registration Date</Label>
                    <p className="break-words text-sm font-medium text-gray-900">{formatDate(viewingStudent.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setShowViewDialog(false)}
                  className="min-w-[100px]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
