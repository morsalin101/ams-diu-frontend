import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { Checkbox } from '../components/ui/checkbox';
import {
  FileText,
  Search,
  RefreshCw,
  Building,
  CheckCircle2,
  RotateCcw,
  X,
  Filter,
  Eye,
  Download,
  Loader2,
  Users,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { admissionResultsAPI, examAPI, departmentAPI, facultyAPI } from '../services/api';
import { StudentAdmissionReportDialog } from '../components/StudentAdmissionReportDialog';
import { downloadBlobFile } from '../lib/pdf-download';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

interface ChoiceItem {
  department_id: number;
  department_shortname: string;
  priority: number;
}

interface AdmissionResult {
  id: number;
  exam: number;
  exam_id?: number;
  exam_name?: string;
  student: number;
  student_id?: number;
  student_username: string;
  student_full_name: string;
  student_name?: string;
  student_f_id?: string;
  student_email?: string;
  student_ssc?: number;
  ssc_score?: number;
  student_academic_type?: string;
  student_hsc?: number;
  student_diploma?: number;
  academic_score?: number;
  department: number;
  department_id?: number;
  department_name: string;
  department_shortname: string;
  mcq_marks: number;
  viva_marks: number;
  viva_marks_entered?: boolean;
  viva_given?: boolean;
  written_total_marks?: number;
  viva_total_marks?: number;
  written_viva_total?: number;
  total_marks: number;
  weighted_total_marks?: number;
  attended_exam?: boolean;
  is_selected: boolean;
  is_admitted?: boolean;
  is_override_accepted?: boolean;
  result_status: string;
  status: string;
  threshold_applied: number;
  student_department_choices?: ChoiceItem[];
  eligible_departments?: string[];
  waiting_for?: string | null;
  exam_taken_at?: string | null;
  created_at: string;
  configuration?: number;
}

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
  faculty_id?: number;
}

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
}

interface Exam {
  id: number;
  department: string;
  semester: string;
  exam_type?: string;
}

type TabType = 'SELECTED' | 'ACCEPTED';

