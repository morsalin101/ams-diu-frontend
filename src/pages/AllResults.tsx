import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { Checkbox } from '../components/ui/checkbox';
import {
  FileText,
  Search,
  RefreshCw,
  Building,
  CheckCircle2,
  CheckSquare,
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
import {
  admissionResultsAPI,
  departmentAPI,
  facultyAPI,
  facultyDepartmentAPI,
} from '../services/api';
import { SemesterCombobox } from '../components/SemesterCombobox';
import {
  DepartmentMultiSelect,
  type DepartmentOption,
} from '../components/DepartmentMultiSelect';
import {
  FacultyMultiSelect,
  type FacultyOption,
} from '../components/FacultyMultiSelect';
import {
  ResultsSortFilterControls,
  type DateSort,
  type ExamsSort,
  type ScoreSort,
  type SortCategory,
} from '../components/ResultsSortFilterControls';
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
  allocated_department?: string | null;
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

interface FacultyDepartmentMapping {
  faculty_id: number;
  faculty_name: string;
  faculty_shortname?: string;
  department_ids: number[];
}

type TabType = 'SELECTED' | 'ACCEPTED';

interface PersistedAllResultsFilters {
  facultyIds: number[];
  departmentIds: number[];
  semester: string;
  activeTab: TabType;
  search: string;
  examType: 'all' | 'CENTRAL' | 'SCHEDULED';
  activeSortCategory: SortCategory;
  scoreSort: ScoreSort;
  examsSort: ExamsSort;
  dateSort: DateSort;
  customStartDate: string;
  customEndDate: string;
}

const ALL_RESULTS_FILTER_STORAGE_PREFIX = 'ams:all-results:filters:v1';
const ALL_RESULT_TABS: TabType[] = [
  'SELECTED',
  'ACCEPTED',
];

const parseStoredIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
};

const readStoredFilters = (storageKey: string | null): PersistedAllResultsFilters | null => {
  if (!storageKey) return null;
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return null;
    const value = JSON.parse(rawValue) as Record<string, unknown>;
    return {
      facultyIds: parseStoredIds(value.facultyIds),
      departmentIds: parseStoredIds(value.departmentIds),
      semester: typeof value.semester === 'string' ? value.semester : '',
      activeTab: ALL_RESULT_TABS.includes(value.activeTab as TabType)
        ? value.activeTab as TabType
        : 'SELECTED',
      search: typeof value.search === 'string' ? value.search : '',
      examType: ['all', 'CENTRAL', 'SCHEDULED'].includes(String(value.examType))
        ? value.examType as PersistedAllResultsFilters['examType']
        : 'all',
      activeSortCategory: ['score', 'exams', 'date'].includes(String(value.activeSortCategory))
        ? value.activeSortCategory as SortCategory
        : 'date',
      scoreSort: ['score_high', 'score_low'].includes(String(value.scoreSort))
        ? value.scoreSort as ScoreSort
        : 'score_high',
      examsSort: ['exams_most', 'exams_fewest'].includes(String(value.examsSort))
        ? value.examsSort as ExamsSort
        : 'exams_most',
      dateSort: ['latest', 'oldest', 'custom'].includes(String(value.dateSort))
        ? value.dateSort as DateSort
        : 'latest',
      customStartDate: typeof value.customStartDate === 'string' ? value.customStartDate : '',
      customEndDate: typeof value.customEndDate === 'string' ? value.customEndDate : '',
    };
  } catch {
    return null;
  }
};

