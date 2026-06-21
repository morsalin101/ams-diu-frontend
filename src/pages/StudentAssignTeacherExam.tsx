import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Users, UserPlus, Trash2, Search, Calendar, BookOpen, User, Building, AlertTriangle, Loader2, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { StudentAssignmentDialog } from '../components/StudentAssignmentDialog';
import { studentAssignmentAPI, studentsAPI, usersAPI, scheduleAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
import toast from 'react-hot-toast';

interface StudentAssignmentManagementProps {
  gradientClass: string;
}

interface StudentAssignment {
  id: number;
  student: number;
  teacher: number;
  exam: number;
  schedule: number;
  created_at: string;
  student_username: string;
  student_full_name: string;
  student_f_id: string;
  student_registration_semester: string;
  teacher_username: string;
  exam_department: string;
  exam_semester: string;
}

interface Student {
  id: number;
  username: string;
  f_id: string;
  full_name: string;
  email: string;
  department_shortname?: string;
  registration_semester: string;
  ssc?: number;
  hsc?: number;
  diploma?: number;
  created_at: string;
}

interface Teacher {
  id: number;
  username: string;
  email: string;
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

interface Schedule {
  id: number;
  exam: number;
  exam_details: {
    id: number;
    department: string;
    semester: string;
    total_questions: number;
    present_question: number;
    total_marks: number;
    duration_minutes: number;
    language: string;
    faculty: string;
    department_shortnames: string[];
    created_at: string;
    updated_at: string;
  };
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export function StudentAssignTeacherExam({ gradientClass }: StudentAssignmentManagementProps) {
  const { canWrite, canRead, canDelete } = usePermissions();

  const getResponseRows = (response: any) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.students)) return response.students;
    return [];
  };

  // State managementStudentAssignTeacherExamz
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [assignmentFilterOptions, setAssignmentFilterOptions] = useState<{
    registration_semesters?: string[];
  }>({});
  const [reloadKey, setReloadKey] = useState(0);

  // Form states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: '',
    exam_id: '',
    schedule_id: ''
  });

  // Filter states
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftFilterTeacher, setDraftFilterTeacher] = useState('all');
  const [appliedFilterTeacher, setAppliedFilterTeacher] = useState('all');
  const [draftFilterRegistrationSemester, setDraftFilterRegistrationSemester] = useState('all');
  const [appliedFilterRegistrationSemester, setAppliedFilterRegistrationSemester] = useState('all');
  const [draftFilterDate, setDraftFilterDate] = useState('all');
  const [appliedFilterDate, setAppliedFilterDate] = useState('all');

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadAssignments();
    setSelectedAssignments([]);
  }, [
    page,
    appliedSearch,
    appliedFilterTeacher,
    appliedFilterRegistrationSemester,
    appliedFilterDate,
    reloadKey,
  ]);

  // Load all required data
  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        loadStudents(),
        loadTeachers(),
        loadSchedules()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load assignments
  const loadAssignments = async () => {
    try {
      const response = await studentAssignmentAPI.getAllAssignments({
        page,
        search: appliedSearch || undefined,
        teacher_id: appliedFilterTeacher !== 'all' ? appliedFilterTeacher : undefined,
        registration_semester: appliedFilterRegistrationSemester !== 'all'
          ? appliedFilterRegistrationSemester
          : undefined,
        date_filter: appliedFilterDate === 'today' ? 'today' : undefined,
      });
      if (response && (response.success !== false)) {
        setAssignments(getResponseRows(response));
        setPagination(paginationFromDrf(response, page));
        setAssignmentFilterOptions(response.filter_options || {});
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
      setAssignments([]);
      setPagination(DEFAULT_PAGINATION);
    }
  };

  // Load students
  const loadStudents = async () => {
    try {
      const response = await studentsAPI.getAllStudentsForLookup();
      const studentsData = getResponseRows(response);
      if (studentsData.length === 0 && response && !Array.isArray(response)) {
        console.warn('Unexpected students API response format:', response);
      }

      setStudents(studentsData);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  // Load teachers (from dedicated teachers endpoint)
  const loadTeachers = async () => {
    try {
      const response = await usersAPI.getTeachers();
      if (response && (response.success !== false)) {
        setTeachers(getResponseRows(response));
      }
    } catch (error: any) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  // Load schedules
  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getAllSchedulesForLookup();
      if (response && (response.success !== false)) {
        setSchedules(getResponseRows(response));
      }
    } catch (error: any) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load schedules');
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!assignmentForm.teacher_id || !assignmentForm.schedule_id) {
      toast.error('Please select a teacher and schedule');
      return;
    }

    try {
      setIsLoading(true);
      const assignmentData = {
        student_ids: selectedStudents,
        teacher_id: parseInt(assignmentForm.teacher_id),
        exam_id: assignmentForm.exam_id ? parseInt(assignmentForm.exam_id) : null,
        schedule_id: parseInt(assignmentForm.schedule_id)
      };

      const response = await studentAssignmentAPI.assignBulk(assignmentData);
      if (response && (response.success !== false)) {
        toast.success(`Successfully assigned ${selectedStudents.length} students`);
        setShowAssignDialog(false);
        setSelectedStudents([]);
        setAssignmentForm({ teacher_id: '', exam_id: '', schedule_id: '' });
        setPage(1);
        setReloadKey((current) => current + 1);
      } else {
        toast.error(response.message || 'Failed to assign students');
      }
    } catch (error: any) {
      console.error('Error assigning students:', error);
      toast.error(error.message || 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle single assignment deletion
  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      setIsLoading(true);
      const response = await studentAssignmentAPI.deleteAssignment(assignmentId);
      if (response && (response.success !== false)) {
        toast.success('Assignment deleted successfully');
        setReloadKey((current) => current + 1);
      } else {
        toast.error(response.message || 'Failed to delete assignment');
      }
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast.error(error.message || 'Failed to delete assignment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedAssignments.length === 0) {
      toast.error('Please select assignments to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedAssignments.length} assignments?`)) return;

    try {
      setIsLoading(true);
      const response = await studentAssignmentAPI.deleteBulk(selectedAssignments);
      if (response && (response.success !== false)) {
        toast.success(`Successfully deleted ${selectedAssignments.length} assignments`);
        setSelectedAssignments([]);
        setReloadKey((current) => current + 1);
      } else {
        toast.error(response.message || 'Failed to delete assignments');
      }
    } catch (error: any) {
      console.error('Error deleting assignments:', error);
      toast.error(error.message || 'Failed to delete assignments');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter available students (not assigned) - MOVED UP
  const availableStudents = students.filter(student => 
    student && student.id && !assignments.some(assignment => assignment.student === student.id)
  );
  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedFilterTeacher(draftFilterTeacher);
    setAppliedFilterRegistrationSemester(draftFilterRegistrationSemester);
    setAppliedFilterDate(draftFilterDate);
    setReloadKey((current) => current + 1);
  };

  const handleClearFilters = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftFilterTeacher('all');
    setAppliedFilterTeacher('all');
    setDraftFilterRegistrationSemester('all');
    setAppliedFilterRegistrationSemester('all');
    setDraftFilterDate('all');
    setAppliedFilterDate('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const registrationSemesterOptions = [
    ...new Set((assignmentFilterOptions.registration_semesters || []).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));



  // Permission check
  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading...</h3>
          <p className="text-gray-600">Please wait while we load the data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {availableStudents.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Schedules</p>
                <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search students, teachers, student ID, or semester..."
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
              
              <Select value={draftFilterTeacher} onValueChange={setDraftFilterTeacher}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.username} ({teacher.department_details?.department_shortname || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={draftFilterRegistrationSemester} onValueChange={setDraftFilterRegistrationSemester}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Registered semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registered Semesters</SelectItem>
                  {registrationSemesterOptions.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={draftFilterDate} onValueChange={setDraftFilterDate}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today Only</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSearch}
                variant="outline"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>

              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={
                  isLoading ||
                  (!draftSearch &&
                    !appliedSearch &&
                    draftFilterTeacher === 'all' &&
                    appliedFilterTeacher === 'all' &&
                    draftFilterRegistrationSemester === 'all' &&
                    appliedFilterRegistrationSemester === 'all' &&
                    draftFilterDate === 'all' &&
                    appliedFilterDate === 'all')
                }
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="flex gap-2">
              {canWrite() && (
                <>
                  <Button 
                    onClick={() => setShowAssignDialog(true)}
                    className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A]"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Students
                  </Button>
                  
                  <StudentAssignmentDialog
                    open={showAssignDialog}
                    onOpenChange={setShowAssignDialog}
                    availableStudents={availableStudents}
                    teachers={teachers}
                    schedules={schedules}
                    selectedStudents={selectedStudents}
                    onSelectedStudentsChange={setSelectedStudents}
                    assignmentForm={assignmentForm}
                    onAssignmentFormChange={setAssignmentForm}
                    onAssign={handleBulkAssign}
                    isLoading={isLoading}
                    filterDate={draftFilterDate}
                  />
                </>
              )}

              {canDelete() && selectedAssignments.length > 0 && (
                <Button onClick={handleBulkDelete} variant="destructive" disabled={isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedAssignments.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Assignments</CardTitle>
          <CardDescription>
            Manage student-teacher-exam assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAssignments.length === assignments.length && assignments.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAssignments(assignments.map(a => a.id));
                        } else {
                          setSelectedAssignments([]);
                        }
                      }}
                      aria-label="Select page assignments"
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Registered Semester</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No assignments found</p>
                      <p className="text-gray-400 text-sm">
                        {appliedSearch ||
                        appliedFilterTeacher !== 'all' ||
                        appliedFilterRegistrationSemester !== 'all' ||
                        appliedFilterDate !== 'all'
                          ? 'No assignments match this search'
                          : 'No assignments have been created yet'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAssignments.includes(assignment.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAssignments([...selectedAssignments, assignment.id]);
                            } else {
                              setSelectedAssignments(selectedAssignments.filter(id => id !== assignment.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.student_full_name}</p>
                          <p className="text-sm text-gray-500">@{assignment.student_username || 'unknown'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.student_f_id || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">@{assignment.teacher_username || 'unknown'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{assignment.exam_department || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.student_registration_semester || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-500">
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {canDelete() && (
                          <Button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              pagination={pagination}
              onPageChange={setPage}
              isLoading={isLoading}
              itemLabel="assignments"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