const AllResults: React.FC = () => {
  const { user } = useAuth();
  const { canRead, canWrite } = usePermissions();

  const isSuperAdmin =
    user?.role === 'superadmin' ||
    user?.is_superuser ||
    user?.is_global_access ||
    user?.access_type === 'global';
  const isFacultyUser =
    user?.access_type === 'faculty' ||
    (Boolean(user?.faculty_details?.id) && !user?.department_details?.id);
  const isDepartmentUser = !isSuperAdmin && !isFacultyUser && Boolean(user?.department_details?.id);

  const [activeTab, setActiveTab] = useState<TabType>('SELECTED');
  const [results, setResults] = useState<AdmissionResult[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected student rows for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftFilterExamId, setDraftFilterExamId] = useState<string>('all');
  const [appliedFilterExamId, setAppliedFilterExamId] = useState<string>('all');
  const [draftFilterDepartmentId, setDraftFilterDepartmentId] = useState<string>('all');
  const [appliedFilterDepartmentId, setAppliedFilterDepartmentId] = useState<string>('all');
  const [draftFilterFacultyId, setDraftFilterFacultyId] = useState<string>('all');
  const [appliedFilterFacultyId, setAppliedFilterFacultyId] = useState<string>('all');

  // Summary counts
  const [summary, setSummary] = useState({
    SELECTED: 0,
    ACCEPTED: 0,
    WAITING: 0,
    REJECTED: 0,
  });

  // Report Modal state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportExamId, setSelectedReportExamId] = useState<number | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null);
  const [selectedReportStudentName, setSelectedReportStudentName] = useState<string>('');
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    loadResults();
    setSelectedIds([]);
  }, [
    activeTab,
    page,
    appliedSearch,
    appliedFilterExamId,
    appliedFilterDepartmentId,
    appliedFilterFacultyId,
    reloadKey,
  ]);

  const loadInitialData = async () => {
    try {
      await Promise.all([loadDepartments(), loadFaculties(), loadExams()]);
    } catch (error) {
      console.error('Error loading initial lookup data:', error);
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

  const loadFaculties = async () => {
    try {
      const response = await facultyAPI.getAllFaculties();
      if (response.success && response.data) {
        setFaculties(response.data);
      }
    } catch (error: any) {
      console.error('Error loading faculties:', error);
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

      // Requirement 11: Selected vs Accepted workflows
      params.result_status = activeTab;

      if (appliedSearch) params.search = appliedSearch;
      if (appliedFilterExamId && appliedFilterExamId !== 'all') params.exam_id = appliedFilterExamId;

      // Access-scope enforcement
      if (isDepartmentUser && user?.department_details?.id) {
        params.department_id = user.department_details.id;
      } else if (appliedFilterDepartmentId && appliedFilterDepartmentId !== 'all') {
        params.department_id = appliedFilterDepartmentId;
      }

      if (isFacultyUser && user?.faculty_details?.id) {
        params.faculty_id = user.faculty_details.id;
      } else if (appliedFilterFacultyId && appliedFilterFacultyId !== 'all') {
        params.faculty_id = appliedFilterFacultyId;
      }

      const response = await admissionResultsAPI.getResults(params);
      if (response.success) {
        setResults(response.results || []);
        setPagination(paginationFromDrf(response, page));

        if (response.summary || response.total_summary) {
          const s = response.summary || response.total_summary;
          setSummary({
            SELECTED: s.SELECTED ?? 0,
            ACCEPTED: s.ACCEPTED ?? 0,
            WAITING: s.WAITING ?? 0,
            REJECTED: s.REJECTED ?? 0,
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      toast.error('Failed to load admission results');
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
    setAppliedFilterFacultyId(draftFilterFacultyId);
    setReloadKey((current) => current + 1);
  };

  const handleClearFilters = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftFilterExamId('all');
    setAppliedFilterExamId('all');
    setDraftFilterDepartmentId('all');
    setAppliedFilterDepartmentId('all');
    setDraftFilterFacultyId('all');
    setAppliedFilterFacultyId('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(results.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Admission Acceptance workflow
  const handleAcceptAdmission = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one candidate to accept.');
      return;
    }

    const selectedResults = results.filter((r) => selectedIds.includes(r.id));
    setIsProcessing(true);
    try {
      const configMap = new Map<number, number[]>();
      const examMap = new Map<number, number[]>();

      selectedResults.forEach((r) => {
        const studentId = r.student_id || r.student;
        const configId = r.configuration;
        const examId = r.exam_id || r.exam;
        if (configId) {
          if (!configMap.has(configId)) configMap.set(configId, []);
          configMap.get(configId)!.push(studentId);
        } else if (examId) {
          if (!examMap.has(examId)) examMap.set(examId, []);
          examMap.get(examId)!.push(studentId);
        }
      });

      const promises: Promise<any>[] = [];
      configMap.forEach((studentIds, configuration_id) => {
        promises.push(
          admissionResultsAPI.bulkUpdateStatus({
            action: 'SET_ADMITTED',
            configuration_id,
            student_ids: studentIds,
          })
        );
      });
      examMap.forEach((studentIds, exam_id) => {
        promises.push(
          admissionResultsAPI.bulkUpdateStatus({
            action: 'SET_ADMITTED',
            exam_id,
            student_ids: studentIds,
          })
        );
      });

      await Promise.all(promises);
      toast.success(`Successfully accepted ${selectedIds.length} candidate(s) for admission.`);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (error: any) {
      console.error('Error accepting candidates:', error);
      toast.error(error?.message || 'Failed to accept candidates');
    } finally {
      setIsProcessing(false);
    }
  };

  // Admission Revert workflow
  const handleRevertAdmission = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one candidate to revert.');
      return;
    }

    const selectedResults = results.filter((r) => selectedIds.includes(r.id));
    setIsProcessing(true);
    try {
      const configMap = new Map<number, number[]>();
      const examMap = new Map<number, number[]>();

      selectedResults.forEach((r) => {
        const studentId = r.student_id || r.student;
        const configId = r.configuration;
        const examId = r.exam_id || r.exam;
        if (configId) {
          if (!configMap.has(configId)) configMap.set(configId, []);
          configMap.get(configId)!.push(studentId);
        } else if (examId) {
          if (!examMap.has(examId)) examMap.set(examId, []);
          examMap.get(examId)!.push(studentId);
        }
      });

      const promises: Promise<any>[] = [];
      configMap.forEach((studentIds, configuration_id) => {
        promises.push(
          admissionResultsAPI.bulkUpdateStatus({
            action: 'REVERT_TO_STORED_STATUS',
            configuration_id,
            student_ids: studentIds,
          })
        );
      });
      examMap.forEach((studentIds, exam_id) => {
        promises.push(
          admissionResultsAPI.bulkUpdateStatus({
            action: 'REVERT_TO_STORED_STATUS',
            exam_id,
            student_ids: studentIds,
          })
        );
      });

      await Promise.all(promises);
      toast.success(`Successfully reverted ${selectedIds.length} candidate(s).`);
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (error: any) {
      console.error('Error reverting candidates:', error);
      toast.error(error?.message || 'Failed to revert candidates');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open candidate report dialog
  const handleOpenReport = (result: AdmissionResult) => {
    setSelectedReportExamId(result.exam_id || result.exam);
    setSelectedReportStudentId(result.student_id || result.student);
    setSelectedReportStudentName(
      result.student_full_name || result.student_name || result.student_username || 'Student'
    );
    setIsReportDialogOpen(true);
  };

  // Download single report PDF
  const handleDownloadReport = async (result: AdmissionResult) => {
    const examId = result.exam_id || result.exam;
    const studentId = result.student_id || result.student;
    setDownloadingReportId(result.id);
    try {
      const response = await admissionResultsAPI.downloadStudentDetailReportPdf(examId, studentId);
      if (!response?.blob) {
        throw new Error('Student report PDF is not available yet.');
      }
      downloadBlobFile(response.blob, response.filename);
      toast.success(
        `Downloaded report for ${result.student_full_name || result.student_name || result.student_username}`
      );
    } catch (error: any) {
      console.error('Error downloading report PDF:', error);
      toast.error(error?.message || 'Failed to download student report');
    } finally {
      setDownloadingReportId(null);
    }
  };

  const hasAppliedFilters =
    appliedSearch ||
    appliedFilterExamId !== 'all' ||
    appliedFilterDepartmentId !== 'all' ||
    appliedFilterFacultyId !== 'all';

  const allVisibleSelected = results.length > 0 && results.every((r) => selectedIds.includes(r.id));
  const someVisibleSelected = results.some((r) => selectedIds.includes(r.id));

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Access Denied</h3>
          <p className="text-gray-600">You do not have permission to view admission results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeTab === 'SELECTED'
              ? 'border-[#2E3094] bg-[#2E3094]/5 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            setActiveTab('SELECTED');
            setPage(1);
          }}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected Candidates
              </p>
              <p className="text-2xl font-bold text-green-700 mt-1">{summary.SELECTED}</p>
              <p className="text-xs text-slate-500 mt-0.5">Awaiting Admission</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl text-green-700">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeTab === 'ACCEPTED'
              ? 'border-emerald-700 bg-emerald-50/50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            setActiveTab('ACCEPTED');
            setPage(1);
          }}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Accepted Candidates
              </p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{summary.ACCEPTED}</p>
              <p className="text-xs text-slate-500 mt-0.5">Admission Completed</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-800">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Waiting List
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{summary.WAITING}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pending seat opening</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
              <Building className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Filtered
              </p>
              <p className="text-2xl font-bold text-[#2E3094] mt-1">{pagination.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{activeTab} tab results</p>
            </div>
            <div className="p-3 bg-[#2E3094]/10 rounded-xl text-[#2E3094]">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filter Bar */}
      <Card className="gap-0 border-2 border-gray-200 shadow-sm">
        <CardHeader className="py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-800">
            <Filter className="w-4 h-4 text-blue-600" />
            Admission Results Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-3.5 pb-4 sm:px-5">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* Search */}
            <div className="min-w-0 space-y-1.5 md:col-span-2 xl:col-span-1">
              <label className="text-xs font-semibold uppercase text-gray-600">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Name, App Serial, Username..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Exam Filter */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-semibold uppercase text-gray-600">Exam</label>
              <Select value={draftFilterExamId} onValueChange={setDraftFilterExamId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.department} - {exam.semester} {exam.exam_type ? `(${exam.exam_type})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter (Scoped) */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-semibold uppercase text-gray-600">Department</label>
              <Select
                value={
                  isDepartmentUser && user?.department_details?.id
                    ? user.department_details.id.toString()
                    : draftFilterDepartmentId
                }
                onValueChange={setDraftFilterDepartmentId}
                disabled={isDepartmentUser}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.department_shortname} - {dept.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Faculty Filter */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-semibold uppercase text-gray-600">Faculty</label>
              <Select
                value={
                  isFacultyUser && user?.faculty_details?.id
                    ? user.faculty_details.id.toString()
                    : draftFilterFacultyId
                }
                onValueChange={setDraftFilterFacultyId}
                disabled={isFacultyUser || isDepartmentUser}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  {faculties.map((fac) => (
                    <SelectItem key={fac.id} value={fac.id.toString()}>
                      {fac.faculty_shortname} - {fac.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:col-span-2 xl:col-span-4 justify-end pt-1">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="h-9 px-4 bg-[#2E3094] text-white hover:bg-[#252778] text-xs font-semibold shadow-sm"
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Filter Results
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={isLoading || !hasAppliedFilters}
                className="h-9 px-3 text-gray-600 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setReloadKey((current) => current + 1)}
                    disabled={isLoading}
                    aria-label="Refresh results"
                    className="h-9 w-9"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Refresh table</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Results Board */}
      <Card className="border-2 border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View / Tab Selector */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as TabType);
                setPage(1);
              }}
              className="w-auto"
            >
              <TabsList className="bg-slate-100 p-1 rounded-lg">
                <TabsTrigger
                  value="SELECTED"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#2E3094] data-[state=active]:shadow-sm font-semibold text-xs px-3.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Selected Candidates ({summary.SELECTED})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="ACCEPTED"
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm font-semibold text-xs px-3.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                    Accepted Candidates ({summary.ACCEPTED})
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Workflow Action Buttons */}
            <div className="flex items-center gap-2">
              {activeTab === 'SELECTED' && canWrite() && (
                <Button
                  size="sm"
                  onClick={handleAcceptAdmission}
                  disabled={selectedIds.length === 0 || isProcessing}
                  className="h-8 px-3 text-white bg-green-600 hover:bg-green-700 shadow-sm text-xs font-semibold"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Accept Admission {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Button>
              )}

              {activeTab === 'ACCEPTED' && canWrite() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevertAdmission}
                  disabled={selectedIds.length === 0 || isProcessing}
                  className="h-8 px-3 text-amber-700 border-amber-300 hover:bg-amber-50 shadow-sm text-xs font-semibold"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Revert Admission {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Button>
              )}

              <Badge variant="outline" className="h-8 px-2.5 font-medium text-xs">
                {pagination.count} Total
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-[#2E3094] animate-spin" />
              <span className="ml-3 text-sm font-medium text-gray-600">
                Loading {activeTab.toLowerCase()} candidates...
              </span>
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {/* Checkbox column */}
                    <TableHead className="w-10 px-3 text-center">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => handleToggleSelectAll(Boolean(checked))}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    {/* 1. SL */}
                    <TableHead className="w-12 text-center">SL</TableHead>
                    {/* 2. Application Serial */}
                    <TableHead className="min-w-[120px]">App Serial</TableHead>
                    {/* 3. Student Name */}
                    <TableHead className="min-w-[160px]">Student Name</TableHead>
                    {/* 4. SSC */}
                    <TableHead className="text-center">SSC</TableHead>
                    {/* 5. HSC/Diploma */}
                    <TableHead className="text-center">HSC/Dip</TableHead>
                    {/* 6. Written */}
                    <TableHead className="text-center">Written</TableHead>
                    {/* 7. Viva */}
                    <TableHead className="text-center">Viva</TableHead>
                    {/* 8. Written + Viva */}
                    <TableHead className="text-center">W + V</TableHead>
                    {/* 9. Total */}
                    <TableHead className="text-center font-bold">Total</TableHead>
                    {/* 10. Choice List */}
                    <TableHead className="min-w-[150px]">Choice List</TableHead>
                    {/* 11. Eligible Departments */}
                    <TableHead className="min-w-[140px]">Eligible Depts</TableHead>
                    {/* 12. Allocated Department */}
                    <TableHead className="min-w-[120px]">Allocated</TableHead>
                    {/* 13. Waiting List For */}
                    <TableHead className="min-w-[110px]">Waiting For</TableHead>
                    {/* 14. Status */}
                    <TableHead className="text-center">Status</TableHead>
                    {/* 15. Exam Taken */}
                    <TableHead className="text-center whitespace-nowrap">Exam Taken</TableHead>
                    {/* 16. View */}
                    <TableHead className="w-12 text-center">View</TableHead>
                    {/* 17. Download */}
                    <TableHead className="w-12 text-center">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {results.map((result, index) => {
                    const isChecked = selectedIds.includes(result.id);
                    const serialNumber =
                      (pagination.current_page - 1) * pagination.page_size + index + 1;

                    return (
                      <TableRow
                        key={result.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          isChecked ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="px-3 text-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggleSelectRow(result.id, Boolean(checked))
                            }
                            aria-label={`Select student ${result.student_full_name}`}
                          />
                        </TableCell>

                        {/* 1. SL */}
                        <TableCell className="text-center font-medium text-slate-500">
                          {serialNumber}
                        </TableCell>

                        {/* 2. Application Serial */}
                        <TableCell className="font-mono font-semibold text-slate-800">
                          {result.student_f_id || result.student_username || '—'}
                        </TableCell>

                        {/* 3. Student Name */}
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {result.student_full_name || result.student_name || 'Candidate'}
                            </p>
                            {result.student_username && (
                              <p className="text-[11px] text-slate-500">@{result.student_username}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. SSC */}
                        <TableCell className="text-center text-slate-700">
                          {result.ssc_score !== undefined && result.ssc_score !== null
                            ? Number(result.ssc_score).toFixed(2)
                            : result.student_ssc !== undefined && result.student_ssc !== null
                            ? Number(result.student_ssc).toFixed(2)
                            : '—'}
                        </TableCell>

                        {/* 5. HSC/Diploma */}
                        <TableCell className="text-center text-slate-700">
                          {result.academic_score !== undefined && result.academic_score !== null
                            ? Number(result.academic_score).toFixed(2)
                            : result.student_hsc !== undefined && result.student_hsc !== null
                            ? Number(result.student_hsc).toFixed(2)
                            : result.student_diploma !== undefined && result.student_diploma !== null
                            ? Number(result.student_diploma).toFixed(2)
                            : '—'}
                        </TableCell>

                        {/* 6. Written */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {result.mcq_marks ?? 0}
                            {result.written_total_marks ? (
                              <span className="text-[10px] text-slate-400">
                                /{result.written_total_marks}
                              </span>
                            ) : null}
                          </Badge>
                        </TableCell>

                        {/* 7. Viva */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {result.viva_marks_entered ||
                            (result.viva_marks !== null && result.viva_marks !== undefined)
                              ? result.viva_marks
                              : result.viva_given === false
                              ? 'Not Given'
                              : (result.viva_marks ?? '—')}
                          </Badge>
                        </TableCell>

                        {/* 8. Written + Viva */}
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono font-semibold text-xs">
                            {result.written_viva_total !== undefined &&
                            result.written_viva_total !== null
                              ? Number(result.written_viva_total).toFixed(1)
                              : (
                                  Number(result.mcq_marks || 0) + Number(result.viva_marks || 0)
                                ).toFixed(1)}
                          </Badge>
                        </TableCell>

                        {/* 9. Total */}
                        <TableCell className="text-center">
                          <span className="font-bold text-slate-900 font-mono">
                            {result.weighted_total_marks !== undefined &&
                            result.weighted_total_marks !== null
                              ? Number(result.weighted_total_marks).toFixed(2)
                              : Number(result.total_marks || 0).toFixed(2)}
                            <span className="text-[10px] font-normal text-slate-400 ml-0.5">/100</span>
                          </span>
                        </TableCell>

                        {/* 10. Choice List */}
                        <TableCell>
                          {result.student_department_choices &&
                          result.student_department_choices.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {result.student_department_choices.map((choice, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-700 font-normal"
                                >
                                  {choice.priority}. {choice.department_shortname}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* 11. Eligible Departments */}
                        <TableCell>
                          {result.eligible_departments && result.eligible_departments.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {result.eligible_departments.map((dept, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200"
                                >
                                  {dept}
                                </Badge>
                              ))}
                            </div>
                          ) : result.is_selected && result.department_shortname ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200"
                            >
                              {result.department_shortname}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* 12. Allocated Department */}
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              {result.department_shortname || result.department_name || '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* 13. Waiting List For */}
                        <TableCell>
                          {result.waiting_for ? (
                            <Badge
                              variant="outline"
                              className="text-amber-800 bg-amber-50 border-amber-300 text-[10px] px-1.5 py-0"
                            >
                              {result.waiting_for}
                            </Badge>
                          ) : result.result_status === 'WAITING' ? (
                            <Badge
                              variant="outline"
                              className="text-amber-800 bg-amber-50 border-amber-300 text-[10px] px-1.5 py-0"
                            >
                              {result.department_shortname || 'Waiting'}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* 14. Status */}
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] px-2 py-0.5 uppercase tracking-wide font-semibold ${
                              result.is_admitted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : result.result_status === 'SELECTED'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : result.result_status === 'WAITING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {result.is_admitted ? 'Accepted' : result.result_status || 'Selected'}
                          </Badge>
                        </TableCell>

                        {/* 15. Exam Taken */}
                        <TableCell className="text-center text-[11px] text-slate-600 whitespace-nowrap">
                          {result.exam_taken_at
                            ? new Date(result.exam_taken_at).toLocaleDateString()
                            : result.created_at
                            ? new Date(result.created_at).toLocaleDateString()
                            : '—'}
                        </TableCell>

                        {/* 16. View */}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenReport(result)}
                            aria-label={`View report for ${result.student_full_name || result.student_name}`}
                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>

                        {/* 17. Download */}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReport(result)}
                            disabled={downloadingReportId === result.id}
                            aria-label={`Download report for ${result.student_full_name || result.student_name}`}
                            className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            {downloadingReportId === result.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-semibold text-gray-700">
                No {activeTab.toLowerCase()} candidates found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {hasAppliedFilters
                  ? 'Try clearing or adjusting your search filters'
                  : `No admission candidates are currently in the ${activeTab.toLowerCase()} workflow`}
              </p>
            </div>
          )}
        </CardContent>

        {!isLoading && results.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-4 py-2">
            <PaginationControls
              pagination={pagination}
              onPageChange={setPage}
              isLoading={isLoading}
              itemLabel="candidates"
            />
          </div>
        )}
      </Card>

      {/* Candidate Full Report Dialog */}
      <StudentAdmissionReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        examId={selectedReportExamId}
        studentId={selectedReportStudentId}
        studentName={selectedReportStudentName}
      />
    </div>
  );
};

export default AllResults;
