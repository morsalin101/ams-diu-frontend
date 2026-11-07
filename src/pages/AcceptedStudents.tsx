import { startTransition, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { SemesterCombobox } from "../components/SemesterCombobox";
import {
  DepartmentMultiSelect,
  type DepartmentOption,
} from "../components/DepartmentMultiSelect";
import {
  FacultyMultiSelect,
  type FacultyOption,
} from "../components/FacultyMultiSelect";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../contexts/AuthContext";
import {
  formatSemesterLabel,
  PRETTY_STATUS_LABELS,
  type AdmissionResult,
} from "../lib/admission";
import {
  buildResultSheetRows,
  getColumnHeader,
  getResultStatusBadgeClass,
  groupResultsByDenominators,
  resolveFacultyName,
  type ExamLookupRecord,
} from "../lib/result-sheet";
import {
  drawDiuPdfChrome,
  drawSignatureBlock,
  getSignatureBlockHeight,
  loadDiuLogoDataUrl,
  type ResultSheetSignatory,
} from "../lib/diu-report-pdf";
import { downloadBlobFile } from "../lib/pdf-download";
import {
  admissionResultsAPI,
  departmentAPI,
  examAPI,
  facultyAPI,
  facultyDepartmentAPI,
  reportSignatoryAPI,
} from "../services/api";
import { StudentAdmissionReportDialog } from "../components/StudentAdmissionReportDialog";
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from "../components/PaginationControls";
import {
  ResultsSortFilterControls,
  type SortCategory,
  type ScoreSort,
  type ExamsSort,
  type DateSort,
} from "../components/ResultsSortFilterControls";

const TAB_TO_STATUS = {
  selected: "SELECTED",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  waiting: "WAITING",
  absent: "ABSENT",
} as const;

const RESULT_TAB_TRIGGER_CLASS =
  "border border-gray-300 bg-white px-3 py-2 shadow-sm hover:border-[#4C51BF] hover:bg-[#4C51BF]/5 data-[state=active]:border-[#2E3094] data-[state=active]:bg-[#2E3094]/10 data-[state=active]:text-[#2E3094] data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-[#2E3094]/20";

const DEFAULT_SUMMARY = {
  SELECTED: 0,
  ACCEPTED: 0,
  WAITING: 0,
  REJECTED: 0,
  ABSENT: 0,
};

interface ReportSignatoryRecord {
  role: "CONVENOR" | "DEPARTMENT_HEAD" | "DEAN";
  name: string;
  designation: string;
  department: number | null;
  faculty: number | null;
}

const withoutRepeatedPrefix = (value: string, prefix: "Faculty" | "Department") =>
  value
    .trim()
    .replace(new RegExp(`^(?:${prefix}\\s+of\\s+)+`, "i"), "")
    .trim();

type TabKey = keyof typeof TAB_TO_STATUS;
const ALL_TABS = Object.keys(TAB_TO_STATUS) as TabKey[];

const RESULT_FILTER_STORAGE_PREFIX = "ams:results:filters:v1";

interface PersistedResultFilters {
  facultyIds: number[];
  departmentIds: number[];
  semester: string;
  activeTab: TabKey;
  search: string;
  examType: "all" | "CENTRAL" | "SCHEDULED";
  activeSortCategory: SortCategory;
  scoreSort: ScoreSort;
  examsSort: ExamsSort;
  dateSort: DateSort;
  customStartDate: string;
  customEndDate: string;
  exportCount: string;
}

const parseStoredNumberIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
};

const readPersistedResultFilters = (
  storageKey: string | null,
): PersistedResultFilters | null => {
  if (!storageKey) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    const value = JSON.parse(rawValue) as Record<string, unknown>;
    const activeTab = ALL_TABS.includes(value.activeTab as TabKey)
      ? value.activeTab as TabKey
      : "selected";
    const examType = ["all", "CENTRAL", "SCHEDULED"].includes(String(value.examType))
      ? value.examType as PersistedResultFilters["examType"]
      : "all";
    const activeSortCategory = ["score", "exams", "date"].includes(
      String(value.activeSortCategory),
    )
      ? value.activeSortCategory as SortCategory
      : "date";
    const scoreSort = ["score_high", "score_low"].includes(String(value.scoreSort))
      ? value.scoreSort as ScoreSort
      : "score_high";
    const examsSort = ["exams_most", "exams_fewest"].includes(String(value.examsSort))
      ? value.examsSort as ExamsSort
      : "exams_most";
    const dateSort = ["latest", "oldest", "custom"].includes(String(value.dateSort))
      ? value.dateSort as DateSort
      : "latest";

    return {
      facultyIds: parseStoredNumberIds(value.facultyIds),
      departmentIds: parseStoredNumberIds(value.departmentIds),
      semester: typeof value.semester === "string" ? value.semester : "",
      activeTab,
      search: typeof value.search === "string" ? value.search : "",
      examType,
      activeSortCategory,
      scoreSort,
      examsSort,
      dateSort,
      customStartDate:
        typeof value.customStartDate === "string" ? value.customStartDate : "",
      customEndDate:
        typeof value.customEndDate === "string" ? value.customEndDate : "",
      exportCount:
        typeof value.exportCount === "string" && /^\d*$/.test(value.exportCount)
          ? value.exportCount
          : "",
    };
  } catch {
    return null;
  }
};

// Per-tab labels (trigger text) and summary-card styling, so both the cards and
// the tab strip can be rendered from an allow-list (cosmetic tab restriction).
const TAB_LABELS: Record<TabKey, string> = {
  selected: "Selected",
  accepted: "Accepted",
  rejected: "Not Selected",
  waiting: "Waiting",
  absent: "Absent",
};
const CARD_CONFIG: Record<TabKey, { label: string; className: string }> = {
  selected: { label: "Selected", className: "text-green-600" },
  accepted: { label: "Accepted", className: "text-emerald-700" },
  rejected: { label: "Rejected", className: "text-rose-600" },
  waiting: { label: "Waiting", className: "text-amber-600" },
  absent: { label: "Absent", className: "text-slate-600" },
};
// Static class names (Tailwind can't see interpolated ones).
const GRID_COLS_XL: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};
const GRID_COLS_MD: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

// Configurable columns for the exported PDF result sheet.
// To adjust the PDF table:
//   - Rename a column        → change the `header` value
//   - Resize a column        → change the `cellWidth` value
//   - Hide a column          → comment out that one object line
//   - Reorder columns        → reorder the entries in this array
//   - Add a new column       → add a new entry; make sure the row object
//                              has the matching field (see `exportRows`)
type PdfColumnAlign = "left" | "center" | "right";

type PdfColumn = {
  key: keyof ReturnType<typeof buildResultSheetRows>[number];
  header: string;
  cellWidth: number;
  align?: PdfColumnAlign;
};

