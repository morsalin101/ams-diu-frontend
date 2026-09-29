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
  const rawFaculty = report.written_exam.faculty || "Science and Information Technology";
  const facultyName = rawFaculty.toUpperCase() === "FSIT" ? "Science and Information Technology" : rawFaculty;
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
      className={`font-serif text-black leading-snug mx-auto ${
        exportMode ? "w-[794px] bg-white px-[48px] py-[36px]" : "w-full max-w-[794px] bg-white px-6 sm:px-10 py-8"
      }`}
      data-student-report-export-root={exportMode ? "true" : undefined}
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* DIU Centered Header */}
      <div className="text-center mb-1">
        <img
          src={diuLogo}
          alt="Daffodil International University"
          className="mx-auto h-[60px] w-auto mb-1 object-contain"
        />
        <h2 className="text-[22px] font-bold tracking-normal mb-0">
          Daffodil International University
        </h2>
        <p className="text-[17px] mt-0">
          Admission Test Result, {formatSemesterLabel(report.written_exam.semester)}
        </p>
        <p className="text-[17px] mt-0">Faculty of {facultyName}</p>
        <p className="text-[17px] mt-0">{deptLine}</p>
        <p className="text-[17px] mt-0">Exam Date: {examDate}</p>
      </div>

      {/* Double Horizontal Rule */}
      <div className="mt-2 mb-4">
        <div className="border-t-[1.5px] border-black" />
        <div className="border-t-[0.5px] border-black mt-[1.5px]" />
      </div>

      {/* Student Information */}
      <div className="mb-4">
        <h3 className="text-[18px] font-bold mb-2">Student Information</h3>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[16px]">
          <div className="flex">
            <span className="w-[140px]">Applicant Name</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">{applicantName}</span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Applicant Serial ID</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {report.student.application_serial || "N/A"}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">{hscLabel}</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">{hscVal}</span>
          </div>
          <div className="flex">
            <span className="w-[140px]">SSC GPA</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">{sscVal}</span>
          </div>
        </div>
      </div>

      {/* Admission Details */}
      <div className="mb-5">
        <h3 className="text-[18px] font-bold mb-1">Admission Details</h3>

        {/* Written Examination Subsection */}
        <p className="text-[17px] italic mb-1">Written Examination</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0 text-[16px] mb-2">
          <div className="flex">
            <span className="w-[140px]">Exam ID</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              EXM{report.written_exam.exam_id}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Exam Duration</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {report.written_exam.duration_display || "50 Minutes"}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Total Questions</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">{totalQuestions}</span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Total Marks</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {formatReportNumber(totalWrittenMarks)}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Invigilator&apos;s Name</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {report.written_exam.assigned_teacher || "Invigilator_Name"}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Exam Time</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {formatTimeOnly(report.written_exam.schedule_start_time)}
            </span>
          </div>
        </div>

        {/* Viva Examination Subsection */}
        <p className="text-[17px] italic mb-1">Viva Examination</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0 text-[16px]">
          <div className="flex">
            <span className="w-[140px]">Invigilator&apos;s Name</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {report.viva.teacher || "Invigilator_Name2"}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Room No.</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {report.viva.room || "KT-205"}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Exam Time</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {formatTimeOnly(report.viva.scheduled_at || report.viva.time)}
            </span>
          </div>
          <div className="flex">
            <span className="w-[140px]">Total Marks</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">
              {formatReportNumber(totalVivaMarks)}
            </span>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      <div className="mb-6">
        <h3 className="text-[18px] font-bold mb-1">Result Summary</h3>
        <div className="border-t border-black mb-3" />

        <div className="overflow-hidden">
          <table className="w-full border-collapse border border-black text-[14px]">
            <thead>
              <tr className="font-bold">
                <th
                  rowSpan={2}
                  className="border border-black p-0 h-[1px] w-[30%]"
                >
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Assessment
                  </div>
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-0 h-[1px]"
                >
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Score
                  </div>
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-0 h-[1px]"
                >
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Score Contribution
                  </div>
                </th>
              </tr>
              <tr className="font-bold">
                <th className="border border-black p-0 h-[1px] w-[17.5%]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Total
                  </div>
                </th>
                <th className="border border-black p-0 h-[1px] w-[17.5%]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Obtained
                  </div>
                </th>
                <th className="border border-black p-0 h-[1px] w-[17.5%]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Total
                  </div>
                </th>
                <th className="border border-black p-0 h-[1px] w-[17.5%]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    Obtained
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-3 py-[6px] italic">
                    Written Exam<span className="relative -top-[0.4em] text-[10px] no-italic ml-[1px]">[1]</span>
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(totalWrittenMarks)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(obtainedWrittenMarks)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(writtenWeight)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.written_contribution || 0)}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-3 py-[6px] italic">
                    Viva<span className="relative -top-[0.4em] text-[10px] no-italic ml-[1px]">[2]</span>
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(totalVivaMarks)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(obtainedVivaMarks)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(vivaWeight)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.viva_contribution || 0)}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-3 py-[6px] italic">
                    {hscLabel}<span className="relative -top-[0.4em] text-[10px] no-italic ml-[1px]">[3]</span>
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {isDiploma ? "4" : "5"}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.academic_score || hscVal)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(academicWeight)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.academic_contribution || 0)}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-3 py-[6px] italic">
                    SSC GPA<span className="relative -top-[0.4em] text-[10px] no-italic ml-[1px]">[4]</span>
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    5
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.ssc_score || sscVal)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    {formatReportNumber(sscWeight)}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.ssc_contribution || 0)}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-3 py-[6px] italic">
                    Final Weighted Score<span className="relative -top-[0.4em] text-[10px] no-italic ml-[1px]">[5]</span>
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]" />
                <td className="border border-black p-0 h-[1px]" />
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px]">
                    100
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-3 py-[6px] font-bold">
                    {formatReportNumber(report.final_result.weighted_total)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Score Box */}
      <div className="my-6 flex justify-center">
        <div className="border border-black rounded-[16px] px-[50px] py-[12px] text-center bg-gray-100/50">
          <p className="text-[22px] font-bold tracking-tight mb-1">
            Final Score: {formatReportNumber(report.final_result.weighted_total)}/100
          </p>
          <p className="text-[20px] font-bold mb-1">
            Pass Mark: {formatReportNumber(report.final_result.threshold ?? 40)}
          </p>
          <p
            className={`text-[20px] font-bold uppercase tracking-normal ${
              isAccepted
                ? "text-[#1b7339]" // Match the green color
                : status === "REJECTED"
                  ? "text-[#b91c1c]"
                  : "text-[#b45309]"
            }`}
          >
            Final Result: {isAccepted ? "ACCEPTED" : status}
          </p>
        </div>
      </div>

      {/* How the Final Score is Calculated & Mark Distribution Box */}
      <div className="border border-black p-[14px] text-[16px] mb-6 flex bg-[#f8f9fa]">
        {/* Left Column: Equations */}
        <div className="flex-1">
          <h4 className="font-bold text-[16px] mb-1">How the Final Score is Calculated</h4>
          <div className="space-y-0.5 text-[15px] italic">
            <div>
              <p>
                <span className="font-bold">1. Written Exam Contribution</span><br/>
                <span className="pl-[20px]">(Obtained written exam marks ÷ Total written exam marks) × {writtenWeight}</span>
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">2. Viva Contribution</span><br/>
                <span className="pl-[20px]">(Obtained viva marks ÷ Total viva marks) × {vivaWeight}</span>
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">3. SSC GPA Contribution</span><br/>
                <span className="pl-[20px]">(Obtained SSC GPA ÷ 5) × {sscWeight}</span>
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">4. {hscLabel} Contribution</span><br/>
                <span className="pl-[20px]">(Obtained {hscLabel} ÷ {isDiploma ? 4 : 5}) × {academicWeight}</span>
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">5. Final Weighted Score</span><br/>
                <span className="pl-[20px]">SSC GPA Contribution + HSC GPA Contribution + Written Exam Contribution + Viva Contribution</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Mark Distribution Table */}
        <div className="w-[180px] flex flex-col items-center justify-center">
          <h4 className="font-bold text-[16px] mb-1">Mark Distribution</h4>
          <table className="w-full border-collapse border border-black text-[15px] bg-white">
            <tbody>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-2 py-[4px]">
                    Written
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-2 py-[4px]">
                    {writtenWeight}%
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-2 py-[4px]">
                    Viva
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-2 py-[4px]">
                    {vivaWeight}%
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-2 py-[4px]">
                    {isDiploma ? "Diploma" : "HSC"}
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-2 py-[4px]">
                    {academicWeight}%
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-2 py-[4px]">
                    SSC
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-2 py-[4px]">
                    {sscWeight}%
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center w-full h-full px-2 py-[4px] font-bold">
                    Total
                  </div>
                </td>
                <td className="border border-black p-0 h-[1px]">
                  <div className="flex items-center justify-center w-full h-full px-2 py-[4px] font-bold">
                    100%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Date stamp at bottom right */}
      <div className="text-right text-[15px] mt-1">
        Date: {formatReportDate()}
      </div>
    </div>
  );
}