const AllResults: React.FC = () => {
  const { user } = useAuth();
  const { canRead, canWrite } = usePermissions();
  const hasReadAccess = canRead();
  const accessType = (user?.access_type || '').trim().toUpperCase();
  const isSuperAdmin =
    user?.role_details?.role_name?.toLowerCase() === 'superadmin' ||
    Boolean(user?.is_global_access) ||
    accessType === 'GLOBAL';
  const isFacultyUser =
    !isSuperAdmin &&
    (accessType === 'FACULTY' ||
      (Boolean(user?.faculty_details?.id) && !user?.department_details?.id));
  const isDepartmentUser = !isSuperAdmin && !isFacultyUser && Boolean(user?.department_details?.id);
  const filterStorageKey = user
    ? `${ALL_RESULTS_FILTER_STORAGE_PREFIX}:user:${user.id}`
    : null;

  const [activeTab, setActiveTab] = useState<TabType>('SELECTED');
  const [results, setResults] = useState<AdmissionResult[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [facultyMappings, setFacultyMappings] = useState<FacultyDepartmentMapping[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const [isScopeLoading, setIsScopeLoading] = useState(true);
  const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Selected student rows for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [semesterOptions, setSemesterOptions] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState<'all' | 'CENTRAL' | 'SCHEDULED'>('all');
  const [activeSortCategory, setActiveSortCategory] = useState<SortCategory>('date');
  const [scoreSort, setScoreSort] = useState<ScoreSort>('score_high');
  const [examsSort, setExamsSort] = useState<ExamsSort>('exams_most');
  const [dateSort, setDateSort] = useState<DateSort>('latest');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Summary counts
  const [summary, setSummary] = useState({
    SELECTED: 0,
    ACCEPTED: 0,
    WAITING: 0,
    REJECTED: 0,
    ABSENT: 0,
  });

  // Report Modal state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportExamId, setSelectedReportExamId] = useState<number | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null);
  const [selectedReportStudentName, setSelectedReportStudentName] = useState<string>('');
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null);
  const [isBulkDownloadingReports, setIsBulkDownloadingReports] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  const availableDepartments = useMemo(() => {
    if (selectedFacultyIds.length === 0) return departments;
    const selectedFacultyIdSet = new Set(selectedFacultyIds);
    const mappedDepartmentIds = new Set(
      facultyMappings
        .filter((mapping) => selectedFacultyIdSet.has(Number(mapping.faculty_id)))
        .flatMap((mapping) => mapping.department_ids || []),
    );
    return departments.filter((department) => mappedDepartmentIds.has(department.id));
  }, [departments, facultyMappings, selectedFacultyIds]);

  const selectedFaculty = useMemo(() => {
    if (selectedFacultyIds.length !== 1) return null;
    return faculties.find((faculty) => faculty.id === selectedFacultyIds[0]) || null;
  }, [faculties, selectedFacultyIds]);

  const scopeQueryParams = useMemo(() => {
    const params: Record<string, number | string> = {};
    if (selectedFacultyIds.length === 1) {
      params.faculty_id = selectedFacultyIds[0];
    } else if (selectedFacultyIds.length > 1) {
      params.faculty_ids = selectedFacultyIds.join(',');
    }
    if (selectedDepartmentIds.length === 1) {
      params.department_id = selectedDepartmentIds[0];
    } else if (selectedDepartmentIds.length > 1) {
      params.department_ids = selectedDepartmentIds.join(',');
    }
    return params;
  }, [selectedDepartmentIds, selectedFacultyIds]);

  const resultQueryParams = useMemo(() => {
    const params: Record<string, string> = {
      sort_by: activeSortCategory === 'score'
        ? 'score'
        : activeSortCategory === 'exams'
          ? 'exams_taken'
          : 'date',
      order: activeSortCategory === 'score'
        ? (scoreSort === 'score_high' ? 'desc' : 'asc')
        : activeSortCategory === 'exams'
          ? (examsSort === 'exams_most' ? 'desc' : 'asc')
          : (dateSort === 'oldest' ? 'asc' : 'desc'),
    };
    if (dateSort === 'custom') {
      if (customStartDate && customEndDate && customStartDate === customEndDate) {
        params.exam_taken_date = customStartDate;
      } else {
        if (customStartDate) params.start_date = customStartDate;
        if (customEndDate) params.end_date = customEndDate;
      }
    }
    if (examTypeFilter !== 'all') params.exam_type = examTypeFilter;
    return params;
  }, [
    activeSortCategory,
    customEndDate,
    customStartDate,
    dateSort,
    examTypeFilter,
    examsSort,
    scoreSort,
  ]);

  useEffect(() => {
    if (!hasReadAccess) {
      setIsScopeLoading(false);
      return;
    }

    let isMounted = true;
    const loadScope = async () => {
      setIsScopeLoading(true);
      setIsFilterStateHydrated(false);
      try {
        const [departmentResponse, facultyResponse, mappingResponse] = await Promise.all([
          departmentAPI.getAllDepartments(),
          facultyAPI.getAllFaculties(),
          facultyDepartmentAPI.getAllMappings(),
        ]);
        if (!isMounted) return;

        const nextDepartments: DepartmentOption[] = departmentResponse?.data || [];
        let nextFaculties: FacultyOption[] = facultyResponse?.data || [];
        const allMappings: FacultyDepartmentMapping[] = Array.isArray(mappingResponse)
          ? mappingResponse
          : mappingResponse?.data || [];
        const accessibleDepartmentIds = new Set(nextDepartments.map((department) => department.id));
        const nextMappings = isSuperAdmin
          ? allMappings
          : allMappings.filter((mapping) =>
              mapping.department_ids?.some((departmentId) =>
                accessibleDepartmentIds.has(departmentId),
              ),
            );

        nextMappings.forEach((mapping) => {
          if (!nextFaculties.some((faculty) => faculty.id === mapping.faculty_id)) {
            nextFaculties = [
              ...nextFaculties,
              {
                id: mapping.faculty_id,
                faculty_name: mapping.faculty_name,
                faculty_shortname: mapping.faculty_shortname || mapping.faculty_name,
              },
            ];
          }
        });

        const assignedDepartmentId = user?.department_details?.id;
        const mappedFaculty = assignedDepartmentId
          ? nextMappings.find((mapping) => mapping.department_ids?.includes(assignedDepartmentId))
          : null;
        const assignedFacultyId = user?.faculty_details?.id || mappedFaculty?.faculty_id;
        const storedFilters = readStoredFilters(filterStorageKey);
        const availableFacultyIds = new Set(nextFaculties.map((faculty) => Number(faculty.id)));
        let nextSelectedFacultyIds = !isSuperAdmin && assignedFacultyId
          ? [Number(assignedFacultyId)]
          : (storedFilters?.facultyIds || []).filter((id) => availableFacultyIds.has(id));
        if (nextFaculties.length === 1) {
          nextSelectedFacultyIds = [Number(nextFaculties[0].id)];
        }

        const selectedFacultyIdSet = new Set(nextSelectedFacultyIds);
        const mappedDepartmentIds = nextSelectedFacultyIds.length > 0
          ? new Set(
              nextMappings
                .filter((mapping) => selectedFacultyIdSet.has(Number(mapping.faculty_id)))
                .flatMap((mapping) => mapping.department_ids || []),
            )
          : accessibleDepartmentIds;
        const scopedDepartmentIds = nextDepartments
          .map((department) => Number(department.id))
          .filter((departmentId) => mappedDepartmentIds.has(departmentId));
        const scopedDepartmentIdSet = new Set(scopedDepartmentIds);
        let nextSelectedDepartmentIds = isDepartmentUser && assignedDepartmentId
          ? [Number(assignedDepartmentId)]
          : (storedFilters?.departmentIds || []).filter((id) => scopedDepartmentIdSet.has(id));
        if (scopedDepartmentIds.length === 1) {
          nextSelectedDepartmentIds = [scopedDepartmentIds[0]];
        }

        setDepartments(nextDepartments);
        setFaculties(nextFaculties);
        setFacultyMappings(nextMappings);
        setSelectedFacultyIds(nextSelectedFacultyIds);
        setSelectedDepartmentIds(nextSelectedDepartmentIds);
        setSelectedSemester(storedFilters?.semester || '');
        setActiveTab(storedFilters?.activeTab || 'SELECTED');
        setDraftSearch(storedFilters?.search || '');
        setAppliedSearch(storedFilters?.search || '');
        setExamTypeFilter(storedFilters?.examType || 'all');
        setActiveSortCategory(storedFilters?.activeSortCategory || 'date');
        setScoreSort(storedFilters?.scoreSort || 'score_high');
        setExamsSort(storedFilters?.examsSort || 'exams_most');
        setDateSort(storedFilters?.dateSort || 'latest');
        setCustomStartDate(storedFilters?.customStartDate || '');
        setCustomEndDate(storedFilters?.customEndDate || '');
        setIsFilterStateHydrated(true);
      } catch (error: any) {
        if (isMounted) {
          toast.error(error?.message || 'Failed to load faculty and department filters');
          setDepartments([]);
          setFaculties([]);
          setFacultyMappings([]);
        }
      } finally {
        if (isMounted) setIsScopeLoading(false);
      }
    };

    void loadScope();
    return () => {
      isMounted = false;
    };
  }, [filterStorageKey, hasReadAccess, isDepartmentUser, isSuperAdmin, user]);

  useEffect(() => {
    if (isScopeLoading) return;
    let isMounted = true;
    const loadSemesters = async () => {
      try {
        const response = await admissionResultsAPI.getSemesterOptions(scopeQueryParams);
        if (!isMounted) return;
        const semesters = response?.semesters || [];
        setSemesterOptions(semesters);
        setSelectedSemester((currentSemester) =>
          currentSemester && semesters.includes(currentSemester)
            ? currentSemester
            : semesters[0] || '',
        );
      } catch (error: any) {
        if (isMounted) {
          toast.error(error?.message || 'Failed to load semester options');
          setSemesterOptions([]);
          setSelectedSemester('');
        }
      }
    };
    void loadSemesters();
    return () => {
      isMounted = false;
    };
  }, [isScopeLoading, scopeQueryParams]);

  useEffect(() => {
    if (!filterStorageKey || !isFilterStateHydrated || isScopeLoading) return;
    const filters: PersistedAllResultsFilters = {
      facultyIds: selectedFacultyIds,
      departmentIds: selectedDepartmentIds,
      semester: selectedSemester,
      activeTab,
      search: appliedSearch,
      examType: examTypeFilter,
      activeSortCategory,
      scoreSort,
      examsSort,
      dateSort,
      customStartDate,
      customEndDate,
    };
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(filters));
    } catch {
      // localStorage can be unavailable; current-session filtering still works.
    }
  }, [
    activeSortCategory,
    activeTab,
    appliedSearch,
    customEndDate,
    customStartDate,
    dateSort,
    examTypeFilter,
    examsSort,
    filterStorageKey,
    isFilterStateHydrated,
    isScopeLoading,
    scoreSort,
    selectedDepartmentIds,
    selectedFacultyIds,
    selectedSemester,
  ]);

  useEffect(() => {
    if (isScopeLoading) return;
    if (availableDepartments.length === 1) {
      const onlyDepartmentId = availableDepartments[0].id;
      setSelectedDepartmentIds((currentIds) =>
        currentIds.length === 1 && currentIds[0] === onlyDepartmentId
          ? currentIds
          : [onlyDepartmentId],
      );
      return;
    }
    const availableIdSet = new Set(availableDepartments.map((department) => department.id));
    setSelectedDepartmentIds((currentIds) => {
      const validIds = currentIds.filter((departmentId) => availableIdSet.has(departmentId));
      return validIds.length === currentIds.length ? currentIds : [];
    });
  }, [availableDepartments, isScopeLoading]);

  useEffect(() => {
    setPage(1);
  }, [
    activeSortCategory,
    customEndDate,
    customStartDate,
    dateSort,
    examTypeFilter,
    examsSort,
    scoreSort,
    selectedDepartmentIds,
    selectedFacultyIds,
    selectedSemester,
  ]);

  useEffect(() => {
    if (!hasReadAccess || isScopeLoading || !selectedSemester) {
      setResults([]);
      setPagination(DEFAULT_PAGINATION);
      return;
    }

    let isMounted = true;
    const loadResults = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          ...scopeQueryParams,
          ...resultQueryParams,
          page,
          semester: selectedSemester,
          search: appliedSearch || undefined,
        };
        if (activeTab === 'ACCEPTED') {
          params.result_status = 'ACCEPTED';
        } else {
          // The pre-admission board includes every not-yet-accepted result so
          // candidates without an allocation remain visible as "None".
          params.is_admitted = false;
        }

        const response = await admissionResultsAPI.getResults(params);
        if (!isMounted) return;
        if (response && response.success !== false) {
          setResults(response.results || (Array.isArray(response) ? response : []));
          setPagination(paginationFromDrf(response, page));
          const nextSummary = response.summary || response.total_summary || {};
          setSummary({
            SELECTED: nextSummary.SELECTED ?? 0,
            ACCEPTED: nextSummary.ACCEPTED ?? 0,
            WAITING: nextSummary.WAITING ?? 0,
            REJECTED: nextSummary.REJECTED ?? 0,
            ABSENT: nextSummary.ABSENT ?? 0,
          });
        } else {
          toast.error(response?.message || 'Failed to load admission results');
          setResults([]);
          setPagination(DEFAULT_PAGINATION);
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Error loading results:', error);
        toast.error(error?.message || error?.detail || 'Failed to load admission results');
        setResults([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadResults();
    setSelectedIds([]);
    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    appliedSearch,
    hasReadAccess,
    isScopeLoading,
    page,
    reloadKey,
    resultQueryParams,
    scopeQueryParams,
    selectedSemester,
  ]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setReloadKey((current) => current + 1);
  };

  const handleClearSearch = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleFacultyChange = (facultyIds: number[]) => {
    setSelectedFacultyIds(facultyIds);
    setSelectedDepartmentIds([]);
    setPage(1);
  };

  const handleResetSortAndFilter = () => {
    setActiveSortCategory('date');
    setScoreSort('score_high');
    setExamsSort('exams_most');
    setDateSort('latest');
    setExamTypeFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const isSortFilterCustomized =
    activeSortCategory !== 'date' ||
    dateSort !== 'latest' ||
    examTypeFilter !== 'all' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(results.map((result) => result.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, id])]);
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

    const selectedResults = results.filter(
      (result) =>
        selectedIds.includes(result.id) &&
        result.is_selected &&
        result.result_status === 'SELECTED' &&
        !result.is_admitted,
    );
    if (selectedResults.length === 0) {
      toast.error('Only candidates allocated to a department can be accepted.');
      return;
    }
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
      toast.success(`Successfully accepted ${selectedResults.length} candidate(s) for admission.`);
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

  const resolveBulkReportResults = async (): Promise<AdmissionResult[]> => {
    if (selectedIds.length > 0) {
      const selectedIdSet = new Set(selectedIds);
      return results.filter((result) => selectedIdSet.has(result.id));
    }

    const params: Record<string, unknown> = {
      ...scopeQueryParams,
      ...resultQueryParams,
      semester: selectedSemester,
      search: appliedSearch || undefined,
    };
    if (activeTab === 'ACCEPTED') {
      params.result_status = 'ACCEPTED';
    } else {
      params.is_admitted = false;
    }
    const response = await admissionResultsAPI.getAllResults(params);
    return response?.results || response?.data || [];
  };

  const handleDownloadBulkReports = async () => {
    setIsBulkDownloadingReports(true);
    try {
      const reportResults = await resolveBulkReportResults();
      if (reportResults.length === 0) {
        toast.error('No students found for the current filters.');
        return;
      }
      if (reportResults.length === 1) {
        await handleDownloadReport(reportResults[0]);
        return;
      }

      const response = await admissionResultsAPI.downloadStudentDetailReportsZip(
        reportResults.map((result) => ({
          exam_id: result.exam_id || result.exam,
          student_id: result.student_id || result.student,
        })),
      );
      if (!response?.blob) {
        throw new Error('Student report ZIP is not available yet.');
      }
      downloadBlobFile(response.blob, response.filename);
      toast.success(`Downloaded ${reportResults.length} student reports as ZIP.`);
    } catch (error: any) {
      console.error('Error downloading bulk student reports:', error);
      toast.error(error?.message || 'Failed to download student reports');
    } finally {
      setIsBulkDownloadingReports(false);
    }
  };

  const hasAppliedFilters =
    Boolean(appliedSearch) ||
    selectedFacultyIds.length > 0 ||
    selectedDepartmentIds.length > 0 ||
    examTypeFilter !== 'all' ||
    isSortFilterCustomized;

  const actionableResults = results.filter((result) =>
    activeTab === 'ACCEPTED'
      ? Boolean(result.is_admitted)
      : Boolean(result.is_selected && result.result_status === 'SELECTED'),
  );
  const selectedIdSet = new Set(selectedIds);
  const selectedActionableCount = actionableResults.filter((result) =>
    selectedIdSet.has(result.id),
  ).length;
  const allVisibleSelected =
    results.length > 0 && results.every((result) => selectedIdSet.has(result.id));
  const someVisibleSelected = results.some((result) => selectedIdSet.has(result.id));
  const awaitingAdmissionCount =
    summary.SELECTED + summary.WAITING + summary.REJECTED + summary.ABSENT;
  const statusTabs: Array<{
    value: TabType;
    label: string;
    count: number;
    dotClass: string;
  }> = [
    {
      value: 'SELECTED',
      label: 'Selected Candidates',
      count: awaitingAdmissionCount,
      dotClass: 'bg-green-500',
    },
    {
      value: 'ACCEPTED',
      label: 'Accepted Candidates',
      count: summary.ACCEPTED,
      dotClass: 'bg-emerald-600',
    },
  ];

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
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-600">Faculty</Label>
              <FacultyMultiSelect
                options={faculties}
                selectedIds={selectedFacultyIds}
                onChange={handleFacultyChange}
                disabled={isScopeLoading || !isSuperAdmin || faculties.length <= 1}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-600">Department</Label>
              <DepartmentMultiSelect
                options={availableDepartments}
                selectedIds={selectedDepartmentIds}
                onChange={(departmentIds) => {
                  setSelectedDepartmentIds(departmentIds);
                  setPage(1);
                }}
                disabled={isScopeLoading || isDepartmentUser || availableDepartments.length <= 1}
                allLabel={selectedFaculty
                  ? `All ${selectedFaculty.faculty_shortname} departments`
                  : selectedFacultyIds.length > 0
                    ? 'All selected faculty departments'
                    : 'All departments'}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-600">Semester</Label>
              <SemesterCombobox
                value={selectedSemester}
                options={semesterOptions}
                onChange={setSelectedSemester}
                disabled={isScopeLoading || semesterOptions.length === 0}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-600">Exam Type</Label>
              <Select
                value={examTypeFilter}
                onValueChange={(value: 'all' | 'CENTRAL' | 'SCHEDULED') =>
                  setExamTypeFilter(value)
                }
                disabled={isScopeLoading || isLoading}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Exam Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exam Types</SelectItem>
                  <SelectItem value="CENTRAL">Central</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5 md:col-span-2 xl:col-span-2">
              <Label className="text-xs font-semibold uppercase text-gray-600">Search</Label>
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

            <div className="flex items-center gap-2 md:col-span-2 xl:col-span-2 justify-end pt-1">
              <Button
                onClick={handleSearch}
                disabled={isScopeLoading || isLoading || !selectedSemester}
                className="h-9 px-4 bg-[#2E3094] text-white hover:bg-[#252778] text-xs font-semibold shadow-sm"
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={handleClearSearch}
                disabled={isScopeLoading || isLoading || (!draftSearch && !appliedSearch)}
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
                    disabled={isScopeLoading || isLoading || !selectedSemester}
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

          <div className="mt-4">
            <ResultsSortFilterControls
              activeCategory={activeSortCategory}
              onCategoryChange={setActiveSortCategory}
              scoreSort={scoreSort}
              onScoreSortChange={setScoreSort}
              examsSort={examsSort}
              onExamsSortChange={setExamsSort}
              dateSort={dateSort}
              onDateSortChange={setDateSort}
              startDate={customStartDate}
              endDate={customEndDate}
              onStartDateChange={setCustomStartDate}
              onEndDateChange={setCustomEndDate}
              onReset={handleResetSortAndFilter}
              isCustomized={isSortFilterCustomized}
              disabled={isScopeLoading || isLoading || !selectedSemester}
            />
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
              <TabsList className="flex h-auto flex-wrap bg-slate-100 p-1 rounded-lg">
                {statusTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-white data-[state=active]:text-[#2E3094] data-[state=active]:shadow-sm font-semibold text-xs px-3.5 py-1.5"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${tab.dotClass}`} />
                      {tab.label} ({tab.count})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Workflow Action Buttons */}
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-600 sm:flex">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                Bulk Selection
              </span>
              {activeTab === 'SELECTED' && canWrite() && (
                <Button
                  size="sm"
                  onClick={handleAcceptAdmission}
                  disabled={selectedActionableCount === 0 || isProcessing}
                  className="h-8 px-3 text-white bg-green-600 hover:bg-green-700 shadow-sm text-xs font-semibold"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Accept Admission {selectedActionableCount > 0 && `(${selectedActionableCount})`}
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

              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDownloadBulkReports()}
                disabled={
                  isLoading ||
                  isBulkDownloadingReports ||
                  downloadingReportId !== null ||
                  !selectedSemester ||
                  pagination.count === 0
                }
                className="h-8 px-3 text-xs font-semibold"
                title={
                  selectedIds.length > 0
                    ? 'Download reports for selected students'
                    : 'Download reports for all students matching the current filters'
                }
              >
                {isBulkDownloadingReports ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                {selectedIds.length > 0
                  ? `Reports (${selectedIds.length})`
                  : 'All Reports'}
              </Button>

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
                        disabled={results.length === 0}
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
                              {result.allocated_department ||
                                (result.is_selected || result.is_admitted
                                  ? result.department_shortname || result.department_name
                                  : 'None')}
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
