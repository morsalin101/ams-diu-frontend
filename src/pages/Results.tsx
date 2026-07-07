import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  FilePlus,
  Search,
  RefreshCw,
  Eye,
  BarChart3,
  User,
  BookOpen,
  Calendar,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Target,
  Users,
  Trophy,
  GraduationCap,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { VivaModal } from '../components/VivaModal';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { formatSemesterLabel, sortSemesterValues } from '../lib/semester';
import toast from 'react-hot-toast';
import { admissionResultsAPI, examAPI } from '../services/api';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';

interface ResultsProps {
  gradientClass: string;
}

interface ExamResult {
  student_id: number;
  exam_id: number;
  student_f_id: string;
  student_name: string;
  exam_details: {
    department: string;
    semester: string;
    total_questions: number;
  };
  results: {
    correct_answers: number;
    wrong_answers: number;
    score_percentage: number;
  };
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    score_percentage: number;
  }>;
  viva_marks: {
    marks: number;
    rubrics_marks: { [key: string]: number };
    remarks: string | null;
  };
  result_status: string;
}

// Admission status shown per row (replaces the department column — a teacher
// only ever sees their own department, so it carried no signal).
const STATUS_META: Record<string, { label: string; className: string }> = {
  SELECTED: { label: 'Selected', className: 'text-green-700 bg-green-50 border-green-200' },
  ACCEPTED: { label: 'Accepted', className: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
  WAITING: { label: 'Waiting', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  REJECTED: { label: 'Not Selected', className: 'text-rose-700 bg-rose-50 border-rose-200' },
  ABSENT: { label: 'Absent', className: 'text-slate-700 bg-slate-50 border-slate-200' },
  PENDING: { label: 'Pending', className: 'text-slate-600 bg-slate-50 border-slate-200' },
};
const getStatusMeta = (status?: string) => STATUS_META[status || 'PENDING'] || STATUS_META.PENDING;

interface ApiResponse {
  success: boolean;
  data: {
    pagination: {
      count: number;
      current_page: number;
      total_pages: number;
      page_size: number;
      has_next: boolean;
      has_previous: boolean;
    };
    results: ExamResult[];
    filters: {
      semester: string | null;
      teacher_id: number;
      teacher_name: string;
    };
  };
  message: string;
}

export function Results({ gradientClass }: ResultsProps) {
  const { user } = useAuth();
  const { canRead } = usePermissions();

  // State management
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftSemesterFilter, setDraftSemesterFilter] = useState('all');
  const [appliedSemesterFilter, setAppliedSemesterFilter] = useState('all');
  const [draftVivaStatusFilter, setDraftVivaStatusFilter] = useState('all');
  const [appliedVivaStatusFilter, setAppliedVivaStatusFilter] = useState('all');
  const [draftPerformanceFilter, setDraftPerformanceFilter] = useState('all');
  const [appliedPerformanceFilter, setAppliedPerformanceFilter] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showVivaModal, setShowVivaModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [preparingExamId, setPreparingExamId] = useState<number | null>(null);

  // Load exam results
  useEffect(() => {
    if (canRead() && user?.id) {
      loadExamResults();
    }
  }, [user?.id, currentPage, appliedSearch, appliedSemesterFilter, reloadKey]);

  // Debounced auto-search so the search box applies without a button press.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = draftSearch.trim();
      setAppliedSearch((prev) => (prev === next ? prev : next));
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [draftSearch]);

  // Filter results based on search and filters
  useEffect(() => {
    let filtered = examResults;

    if (appliedVivaStatusFilter !== 'all') {
      filtered = filtered.filter(result => {
        const isVivaCompleted = (result.viva_marks?.marks || 0) > 0;
        return appliedVivaStatusFilter === 'completed'
          ? isVivaCompleted
          : !isVivaCompleted;
      });
    }

    // Performance filter
    if (appliedPerformanceFilter !== 'all') {
      filtered = filtered.filter(result => {
        const score = result.results.score_percentage;
        switch (appliedPerformanceFilter) {
          case 'excellent':
            return score >= 90;
          case 'good':
            return score >= 80 && score < 90;
          case 'average':
            return score >= 60 && score < 80;
          case 'below-average':
            return score >= 40 && score < 60;
          case 'poor':
            return score < 40;
          default:
            return true;
        }
      });
    }

    setFilteredResults(filtered);
  }, [
    examResults,
    appliedVivaStatusFilter,
    appliedPerformanceFilter,
  ]);

  const loadExamResults = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await examAPI.getAllResultsByTeacher(user.id, {
        page: currentPage,
        search: appliedSearch || undefined,
        ...(appliedSemesterFilter !== 'all' ? { semester: appliedSemesterFilter } : {}),
      });

      if (data.success) {
        setExamResults(data.data.results);
        setCurrentPage(data.data.pagination.current_page);
        setPagination(paginationFromDrf({ pagination: data.data.pagination }, currentPage));
        toast.success(
          data.message || `Loaded ${data.data.results.length} exam results`,
        );
      } else {
        throw new Error(data.message || 'Failed to load exam results');
      }
    } catch (error: any) {
      console.error('Error loading exam results:', error);
      toast.error(error.message || 'Failed to load exam results');
      setExamResults([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  };

  const openResultDialog = (result: ExamResult) => {
    setSelectedResult(result);
    setShowResultDialog(true);
  };

  const openVivaModal = (result: ExamResult) => {
    setSelectedResult(result);
    setShowVivaModal(true);
  };

  const handleVivaMarksAdded = () => {
    // Reload the results to get updated viva marks
    loadExamResults();
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedSemesterFilter(draftSemesterFilter);
    setAppliedVivaStatusFilter(draftVivaStatusFilter);
    setAppliedPerformanceFilter(draftPerformanceFilter);
    setReloadKey((current) => current + 1);
  };

  const handleSemesterFilterChange = (value: string) => {
    setDraftSemesterFilter(value);
    setAppliedSemesterFilter(value);
    setCurrentPage(1);
    setReloadKey((current) => current + 1);
  };

  // Auto-applying filters (used by the mobile layout, which has no Search button).
  const handlePerformanceFilterChange = (value: string) => {
    setDraftPerformanceFilter(value);
    setAppliedPerformanceFilter(value);
  };

  const handleVivaStatusFilterChange = (value: string) => {
    setDraftVivaStatusFilter(value);
    setAppliedVivaStatusFilter(value);
  };

  const handleClearSearch = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftSemesterFilter('all');
    setAppliedSemesterFilter('all');
    setDraftVivaStatusFilter('all');
    setAppliedVivaStatusFilter('all');
    setDraftPerformanceFilter('all');
    setAppliedPerformanceFilter('all');
    setCurrentPage(1);
    setReloadKey((current) => current + 1);
  };

  const handlePrepareAdmissionBoard = async (examId: number) => {
    try {
      setPreparingExamId(examId);
      const response = await admissionResultsAPI.calculateResults({
        exam_id: examId,
      });
      toast.success(
        response?.message || `Admission board prepared for exam ${examId}`,
      );
    } catch (error: any) {
      console.error('Error preparing admission board:', error);
      toast.error(error?.message || 'Failed to prepare admission board');
    } finally {
      setPreparingExamId(null);
    }
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getInitials = (name?: string | null) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90)
      return 'text-purple-600 bg-purple-50 border-purple-200';
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40)
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 60) return 'Average';
    if (percentage >= 40) return 'Below Average';
    return 'Poor';
  };

  const getPerformanceBadgeIcon = (percentage: number) => {
    if (percentage >= 90) return Trophy;
    if (percentage >= 80) return Award;
    if (percentage >= 60) return Target;
    return AlertTriangle;
  };

  const normalizeDepartmentText = (value?: string | null) =>
    (value || '')
      .toLowerCase()
      .replace(/^department\s+of\s+/, '')
      .replace(/&/g, 'and')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const getDisplayDepartment = (department?: string | null) => {
    const rawDepartment = (department || '').trim();
    const userDepartment = user?.department_details;

    if (!rawDepartment) return 'N/A';

    if (userDepartment?.department_shortname) {
      const rawNormalized = normalizeDepartmentText(rawDepartment);
      const userNameNormalized = normalizeDepartmentText(
        userDepartment.department_name,
      );
      const shortName = userDepartment.department_shortname.trim();
      const shortNameMatch = rawDepartment.match(/\(([^)]+)\)/)?.[1]?.trim();

      if (
        rawNormalized === userNameNormalized ||
        rawNormalized.includes(userNameNormalized) ||
        userNameNormalized.includes(rawNormalized) ||
        shortNameMatch?.toLowerCase() === shortName.toLowerCase()
      ) {
        return shortName;
      }
    }

    return rawDepartment.replace(/^Department\s+of\s+/i, '').trim();
  };

  // Get unique values for filters
  const uniqueSemesters = sortSemesterValues(
    examResults.map(result => result.exam_details.semester),
  );

  // Calculate statistics
  const averageScore =
    examResults.length > 0
      ? examResults.reduce(
          (sum, result) => sum + result.results.score_percentage,
          0,
        ) / examResults.length
      : 0;
  const excellentCount = examResults.filter(
    r => r.results.score_percentage >= 90,
  ).length;
  const goodCount = examResults.filter(
    r => r.results.score_percentage >= 80 && r.results.score_percentage < 90,
  ).length;
  const totalStudents = pagination.count;
  const currentPageStudentCount = examResults.length;

  // Permission check
  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats */}
      {/* Mobile + tablet: single Total Students card */}
      <div className="lg:hidden">
        <div
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
          style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0E1FF] text-[#2E3094]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Students</p>
              <h2 className="text-2xl font-bold text-slate-900">{totalStudents}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: full stats grid */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-5">
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {totalStudents}
            </div>
            <div className="text-xs text-blue-700">Total Students</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">
              {excellentCount}
            </div>
            <div className="text-xs text-purple-700">Excellent (90%+)</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{goodCount}</div>
            <div className="text-xs text-green-700">Good (80-89%)</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-600">
              {formatPercentage(averageScore)}
            </div>
            <div className="text-xs text-yellow-700">Average Score</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-2xl font-bold text-indigo-600">
              {formatPercentage(
                currentPageStudentCount > 0
                  ? (examResults.filter(r => r.results.score_percentage >= 60)
                      .length /
                      currentPageStudentCount) *
                      100
                  : 0,
              )}
            </div>
            <div className="text-xs text-indigo-700">Pass Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile + tablet: search + auto-applying filters (no search button) */}
      <div className="space-y-3 lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="rounded-xl border-slate-200 bg-slate-50 pl-10"
            placeholder="Search student name or ID..."
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
          />
        </div>

        <Select
          value={draftSemesterFilter}
          onValueChange={handleSemesterFilterChange}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {uniqueSemesters.map((semester) => (
              <SelectItem key={semester} value={semester}>
                {formatSemesterLabel(semester)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={draftPerformanceFilter}
            onValueChange={handlePerformanceFilterChange}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="excellent">Excellent (90%+)</SelectItem>
              <SelectItem value="good">Good (80-89%)</SelectItem>
              <SelectItem value="average">Average (60-79%)</SelectItem>
              <SelectItem value="below-average">Below Average (40-59%)</SelectItem>
              <SelectItem value="poor">Poor (&lt;40%)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={draftVivaStatusFilter}
            onValueChange={handleVivaStatusFilterChange}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Viva Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Viva Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(draftSearch ||
          draftSemesterFilter !== 'all' ||
          draftPerformanceFilter !== 'all' ||
          draftVivaStatusFilter !== 'all') && (
          <Button
            onClick={handleClearSearch}
            variant="outline"
            disabled={isLoading}
            className="w-full rounded-xl border-slate-200 text-slate-600"
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Filters (desktop) */}
      <Card className="hidden border-2 border-gray-200 lg:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Search & Filter Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="space-y-2 lg:flex-1 lg:min-w-0">
              <Label htmlFor="search">Search Students</Label>
              <Input
                id="search"
                placeholder="Search by name, form ID, department..."
                value={draftSearch}
                onChange={e => setDraftSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="space-y-2 lg:flex-1 lg:min-w-0">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={draftSemesterFilter}
                onValueChange={handleSemesterFilterChange}
              >
                <SelectTrigger id="semester">
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {uniqueSemesters.map(semester => (
                    <SelectItem key={semester} value={semester}>
                      {formatSemesterLabel(semester)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:flex-1 lg:min-w-0">
              <Label htmlFor="performance">Performance</Label>
              <Select
                value={draftPerformanceFilter}
                onValueChange={setDraftPerformanceFilter}
              >
                <SelectTrigger id="performance">
                  <SelectValue placeholder="All performance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Performance</SelectItem>
                  <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                  <SelectItem value="good">Good (80-89%)</SelectItem>
                  <SelectItem value="average">Average (60-79%)</SelectItem>
                  <SelectItem value="below-average">
                    Below Average (40-59%)
                  </SelectItem>
                  <SelectItem value="poor">Poor (&lt;40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:flex-1 lg:min-w-0">
              <Label htmlFor="viva-status">Viva Status</Label>
              <Select
                value={draftVivaStatusFilter}
                onValueChange={setDraftVivaStatusFilter}
              >
                <SelectTrigger id="viva-status">
                  <SelectValue placeholder="All viva status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Viva Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 lg:shrink-0">
              <Button
                onClick={handleSearch}
                className="flex-1 bg-[#2E3094] text-white hover:bg-[#1E2078] lg:flex-none"
                disabled={isLoading}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                onClick={handleClearSearch}
                variant="outline"
                className="flex-1 lg:flex-none"
                disabled={
                  isLoading ||
                  (!draftSearch &&
                    !appliedSearch &&
                    draftSemesterFilter === 'all' &&
                    appliedSemesterFilter === 'all' &&
                    draftVivaStatusFilter === 'all' &&
                    appliedVivaStatusFilter === 'all' &&
                    draftPerformanceFilter === 'all' &&
                    appliedPerformanceFilter === 'all')
                }
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                onClick={() => setReloadKey((current) => current + 1)}
                variant="outline"
                disabled={isLoading}
                aria-label="Refresh results"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Student Exam Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading exam results...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-8 text-center">
              <FilePlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-600">
                No Results Found
              </h3>
              <p className="text-gray-500">
                {examResults.length === 0
                  ? 'No exam results available yet.'
                  : 'No results match your current filters.'}
              </p>
            </div>
          ) : (
            <>
              {/* Card view (mobile + tablet) */}
              <div className="space-y-3 md:space-y-4 lg:hidden">
                {filteredResults.map(result => {
                  const isVivaCompleted = result.viva_marks?.marks > 0;

                  return (
                    <div
                      key={`m-${result.student_id}-${result.exam_id}`}
                      className="space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 md:p-5"
                      style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0E1FF] text-sm font-bold text-[#2E3094] md:h-12 md:w-12 md:text-base">
                            {getInitials(result.student_name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-base font-semibold text-slate-900 md:text-lg">
                              {result.student_name}
                            </h4>
                            <p className="truncate text-xs text-slate-500 md:text-sm">
                              ID: {result.student_f_id}
                            </p>
                            <span
                              className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold md:text-xs ${getStatusMeta(result.result_status).className}`}
                            >
                              {getStatusMeta(result.result_status).label}
                            </span>
                          </div>
                        </div>
                        {isVivaCompleted ? (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700 md:text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Graded
                          </span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-semibold text-orange-700 md:text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => openVivaModal(result)}
                          className={`flex-1 min-w-0 whitespace-nowrap px-1.5 text-xs md:h-11 md:text-sm ${
                            isVivaCompleted
                              ? 'bg-white text-[#2E3094] border border-[#2E3094]/30 hover:bg-[#2E3094]/5'
                              : 'bg-[#2E3094] text-white hover:bg-[#252877]'
                          }`}
                          variant={isVivaCompleted ? 'outline' : 'default'}
                        >
                          <GraduationCap className="mr-1 h-4 w-4 shrink-0" />
                          {isVivaCompleted ? 'Update Viva' : 'Give Viva Marks'}
                        </Button>
                        <Button
                          onClick={() => openResultDialog(result)}
                          variant="outline"
                          className="hidden"
                        >
                          <Eye className="mr-1 h-4 w-4 shrink-0" />
                          View Results
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Correct Answers</TableHead>
                    <TableHead>Wrong Answers</TableHead>
                    <TableHead>Written Score</TableHead>
                    <TableHead>Viva Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map(result => {
                    const isVivaCompleted = result.viva_marks?.marks > 0;
                    const PerformanceIcon = getPerformanceBadgeIcon(
                      result.results.score_percentage,
                    );

                    return (
                      <TableRow
                        key={`${result.student_id}-${result.exam_id}`}
                        className="hover:bg-gray-50"
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {result.student_f_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {result.student_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusMeta(result.result_status).className}`}
                          >
                            {getStatusMeta(result.result_status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatSemesterLabel(result.exam_details.semester)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {result.results.correct_answers}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-600">
                              {result.results.wrong_answers}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getPerformanceColor(result.results.score_percentage)} font-medium`}
                          >
                            <PerformanceIcon className="w-3 h-3 mr-1" />
                            {formatPercentage(result.results.score_percentage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isVivaCompleted ? (
                            <Badge
                              variant="default"
                              className="text-green-800 bg-green-100 border-green-200"
                            >
                              <Award className="w-3 h-3 mr-1" />
                              Completed ({result.viva_marks.marks})
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-yellow-800 border-yellow-200 bg-yellow-50"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => openResultDialog(result)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Results
                            </Button>
                            <Button
                              onClick={() => openVivaModal(result)}
                              variant={isVivaCompleted ? 'outline' : 'default'}
                              size="sm"
                              className={
                                isVivaCompleted
                                  ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                                  : 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white'
                              }
                            >
                              <GraduationCap className="w-4 h-4 mr-1" />
                              {isVivaCompleted
                                ? 'Update Viva'
                                : 'Give Viva Marks'}
                            </Button>

                            {/* <Button
                              onClick={() => handlePrepareAdmissionBoard(result.exam_id)}
                              variant="outline"
                              size="sm"
                              disabled={preparingExamId === result.exam_id}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              {preparingExamId === result.exam_id ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Prepare Board
                            </Button> */}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>

              <PaginationControls
                pagination={pagination}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
                itemLabel="results"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Result Details Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent
          className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-auto sm:max-h-[92vh] sm:w-[95vw] sm:max-w-[95vw] sm:rounded-xl sm:p-0 md:max-h-[90vh] lg:max-w-[1100px] xl:max-w-[1200px] 2xl:max-w-[1320px] [&>button]:hidden"
        >
          {/* Modal Header */}
          <header className="flex-shrink-0 border-b border-gray-100">
            {/* Top toolbar: Back arrow (mobile only) + Close icon */}
            <div className="flex items-center justify-between px-3 pt-2 sm:px-4 sm:pt-3 md:px-5 md:pt-4">
              <button
                onClick={() => setShowResultDialog(false)}
                className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="hidden md:block" aria-hidden="true" />
              <button
                onClick={() => setShowResultDialog(false)}
                className="shrink-0 rounded p-1 text-indigo-900 transition-colors hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Title row */}
            <div className="flex items-start gap-3 px-4 pb-4 sm:px-5 sm:pb-5 md:gap-4 md:px-6 md:pb-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 sm:h-10 sm:w-10">
                <BarChart3 className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-bold text-slate-800 md:text-xl">
                  Detailed Result Analysis
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                  Complete performance breakdown for {selectedResult?.student_name}
                </DialogDescription>
              </div>
            </div>
          </header>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedResult && (
              <>
              {/* Mobile detailed view */}
              <div className="md:hidden">
                <div className="space-y-4 px-5 pb-10 pt-4">
                  {/* Student identity + high-level stats */}
                  <div
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E0E1FF] text-[#2E3094]">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-900">
                          {selectedResult.student_name}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Dept:{' '}
                          {getDisplayDepartment(
                            selectedResult.exam_details.department,
                          )}{' '}
                          | {formatSemesterLabel(selectedResult.exam_details.semester)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div
                        className={`flex flex-col items-center rounded-xl border p-3 ${getPerformanceColor(selectedResult.results.score_percentage)}`}
                      >
                        {React.createElement(
                          getPerformanceBadgeIcon(
                            selectedResult.results.score_percentage,
                          ),
                          { className: 'h-5 w-5 mb-1' },
                        )}
                        <span className="text-xl font-bold leading-tight">
                          {formatPercentage(
                            selectedResult.results.score_percentage,
                          )}
                        </span>
                        <span className="text-[11px] opacity-70">
                          {getPerformanceLabel(
                            selectedResult.results.score_percentage,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col items-center rounded-xl border border-green-100 bg-green-50 p-3 text-green-700">
                        <CheckCircle2 className="mb-1 h-5 w-5" />
                        <span className="text-xl font-bold leading-tight">
                          {selectedResult.results.correct_answers}
                        </span>
                        <span className="text-[11px] opacity-70">Correct</span>
                      </div>
                      <div className="flex flex-col items-center rounded-xl border border-red-100 bg-red-50 p-3 text-red-600">
                        <XCircle className="mb-1 h-5 w-5" />
                        <span className="text-xl font-bold leading-tight">
                          {selectedResult.results.wrong_answers}
                        </span>
                        <span className="text-[11px] opacity-70">Wrong</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject-wise performance */}
                  <div className="flex items-center gap-2 px-1">
                    <BookOpen className="h-4 w-4 text-[#2E3094]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Subject-wise Performance
                    </h3>
                  </div>

                  {selectedResult.subjects?.length ? (
                    <div className="space-y-3">
                      {[...selectedResult.subjects]
                        .sort((a, b) => b.score_percentage - a.score_percentage)
                        .map((subject) => {
                          const skipped =
                            subject.total_questions -
                            subject.correct_answers -
                            subject.wrong_answers;
                          return (
                            <div
                              key={subject.subject_id}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                              style={{
                                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
                              }}
                            >
                              <div className="flex w-full items-center justify-between border-b border-slate-100 p-4">
                                <div className="flex min-w-0 items-center gap-2">
                                  <BookOpen className="h-5 w-5 shrink-0 text-[#2E3094]" />
                                  <span className="truncate font-semibold text-slate-900">
                                    {subject.subject_name}
                                  </span>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${getPerformanceColor(subject.score_percentage)}`}
                                >
                                  {formatPercentage(subject.score_percentage)}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-2 p-4">
                                <div className="rounded-lg bg-slate-50 p-2 text-center">
                                  <div className="text-lg font-bold text-slate-900">
                                    {subject.total_questions}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Total
                                  </div>
                                </div>
                                <div className="rounded-lg border border-green-100 bg-green-50 p-2 text-center text-green-700">
                                  <div className="text-lg font-bold">
                                    {subject.correct_answers}
                                  </div>
                                  <div className="text-[11px]">Correct</div>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-2 text-center text-red-700">
                                  <div className="text-lg font-bold">
                                    {subject.wrong_answers}
                                  </div>
                                  <div className="text-[11px]">Wrong</div>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-center text-blue-700">
                                  <div className="text-lg font-bold">
                                    {skipped}
                                  </div>
                                  <div className="text-[11px]">Skip</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No subject-wise performance data available.
                    </div>
                  )}

                  {/* Viva assessment */}
                  <div className="flex items-center gap-2 px-1">
                    <GraduationCap className="h-4 w-4 text-[#2E3094]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Viva Assessment
                    </h3>
                  </div>

                  {selectedResult.viva_marks?.marks > 0 ? (
                    <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-4">
                      <span className="text-sm font-semibold text-green-800">
                        Viva Completed
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        <Award className="h-3.5 w-3.5" />
                        {selectedResult.viva_marks.marks} marks
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-yellow-800">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        Viva examination has not been completed
                      </div>
                      <Button
                        onClick={() => {
                          setShowResultDialog(false);
                          openVivaModal(selectedResult);
                        }}
                        className="w-full bg-[#2E3094] text-white hover:bg-[#252877]"
                      >
                        <GraduationCap className="mr-1 h-4 w-4" />
                        Give Viva Marks
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop detailed view (hidden on mobile) */}
              <div className="hidden md:block space-y-4 p-5 sm:space-y-5 sm:p-5 md:space-y-6 md:p-6">
                {/* Student Summary Section */}
                <section
                  className="rounded-xl border border-gray-100 p-4 md:p-5"
                  data-purpose="student-info-bar"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                    {/* Student info + meta */}
                    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-x-8 md:gap-y-4 lg:w-auto lg:flex-grow">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 shrink-0 text-indigo-500" />
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-800 sm:text-lg">
                            {selectedResult.student_name}
                          </p>
                          <p className="text-xs text-gray-500 sm:text-sm">
                            Department:{' '}
                            <span className="text-slate-700">
                              {getDisplayDepartment(
                                selectedResult.exam_details.department,
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center md:items-end">
                        <p className="text-xs text-gray-500 sm:text-sm">
                          Semester:{' '}
                          <span className="font-medium text-slate-700">
                            {formatSemesterLabel(
                              selectedResult.exam_details.semester,
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center md:items-end">
                        <p className="text-xs text-gray-500 sm:text-sm">
                          Total Questions:{' '}
                          <span className="font-medium text-slate-700">
                            {selectedResult.exam_details.total_questions}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* High-level stats */}
                    <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap md:gap-3">
                      {/* Performance score card */}
                      <div
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 md:min-w-[140px] ${getPerformanceColor(selectedResult.results.score_percentage)}`}
                      >
                        {React.createElement(
                          getPerformanceBadgeIcon(
                            selectedResult.results.score_percentage,
                          ),
                          { className: 'h-5 w-5 shrink-0' },
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-tight sm:text-lg md:text-xl">
                            {formatPercentage(
                              selectedResult.results.score_percentage,
                            )}
                          </p>
                          <p className="text-[10px] font-semibold opacity-80 sm:text-xs">
                            {getPerformanceLabel(
                              selectedResult.results.score_percentage,
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Correct Answers */}
                      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 md:min-w-[140px]">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-tight text-emerald-600 sm:text-lg md:text-xl">
                            {selectedResult.results.correct_answers}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-500 sm:text-xs">
                            Correct Answers
                          </p>
                        </div>
                      </div>

                      {/* Wrong Answers */}
                      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 md:min-w-[140px]">
                        <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-tight text-rose-600 sm:text-lg md:text-xl">
                            {selectedResult.results.wrong_answers}
                          </p>
                          <p className="text-[10px] font-semibold text-rose-500 sm:text-xs">
                            Wrong Answers
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

              {/* Subject-wise Performance */}
              <section
                className="rounded-xl border border-gray-100 p-4 md:p-5"
                data-purpose="subject-wise-performance"
              >
                <div className="mb-4 flex items-center gap-2 md:mb-6">
                  <BookOpen className="h-5 w-5 text-indigo-800" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    Subject-wise Performance Analysis
                  </h2>
                </div>
                {selectedResult.subjects?.length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {[...selectedResult.subjects]
                      .sort((a, b) => b.score_percentage - a.score_percentage)
                      .map((subject) => {
                        const skipped =
                          subject.total_questions -
                          subject.correct_answers -
                          subject.wrong_answers;
                        return (
                          <div
                            key={subject.subject_id}
                            className="rounded-xl border border-gray-100 p-3 shadow-sm sm:p-4"
                            data-purpose="subject-card"
                          >
                            <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
                              <div className="flex min-w-0 items-center gap-2">
                                <BookOpen className="h-4 w-4 shrink-0 text-gray-400" />
                                <span className="truncate font-bold text-slate-800">
                                  {subject.subject_name}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${getPerformanceColor(subject.score_percentage)}`}
                              >
                                {formatPercentage(subject.score_percentage)}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center">
                              <div className="rounded-lg bg-gray-50 p-1.5 sm:p-2">
                                <p className="text-xs font-bold text-slate-700">
                                  {subject.total_questions}
                                </p>
                                <p className="text-[9px] text-gray-500">Total</p>
                              </div>
                              <div className="rounded-lg bg-emerald-50 p-1.5 sm:p-2">
                                <p className="text-xs font-bold text-emerald-600">
                                  {subject.correct_answers}
                                </p>
                                <p className="text-[9px] text-emerald-600">Correct</p>
                              </div>
                              <div className="rounded-lg bg-rose-50 p-1.5 sm:p-2">
                                <p className="text-xs font-bold text-rose-600">
                                  {subject.wrong_answers}
                                </p>
                                <p className="text-[9px] text-rose-600">Wrong</p>
                              </div>
                              <div className="rounded-lg bg-sky-50 p-1.5 sm:p-2">
                                <p className="text-xs font-bold text-sky-600">
                                  {skipped}
                                </p>
                                <p className="text-[9px] text-sky-600">Skipped</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No subject-wise performance data available.
                  </div>
                )}
              </section>

              {/* Viva Assessment */}
              <section
                className="rounded-xl border border-gray-100 p-4 md:p-5"
                data-purpose="viva-assessment-section"
              >
                <div className="mb-4 flex items-center gap-2 md:mb-6">
                  <BookOpen className="h-5 w-5 text-indigo-900" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    Viva Assessment
                  </h2>
                </div>
                {selectedResult?.viva_marks?.marks > 0 ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 sm:gap-4 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-emerald-700">
                        Viva Completed
                      </h3>
                      <div className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
                        <Award className="h-3 w-3" />
                        {selectedResult.viva_marks.marks} marks
                      </div>
                    </div>
                    {selectedResult.viva_marks.remarks && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-emerald-800">
                          Examiner's Remarks:
                        </p>
                        <p className="rounded-lg border bg-white p-2 text-[11px] text-slate-700">
                          {selectedResult.viva_marks.remarks}
                        </p>
                      </div>
                    )}
                    {Object.keys(selectedResult.viva_marks.rubrics_marks)
                      .length > 0 && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold text-emerald-800">
                          Rubric Breakdown:
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {Object.entries(
                            selectedResult.viva_marks.rubrics_marks,
                          ).map(([rubricId, marks]) => (
                            <div
                              key={rubricId}
                              className="rounded-lg border border-gray-100 bg-white p-3 text-[11px] text-slate-700"
                            >
                              <span className="font-bold">
                                Rubric {rubricId}:
                              </span>{' '}
                              {marks} marks
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 shrink-0 text-yellow-600" />
                      <p className="text-sm font-medium text-yellow-800">
                        Viva examination has not been completed
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowResultDialog(false);
                        openVivaModal(selectedResult);
                      }}
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] md:w-auto"
                    >
                      <GraduationCap className="mr-1 h-4 w-4" />
                      Give Viva Marks
                    </Button>
                  </div>
                )}
              </section>
              </div>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Viva Modal */}
      <VivaModal
        open={showVivaModal}
        onOpenChange={setShowVivaModal}
        studentResult={selectedResult}
        onVivaMarksAdded={handleVivaMarksAdded}
        onViewWrittenResult={() => {
          if (selectedResult) {
            setShowVivaModal(false);
            openResultDialog(selectedResult);
          }
        }}
      />
    </div>
  );
}
