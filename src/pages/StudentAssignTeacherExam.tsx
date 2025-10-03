import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Users, UserPlus, Trash2, Search, Filter, Calendar, BookOpen, User, Building, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { studentAssignmentAPI, studentsAPI, usersAPI, examAPI, scheduleAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
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
  department_shortname: string;
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
  department_details: {
    id: number;
    department_name: string;
    department_shortname: string;
  };
}

interface Exam {
  id: number;
  department: string;
  semester: string;
  duration_minutes: number;
  created_at: string;
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
  const { user } = useAuth();
  const { canWrite, canRead, canDelete } = usePermissions();

  // State managementStudentAssignTeacherExamz
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: '',
    exam_id: '',
    schedule_id: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load all required data
  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        loadAssignments(),
        loadStudents(),
        loadTeachers(),
        loadExams(),
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
      const response = await studentAssignmentAPI.getAllAssignments();
      if (response && (response.success !== false)) {
        const data = response.data || response;
        setAssignments(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    }
  };

  // Load students
  const loadStudents = async () => {
    try {
      const response = await studentsAPI.getAllStudents();
      if (response && (response.success !== false)) {
        const data = response.data || response;
        // Handle paginated response with results array
        const studentsData = data.results || data;
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      }
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  // Load teachers (from dedicated teachers endpoint)
  const loadTeachers = async () => {
    try {
      const response = await usersAPI.getTeachers();
      if (response && response.success && response.data) {
        setTeachers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  // Load exams
  const loadExams = async () => {
    try {
      const response = await examAPI.getAllExams();
      if (response && (response.success !== false)) {
        const data = response.data || response;
        setExams(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
    }
  };

  // Load schedules
  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getAllSchedules();
      if (response && (response.success !== false)) {
        const data = response.data || response;
        // Handle paginated response with results array
        const schedulesData = data.results || data;
        console.log('Loaded schedules:', schedulesData); // Debug log
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
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

    if (!assignmentForm.teacher_id || !assignmentForm.exam_id || !assignmentForm.schedule_id) {
      toast.error('Please fill in all assignment details');
      return;
    }

    try {
      setIsLoading(true);
      const assignmentData = {
        student_ids: selectedStudents,
        teacher_id: parseInt(assignmentForm.teacher_id),
        exam_id: parseInt(assignmentForm.exam_id),
        schedule_id: parseInt(assignmentForm.schedule_id)
      };

      const response = await studentAssignmentAPI.assignBulk(assignmentData);
      if (response && (response.success !== false)) {
        toast.success(`Successfully assigned ${selectedStudents.length} students`);
        setShowAssignDialog(false);
        setSelectedStudents([]);
        setAssignmentForm({ teacher_id: '', exam_id: '', schedule_id: '' });
        loadAssignments();
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
        loadAssignments();
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
        loadAssignments();
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

  // Helper function to check if date is today
  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  // Filter available students (not assigned) - MOVED UP
  const availableStudents = students.filter(student => 
    !assignments.some(assignment => assignment.student === student.id)
  );

  // Filter available students based on date filter - MOVED UP
  const filteredAvailableStudents = availableStudents.filter(student => {
    return !filterDate || (filterDate === 'today' && isToday(student.created_at));
  });

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.student_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student_f_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.teacher_username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeacher = !filterTeacher || filterTeacher === 'all' || assignment.teacher.toString() === filterTeacher;
    const matchesExam = !filterExam || assignment.exam.toString() === filterExam;
    
    const matchesDate = !filterDate || 
      (filterDate === 'today' && isToday(assignment.created_at));

    return matchesSearch && matchesTeacher && matchesExam && matchesDate;
  });

  // Filter schedules based on date filter
  const filteredSchedules = schedules.filter(schedule => {
    return !filterDate || (filterDate === 'today' && isToday(schedule.created_at));
  });

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
      {/* Header */}
      <div className={`bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-lg p-4 sm:p-6 text-white`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Student Assignment Management</h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Assign students to teachers and exams, manage student-teacher-exam relationships.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
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
                  {filterDate ? filteredAvailableStudents.length : availableStudents.length}
                  {filterDate && (
                    <span className="text-sm text-gray-500 ml-1">({availableStudents.length} total)</span>
                  )}
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
                    placeholder="Search students, teachers, or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.username} ({teacher.department_details.department_shortname})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today Only</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || filterTeacher !== '' || filterDate !== '') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTeacher('');
                    setFilterDate('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {canWrite() && (
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A]">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Students
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    <DialogHeader>
                      <DialogTitle>Assign Students to Teacher and Exam</DialogTitle>
                      <DialogDescription>
                        Select students and assign them to a teacher and exam schedule.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Student Selection */}
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Select Students</Label>
                        <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
                          {filteredAvailableStudents.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No available students to assign</p>
                          ) : (
                            <div className="space-y-2">
                              {filteredAvailableStudents.map((student) => (
                                <div key={student.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                                  <Checkbox
                                    checked={selectedStudents.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedStudents([...selectedStudents, student.id]);
                                      } else {
                                        setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                      }
                                    }}
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium">{student.full_name}</p>
                                    <p className="text-sm text-gray-500">@{student.username} | ID: {student.f_id}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Selected: {selectedStudents.length} students
                        </p>
                      </div>

                      {/* Assignment Details */}
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Assignment Details</Label>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="teacher">Teacher</Label>
                            <Select
                              value={assignmentForm.teacher_id}
                              onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, teacher_id: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map(teacher => (
                                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                    {teacher.username} ({teacher.department_details.department_shortname})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="exam">Exam</Label>
                            <Select
                              value={assignmentForm.exam_id}
                              onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, exam_id: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select exam" />
                              </SelectTrigger>
                              <SelectContent>
                                {exams.length === 0 ? (
                                  <div className="p-2 text-sm text-gray-500 text-center">No exams available</div>
                                ) : (
                                  exams.map(exam => (
                                    <SelectItem key={exam.id} value={exam.id.toString()}>
                                      {exam.department} - {exam.semester}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="schedule">Schedule</Label>
                            <Select
                              value={assignmentForm.schedule_id}
                              onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, schedule_id: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select schedule" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredSchedules.map(schedule => (
                                  <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                    {schedule.exam_details ? (
                                      `${schedule.exam_details.department} - ${schedule.exam_details.semester} | ${new Date(schedule.start_time).toLocaleDateString()} | ${new Date(schedule.start_time).toLocaleTimeString()} - ${new Date(schedule.end_time).toLocaleTimeString()}`
                                    ) : (
                                      `Schedule ${schedule.id} | ${new Date(schedule.start_time).toLocaleDateString()} | ${new Date(schedule.start_time).toLocaleTimeString()} - ${new Date(schedule.end_time).toLocaleTimeString()}`
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleBulkAssign}
                            disabled={isLoading || selectedStudents.length === 0}
                            className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A]"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Students ({selectedStudents.length})
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      checked={selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAssignments(filteredAssignments.map(a => a.id));
                        } else {
                          setSelectedAssignments([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No assignments found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
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
                          <p className="text-sm text-gray-500">@{assignment.student_username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.student_f_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">@{assignment.teacher_username}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{assignment.exam_department}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.exam_semester}</Badge>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}