import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Search, RefreshCw, User, Building, CheckCircle, XCircle, X, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { admissionResultsAPI, examAPI, departmentAPI } from '../services/api';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
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
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftFilterExamId, setDraftFilterExamId] = useState<string>('all');
  const [appliedFilterExamId, setAppliedFilterExamId] = useState<string>('all');
  const [draftFilterDepartmentId, setDraftFilterDepartmentId] = useState<string>('all');
  const [appliedFilterDepartmentId, setAppliedFilterDepartmentId] = useState<string>('all');
  const [draftFilterStatus, setDraftFilterStatus] = useState<string>('all');
  const [appliedFilterStatus, setAppliedFilterStatus] = useState<string>('all');
  const [draftFilterSelection, setDraftFilterSelection] = useState<string>('all');
  const [appliedFilterSelection, setAppliedFilterSelection] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadResults();
  }, [
    page,
    appliedSearch,
    appliedFilterExamId,
    appliedFilterDepartmentId,
    appliedFilterStatus,
    appliedFilterSelection,
    reloadKey,
  ]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadDepartments(),
        loadExams(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
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
      const response = await examAPI.getAllExamsForLookup();
      const examData = response.results || response;
      setExams(examData);
    } catch (error: any) {
      console.error('Error loading exams:', error);
    }
  };

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const params: any = { page };
      if (appliedSearch) params.search = appliedSearch;
      if (appliedFilterExamId && appliedFilterExamId !== 'all') params.exam_id = appliedFilterExamId;
      if (appliedFilterDepartmentId && appliedFilterDepartmentId !== 'all') params.department_id = appliedFilterDepartmentId;
      if (appliedFilterStatus && appliedFilterStatus !== 'all') params.status = appliedFilterStatus;
      if (appliedFilterSelection && appliedFilterSelection !== 'all') params.is_selected = appliedFilterSelection === 'true';

      const response = await admissionResultsAPI.getResults(params);
      if (response.success) {
        setResults(response.results || []);
        setPagination(paginationFromDrf(response, page));
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
      setResults([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedFilterExamId(draftFilterExamId);
    setAppliedFilterDepartmentId(draftFilterDepartmentId);
    setAppliedFilterStatus(draftFilterStatus);
    setAppliedFilterSelection(draftFilterSelection);
    setReloadKey((current) => current + 1);
  };

  const handleClearFilters = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftFilterExamId('all');
    setAppliedFilterExamId('all');
    setDraftFilterDepartmentId('all');
    setAppliedFilterDepartmentId('all');
    setDraftFilterStatus('all');
    setAppliedFilterStatus('all');
    setDraftFilterSelection('all');
    setAppliedFilterSelection('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const hasAppliedFilters =
    appliedSearch ||
    appliedFilterExamId !== 'all' ||
    appliedFilterDepartmentId !== 'all' ||
    appliedFilterStatus !== 'all' ||
    appliedFilterSelection !== 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setReloadKey((current) => current + 1)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filter Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, username, or form ID..."
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

            <Select value={draftFilterExamId} onValueChange={setDraftFilterExamId}>
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

            <Select value={draftFilterDepartmentId} onValueChange={setDraftFilterDepartmentId}>
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

            <Select value={draftFilterStatus} onValueChange={setDraftFilterStatus}>
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

            <Select value={draftFilterSelection} onValueChange={setDraftFilterSelection}>
              <SelectTrigger>
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="true">Selected</SelectItem>
                <SelectItem value="false">Not Selected</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 md:col-span-2 lg:col-span-3">
              <Button onClick={handleSearch} disabled={isLoading}>
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
                    draftFilterExamId === 'all' &&
                    appliedFilterExamId === 'all' &&
                    draftFilterDepartmentId === 'all' &&
                    appliedFilterDepartmentId === 'all' &&
                    draftFilterStatus === 'all' &&
                    appliedFilterStatus === 'all' &&
                    draftFilterSelection === 'all' &&
                    appliedFilterSelection === 'all')
                }
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Admission Results
            </span>
            <Badge variant="outline">{pagination.count} results</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading results...</span>
            </div>
          ) : results.length > 0 ? (
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
                  {results.map((result) => (
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
              <p className="text-sm">
                {hasAppliedFilters ? 'Try adjusting your filters' : 'No admission results are available yet'}
              </p>
            </div>
          )}
        </CardContent>
        {!isLoading && results.length > 0 && (
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            isLoading={isLoading}
            itemLabel="results"
          />
        )}
      </Card>
    </div>
  );
};

export default AllResults;
