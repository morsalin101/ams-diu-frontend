import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Search, RefreshCw, User, Building, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { admissionResultsAPI, examAPI, departmentAPI } from '../services/api';
import toast from 'react-hot-toast';

interface AdmissionResult {
  id: number;
  exam_id: number;
  exam_name: string;
  student_id: number;
  student_username: string;
  student_name: string;
  student_email: string;
  department_id: number;
  department_name: string;
  department_shortname: string;
  mcq_marks: number;
  viva_marks: number;
  total_marks: number;
  is_selected: boolean;
  status: string;
  threshold_applied: number;
  created_at: string;
}

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface Exam {
  id: number;
  department: string;
  semester: string;
}

const AllResults: React.FC = () => {
  const [results, setResults] = useState<AdmissionResult[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamId, setFilterExamId] = useState<string>('all');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSelection, setFilterSelection] = useState<string>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadResults();
  }, [filterExamId, filterDepartmentId, filterStatus, filterSelection]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDepartments(),
        loadExams(),
        loadResults()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error: any) {
      console.error('Error loading departments:', error);
    }
  };

  const loadExams = async () => {
    try {
      const response = await examAPI.getAllExams();
      const examData = response.results || response;
      setExams(examData);
    } catch (error: any) {
      console.error('Error loading exams:', error);
    }
  };

  const loadResults = async () => {
    try {
      const params: any = {};
      if (filterExamId && filterExamId !== 'all') params.exam_id = filterExamId;
      if (filterDepartmentId && filterDepartmentId !== 'all') params.department_id = filterDepartmentId;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (filterSelection && filterSelection !== 'all') params.is_selected = filterSelection === 'true';

      const response = await admissionResultsAPI.getResults(params);
      if (response.success) {
        setResults(response.results || []);
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
    }
  };

  const getFilteredResults = () => {
    if (!searchTerm.trim()) return results;

    const search = searchTerm.toLowerCase();
    return results.filter(
      (result) =>
        result.student_name.toLowerCase().includes(search) ||
        result.student_username.toLowerCase().includes(search) ||
        result.student_email.toLowerCase().includes(search)
    );
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">All Results</h1>
            <p className="text-gray-600">View admission test results</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => loadResults()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>Search and filter admission results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterExamId} onValueChange={setFilterExamId}>
              <SelectTrigger>
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id.toString()}>
                    {exam.department} - {exam.semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDepartmentId} onValueChange={setFilterDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.department_shortname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSelection} onValueChange={setFilterSelection}>
              <SelectTrigger>
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="true">Selected</SelectItem>
                <SelectItem value="false">Not Selected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Admission Results</span>
            <Badge variant="outline">{filteredResults.length} results</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading results...</span>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>MCQ</TableHead>
                    <TableHead>Viva</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Selected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{result.student_name}</p>
                            <p className="text-sm text-gray-500">@{result.student_username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{result.exam_name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{result.department_shortname}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.mcq_marks}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.viva_marks}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold">
                          {result.total_marks}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{result.threshold_applied}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            result.status === 'PUBLISHED'
                              ? 'default'
                              : result.status === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {result.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.is_selected ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllResults;
