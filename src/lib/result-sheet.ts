import {
  PRETTY_STATUS_LABELS,
  getAcademicDisplayValue,
  getAcademicDisplayLabel,
  getAcademicMaxScore,
  type AdmissionResult,
  type EffectiveDepartment,
} from "./admission";
import { normalizeSemesterValue } from "./semester";

export interface ExamLookupRecord {
  id?: number;
  semester?: string | null;
  faculty?: string | null;
  department?: string | null;
  department_shortnames?: string[] | string | null;
}

export interface ResultSheetRow {
  id: number;
  serial: number;
  applicationSerial: string;
  studentName: string;
  username: string;
  ssc: string;
  academic: string;
  written: string;
  viva: string;
  writtenViva: string;
  total: string;
  remarks: string;
  examTakenAt: string;
}

const FACULTY_BY_DEPARTMENT_SHORTNAME: Record<string, string> = {
  CSE: "Science and Information Technology",
  SWE: "Science and Information Technology",
  CIS: "Science and Information Technology",
  EEE: "Engineering",
  TE: "Engineering",
  CE: "Engineering",
  ME: "Engineering",
  BBA: "Business and Entrepreneurship",
  MBA: "Business and Entrepreneurship",
  THM: "Business and Entrepreneurship",
  ENG: "Humanities and Social Sciences",
  JMC: "Humanities and Social Sciences",
  LAW: "Humanities and Social Sciences",
  NFE: "Health and Life Sciences",
  PH: "Health and Life Sciences",
  ARCH: "Health and Life Sciences",
};

const FACULTY_NAME_NORMALIZERS: Record<string, string> = {
  FSIT: "Science and Information Technology",
  "SCIENCE AND INFORMATION TECHNOLOGY": "Science and Information Technology",
  "FACULTY OF SCIENCE AND INFORMATION TECHNOLOGY": "Science and Information Technology",
  FE: "Engineering",
  ENGINEERING: "Engineering",
  "FACULTY OF ENGINEERING": "Engineering",
  FEB: "Business and Entrepreneurship",
  "BUSINESS AND ENTREPRENEURSHIP": "Business and Entrepreneurship",
  "FACULTY OF BUSINESS AND ENTREPRENEURSHIP": "Business and Entrepreneurship",
  FHS: "Humanities and Social Sciences",
  HSS: "Humanities and Social Sciences",
  "HUMANITIES AND SOCIAL SCIENCES": "Humanities and Social Sciences",
  "FACULTY OF HUMANITIES AND SOCIAL SCIENCES": "Humanities and Social Sciences",
  FHLS: "Health and Life Sciences",
  "HEALTH AND LIFE SCIENCES": "Health and Life Sciences",
  "FACULTY OF HEALTH AND LIFE SCIENCES": "Health and Life Sciences",
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return Number(value).toFixed(2).replace(/\.00$/, "");
}

// "4.83 / 5"; when total is missing/0 (e.g. no viva assigned), show the
// value alone rather than a meaningless "x / 0".
function formatOutOf(value?: number | null, total?: number | null): string {
  const v = formatNumber(value);
  if (!total || total <= 0) {
    return v;
  }
  return `${v} / ${formatNumber(total)}`;
}