const RESULT_SHEET_PDF_COLUMNS: PdfColumn[] = [
  { key: "serial", header: "SL", cellWidth: 24, align: "center" },
  { key: "applicationSerial", header: "Application Serial", cellWidth: 76 },
  { key: "studentName", header: "Student Name", cellWidth: 92 },
  { key: "ssc", header: "SSC", cellWidth: 58, align: "center" },
  { key: "academic", header: "HSC/Diploma", cellWidth: 58, align: "center" },
  { key: "written", header: "Written", cellWidth: 58, align: "center" },
  { key: "viva", header: "Viva", cellWidth: 54, align: "center" },
  // { key: "writtenViva", header: "Written + Viva", cellWidth: 50, align: "center" },  // commented out: hidden column
  { key: "total", header: "Total", cellWidth: 76, align: "center" },
  { key: "examTakenAt", header: "Exam Date", cellWidth: 68, align: "center" },
  { key: "remarks", header: "Status", cellWidth: 62, align: "center" },
];

// Column order for the Excel result sheet. Headers are computed per denominator
// group via getColumnHeader; the mark columns hold bare values (denominator is
// in the header). Keep in sync with the `!cols` widths in exportExcel.
const RESULT_SHEET_EXCEL_KEYS = [
  "serial",
  "applicationSerial",
  "studentName",
  "ssc",
  "academic",
  "written",
  "viva",
  "writtenViva",
  "total",
  "examTakenAt",
  "remarks",
] as const;

// Build autoTable input from the column config above.
// Pass `effectiveColumnWidths` (from `scaleColumnWidthsToPage`) to make the
// table fill the full usable page width and avoid a gap on the right side.
const buildPdfTableConfig = (
  columns: PdfColumn[],
  effectiveColumnWidths?: number[],
) => {
  const head: string[][] = [columns.map((column) => column.header)];
  const columnStyles: Record<
    number,
    { cellWidth: number; halign?: PdfColumnAlign }
  > = {};
  columns.forEach((column, index) => {
    const cellWidth = effectiveColumnWidths?.[index] ?? column.cellWidth;
    columnStyles[index] = { cellWidth };
    if (column.align) {
      columnStyles[index].halign = column.align;
    }
  });
  return { head, columnStyles };
};

const formatPdfColumnHeader = (header: string) => {
  const match = header.match(/^(.*) \((out of .+)\)$/i);
  return match ? `${match[1]}\n(${match[2]})` : header;
};

/**
 * Scale the configured column widths so they exactly fill the available page
 * width. This keeps the right edge of the table flush with the right margin
 * even if the configured widths don't sum to the page width.
 *
 * Any change to a `cellWidth` in `RESULT_SHEET_PDF_COLUMNS` will be scaled
 * proportionally to the rest, so the table always spans the full width.
 */
const scaleColumnWidthsToPage = (
  columns: PdfColumn[],
  pageWidth: number,
  marginX: number,
): number[] => {
  const usableWidth = pageWidth - marginX * 2;
  const baseWidths = columns.map((column) => column.cellWidth);
  const baseTotal = baseWidths.reduce((sum, width) => sum + width, 0);
  if (baseTotal <= 0) {
    return baseWidths;
  }
  // Scale each width proportionally and round to integers. Then adjust the
  // last column so the rounded widths still sum exactly to `usableWidth`.
  const scaled = baseWidths.map((width) =>
    Math.round((width / baseTotal) * usableWidth),
  );
  const scaledTotal = scaled.reduce((sum, width) => sum + width, 0);
  const drift = usableWidth - scaledTotal;
  scaled[scaled.length - 1] += drift;
  return scaled;
};

type ExportFormat = "pdf" | "excel";

interface AcceptedStudentsProps {
  // Cosmetic tab restriction: pass a subset to show only those tabs + their
  // summary cards (e.g. ["selected","rejected"] for a published-results viewer).
  // Not a security boundary — the API still serves every status.
  allowedTabs?: TabKey[];
}

interface FacultyDepartmentMapping {
  faculty_id: number;
  faculty_name: string;
  faculty_shortname?: string;
  department_ids: number[];
}

