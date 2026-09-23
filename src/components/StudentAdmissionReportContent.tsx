import diuLogo from "../assets/diu-logo.png";
import { formatReportDate } from "../lib/diu-report-pdf";
import { formatSemesterLabel } from "../lib/semester";
import {
  formatReportNumber,
  type StudentAdmissionDetailReport,
} from "../lib/student-report";

interface StudentAdmissionReportContentProps {
  report: StudentAdmissionDetailReport;
  exportMode?: boolean;
}

function formatTimeOnly(dateString?: string | null) {
  if (!dateString) return "09:00AM";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(/\s+/g, "");
}

function formatDateOnly(dateString?: string | null) {
  if (!dateString) return formatReportDate();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function StudentAdmissionReportContent({
  report,
  exportMode = false,
}: StudentAdmissionReportContentProps) {
  const applicantName = report.student.full_name || report.student.username;
  const facultyName = report.written_exam.faculty || "Science and Information Technology";
  const departmentName = (report.written_exam.department || "Computer Science & Engineering").trim();
  const deptLine = /^department\s+of\b/i.test(departmentName)
    ? departmentName
    : `Department of ${departmentName}`;
  const examDate = formatDateOnly(
    report.written_exam.exam_date || report.written_exam.schedule_start_time,
  );

  const isDiploma = report.student.academic_type === "DIPLOMA";
  const hscLabel = isDiploma ? "Diploma GPA" : "HSC GPA";
  const hscVal = isDiploma
    ? formatReportNumber(report.student.diploma)
    : formatReportNumber(report.student.hsc);
  const sscVal = formatReportNumber(report.student.ssc);

  const totalQuestions = report.written_summary.total_questions || 50;
  const totalWrittenMarks = report.written_summary.total_marks || 50;
  const obtainedWrittenMarks = report.written_summary.obtained_marks || 0;

  const totalVivaMarks = report.viva.total_marks || 20;
  const obtainedVivaMarks = report.final_result.viva_marks || 0;

  const distribution = report.final_result.distribution_percentages || {
    written: 90,
    viva: 5,
    hsc: 3,
    ssc: 2,
    diploma: 3,
  };

  const writtenWeight = distribution.written ?? 90;
  const vivaWeight = distribution.viva ?? 5;
  const academicWeight = isDiploma ? (distribution.diploma ?? 3) : (distribution.hsc ?? 3);
  const sscWeight = distribution.ssc ?? 2;

  const status = report.final_result.result_status || "ACCEPTED";
  const isAccepted = status === "SELECTED" || status === "ACCEPTED";

  return (
    <div
      className={exportMode ? "w-[800px] bg-white p-8 text-slate-900" : "w-full text-slate-900"}
      data-student-report-export-root={exportMode ? "true" : undefined}
    >
      {/* DIU Centered Header */}
      <div className="text-center">
        <img
          src={diuLogo}
          alt="Daffodil International University"
          className="mx-auto h-11 sm:h-12 w-auto mb-2 object-contain"
        />
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          Daffodil International University
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
          Admission Test Result, {formatSemesterLabel(report.written_exam.semester)}
        </p>
        <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">Faculty of {facultyName}</p>
        <p className="text-[11px] sm:text-xs text-slate-700">{deptLine}</p>
        <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">Exam Date: {examDate}</p>

        {/* Double Horizontal Rule */}
        <div className="mt-3 mb-4">
          <div className="border-t-[1.5px] border-slate-900" />
          <div className="border-t border-slate-900 mt-[2px]" />
        </div>
      </div>

      {/* Student Information */}
      <div className="mb-5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">Student Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-medium">
          <div className="flex">
            <span className="w-32 text-slate-600">Applicant Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{applicantName}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Applicant Serial ID</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.student.application_serial || "N/A"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">{hscLabel}</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{hscVal}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">SSC GPA</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{sscVal}</span>
          </div>
        </div>
      </div>

      {/* Admission Details */}
      <div className="mb-5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">Admission Details</h3>

        {/* Written Examination Subsection */}
        <p className="text-xs font-bold italic text-slate-800 mb-1.5">Written Examination</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-medium mb-3">
          <div className="flex">
            <span className="w-32 text-slate-600">Exam ID</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              EXM{report.written_exam.exam_id}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam Duration</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.written_exam.duration_display || "50 Minutes"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Total Questions</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{totalQuestions}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Total Marks</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatReportNumber(totalWrittenMarks)}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Invigilator&apos;s Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.written_exam.assigned_teacher || "Invigilator_Name"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam Time</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatTimeOnly(report.written_exam.schedule_start_time)}
            </span>
          </div>
        </div>

        {/* Viva Examination Subsection */}
        <p className="text-xs font-bold italic text-slate-800 mb-1.5">Viva Examination</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-medium">
          <div className="flex">
            <span className="w-32 text-slate-600">Invigilator&apos;s Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.viva.teacher || "Invigilator_Name2"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Room No.</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.viva.room || "KT-205"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam Time</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatTimeOnly(report.viva.scheduled_at || report.viva.time)}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Total Marks</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatReportNumber(totalVivaMarks)}
            </span>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      <div className="mb-6">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">Result Summary</h3>
        <div className="border-t border-slate-300 mb-3" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-900 font-bold">
                <th
                  rowSpan={2}
                  className="border border-slate-800 px-3 py-2 text-left align-middle"
                >
                  Assessment
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-800 px-2 py-1.5 text-center"
                >
                  Score
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-800 px-2 py-1.5 text-center"
                >
                  Score Contribution
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-900 font-bold">
                <th className="border border-slate-800 px-2 py-1 text-center w-16 sm:w-20">Total</th>
                <th className="border border-slate-800 px-2 py-1 text-center w-16 sm:w-20">
                  Obtained
                </th>
                <th className="border border-slate-800 px-2 py-1 text-center w-18 sm:w-24">Total</th>
                <th className="border border-slate-800 px-2 py-1 text-center w-18 sm:w-24">
                  Obtained
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50/50">
                <td className="border border-slate-800 px-3 py-1.5 font-medium">
                  Written Exam<sup className="text-[10px] text-slate-500 font-bold">[1]</sup>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(totalWrittenMarks)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(obtainedWrittenMarks)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(writtenWeight)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.written_contribution || 0)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="border border-slate-800 px-3 py-1.5 font-medium">
                  Viva<sup className="text-[10px] text-slate-500 font-bold">[2]</sup>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(totalVivaMarks)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(obtainedVivaMarks)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(vivaWeight)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.viva_contribution || 0)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="border border-slate-800 px-3 py-1.5 font-medium">
                  {hscLabel}<sup className="text-[10px] text-slate-500 font-bold">[3]</sup>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {isDiploma ? "4" : "5"}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.academic_score || hscVal)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(academicWeight)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.academic_contribution || 0)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="border border-slate-800 px-3 py-1.5 font-medium">
                  SSC GPA<sup className="text-[10px] text-slate-500 font-bold">[4]</sup>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">5</td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.ssc_score || sscVal)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportNumber(sscWeight)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                  {formatReportNumber(report.final_result.ssc_contribution || 0)}
                </td>
              </tr>

              <tr className="font-bold bg-slate-50/80">
                <td className="border border-slate-800 px-3 py-2">
                  Final Weighted Score
                  <sup className="text-[10px] text-slate-500 font-bold">[5]</sup>
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center" />
                <td className="border border-slate-800 px-2 py-2 text-center" />
                <td className="border border-slate-800 px-2 py-2 text-center">100</td>
                <td className="border border-slate-800 px-2 py-2 text-center text-slate-900 text-sm">
                  {formatReportNumber(report.final_result.weighted_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Score Box */}
      <div className="my-6 flex justify-center">
        <div className="border border-slate-800 rounded-2xl px-8 sm:px-10 py-3.5 text-center min-w-[240px] sm:min-w-[280px] bg-slate-50/60 shadow-sm space-y-0.5">
          <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Final Score: {formatReportNumber(report.final_result.weighted_total)}/100
          </p>
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Pass Mark: {formatReportNumber(report.final_result.threshold ?? 40)}
          </p>
          <p
            className={`text-sm sm:text-base font-bold uppercase tracking-wide ${
              isAccepted
                ? "text-emerald-700"
                : status === "REJECTED"
                  ? "text-rose-700"
                  : "text-amber-700"
            }`}
          >
            Final Result: {isAccepted ? "ACCEPTED" : status}
          </p>
        </div>
      </div>

      {/* How the Final Score is Calculated & Mark Distribution Box */}
      <div className="border border-slate-800 rounded p-3.5 sm:p-4 text-xs font-sans mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] gap-5">
          {/* Left Column: Equations */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-xs text-slate-900">How the Final Score is Calculated</h4>

            <div className="space-y-1 text-[11px] leading-relaxed">
              <div>
                <p className="font-bold italic text-slate-800">1. Written Exam Contribution</p>
                <p className="italic text-slate-600 pl-3">
                  (Obtained written exam marks ÷ Total written exam marks) × {writtenWeight}
                </p>
              </div>

              <div>
                <p className="font-bold italic text-slate-800">2. Viva Contribution</p>
                <p className="italic text-slate-600 pl-3">
                  (Obtained viva marks ÷ Total viva marks) × {vivaWeight}
                </p>
              </div>

              <div>
                <p className="font-bold italic text-slate-800">3. SSC GPA Contribution</p>
                <p className="italic text-slate-600 pl-3">
                  (Obtained SSC GPA ÷ 5) × {sscWeight}
                </p>
              </div>

              <div>
                <p className="font-bold italic text-slate-800">4. {hscLabel} Contribution</p>
                <p className="italic text-slate-600 pl-3">
                  (Obtained {hscLabel} ÷ {isDiploma ? 4 : 5}) × {academicWeight}
                </p>
              </div>

              <div>
                <p className="font-bold italic text-slate-800">5. Final Weighted Score</p>
                <p className="italic text-slate-600 pl-3">
                  SSC GPA Contribution + HSC GPA Contribution + Written Exam Contribution + Viva
                  Contribution
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Mark Distribution Table */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 text-center mb-1.5">
              Mark Distribution
            </h4>
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-slate-800 px-3 py-1 font-medium">Written</td>
                  <td className="border border-slate-800 px-3 py-1 text-center">
                    {writtenWeight}%
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 px-3 py-1 font-medium">Viva</td>
                  <td className="border border-slate-800 px-3 py-1 text-center">
                    {vivaWeight}%
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 px-3 py-1 font-medium">
                    {isDiploma ? "Diploma" : "HSC"}
                  </td>
                  <td className="border border-slate-800 px-3 py-1 text-center">
                    {academicWeight}%
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 px-3 py-1 font-medium">SSC</td>
                  <td className="border border-slate-800 px-3 py-1 text-center">
                    {sscWeight}%
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-800 px-3 py-1">Total</td>
                  <td className="border border-slate-800 px-3 py-1 text-center">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Date stamp at bottom right */}
      <div className="text-right text-[11px] text-slate-500 mt-6">
        Date: {formatReportDate()}
      </div>
    </div>
  );
}