function normalizeFacultyLabel(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) {
    return "";
  }

  const normalized = FACULTY_NAME_NORMALIZERS[text.toUpperCase()];
  if (normalized) {
    return normalized;
  }

  return text
    .replace(/^Faculty of\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDepartmentShortnames(record: ExamLookupRecord) {
  if (Array.isArray(record.department_shortnames)) {
    return record.department_shortnames.map((value) => value.trim().toUpperCase());
  }

  if (typeof record.department_shortnames === "string" && record.department_shortnames.trim()) {
    return record.department_shortnames
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  return [];
}

function examMatchesDepartment(record: ExamLookupRecord, department: EffectiveDepartment) {
  const shortnames = getDepartmentShortnames(record);
  if (shortnames.includes(department.department_shortname.toUpperCase())) {
    return true;
  }

  const departmentText = (record.department || "").trim().toLowerCase();
  return (
    departmentText === department.department_name.toLowerCase() ||
    departmentText === department.department_shortname.toLowerCase()
  );
}

export function resolveFacultyName({
  exams,
  department,
  semester,
  resultExamIds = [],
}: {
  exams: ExamLookupRecord[];
  department: EffectiveDepartment | null;
  semester: string;
  resultExamIds?: number[];
}) {
  const normalizedSemester = normalizeSemesterValue(semester);
  const resultExamIdSet = new Set(resultExamIds);

  const examFaculty = exams
    .filter((exam) => normalizeSemesterValue(exam.semester) === normalizedSemester)
    .filter((exam) => (department ? examMatchesDepartment(exam, department) : true))
    .filter((exam) => (resultExamIdSet.size > 0 ? resultExamIdSet.has(Number(exam.id)) : true))
    .map((exam) => normalizeFacultyLabel(exam.faculty))
    .find(Boolean);

  if (examFaculty) {
    return examFaculty;
  }

  if (department?.department_shortname) {
    const fallback = FACULTY_BY_DEPARTMENT_SHORTNAME[department.department_shortname.toUpperCase()];
    if (fallback) {
      return fallback;
    }
  }

  return "Science and Information Technology";
}

export function formatReportDate(value = new Date()) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Exam-taken datetime for display/export; blank when the student never submitted.
export function formatExamTaken(value?: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// When `withDenominator` is false the mark columns hold bare values (e.g. "12")
// instead of "12 / 15" — used by the exports, where the denominator moves into
// the column header (see `getColumnHeader`) so a table can be shown per cohort.
export function buildResultSheetRows(
  results: AdmissionResult[],
  { withDenominator = true }: { withDenominator?: boolean } = {},
): ResultSheetRow[] {
  const fmt = (value?: number | null, total?: number | null) =>
    withDenominator ? formatOutOf(value, total) : formatNumber(value);

  return results.map((result, index) => ({
    id: result.id,
    serial: index + 1,
    applicationSerial: result.student_f_id || "N/A",
    studentName: result.student_full_name || "N/A",
    username: result.student_username || "",
    ssc: fmt(result.student_ssc, 5),
    academic: fmt(getAcademicDisplayValue(result), getAcademicMaxScore(result)),
    written: fmt(result.mcq_marks, result.written_total_marks),
    viva: fmt(result.viva_marks, result.viva_total_marks),
    writtenViva: fmt(
      result.written_viva_total,
      (result.written_total_marks || 0) + (result.viva_total_marks || 0),
    ),
    total: formatNumber(result.weighted_total_marks),
    remarks: result.is_admitted ? PRETTY_STATUS_LABELS.ACCEPTED : PRETTY_STATUS_LABELS[result.result_status],
    examTakenAt: formatExamTaken(result.exam_taken_at),
  }));
}

// The per-column maximums that vary between students. SSC (5) and the weighted
// Total (100) are constant, so they never split a table and aren't part of the
// grouping signature.
export interface ResultDenominators {
  academicLabel: string; // "HSC" | "Diploma"
  academicMax: number; // 5 (HSC) | 4 (Diploma)
  writtenTotal: number;
  vivaTotal: number;
}

export interface ResultSheetGroup {
  key: string;
  denominators: ResultDenominators;
  results: AdmissionResult[];
}

export function getResultDenominators(result: AdmissionResult): ResultDenominators {
  return {
    academicLabel: getAcademicDisplayLabel(result),
    academicMax: getAcademicMaxScore(result),
    writtenTotal: Number(result.written_total_marks) || 0,
    vivaTotal: Number(result.viva_total_marks) || 0,
  };
}

// Split an export cohort into groups that share the same denominators, so each
// group can be rendered as its own table with those maxes in the headers.
// Order: HSC before Diploma, then written total asc, then viva total asc.
export function groupResultsByDenominators(results: AdmissionResult[]): ResultSheetGroup[] {
  const groups = new Map<string, ResultSheetGroup>();

  for (const result of results) {
    const denominators = getResultDenominators(result);
    const key = [
      denominators.academicLabel,
      denominators.academicMax,
      denominators.writtenTotal,
      denominators.vivaTotal,
    ].join("|");
    const existing = groups.get(key);
    if (existing) {
      existing.results.push(result);
    } else {
      groups.set(key, { key, denominators, results: [result] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const left = a.denominators;
    const right = b.denominators;
    if (left.academicMax !== right.academicMax) return right.academicMax - left.academicMax;
    if (left.writtenTotal !== right.writtenTotal) return left.writtenTotal - right.writtenTotal;
    if (left.vivaTotal !== right.vivaTotal) return left.vivaTotal - right.vivaTotal;
    return left.academicLabel.localeCompare(right.academicLabel);
  });
}

// Append "(out of X)" only when X is a real maximum (>0).
function withMax(label: string, max: number): string {
  return max > 0 ? `${label} (out of ${formatNumber(max)})` : label;
}

// Column header text for a given group. Mark columns carry that group's
// denominator; the rest are static labels.
export function getColumnHeader(
  key: keyof ResultSheetRow,
  denominators: ResultDenominators,
): string {
  switch (key) {
    case "serial":
      return "SL";
    case "applicationSerial":
      return "Application Serial";
    case "studentName":
      return "Student Name";
    case "username":
      return "Username";
    case "ssc":
      return withMax("SSC", 5);
    case "academic":
      return withMax(denominators.academicLabel, denominators.academicMax);
    case "written":
      return withMax("Written", denominators.writtenTotal);
    case "viva":
      return withMax("Viva", denominators.vivaTotal);
    case "writtenViva":
      return withMax("Written + Viva", denominators.writtenTotal + denominators.vivaTotal);
    case "total":
      return withMax("Total", 100);
    case "remarks":
      return "Status";
    case "examTakenAt":
      return "Exam Taken";
    default:
      return String(key);
  }
}

export function getResultStatusBadgeClass(status: AdmissionResult["result_status"] | "ACCEPTED") {
  if (status === "SELECTED") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "ACCEPTED") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (status === "WAITING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function isMinimumScoreEligible(result: AdmissionResult, minimumScore: number | null) {
  if (minimumScore === null) {
    return result.result_status !== "SELECTED";
  }

  return Number(result.weighted_total_marks) >= minimumScore;
}