export function AcceptedStudents({ allowedTabs = ALL_TABS }: AcceptedStudentsProps = {}) {
  const visibleTabs = allowedTabs.length > 0 ? allowedTabs : ALL_TABS;
  const { user } = useAuth();
  const { canRead, canWrite } = usePermissions();
  const hasReadAccess = canRead();
  const hasWriteAccess = canWrite();
  const filterStorageKey = user
    ? `${RESULT_FILTER_STORAGE_PREFIX}:user:${user.id}`
    : null;

  const accessType = (user?.access_type || "").trim().toUpperCase();
  const isGlobalUser =
    user?.role_details?.role_name?.toLowerCase() === "superadmin"
    || Boolean(user?.is_global_access)
    || accessType === "GLOBAL";
  const isFacultyUser =
    !isGlobalUser
    && (accessType === "FACULTY"
      || Boolean(user?.faculty_details?.id && !user?.department_details?.id));
  const isDepartmentUser =
    !isGlobalUser && !isFacultyUser && Boolean(user?.department_details?.id);

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [facultyMappings, setFacultyMappings] = useState<FacultyDepartmentMapping[]>([]);
  // Empty means every faculty available inside the user's access scope.
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  // Empty means every department available inside the selected access scope.
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const [isScopeLoading, setIsScopeLoading] = useState(true);
  const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [semesterOptions, setSemesterOptions] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(visibleTabs[0]);
  const [results, setResults] = useState<AdmissionResult[]>([]);
  // Filtered counts drive both the top cards and tab labels.
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [configurationMissing, setConfigurationMissing] = useState(false);
  const [examRecords, setExamRecords] = useState<ExamLookupRecord[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  // Sort and filter divided into 3 distinct logical groups:
  // 1. SCORE ("score_high" | "score_low")
  // 2. EXAM TAKEN ("exams_most" | "exams_fewest")
  // 3. DATE ("latest" | "oldest" | "custom")
  const [activeSortCategory, setActiveSortCategory] = useState<SortCategory>("date");
  const [scoreSort, setScoreSort] = useState<ScoreSort>("score_high");
  const [examsSort, setExamsSort] = useState<ExamsSort>("exams_most");
  const [dateSort, setDateSort] = useState<DateSort>("latest");
  const [examTypeFilter, setExamTypeFilter] = useState<"all" | "CENTRAL" | "SCHEDULED">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  // Draft count in the input vs the count applied on OK (drives N-export).
  const [exportCount, setExportCount] = useState("");
  const [appliedExportCount, setAppliedExportCount] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportExamId, setSelectedReportExamId] = useState<number | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null);
  const [selectedReportStudentName, setSelectedReportStudentName] = useState("");
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null);
  const [isBulkDownloadingReports, setIsBulkDownloadingReports] = useState(false);

  const availableDepartments = useMemo(() => {
    if (selectedFacultyIds.length === 0) {
      return departments;
    }
    const selectedFacultyIdSet = new Set(selectedFacultyIds);
    const mappedIdSet = new Set(
      facultyMappings
        .filter((item) => selectedFacultyIdSet.has(Number(item.faculty_id)))
        .flatMap((item) => item.department_ids || []),
    );
    return departments.filter((departmentOption) => mappedIdSet.has(departmentOption.id));
  }, [departments, facultyMappings, selectedFacultyIds]);

  const selectedDepartments = useMemo(() => {
    if (selectedDepartmentIds.length === 0) {
      return availableDepartments;
    }
    const selectedIdSet = new Set(selectedDepartmentIds);
    return availableDepartments.filter((departmentOption) =>
      selectedIdSet.has(departmentOption.id),
    );
  }, [availableDepartments, selectedDepartmentIds]);

  const selectedFaculties = useMemo(() => {
    if (selectedFacultyIds.length === 0) {
      return faculties;
    }
    const selectedIdSet = new Set(selectedFacultyIds);
    return faculties.filter((faculty) => selectedIdSet.has(faculty.id));
  }, [faculties, selectedFacultyIds]);
  const selectedFaculty = selectedFaculties.length === 1 ? selectedFaculties[0] : null;

  const scopeQueryParams = useMemo(() => {
    const params: {
      faculty_id?: number;
      faculty_ids?: string;
      department_id?: number;
      department_ids?: string;
    } = {};

    if (selectedFacultyIds.length === 1) {
      params.faculty_id = selectedFacultyIds[0];
    } else if (selectedFacultyIds.length > 1) {
      params.faculty_ids = selectedFacultyIds.join(",");
    }
    if (selectedDepartmentIds.length === 1) {
      params.department_id = selectedDepartmentIds[0];
    } else if (selectedDepartmentIds.length > 1) {
      params.department_ids = selectedDepartmentIds.join(",");
    }
    return params;
  }, [selectedDepartmentIds, selectedFacultyIds]);

  const scopeQueryKey = `${selectedFacultyIds.join(",")}:${selectedDepartmentIds.join(",")}`;
  const singleDepartment =
    selectedDepartments.length === 1 ? selectedDepartments[0] : null;
  const facultyBoardLabel = selectedFaculty
    ? selectedFaculty.faculty_shortname
    : selectedFacultyIds.length > 0
      ? `${selectedFacultyIds.length} faculties`
      : "All Faculties";
  const departmentBoardLabel = singleDepartment
    ? singleDepartment.department_shortname
    : selectedDepartmentIds.length > 0
      ? `${selectedDepartmentIds.length} departments`
      : selectedFaculty
        ? `All ${selectedFaculty.faculty_shortname} departments`
        : selectedFacultyIds.length > 0
          ? "All selected faculty departments"
        : "All departments";
  const departmentSelectionLocked =
    isDepartmentUser || availableDepartments.length <= 1;
  const facultySelectionLocked = !isGlobalUser || faculties.length <= 1;

  useEffect(() => {
    if (!hasReadAccess) {
      setIsScopeLoading(false);
      return;
    }

    let isMounted = true;
    const loadAccessScope = async () => {
      setIsScopeLoading(true);
      setIsFilterStateHydrated(false);
      setScopeError(null);
      try {
        const [departmentResponse, facultyResponse, mappingResponse] = await Promise.all([
          departmentAPI.getAllDepartments(),
          facultyAPI.getAllFaculties(),
          facultyDepartmentAPI.getAllMappings(),
        ]);
        if (!isMounted) {
          return;
        }

        const nextDepartments = departmentResponse?.data || [];
        const allMappings = Array.isArray(mappingResponse)
          ? mappingResponse
          : mappingResponse?.data || [];
        const accessibleDepartmentIds = new Set(
          nextDepartments.map((departmentOption: DepartmentOption) => departmentOption.id),
        );
        const nextMappings = isGlobalUser
          ? allMappings
          : allMappings.filter((mapping: FacultyDepartmentMapping) =>
              mapping.department_ids?.some((departmentId) =>
                accessibleDepartmentIds.has(departmentId),
              ),
            );
        let nextFaculties = facultyResponse?.data || [];

        // A department-scoped user may not receive a faculty from the faculty
        // list endpoint. The mapping still lets us display the assigned parent.
        nextMappings.forEach((mapping: FacultyDepartmentMapping) => {
          if (!nextFaculties.some((faculty: FacultyOption) => faculty.id === mapping.faculty_id)) {
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

        setDepartments(nextDepartments);
        setFacultyMappings(nextMappings);
        setFaculties(nextFaculties);

        const assignedDepartmentId = user?.department_details?.id;
        const mappedFaculty = assignedDepartmentId
          ? nextMappings.find((mapping: FacultyDepartmentMapping) =>
              mapping.department_ids?.includes(assignedDepartmentId),
            )
          : null;
        const assignedFacultyId = user?.faculty_details?.id || mappedFaculty?.faculty_id;
        const storedFilters = readPersistedResultFilters(filterStorageKey);
        const availableFacultyIdSet = new Set(
          nextFaculties.map((faculty: FacultyOption) => Number(faculty.id)),
        );
        let nextSelectedFacultyIds = !isGlobalUser && assignedFacultyId
          ? [Number(assignedFacultyId)]
          : (storedFilters?.facultyIds || []).filter((facultyId) =>
              availableFacultyIdSet.has(facultyId),
            );

        if (nextFaculties.length === 1) {
          nextSelectedFacultyIds = [Number(nextFaculties[0].id)];
        }

        const selectedFacultyIdSet = new Set(nextSelectedFacultyIds);
        const facultyDepartmentIdSet = nextSelectedFacultyIds.length > 0
          ? new Set(
              nextMappings
                .filter((mapping: FacultyDepartmentMapping) =>
                  selectedFacultyIdSet.has(Number(mapping.faculty_id)),
                )
                .flatMap((mapping: FacultyDepartmentMapping) => mapping.department_ids || []),
            )
          : accessibleDepartmentIds;
        const availableDepartmentIds = nextDepartments
          .map((departmentOption: DepartmentOption) => Number(departmentOption.id))
          .filter((departmentId: number) => facultyDepartmentIdSet.has(departmentId));
        const availableDepartmentIdSet = new Set(availableDepartmentIds);
        let nextSelectedDepartmentIds = isDepartmentUser && assignedDepartmentId
          ? [Number(assignedDepartmentId)]
          : (storedFilters?.departmentIds || []).filter((departmentId) =>
              availableDepartmentIdSet.has(departmentId),
            );

        if (availableDepartmentIds.length === 1) {
          nextSelectedDepartmentIds = [availableDepartmentIds[0]];
        }

        setSelectedFacultyIds(nextSelectedFacultyIds);
        setSelectedDepartmentIds(nextSelectedDepartmentIds);
        setSelectedSemester(storedFilters?.semester || "");
        setActiveTab(
          storedFilters && visibleTabs.includes(storedFilters.activeTab)
            ? storedFilters.activeTab
            : visibleTabs[0],
        );
        setDraftSearch(storedFilters?.search || "");
        setAppliedSearch(storedFilters?.search || "");
        setExamTypeFilter(storedFilters?.examType || "all");
        setActiveSortCategory(storedFilters?.activeSortCategory || "date");
        setScoreSort(storedFilters?.scoreSort || "score_high");
        setExamsSort(storedFilters?.examsSort || "exams_most");
        setDateSort(storedFilters?.dateSort || "latest");
        setCustomStartDate(storedFilters?.customStartDate || "");
        setCustomEndDate(storedFilters?.customEndDate || "");
        setExportCount(storedFilters?.exportCount || "");
        setAppliedExportCount(storedFilters?.exportCount || "");
        setIsFilterStateHydrated(true);
      } catch (accessError: any) {
        if (isMounted) {
          setScopeError(accessError?.message || "Failed to load faculty and department access.");
          setDepartments([]);
          setFaculties([]);
          setFacultyMappings([]);
        }
      } finally {
        if (isMounted) {
          setIsScopeLoading(false);
        }
      }
    };

    void loadAccessScope();
    return () => {
      isMounted = false;
    };
  }, [filterStorageKey, hasReadAccess, isDepartmentUser, isGlobalUser, user]);

  useEffect(() => {
    if (!filterStorageKey || !isFilterStateHydrated || isScopeLoading) {
      return;
    }

    const filters: PersistedResultFilters = {
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
      exportCount: appliedExportCount,
    };

    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(filters));
    } catch {
      // Browsers can disable or exhaust localStorage. Filters still work for
      // the current session, so persistence failure should not block the page.
    }
  }, [
    activeSortCategory,
    activeTab,
    appliedExportCount,
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
    if (isScopeLoading) {
      return;
    }
    if (faculties.length === 1) {
      const onlyFacultyId = faculties[0].id;
      setSelectedFacultyIds((currentIds) =>
        currentIds.length === 1 && currentIds[0] === onlyFacultyId
          ? currentIds
          : [onlyFacultyId],
      );
    }
  }, [faculties, isScopeLoading]);

  useEffect(() => {
    if (isScopeLoading) {
      return;
    }
    if (availableDepartments.length === 1) {
      const onlyDepartmentId = availableDepartments[0].id;
      setSelectedDepartmentIds((currentIds) =>
        currentIds.length === 1 && currentIds[0] === onlyDepartmentId
          ? currentIds
          : [onlyDepartmentId],
      );
      return;
    }

    const availableIdSet = new Set(availableDepartments.map((item) => item.id));
    setSelectedDepartmentIds((currentIds) => {
      const nextIds = currentIds.filter((departmentId) => availableIdSet.has(departmentId));
      return nextIds.length === currentIds.length ? currentIds : [];
    });
  }, [availableDepartments, isScopeLoading]);

  const handleFacultyChange = (facultyIds: number[]) => {
    setSelectedFacultyIds(facultyIds);
    setSelectedDepartmentIds([]);
    setPage(1);
  };

  // Computed backend query params for sorting, date, and exam-type filtering.
  const resultQueryParams = useMemo(() => {
    const params: {
      sort_by: string;
      order: string;
      exam_taken_date?: string;
      start_date?: string;
      end_date?: string;
      exam_type?: "CENTRAL" | "SCHEDULED";
    } = {
      sort_by: "date",
      order: "desc",
    };

    if (activeSortCategory === "score") {
      params.sort_by = "score";
      params.order = scoreSort === "score_high" ? "desc" : "asc";
    } else if (activeSortCategory === "exams") {
      params.sort_by = "exams_taken";
      params.order = examsSort === "exams_most" ? "desc" : "asc";
    } else {
      // date
      params.sort_by = "date";
      params.order = dateSort === "oldest" ? "asc" : "desc";
    }

    if (dateSort === "custom") {
      if (customStartDate && customEndDate && customStartDate === customEndDate) {
        params.exam_taken_date = customStartDate;
      } else {
        if (customStartDate) {
          params.start_date = customStartDate;
        }
        if (customEndDate) {
          params.end_date = customEndDate;
        }
      }
    }

    if (examTypeFilter !== "all") {
      params.exam_type = examTypeFilter;
    }

    return params;
  }, [activeSortCategory, scoreSort, examsSort, dateSort, customStartDate, customEndDate, examTypeFilter]);

  const handleResetSortAndFilter = () => {
    setActiveSortCategory("date");
    setScoreSort("score_high");
    setExamsSort("exams_most");
    setDateSort("latest");
    setExamTypeFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const isSortFilterCustomized =
    activeSortCategory !== "date" ||
    dateSort !== "latest" ||
    examTypeFilter !== "all" ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  const parsedExportCount = useMemo(() => {
    if (appliedExportCount.trim() === "") {
      return null;
    }
    const countValue = Number(appliedExportCount);
    return Number.isInteger(countValue) && countValue > 0 ? countValue : null;
  }, [appliedExportCount]);

  useEffect(() => {
    if (!hasReadAccess) {
      return;
    }

    let isMounted = true;

    const loadSemesterOptions = async () => {
      if (isScopeLoading) {
        return;
      }

      try {
        const response = await admissionResultsAPI.getSemesterOptions(scopeQueryParams);
        const semesters = response?.semesters || [];

        if (!isMounted) {
          return;
        }

        setSemesterOptions(semesters);
        setSelectedSemester((currentSemester) => {
          if (currentSemester && semesters.includes(currentSemester)) {
            return currentSemester;
          }

          return semesters[0] || "";
        });
      } catch (semesterError: any) {
        if (isMounted) {
          toast.error(semesterError?.message || "Failed to load semester options");
          setSemesterOptions([]);
          setSelectedSemester("");
          setResults([]);
          setSummary(DEFAULT_SUMMARY);
          setConfigurationMissing(false);
        }
      }
    };

    const loadExamRecords = async () => {
      try {
        const response = await examAPI.getAllExamsForLookup();
        const nextExams = response?.results || response?.data || response || [];

        if (isMounted) {
          setExamRecords(Array.isArray(nextExams) ? nextExams : []);
        }
      } catch (examError) {
        if (isMounted) {
          console.error("Error loading exam records for result sheet:", examError);
        }
      }
    };

    loadSemesterOptions();
    loadExamRecords();

    return () => {
      isMounted = false;
    };
  }, [hasReadAccess, isScopeLoading, scopeQueryKey, scopeQueryParams]);

  useEffect(() => {
    setResults([]);
    setSummary(DEFAULT_SUMMARY);
    setConfigurationMissing(false);
    setSelectedStudentIds([]);
    setPage(1);
  }, [scopeQueryKey, selectedSemester]);

  // Changing sort/date/exam-type filters jumps back to page 1.
  useEffect(() => {
    setPage(1);
  }, [activeSortCategory, scoreSort, examsSort, dateSort, customStartDate, customEndDate, examTypeFilter]);

  useEffect(() => {
    if (!hasReadAccess || isScopeLoading || !selectedSemester) {
      setResults([]);
      setSummary(DEFAULT_SUMMARY);
      setPagination(DEFAULT_PAGINATION);
      setConfigurationMissing(false);
      return;
    }

    let isMounted = true;

    const loadResults = async () => {
      try {
        setIsLoading(true);
        const response = await admissionResultsAPI.getResults({
          ...scopeQueryParams,
          semester: selectedSemester,
          result_status: TAB_TO_STATUS[activeTab],
          search: appliedSearch || undefined,
          page,
          ...resultQueryParams,
        });

        if (!isMounted) {
          return;
        }

        const isConfigMissing = Boolean(response?.configuration_missing);
        startTransition(() => {
          setConfigurationMissing(isConfigMissing);
          setResults(isConfigMissing ? [] : response?.results || []);
          setPagination(isConfigMissing ? DEFAULT_PAGINATION : paginationFromDrf(response, page));
          setSummary(isConfigMissing ? DEFAULT_SUMMARY : {
            ...DEFAULT_SUMMARY,
            ...(response?.summary || {}),
          });
          setSelectedStudentIds([]);
        });
      } catch (resultError: any) {
        if (!isMounted) {
          return;
        }

        console.error("Error loading accepted students:", resultError);
        toast.error(resultError?.message || "Failed to load accepted students");
        setResults([]);
        setSummary(DEFAULT_SUMMARY);
        setPagination(DEFAULT_PAGINATION);
        setConfigurationMissing(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      isMounted = false;
    };
  }, [hasReadAccess, isScopeLoading, scopeQueryKey, scopeQueryParams, selectedSemester, activeTab, appliedSearch, page, reloadKey, resultQueryParams]);

  const visibleResults = results;
  const visibleRows = useMemo(() => buildResultSheetRows(visibleResults), [visibleResults]);
  const isSearchActive = appliedSearch.trim().length > 0;
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const selectedTabResults = useMemo(
    () => visibleResults.filter((result) => selectedStudentIdSet.has(result.student)),
    [visibleResults, selectedStudentIdSet],
  );
  const canRevertCurrentTab =
    !configurationMissing &&
    hasWriteAccess &&
    (activeTab === "selected" || activeTab === "accepted" || activeTab === "rejected");
  const canAcceptCurrentTab = !configurationMissing && hasWriteAccess && activeTab === "selected";
  const hasSelectedRows = selectedStudentIds.length > 0;
  const exportResults = useMemo(
    () =>
      hasSelectedRows
        ? visibleResults.filter((result) => selectedStudentIdSet.has(result.student))
        : visibleResults,
    [hasSelectedRows, selectedStudentIdSet, visibleResults],
  );
  const exportRows = useMemo(() => buildResultSheetRows(exportResults), [exportResults]);
  const isExportDisabled =
    configurationMissing ||
    isScopeLoading ||
    !selectedSemester ||
    exportRows.length === 0 ||
    Boolean(exportingFormat);
  const allSelectedVisible =
    visibleResults.length > 0 &&
    visibleResults.every((result) => selectedStudentIdSet.has(result.student));
  const facultyName = selectedFaculty?.faculty_name
    || (selectedFacultyIds.length > 0
      ? selectedFaculties.map((faculty) => faculty.faculty_shortname).join(" / ")
      : singleDepartment
      ? resolveFacultyName({
          exams: examRecords,
          department: singleDepartment,
          semester: selectedSemester,
          resultExamIds: results.map((result) => result.exam),
        })
      : "All Faculties");
  const departmentName = singleDepartment?.department_name || departmentBoardLabel;

  const loadResultSheetSignatories = async (): Promise<ResultSheetSignatory[]> => {
    if (!singleDepartment) {
      return [];
    }
    const mappedFacultyId = facultyMappings.find((mapping) =>
      mapping.department_ids?.includes(singleDepartment.id),
    )?.faculty_id;
    const reportFaculty = selectedFaculty
      || faculties.find((faculty) => faculty.id === Number(mappedFacultyId));
    if (!reportFaculty) {
      return [];
    }

    const response = await reportSignatoryAPI.getAll({
      department_id: singleDepartment.id,
      faculty_id: reportFaculty.id,
    });
    const records: ReportSignatoryRecord[] = response?.data || [];
    const departmentLine = `Department of ${withoutRepeatedPrefix(
      singleDepartment.department_name,
      "Department",
    )}`;
    const facultyLine = `Faculty of ${withoutRepeatedPrefix(
      reportFaculty.faculty_name,
      "Faculty",
    )}`;
    const signatories: ResultSheetSignatory[] = [];
    const convenor = records.find(
      (record) => record.role === "CONVENOR" && record.department === singleDepartment.id,
    );
    const departmentHead = records.find(
      (record) => record.role === "DEPARTMENT_HEAD" && record.department === singleDepartment.id,
    );
    const dean = records.find(
      (record) => record.role === "DEAN" && record.faculty === reportFaculty.id,
    );

    if (convenor) {
      signatories.push({
        name: convenor.name,
        details: [
          `Convenor, Admission Test Committee, ${reportFaculty.faculty_shortname}`,
          convenor.designation,
          departmentLine,
          "Daffodil International University",
        ],
      });
    }
    if (departmentHead) {
      signatories.push({
        name: departmentHead.name,
        details: [
          departmentHead.designation,
          departmentLine,
          "Daffodil International University",
        ],
      });
    }
    if (dean) {
      signatories.push({
        name: dean.name,
        details: [
          dean.designation,
          facultyLine,
          "Daffodil International University",
        ],
      });
    }
    return signatories;
  };

  const getExportBaseName = () => {
    const titleSemester = formatSemesterLabel(selectedSemester)
      .toLowerCase()
      .replace(/\s+/g, "-");
    const scope = hasSelectedRows ? "selected" : "page";

    return `admission-test-result-${titleSemester}-${activeTab}-${scope}`;
  };

  // Resolve which students to export. Manual checkbox selection wins; otherwise
  // pull the full filtered+sorted list across pages (getAllResults), capped at
  // the applied N. This is what makes N / Today / filters count in exports.
  const resolveExportResults = async (): Promise<AdmissionResult[]> => {
    if (hasSelectedRows) {
      return selectedTabResults;
    }
    if (!selectedSemester) {
      return [];
    }
    const response = await admissionResultsAPI.getAllResults({
      ...scopeQueryParams,
      semester: selectedSemester,
      result_status: TAB_TO_STATUS[activeTab],
      search: appliedSearch || undefined,
      ...resultQueryParams,
    });
    const all: AdmissionResult[] = response?.results || response?.data || [];
    return parsedExportCount != null ? all.slice(0, parsedExportCount) : all;
  };

  const exportPdf = async () => {
    if (isExportDisabled) {
      return;
    }

    setExportingFormat("pdf");
    try {
      const exportData = await resolveExportResults();
      // Cluster by denominators so students with different exam/viva totals or
      // HSC-vs-Diploma each get their own table (maxes live in the headers).
      const groups = groupResultsByDenominators(exportData);
      if (groups.length === 0) {
        toast.error("No students to export for the current filters.");
        return;
      }
      const logoDataUrl = await loadDiuLogoDataUrl();
      const signatories = await loadResultSheetSignatories();
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const marginX = 26;
      const tableTop = 174;
      const bottomMargin = 28;
      const groupGap = 16;
      const activeStatusLabel = PRETTY_STATUS_LABELS[TAB_TO_STATUS[activeTab]];

      const drawHeader = () => {
        drawDiuPdfChrome(doc, {
          logoDataUrl,
          semester: selectedSemester,
          facultyName,
          departmentName,
          rightLabel: activeStatusLabel,
        });
      };

      const { columnStyles } = buildPdfTableConfig(
        RESULT_SHEET_PDF_COLUMNS,
        scaleColumnWidthsToPage(
          RESULT_SHEET_PDF_COLUMNS,
          doc.internal.pageSize.getWidth(),
          marginX,
        ),
      );

      // One table per group, each flowing after the previous one. The
      // denominators live in the column headers, which repeat on page breaks.
      groups.forEach((group, groupIndex) => {
        const groupRows = buildResultSheetRows(group.results, { withDenominator: false });
        const startY =
          groupIndex === 0 ? tableTop : ((doc as any).lastAutoTable?.finalY ?? tableTop) + groupGap;
        autoTable(doc, {
          startY,
          margin: {
            top: tableTop,
            left: marginX,
            right: marginX,
            bottom: 56,
          },
          head: [
            RESULT_SHEET_PDF_COLUMNS.map((column) =>
              formatPdfColumnHeader(getColumnHeader(column.key, group.denominators)),
            ),
          ],
          body: groupRows.map((row) =>
            RESULT_SHEET_PDF_COLUMNS.map((column) => row[column.key] ?? ""),
          ),
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 4,
            textColor: [15, 23, 42],
            lineColor: [203, 213, 225],
            lineWidth: 0.6,
            overflow: "linebreak",
            valign: "middle",
          },
          headStyles: {
            fillColor: [46, 48, 148],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            valign: "top",
          },
          bodyStyles: {
            minCellHeight: 18,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles,
          didDrawPage: () => {
            drawHeader();
          },
        });
      });

      // Render the signature block as one indivisible block at the very end.
      // Compute the remaining vertical space on the current page and decide
      // whether the block fits here or needs to be moved to a new page.
      if (signatories.length > 0) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const signatureBlockHeight = getSignatureBlockHeight(doc, signatories);
        const tableEndY =
          (doc as any).lastAutoTable?.finalY ?? tableTop;
        const signatureTopGap = 36;
        const requiredSpace = signatureBlockHeight + signatureTopGap;
        const remainingSpace =
          pageHeight - bottomMargin - tableEndY;

        if (remainingSpace < requiredSpace) {
          // Not enough room — push the signature block to a new page.
          doc.addPage();
          drawHeader();
        }

        const signatureStartY =
          remainingSpace < requiredSpace
            ? tableTop + signatureTopGap
            : tableEndY + signatureTopGap;

        drawSignatureBlock(doc, signatureStartY, signatories, { marginX });
      }

      doc.save(`${getExportBaseName()}.pdf`);
      toast.success("Result sheet PDF exported successfully");
    } catch (exportError: any) {
      console.error("Error exporting result sheet PDF:", exportError);
      toast.error(exportError?.message || "Failed to export result sheet");
    } finally {
      setExportingFormat(null);
    }
  };

  const exportExcel = async () => {
    if (isExportDisabled) {
      return;
    }

    setExportingFormat("excel");
    try {
      const exportData = await resolveExportResults();
      // Same clustering as the PDF: one table per denominator group, stacked in
      // a single sheet with a caption row and a blank separator between them.
      const groups = groupResultsByDenominators(exportData);
      if (groups.length === 0) {
        toast.error("No students to export for the current filters.");
        return;
      }
      const XLSX = await import("xlsx");
      const sheetRows: (string | number)[][] = [];

      groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
          sheetRows.push([]); // blank separator between tables
        }
        sheetRows.push(
          RESULT_SHEET_EXCEL_KEYS.map((key) => getColumnHeader(key, group.denominators)),
        );

        buildResultSheetRows(group.results, { withDenominator: false }).forEach((row) => {
          sheetRows.push(RESULT_SHEET_EXCEL_KEYS.map((key) => row[key]));
        });
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
      worksheet["!cols"] = [
        { wch: 8 },   // SL
        { wch: 24 },  // Application Serial
        { wch: 28 },  // Student Name
        { wch: 16 },  // SSC (out of 5)
        { wch: 16 },  // HSC/Diploma (out of X)
        { wch: 20 },  // Written (out of X)
        { wch: 18 },  // Viva (out of X)
        { wch: 26 },  // Written + Viva (out of X)
        { wch: 20 },  // Total (out of 100)
        { wch: 18 },  // Exam Date
        { wch: 16 },  // Remarks
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      XLSX.writeFile(workbook, `${getExportBaseName()}.xlsx`);
      toast.success("Result sheet Excel exported successfully");
    } catch (exportError: any) {
      console.error("Error exporting result sheet Excel:", exportError);
      toast.error(exportError?.message || "Failed to export result sheet");
    } finally {
      setExportingFormat(null);
    }
  };

  const refreshResults = async () => {
    if (!selectedSemester) {
      setResults([]);
      setSummary(DEFAULT_SUMMARY);
      setConfigurationMissing(false);
      setSelectedStudentIds([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await admissionResultsAPI.getResults({
        ...scopeQueryParams,
        semester: selectedSemester,
        result_status: TAB_TO_STATUS[activeTab],
        search: appliedSearch || undefined,
        page,
        ...resultQueryParams,
      });

      const isConfigMissing = Boolean(response?.configuration_missing);
      setConfigurationMissing(isConfigMissing);
      setResults(isConfigMissing ? [] : response?.results || []);
      setPagination(isConfigMissing ? DEFAULT_PAGINATION : paginationFromDrf(response, page));
      setSummary(isConfigMissing ? DEFAULT_SUMMARY : {
        ...DEFAULT_SUMMARY,
        ...(response?.summary || {}),
      });
      setSelectedStudentIds([]);
    } catch (refreshError: any) {
      console.error("Error refreshing accepted students:", refreshError);
      toast.error(refreshError?.message || "Failed to refresh accepted students");
      setResults([]);
      setSummary(DEFAULT_SUMMARY);
      setPagination(DEFAULT_PAGINATION);
      setConfigurationMissing(false);
      setSelectedStudentIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [activeTab, selectedSemester, appliedSearch, examTypeFilter, page]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setReloadKey((current) => current + 1);
  };

  const handleClearSearch = () => {
    setDraftSearch("");
    setAppliedSearch("");
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleOpenReport = (result: AdmissionResult) => {
    setSelectedReportExamId(result.exam);
    setSelectedReportStudentId(result.student);
    setSelectedReportStudentName(result.student_full_name || result.student_username || "Student");
    setIsReportDialogOpen(true);
  };

  const handleDownloadReport = async (result: AdmissionResult) => {
    setDownloadingReportId(result.id);
    try {
      const response = await admissionResultsAPI.downloadStudentDetailReportPdf(
        result.exam,
        result.student,
      );

      if (!response?.blob) {
        throw new Error("Student report PDF is not available yet.");
      }

      downloadBlobFile(response.blob, response.filename);
      toast.success(`Downloaded report for ${result.student_full_name || result.student_username}`);
    } catch (reportError: any) {
      console.error("Error downloading student report:", reportError);
      toast.error(reportError?.message || "Failed to download student report");
    } finally {
      setDownloadingReportId((currentId) => (currentId === result.id ? null : currentId));
    }
  };

  const handleDownloadSelectedReports = async () => {
    setIsBulkDownloadingReports(true);
    try {
      const exportData = await resolveExportResults();
      if (exportData.length === 0) {
        toast.error("No candidates to download for the current filters.");
        return;
      }

      if (exportData.length === 1) {
        await handleDownloadReport(exportData[0]);
        return;
      }

      const reports = exportData.map((result) => ({
        exam_id: result.exam,
        student_id: result.student,
      }));

      const response = await admissionResultsAPI.downloadStudentDetailReportsZip(reports);
      if (!response?.blob) {
        throw new Error("Student report ZIP is not available yet.");
      }

      downloadBlobFile(response.blob, response.filename);
      toast.success(`Downloaded ${exportData.length} reports as ZIP.`);
    } catch (reportError: any) {
      console.error("Error downloading student report ZIP:", reportError);
      toast.error(reportError?.message || "Failed to download student reports ZIP");
    } finally {
      setIsBulkDownloadingReports(false);
    }
  };

  const handleApplyExportCount = () => {
    setAppliedExportCount(exportCount.trim());
    toast.success(
      exportCount.trim() === ""
        ? "Export count cleared — exports will include all matching students."
        : `Export count set to ${exportCount.trim()}.`,
    );
  };

  const handleResetExportCount = () => {
    setExportCount("");
    setAppliedExportCount("");
    toast.success("Export count reset — exports will include all matching students.");
  };

  const todayStr = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const isTodayActive =
    activeSortCategory === "date" &&
    dateSort === "custom" &&
    customStartDate === todayStr() &&
    customEndDate === todayStr();

  const handleSelectToday = () => {
    // Toggle: pressing Today again clears the filter back to default (latest).
    if (isTodayActive) {
      setActiveSortCategory("date");
      setDateSort("latest");
      setCustomStartDate("");
      setCustomEndDate("");
      return;
    }
    const today = todayStr();
    setActiveSortCategory("date");
    setDateSort("custom");
    setCustomStartDate(today);
    setCustomEndDate(today);
  };

  useEffect(() => {
    setSelectedStudentIds((currentIds) => {
      const visibleStudentIds = new Set(visibleResults.map((result) => result.student));
      const nextIds = currentIds.filter((id) => visibleStudentIds.has(id));

      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [visibleResults]);

  const handleToggleStudent = (studentId: number, checked: boolean) => {
    setSelectedStudentIds((currentIds) => {
      if (checked) {
        return [...new Set([...currentIds, studentId])];
      }

      return currentIds.filter((id) => id !== studentId);
    });
  };

  const handleToggleAllSelected = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(visibleResults.map((result) => result.student));
      return;
    }

    setSelectedStudentIds([]);
  };

  const handleAcceptAdmission = async () => {
    if (!canAcceptCurrentTab) {
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Select at least one candidate to accept.");
      return;
    }

    const configurationIds = new Set(
      selectedTabResults
        .map((result) => result.configuration)
        .filter((value): value is number => typeof value === "number"),
    );

    if (configurationIds.size !== 1) {
      toast.error("Selected candidates must belong to the same semester board.");
      return;
    }

    setIsAccepting(true);
    try {
      await admissionResultsAPI.bulkUpdateStatus({
        action: "SET_ADMITTED",
        configuration_id: Array.from(configurationIds)[0],
        student_ids: selectedStudentIds,
      });

      toast.success("Selected candidates were accepted for admission.");
      await refreshResults();
    } catch (acceptError: any) {
      console.error("Error accepting candidates:", acceptError);
      toast.error(acceptError?.message || "Failed to accept candidates");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRevert = async () => {
    if (!canRevertCurrentTab) {
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Select at least one candidate to revert.");
      return;
    }

    const configurationIds = new Set(
      selectedTabResults
        .map((result) => result.configuration)
        .filter((value): value is number => typeof value === "number"),
    );

    if (configurationIds.size !== 1) {
      toast.error("Selected candidates must belong to the same semester board.");
      return;
    }

    setIsReverting(true);
    try {
      await admissionResultsAPI.bulkUpdateStatus({
        action: "REVERT_TO_STORED_STATUS",
        configuration_id: Array.from(configurationIds)[0],
        student_ids: selectedStudentIds,
      });

      toast.success("Selected candidates were reverted successfully.");
      await refreshResults();
    } catch (revertError: any) {
      console.error("Error reverting candidates:", revertError);
      toast.error(revertError?.message || "Failed to revert candidates");
    } finally {
      setIsReverting(false);
    }
  };

  if (!hasReadAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {scopeError && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{scopeError}</AlertDescription>
        </Alert>
      )}

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${GRID_COLS_XL[visibleTabs.length] ?? "xl:grid-cols-5"}`}>
        {visibleTabs.map((key) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">{CARD_CONFIG[key].label}</p>
              <p className={`text-2xl font-bold ${CARD_CONFIG[key].className}`}>
                {summary[TAB_TO_STATUS[key]]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label>Faculty</Label>
              <FacultyMultiSelect
                options={faculties}
                selectedIds={selectedFacultyIds}
                onChange={handleFacultyChange}
                disabled={isScopeLoading || facultySelectionLocked}
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <DepartmentMultiSelect
                options={availableDepartments}
                selectedIds={selectedDepartmentIds}
                onChange={(departmentIds) => {
                  setSelectedDepartmentIds(departmentIds);
                  setPage(1);
                }}
                disabled={isScopeLoading || departmentSelectionLocked}
                allLabel={selectedFaculty
                  ? `All ${selectedFaculty.faculty_shortname} departments`
                  : selectedFacultyIds.length > 0
                    ? "All selected faculty departments"
                    : "All departments"}
              />
            </div>

            <div className="space-y-2">
              <Label>Semester</Label>
              <SemesterCombobox
                value={selectedSemester}
                options={semesterOptions}
                onChange={setSelectedSemester}
                disabled={isScopeLoading || semesterOptions.length === 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select
                value={examTypeFilter}
                onValueChange={(value: "all" | "CENTRAL" | "SCHEDULED") =>
                  setExamTypeFilter(value)
                }
                disabled={isScopeLoading || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Exam Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exam Types</SelectItem>
                  <SelectItem value="CENTRAL">Central</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-search">Search</Label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  id="result-search"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search by name or FORM"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              variant="outline"
              disabled={isScopeLoading || isLoading || !selectedSemester}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>

            <Button
              variant="outline"
              onClick={handleClearSearch}
              disabled={isScopeLoading || isLoading || (!draftSearch && !appliedSearch)}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>

            <Button
              variant="outline"
              onClick={refreshResults}
              disabled={isScopeLoading || isLoading || !selectedSemester}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

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
        </CardContent>
      </Card>

      {configurationMissing ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="flex flex-wrap items-center gap-3 text-amber-900">
            <span>Threshold or seat limit is not set for this semester. Please enter these values to proceed.</span>
            {/* <Button asChild size="sm" variant="outline" className="border-amber-200 text-amber-900">
              <Link to="/student-acceptance-criteria">Set admission criteria</Link>
            </Button> */}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-base sm:text-lg">
                    <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Bulk Selection
                  </span>
                  <div className="flex items-center gap-1" title="Number of students to export across pages (respects filters). Leave blank for all.">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={exportCount}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (/^\d*$/.test(value)) {
                          setExportCount(value);
                        }
                      }}
                      placeholder="Count"
                      className="w-16 h-8 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleApplyExportCount} className="h-8 px-2">
                      OK
                    </Button>
                    {parsedExportCount != null ? (
                      <Badge variant="secondary" title="Export count currently held">
                        Held {parsedExportCount}
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetExportCount}
                    disabled={appliedExportCount === "" && exportCount === ""}
                    title="Reset export count (export all)"
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isTodayActive ? "default" : "outline"}
                    onClick={handleSelectToday}
                    title="Filter to students who sat the exam today (click again to clear)"
                    className={`h-8 px-2.5 ${isTodayActive ? "bg-blue-700 hover:bg-blue-800 text-white" : ""}`}
                  >
                    Today
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-1.5 xl:justify-end">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Badge variant="outline" className="px-1.5 py-0 h-6">
                      {facultyBoardLabel}
                    </Badge>
                    <Badge variant="outline" className="px-1.5 py-0 h-6">
                      {departmentBoardLabel}
                    </Badge>
                    {selectedSemester && (
                      <Badge variant="secondary" className="px-1.5 py-0 h-6">{formatSemesterLabel(selectedSemester)}</Badge>
                    )}
                    {examTypeFilter !== "all" && (
                      <Badge variant="secondary" className="px-1.5 py-0 h-6">
                        {examTypeFilter === "CENTRAL" ? "Central" : "Scheduled"}
                      </Badge>
                    )}
                    <Badge variant="outline" className="px-1.5 py-0 h-6">{PRETTY_STATUS_LABELS[TAB_TO_STATUS[activeTab]]}</Badge>
                  </div>
                    {canAcceptCurrentTab ? (
                      <Button
                        size="sm"
                        onClick={handleAcceptAdmission}
                        disabled={selectedStudentIds.length === 0 || isAccepting}
                        className="h-8 px-2.5 text-white bg-green-600 hover:bg-green-700"
                      >
                        {isAccepting ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        )}
                        Accept
                      </Button>
                    ) : null}
                    {canRevertCurrentTab ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRevert}
                        disabled={selectedStudentIds.length === 0 || isReverting}
                        className="h-8 px-2.5"
                      >
                        {isReverting ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                        )}
                        Revert
                      </Button>
                    ) : null}
                  
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleDownloadSelectedReports();
                      }}
                      disabled={
                        isExportDisabled ||
                        isBulkDownloadingReports ||
                        downloadingReportId !== null
                      }
                      className="h-8 px-2.5"
                    >
                      {isBulkDownloadingReports ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1.5" />
                      )}
                      Reports
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          disabled={isExportDisabled}
                          className="h-8 px-2.5 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#23257a] hover:to-[#4046a8]"
                        >
                          {exportingFormat ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-1.5" />
                          )}
                          Export
                          <ChevronDown className="w-4 h-4 ml-1.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white shadow-lg border-slate-200 text-slate-900"
                      >
                        <DropdownMenuItem
                          disabled={isExportDisabled}
                          onSelect={() => {
                            void exportPdf();
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isExportDisabled}
                          onSelect={() => {
                            void exportExcel();
                          }}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel (.xlsx)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as keyof typeof TAB_TO_STATUS);
                  setPage(1);
                }}
              >
                <TabsList className={`grid w-full h-auto grid-cols-2 gap-2 p-0 bg-transparent ${GRID_COLS_MD[visibleTabs.length] ?? "md:grid-cols-5"}`}>
                  {visibleTabs.map((key) => (
                    <TabsTrigger key={key} value={key} className={RESULT_TAB_TRIGGER_CLASS}>
                      {TAB_LABELS[key]} ({summary[TAB_TO_STATUS[key]]})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {visibleTabs.map((tabKey) => (
                  <TabsContent key={tabKey} value={tabKey} className="mt-4">
                    {isScopeLoading || isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
                          <p className="text-gray-600">Loading student results...</p>
                        </div>
                      </div>
                    ) : !selectedSemester ? (
                      <div className="py-12 text-center text-gray-500">
                        Select a semester to load results.
                      </div>
                    ) : visibleRows.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        {isSearchActive
                          ? "No matching students found for this search."
                          : `No ${tabKey} students found for this semester.`}
                      </div>
                    ) : (
                      <div className="overflow-hidden border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={allSelectedVisible}
                                  onCheckedChange={(checked) =>
                                    handleToggleAllSelected(Boolean(checked))
                                  }
                                  disabled={visibleResults.length === 0}
                                  aria-label="Select page candidates"
                                />
                              </TableHead>
                              <TableHead>SL</TableHead>
                              <TableHead>Application Serial</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead>SSC</TableHead>
                              <TableHead>HSC/Diploma</TableHead>
                              <TableHead>Written</TableHead>
                              <TableHead>Viva</TableHead>
                              <TableHead>Written + Viva</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Exam Taken</TableHead>
                              <TableHead className="text-center">View</TableHead>
                              <TableHead className="text-center">Download</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleResults.map((result, index) => {
                              const row = visibleRows[index];
                              const isChecked = selectedStudentIds.includes(result.student);

                              return (
                                <TableRow key={row.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        handleToggleStudent(result.student, Boolean(checked))
                                      }
                                      aria-label={`Select ${row.studentName}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {(pagination.current_page - 1) * pagination.page_size + index + 1}
                                  </TableCell>
                                  <TableCell className="font-medium">{row.applicationSerial}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-gray-900">{row.studentName}</p>
                                      {row.username ? (
                                        <p className="text-sm text-gray-500">@{row.username}</p>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell>{row.ssc}</TableCell>
                                  <TableCell>{row.academic}</TableCell>
                                  <TableCell>{row.written}</TableCell>
                                  <TableCell>
                                    <span className="whitespace-nowrap">{row.viva}</span>
                                  </TableCell>
                                  <TableCell>{row.writtenViva}</TableCell>
                                  <TableCell className="font-semibold">
                                    {row.total}
                                    <span className="ml-1 text-xs font-normal text-gray-400">/ 100</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={getResultStatusBadgeClass(TAB_TO_STATUS[tabKey as keyof typeof TAB_TO_STATUS])}
                                    >
                                      {row.remarks}
                                    </Badge>
                                    {result.result_status === "SELECTED" && !result.attended_exam ? (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Manual override for absent candidate
                                      </div>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                                    {row.examTakenAt || "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenReport(result)}
                                      aria-label={`View report for ${row.studentName}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDownloadReport(result)}
                                      disabled={downloadingReportId === result.id || isBulkDownloadingReports}
                                      aria-label={`Download report for ${row.studentName}`}
                                    >
                                      {downloadingReportId === result.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
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
                        <PaginationControls
                          pagination={pagination}
                          onPageChange={setPage}
                          isLoading={isLoading}
                          itemLabel="candidates"
                        />
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      <StudentAdmissionReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        examId={selectedReportExamId}
        studentId={selectedReportStudentId}
        studentName={selectedReportStudentName}
      />
    </div>
  );
}

export default AcceptedStudents;
