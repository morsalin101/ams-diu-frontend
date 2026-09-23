import diuLogo from "../assets/diu-logo.png";
import { formatReportDate } from "../lib/diu-report-pdf";
import { formatSemesterLabel } from "../lib/semester";
import {
  formatReportNumber,
  type StudentAdmissionDetailReport,
} from "../lib/student-report";

interface StudentVivaReportContentProps {
  report: StudentAdmissionDetailReport;
}

function formatTimeOnly(dateString?: string | null) {
  if (!dateString) return "10:00AM";
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

export function StudentVivaReportContent({ report }: StudentVivaReportContentProps) {
  const applicantName = report.student.full_name || report.student.username;
  const facultyName = report.written_exam.faculty || "Science and Information Technology";
  const departmentName = (report.written_exam.department || "Computer Science & Engineering").trim();
  const deptLine = /^department\s+of\b/i.test(departmentName)
    ? departmentName
    : `Department of ${departmentName}`;
  const examDate = formatDateOnly(
    report.written_exam.exam_date || report.written_exam.schedule_start_time,
  );
  const totalVivaMarks = report.viva.total_marks || 20;
  const obtainedVivaMarks = report.final_result.viva_marks || 0;
  const rubricRows = report.viva.rubric_rows || [];

  return (
    <div className="w-full text-slate-900">
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
          Admission Test Results, {formatSemesterLabel(report.written_exam.semester)}
        </p>
        <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">Faculty of {facultyName}</p>
        <p className="text-[11px] sm:text-xs text-slate-700">{deptLine}</p>
        <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">Exam Date: {examDate}</p>

        {/* Double Rule */}
        <div className="mt-3 mb-4">
          <div className="border-t-[1.5px] border-slate-900" />
          <div className="border-t border-slate-900 mt-[2px]" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-5">
        <h3 className="text-sm sm:text-base font-bold underline underline-offset-4 text-slate-900">
          Viva Examination Report
        </h3>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs leading-relaxed mb-6 font-medium">
        <div className="space-y-1.5">
          <div className="flex">
            <span className="w-32 text-slate-600">Applicant Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{applicantName}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Invigilator&apos;s Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.viva.teacher || "Invigilator_Name2"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam Time</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatTimeOnly(report.viva.scheduled_at || report.viva.time)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex">
            <span className="w-32 text-slate-600">Applicant Serial ID</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.student.application_serial || "N/A"}
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
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">Result Summary</h4>
        <div className="border-t border-slate-300 mb-3" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-900 font-bold">
                <th className="border border-slate-800 px-3 py-2 text-left">
                  Assessment Criteria
                </th>
                <th className="border border-slate-800 px-3 py-2 text-center w-24 sm:w-28">
                  Total Score
                </th>
                <th className="border border-slate-800 px-3 py-2 text-center w-28 sm:w-32">
                  Obtained Score
                </th>
              </tr>
            </thead>
            <tbody>
              {rubricRows.length === 0 ? (
                <tr>
                  <td className="border border-slate-800 px-3 py-2">Viva Assessment</td>
                  <td className="border border-slate-800 px-3 py-2 text-center">
                    {formatReportNumber(totalVivaMarks)}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-center font-bold">
                    {formatReportNumber(obtainedVivaMarks)}
                  </td>
                </tr>
              ) : (
                rubricRows.map((row, idx) => (
                  <tr key={`${row.criteria}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="border border-slate-800 px-3 py-2">{row.criteria}</td>
                    <td className="border border-slate-800 px-3 py-2 text-center">
                      {formatReportNumber(row.max_marks)}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 text-center font-semibold">
                      {formatReportNumber(row.awarded_marks)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="font-bold bg-slate-50/80">
                <td className="border border-slate-800 px-3 py-2">Final Score</td>
                <td className="border border-slate-800 px-3 py-2 text-center">
                  {formatReportNumber(totalVivaMarks)}
                </td>
                <td className="border border-slate-800 px-3 py-2 text-center text-slate-900">
                  {formatReportNumber(obtainedVivaMarks)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks */}
      <div className="mb-6 text-xs">
        <span className="font-semibold text-slate-700">Remarks : </span>
        <span className="text-slate-800 italic">
          {report.viva.remarks || "No specific remarks recorded."}
        </span>
      </div>

      {/* Final Score Box */}
      <div className="my-6 flex justify-center">
        <div className="border border-slate-800 rounded-xl px-8 py-3 text-center min-w-[200px] bg-slate-50/60 shadow-sm">
          <p className="text-base sm:text-lg font-bold text-slate-900">
            Final Score: {formatReportNumber(obtainedVivaMarks)}/
            {formatReportNumber(totalVivaMarks)}
          </p>
        </div>
      </div>

      {/* Date stamp at bottom right */}
      <div className="text-right text-[11px] text-slate-500 mt-8">
        Date: {formatReportDate()}
      </div>
    </div>
  );
}
