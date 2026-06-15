import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { SemesterCombobox } from "../components/SemesterCombobox";
import { StudentAdmissionReportDialog } from "../components/StudentAdmissionReportDialog";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { usePermissions } from "../hooks/usePermissions";
import { useEffectiveDepartment } from "../hooks/useEffectiveDepartment";
import {
  formatSemesterLabel,
  type AdmissionConfiguration,
  type AdmissionResult,
} from "../lib/admission";
import {
  buildResultSheetRows,
  getResultStatusBadgeClass,
} from "../lib/result-sheet";
import { downloadBlobFile } from "../lib/pdf-download";
import { admissionResultsAPI } from "../services/api";
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from "../components/PaginationControls";

interface ExamineeResultProps {
  gradientClass?: string;
}

const DEFAULT_SUMMARY = {
  SELECTED: 0,
  WAITING: 0,
  REJECTED: 0,
  ABSENT: 0,
};

export function ExamineeResult({ gradientClass = "" }: ExamineeResultProps) {
  const { canRead, canWrite } = usePermissions();
  const { department, isLoading: isDepartmentLoading, error: departmentError } =
    useEffectiveDepartment();
  const hasReadAccess = canRead();
  const hasWriteAccess = canWrite();

  const [semesterOptions, setSemesterOptions] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [results, setResults] = useState<AdmissionResult[]>([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [configuration, setConfiguration] = useState<AdmissionConfiguration | null>(null);
  const [draftMinimumScoreFilter, setDraftMinimumScoreFilter] = useState("");
  const [appliedMinimumScoreFilter, setAppliedMinimumScoreFilter] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftSortBy, setDraftSortBy] = useState<"name" | "score">("score");
  const [appliedSortBy, setAppliedSortBy] = useState<"name" | "score">("score");
  const [draftSortOrder, setDraftSortOrder] = useState<"asc" | "desc">("desc");
  const [appliedSortOrder, setAppliedSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportExamId, setSelectedReportExamId] = useState<number | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null);
  const [selectedReportStudentName, setSelectedReportStudentName] = useState("");
  const [activeSingleDownloadResultId, setActiveSingleDownloadResultId] = useState<number | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [topCandidateCount, setTopCandidateCount] = useState("");

  const parsedTopCandidateCount = useMemo(() => {
    if (topCandidateCount.trim() === "") {
      return null;
    }

    const countValue = Number(topCandidateCount);
    if (!Number.isInteger(countValue) || countValue < 0) {
      return null;
    }

    return countValue;
  }, [topCandidateCount]);

  useEffect(() => {
    if (!hasReadAccess || !department?.id) {
      return;
    }

    let isMounted = true;

    const loadSemesterOptions = async () => {
      try {
        const response = await admissionResultsAPI.getSemesterOptions({
          department_id: department.id,
        });
        const semesters = response?.semesters || [];

        if (!isMounted) {
          return;
        }

        setSemesterOptions(semesters);
        if (!selectedSemester && semesters.length > 0) {
          setSelectedSemester(semesters[0]);
        } else if (selectedSemester && !semesters.includes(selectedSemester)) {
          setSelectedSemester(semesters[0] || "");
        }
      } catch (semesterError: any) {
        if (isMounted) {
          toast.error(semesterError?.message || "Failed to load semester options");
        }
      }
    };

    loadSemesterOptions();

    return () => {
      isMounted = false;
    };
  }, [hasReadAccess, department?.id, selectedSemester]);

  useEffect(() => {
    if (!hasReadAccess || !department?.id || !selectedSemester) {
      setResults([]);
      setConfiguration(null);
      setPagination(DEFAULT_PAGINATION);
      setSelectedStudentIds([]);
      return;
    }

    let isMounted = true;

    const loadBoardData = async () => {
      try {
        setIsLoading(true);
        const [configResponse, resultResponse] = await Promise.all([
          admissionResultsAPI.getConfigurations({
            department_id: department.id,
            semester: selectedSemester,
          }),
          admissionResultsAPI.getResults({
            department_id: department.id,
            semester: selectedSemester,
            exclude_result_status: "SELECTED",
            minimum_score: appliedMinimumScoreFilter || undefined,
            search: appliedSearch || undefined,
            sort_by: appliedSortBy,
            order: appliedSortOrder,
            page,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        const resolvedConfiguration =
          configResponse?.configurations?.[0] ||
          resultResponse?.configuration ||
          null;

        const boardResults = resultResponse?.results || [];

        setConfiguration(resolvedConfiguration);
        setSummary({
          ...DEFAULT_SUMMARY,
          ...(resultResponse?.summary || {}),
        });
        setResults(boardResults);
        setPagination(paginationFromDrf(resultResponse, page));
        setSelectedStudentIds([]);
      } catch (boardError: any) {
        if (!isMounted) {
          return;
        }

        console.error("Error loading examinee board:", boardError);
        toast.error(boardError?.message || "Failed to load examinee board");
        setResults([]);
        setConfiguration(null);
        setSummary(DEFAULT_SUMMARY);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBoardData();

    return () => {
      isMounted = false;
    };
  }, [
    hasReadAccess,
    department?.id,
    selectedSemester,
    appliedMinimumScoreFilter,
    appliedSearch,
    appliedSortBy,
    appliedSortOrder,
    page,
    reloadKey,
  ]);

  useEffect(() => {
    setPage(1);
    setSelectedStudentIds([]);
  }, [department?.id, selectedSemester]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [page, appliedMinimumScoreFilter, appliedSearch, appliedSortBy, appliedSortOrder]);

  const visibleRows = buildResultSheetRows(results);
  const selectableResults = results.filter((result) => result.result_status !== "SELECTED");

  const allVisibleWaitingSelected =
    selectableResults.length > 0 &&
    selectableResults.every((result) => selectedStudentIds.includes(result.student));

  useEffect(() => {
    if (parsedTopCandidateCount === null) {
      return;
    }

    const nextSelectedIds = selectableResults
      .slice(0, parsedTopCandidateCount)
      .map((result) => result.student);

    setSelectedStudentIds((currentIds) => {
      const hasSameSelection =
        currentIds.length === nextSelectedIds.length &&
        currentIds.every((id, index) => id === nextSelectedIds[index]);

      return hasSameSelection ? currentIds : nextSelectedIds;
    });
  }, [parsedTopCandidateCount, selectableResults]);

  const refreshBoard = async () => {
    if (!department?.id || !selectedSemester) {
      return;
    }

    setSelectedStudentIds([]);
    setIsLoading(true);
    try {
      const [configResponse, resultResponse] = await Promise.all([
        admissionResultsAPI.getConfigurations({
          department_id: department.id,
          semester: selectedSemester,
        }),
        admissionResultsAPI.getResults({
          department_id: department.id,
          semester: selectedSemester,
          exclude_result_status: "SELECTED",
          minimum_score: appliedMinimumScoreFilter || undefined,
          search: appliedSearch || undefined,
          sort_by: appliedSortBy,
          order: appliedSortOrder,
          page,
        }),
      ]);

      setConfiguration(configResponse?.configurations?.[0] || null);
      setResults(resultResponse?.results || []);
      setPagination(paginationFromDrf(resultResponse, page));
      setSummary({
        ...DEFAULT_SUMMARY,
        ...(resultResponse?.summary || {}),
      });
    } catch (refreshError: any) {
      console.error("Error refreshing examinee board:", refreshError);
      toast.error(refreshError?.message || "Failed to refresh examinee board");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedMinimumScoreFilter(draftMinimumScoreFilter.trim());
    setAppliedSortBy(draftSortBy);
    setAppliedSortOrder(draftSortOrder);
    setReloadKey((current) => current + 1);
  };

  const handleClearSearch = () => {
    setDraftSearch("");
    setAppliedSearch("");
    setDraftMinimumScoreFilter("");
    setAppliedMinimumScoreFilter("");
    setDraftSortBy("score");
    setAppliedSortBy("score");
    setDraftSortOrder("desc");
    setAppliedSortOrder("desc");
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleToggleStudent = (studentId: number, checked: boolean) => {
    setSelectedStudentIds((currentIds) => {
      if (checked) {
        return [...new Set([...currentIds, studentId])];
      }

      return currentIds.filter((id) => id !== studentId);
    });
  };

  const handleToggleAllWaiting = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(selectableResults.map((result) => result.student));
      return;
    }

    setSelectedStudentIds([]);
  };

  const handleAccept = async () => {
    if (!department?.id || !selectedSemester) {
      toast.error("Select a semester first.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Select at least one eligible candidate.");
      return;
    }

    setIsAccepting(true);
    try {
      if (!configuration?.id) {
        throw new Error("Set threshold and seat limit before accepting candidates.");
      }

      await admissionResultsAPI.bulkUpdateStatus({
        configuration_id: configuration.id,
        student_ids: selectedStudentIds,
        result_status: "SELECTED",
      });

      toast.success("Selected candidates moved to the next phase.");
      await refreshBoard();
    } catch (acceptError: any) {
      console.error("Error accepting candidates:", acceptError);
      toast.error(acceptError?.message || "Failed to accept candidates");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!department?.id || !selectedSemester) {
      toast.error("Select a semester first.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Select at least one eligible candidate.");
      return;
    }

    setIsRejecting(true);
    try {
      if (!configuration?.id) {
        throw new Error("Set threshold and seat limit before marking candidates as not selected.");
      }

      await admissionResultsAPI.bulkUpdateStatus({
        configuration_id: configuration.id,
        student_ids: selectedStudentIds,
        result_status: "REJECTED",
      });

      toast.success("Selected candidates have been marked as not selected.");
      await refreshBoard();
    } catch (rejectError: any) {
      console.error("Error rejecting candidates:", rejectError);
      toast.error(rejectError?.message || "Failed to mark candidates as not selected");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenReport = (result: AdmissionResult) => {
    setSelectedReportExamId(result.exam);
    setSelectedReportStudentId(result.student);
    setSelectedReportStudentName(result.student_full_name || result.student_username || "Student");
    setIsReportDialogOpen(true);
  };

  const handleDownloadReport = async (result: AdmissionResult) => {
    setActiveSingleDownloadResultId(result.id);
    try {
      const response = await admissionResultsAPI.downloadStudentDetailReportPdf(
        result.exam,
        result.student,
      );

      if (!response?.blob) {
        throw new Error("Student report PDF is not available yet.");
      }

      downloadBlobFile(response.blob, response.filename);
      toast.success(
        `Downloaded report for ${result.student_full_name || result.student_username || "Student"}`,
      );
    } catch (reportError: any) {
      console.error("Error downloading student report:", reportError);
      toast.error(reportError?.message || "Failed to download student report");
    } finally {
      setActiveSingleDownloadResultId(null);
    }
  };

  const handleDownloadSelectedReports = async () => {
    const selectedResults = results.filter((result) =>
      selectedStudentIds.includes(result.student),
    );

    if (selectedResults.length === 0) {
      toast.error("Select at least one candidate to download reports.");
      return;
    }

    if (selectedResults.length === 1) {
      await handleDownloadReport(selectedResults[0]);
      return;
    }

    setIsBulkDownloading(true);
    try {
      const reports = selectedResults.map((result) => ({
        exam_id: result.exam,
        student_id: result.student,
      }));

      const response = await admissionResultsAPI.downloadStudentDetailReportsZip(reports);
      if (!response?.blob) {
        throw new Error("Student report ZIP is not available yet.");
      }

      downloadBlobFile(response.blob, response.filename);
      toast.success(`Downloaded ${selectedResults.length} reports as ZIP.`);
    } catch (reportError: any) {
      console.error("Error downloading student report ZIP:", reportError);
      toast.error(reportError?.message || "Failed to download student reports ZIP");
    } finally {
      setIsBulkDownloading(false);
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
    <div className="space-y-4">
      {departmentError && !department && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{departmentError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-600">Total Candidates</p>
            <p className="text-xl font-bold text-blue-600">{pagination.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-600">Waiting</p>
            <p className="text-xl font-bold text-amber-600">{summary.WAITING}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-600">Selected</p>
            <p className="text-xl font-bold text-green-600">{summary.SELECTED}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-600">Not Selected / Absent</p>
            <p className="text-xl font-bold text-rose-600">
              {summary.REJECTED + summary.ABSENT}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Search className="w-4 h-4 text-blue-600" />
            Search &amp; Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <div className="flex items-center justify-between h-10 px-3 border rounded-md bg-gray-50">
                <span className="text-sm font-medium text-gray-800 max-w-[120px] truncate block" title={department?.department_name}>
                  {isDepartmentLoading ? "Resolving..." : department?.department_name || "Unavailable"}
                </span>
                {department && (
                  <Badge variant="outline">{department.department_shortname}</Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Semester</Label>
              <SemesterCombobox
                value={selectedSemester}
                options={semesterOptions}
                onChange={setSelectedSemester}
                disabled={isDepartmentLoading || semesterOptions.length === 0}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="search-candidates">Search</Label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  id="search-candidates"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search by name, username, or form ID"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sort By</Label>
              <Select value={draftSortBy} onValueChange={(value: "name" | "score") => setDraftSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Order</Label>
              <Select value={draftSortOrder} onValueChange={(value: "asc" | "desc") => setDraftSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="minimum-score-filter">Filter by Total Mark</Label>
              <Input
                id="minimum-score-filter"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draftMinimumScoreFilter}
                onChange={(event) => setDraftMinimumScoreFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Minimum total mark"
              />
            </div>

            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={isLoading || !department || !selectedSemester}
                className="h-10"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSearch}
                disabled={
                  isLoading ||
                  (!draftSearch &&
                    !appliedSearch &&
                    !draftMinimumScoreFilter &&
                    !appliedMinimumScoreFilter &&
                    draftSortBy === "score" &&
                    appliedSortBy === "score" &&
                    draftSortOrder === "desc" &&
                    appliedSortOrder === "desc")
                }
                className="h-10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={refreshBoard}
                disabled={isLoading || !department || !selectedSemester}
                className="h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!configuration && selectedSemester && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="flex flex-col gap-3 text-blue-900 sm:flex-row sm:items-center sm:justify-between">
            <span>
              No saved admission setup exists for {formatSemesterLabel(selectedSemester)} yet.
              Set threshold and seat limit before accepting candidates or marking them as not selected.
            </span>
            <a
              href="/student-acceptance-criteria"
              className="inline-flex items-center justify-center px-3 text-sm font-medium text-white bg-blue-600 rounded-md h-9 hover:bg-blue-700"
            >
              Set Criteria
            </a>
          </AlertDescription>
        </Alert>
      )}

      {isBulkDownloading && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="flex flex-wrap items-center gap-2 text-blue-900">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating selected reports and building ZIP file...</span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span>Candidate Board</span>
              {selectedSemester ? (
                <Badge variant="outline">{formatSemesterLabel(selectedSemester)}</Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span>Bulk Selection</span>
                <Input
                  id="top-candidate-count"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={topCandidateCount}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (/^\d*$/.test(value)) {
                      setTopCandidateCount(value);
                    }
                  }}
                  placeholder=""
                  className="w-24 h-8"
                />
              </div>
              {hasWriteAccess && (
                <Button
                  onClick={handleAccept}
                  disabled={
                    !department ||
                    !selectedSemester ||
                    !configuration?.id ||
                    selectedStudentIds.length === 0 ||
                    isAccepting ||
                    isRejecting
                  }
                  className="text-white bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#23257a] hover:to-[#4046a8]"
                >
                  {isAccepting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Accept
                </Button>
              )}
              {hasWriteAccess && (
                <Button
                  onClick={handleReject}
                  disabled={
                    !department ||
                    !selectedSemester ||
                    !configuration?.id ||
                    selectedStudentIds.length === 0 ||
                    isRejecting ||
                    isAccepting
                  }
                  className="text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
                >
                  {isRejecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Mark Not Selected
                </Button>
              )}
              <Button
                onClick={handleDownloadSelectedReports}
                disabled={selectedStudentIds.length === 0 || isBulkDownloading || activeSingleDownloadResultId !== null}
                variant="outline"
              >
                {isBulkDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Selected
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isDepartmentLoading || isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
                <p className="text-gray-600">Loading examinee results...</p>
              </div>
            </div>
          ) : !selectedSemester ? (
            <div className="py-12 text-center text-gray-500">
              Select a semester to load examinee results.
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {appliedSearch || appliedMinimumScoreFilter
                ? "No candidates match the current filter and search."
                : "No examinee results are available for this semester yet."}
            </div>
          ) : (
            <div className="overflow-hidden border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allVisibleWaitingSelected}
                          onCheckedChange={(checked) => handleToggleAllWaiting(Boolean(checked))}
                          disabled={selectableResults.length === 0}
                          aria-label="Select page eligible candidates"
                        />
                      </TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Application Serial</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>SSC</TableHead>
                    <TableHead>HSC / Diploma</TableHead>
                    <TableHead>Written</TableHead>
                    <TableHead>Viva</TableHead>
                    <TableHead>Written + Viva</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-20 text-center">View</TableHead>
                    <TableHead className="w-24 text-center">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => {
                    const row = visibleRows[index];
                    const isSelectable = result.result_status !== "SELECTED";
                    const isChecked = selectedStudentIds.includes(result.student);
                    const isAbsentCandidate = result.result_status === "ABSENT";
                    const isRejectedCandidate = result.result_status === "REJECTED";
                    const isDownloadingThisReport = activeSingleDownloadResultId === result.id;

                    return (
                      <TableRow
                        key={result.id}
                        className={isAbsentCandidate ? "bg-slate-50/70" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggleStudent(result.student, Boolean(checked))
                            }
                            disabled={!isSelectable}
                            aria-label={`Select ${result.student_full_name}`}
                          />
                        </TableCell>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.page_size + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{row.applicationSerial}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {row.studentName}
                            </p>
                            {row.username ? (
                              <p className="text-sm text-gray-500">@{row.username}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{row.ssc}</TableCell>
                        <TableCell>{row.academic}</TableCell>
                        <TableCell>{row.written}</TableCell>
                        <TableCell>{row.viva}</TableCell>
                        <TableCell>{row.writtenViva}</TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {row.total}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={getResultStatusBadgeClass(result.result_status)}
                            >
                              {row.remarks}
                            </Badge>
                            {isAbsentCandidate || isRejectedCandidate ? (
                              <p className="text-xs text-slate-500">
                                Manual acceptance or not-selected marking allowed
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => handleOpenReport(result)}
                            aria-label={`View report for ${result.student_full_name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => {
                              void handleDownloadReport(result);
                            }}
                            disabled={isDownloadingThisReport || isBulkDownloading}
                            aria-label={`Download report for ${result.student_full_name}`}
                            title={isDownloadingThisReport ? "Downloading" : "Download report"}
                          >
                            {isDownloadingThisReport ? (
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
        </CardContent>
      </Card>

      <StudentAdmissionReportDialog
        open={isReportDialogOpen}
        onOpenChange={(open) => {
          setIsReportDialogOpen(open);
          if (!open) {
            setSelectedReportExamId(null);
            setSelectedReportStudentId(null);
            setSelectedReportStudentName("");
          }
        }}
        examId={selectedReportExamId}
        studentId={selectedReportStudentId}
        studentName={selectedReportStudentName}
      />
    </div>
  );
}
