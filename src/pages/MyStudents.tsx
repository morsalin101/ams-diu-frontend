import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, User, Calendar, Building, Search, RefreshCw, FileText, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { studentAssignmentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
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
  const [isLoading, setIsLoading] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftFilterDepartment, setDraftFilterDepartment] = useState<string>('all');
  const [appliedFilterDepartment, setAppliedFilterDepartment] = useState<string>('all');
  const [draftFilterSemester, setDraftFilterSemester] = useState<string>('all');
  const [appliedFilterSemester, setAppliedFilterSemester] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filterOptions, setFilterOptions] = useState<{
    departments?: string[];
    semesters?: string[];
  }>({});

  useEffect(() => {
    if (user?.id) {
      loadMyStudents();
    }
  }, [user?.id, page, appliedSearch, appliedFilterDepartment, appliedFilterSemester, reloadKey]);

  const loadMyStudents = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const response = await studentAssignmentAPI.getAssignmentsByTeacher(user.id, {
        page,
        search: appliedSearch || undefined,
        department: appliedFilterDepartment !== 'all' ? appliedFilterDepartment : undefined,
        semester: appliedFilterSemester !== 'all' ? appliedFilterSemester : undefined,
      });
      const data = Array.isArray(response) ? response : response.data || [];
      setAssignments(data);
      setPagination(paginationFromDrf(response, page));
      setFilterOptions(response.filter_options || {});
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
      setAssignments([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedFilterDepartment(draftFilterDepartment);
    setAppliedFilterSemester(draftFilterSemester);
    setReloadKey((current) => current + 1);
  };

  const handleClearSearch = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftFilterDepartment('all');
    setAppliedFilterDepartment('all');
    setDraftFilterSemester('all');
    setAppliedFilterSemester('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const getDepartments = (): string[] => {
    return [...new Set((filterOptions.departments || []).filter(Boolean))].sort();
  };

  const getSemesters = (): string[] => {
    return [...new Set((filterOptions.semesters || []).filter(Boolean))].sort();
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
      <div className="flex justify-end">
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

            <Select value={draftFilterDepartment} onValueChange={setDraftFilterDepartment}>
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

            <Select value={draftFilterSemester} onValueChange={setDraftFilterSemester}>
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
            <div className="flex gap-2 md:col-span-3">
              <Button onClick={handleSearch} disabled={isLoading || !user?.id}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={handleClearSearch}
                disabled={
                  isLoading ||
                  (!draftSearch &&
                    !appliedSearch &&
                    draftFilterDepartment === 'all' &&
                    appliedFilterDepartment === 'all' &&
                    draftFilterSemester === 'all' &&
                    appliedFilterSemester === 'all')
                }
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assigned Students</span>
            <Badge variant="outline">{pagination.count} students</Badge>
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
          ) : assignments.length > 0 ? (
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
                  {assignments.map((assignment) => (
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
              <PaginationControls
                pagination={pagination}
                onPageChange={setPage}
                isLoading={isLoading}
                itemLabel="students"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">
                {appliedSearch || appliedFilterDepartment !== 'all' || appliedFilterSemester !== 'all'
                  ? 'No assigned students match this search'
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
