import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, User, BookOpen, Calendar, Building, Search, RefreshCw, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { studentAssignmentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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
  schedule_exam_date: string;
  schedule_duration: number;
}

const MyStudents: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<StudentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadMyStudents();
    }
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [assignments, searchTerm, filterDepartment, filterSemester]);

  const loadMyStudents = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const response = await studentAssignmentAPI.getAssignmentsByTeacher(user.id);
      const data = Array.isArray(response) ? response : response.data || [];
      setAssignments(data);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...assignments];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (assignment) =>
          assignment.student_full_name.toLowerCase().includes(search) ||
          assignment.student_username.toLowerCase().includes(search) ||
          assignment.student_f_id.toLowerCase().includes(search)
      );
    }

    // Department filter
    if (filterDepartment && filterDepartment !== 'all') {
      filtered = filtered.filter((assignment) => assignment.exam_department === filterDepartment);
    }

    // Semester filter
    if (filterSemester && filterSemester !== 'all') {
      filtered = filtered.filter((assignment) => assignment.exam_semester === filterSemester);
    }

    setFilteredAssignments(filtered);
  };

  const getDepartments = (): string[] => {
    const departments = new Set(assignments.map((a) => a.exam_department));
    return Array.from(departments).sort();
  };

  const getSemesters = (): string[] => {
    const semesters = new Set(assignments.map((a) => a.exam_semester));
    return Array.from(semesters).sort();
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStats = () => {
    const totalStudents = assignments.length;
    const departments = getDepartments().length;
    const exams = new Set(assignments.map((a) => a.exam)).size;
    return { totalStudents, departments, exams };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
            <p className="text-gray-600">Students assigned to you for exams</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadMyStudents} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.exams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
          <CardDescription>Search and filter your assigned students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, username, or F-ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {getDepartments().map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {getSemesters().map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assigned Students</span>
            <Badge variant="outline">{filteredAssignments.length} students</Badge>
          </CardTitle>
          <CardDescription>
            List of all students assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading students...</span>
            </div>
          ) : filteredAssignments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Info</TableHead>
                    <TableHead>F-ID</TableHead>
                    <TableHead>Exam Details</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Exam Date</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{assignment.student_full_name}</p>
                            <p className="text-sm text-gray-500">@{assignment.student_username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.student_f_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{assignment.exam_department}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{assignment.exam_semester}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDate(assignment.schedule_exam_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{assignment.schedule_duration} min</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">
                {searchTerm || filterDepartment !== 'all' || filterSemester !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No students have been assigned to you yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStudents;
