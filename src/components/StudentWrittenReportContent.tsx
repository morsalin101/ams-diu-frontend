import diuLogo from "../assets/diu-logo.png";
import { formatReportDate } from "../lib/diu-report-pdf";
import { formatSemesterLabel } from "../lib/semester";
import {
  formatAnswerDisplay,
  formatCorrectAnswersDisplay,
  formatReportNumber,
  getQuestionStatusBadgeClass,
  type StudentAdmissionDetailReport,
} from "../lib/student-report";
import { Badge } from "./ui/badge";

interface StudentWrittenReportContentProps {
  report: StudentAdmissionDetailReport;
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

export function StudentWrittenReportContent({ report }: StudentWrittenReportContentProps) {
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
  const correctCount = report.written_summary.correct_answers || 0;
  const wrongCount = report.written_summary.wrong_answers || 0;
  const skippedCount = report.written_summary.skipped_answers || 0;

  const subjectSummary = report.subject_summary || [];
  const questionReviews = report.question_reviews || [];

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
          Admission Test Result, {formatSemesterLabel(report.written_exam.semester)}
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
          Written Examination Report
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
            <span className="w-32 text-slate-600">{hscLabel}</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{hscVal}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam ID</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              EXM{report.written_exam.exam_id}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Total Questions</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{totalQuestions}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Invigilator&apos;s Name</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.written_exam.assigned_teacher || "Invigilator_Name"}
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
            <span className="w-32 text-slate-600">SSC GPA</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">{sscVal}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Exam Duration</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {report.written_exam.duration_display || "50 Minutes"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-600">Total Marks</span>
            <span className="mr-2 text-slate-400">:</span>
            <span className="font-bold text-slate-900 flex-1">
              {formatReportNumber(totalWrittenMarks)}
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
      </div>

      {/* Subject Summary */}
      <div className="mb-6">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">Subject Summary</h4>
        <div className="border-t border-slate-300 mb-3" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-900 font-bold">
                <th className="border border-slate-800 px-3 py-2 text-left">
                  Subject Name
                </th>
                <th className="border border-slate-800 px-2 py-2 text-center w-14 sm:w-16">
                  Correct
                </th>
                <th className="border border-slate-800 px-2 py-2 text-center w-14 sm:w-16">
                  Wrong
                </th>
                <th className="border border-slate-800 px-2 py-2 text-center w-14 sm:w-16">
                  Skipped
                </th>
                <th className="border border-slate-800 px-3 py-2 text-center w-20 sm:w-24">
                  Total Score
                </th>
                <th className="border border-slate-800 px-3 py-2 text-center w-24 sm:w-28">
                  Obtained Score
                </th>
              </tr>
            </thead>
            <tbody>
              {subjectSummary.length === 0 ? (
                <tr>
                  <td className="border border-slate-800 px-3 py-2">General</td>
                  <td className="border border-slate-800 px-2 py-2 text-center">{correctCount}</td>
                  <td className="border border-slate-800 px-2 py-2 text-center">{wrongCount}</td>
                  <td className="border border-slate-800 px-2 py-2 text-center">{skippedCount}</td>
                  <td className="border border-slate-800 px-3 py-2 text-center">
                    {formatReportNumber(totalWrittenMarks)}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-center font-bold">
                    {formatReportNumber(obtainedWrittenMarks)}
                  </td>
                </tr>
              ) : (
                subjectSummary.map((sub, idx) => (
                  <tr key={`${sub.subject_name}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="border border-slate-800 px-3 py-2 font-medium">
                      {sub.subject_name}
                    </td>
                    <td className="border border-slate-800 px-2 py-2 text-center text-emerald-700">
                      {sub.correct_answers}
                    </td>
                    <td className="border border-slate-800 px-2 py-2 text-center text-rose-700">
                      {sub.wrong_answers}
                    </td>
                    <td className="border border-slate-800 px-2 py-2 text-center text-slate-500">
                      {sub.skipped_answers}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 text-center">
                      {formatReportNumber(sub.total_marks)}
                    </td>
                    <td className="border border-slate-800 px-3 py-2 text-center font-semibold">
                      {formatReportNumber(sub.obtained_marks)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="font-bold bg-slate-50/80">
                <td className="border border-slate-800 px-3 py-2">Final Score</td>
                <td className="border border-slate-800 px-2 py-2 text-center text-emerald-700">
                  {correctCount}
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center text-rose-700">
                  {wrongCount}
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center text-slate-600">
                  {skippedCount}
                </td>
                <td className="border border-slate-800 px-3 py-2 text-center">
                  {formatReportNumber(totalWrittenMarks)}
                </td>
                <td className="border border-slate-800 px-3 py-2 text-center text-slate-900">
                  {formatReportNumber(obtainedWrittenMarks)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Score Box */}
      <div className="my-6 flex justify-center">
        <div className="border border-slate-800 rounded-xl px-8 py-3 text-center min-w-[200px] bg-slate-50/60 shadow-sm">
          <p className="text-base sm:text-lg font-bold text-slate-900">
            Final Score: {formatReportNumber(obtainedWrittenMarks)}/
            {formatReportNumber(totalWrittenMarks)}
          </p>
        </div>
      </div>

      {/* Answer Script Section */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">Answer Script</h4>
          <p className="text-[11px] text-slate-500">
            {correctCount} correct, {wrongCount} wrong, {skippedCount} skipped across{" "}
            {questionReviews.length} questions
          </p>
        </div>
        <div className="border-t border-slate-300 mb-4" />

        <div className="space-y-3.5">
          {questionReviews.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No question-level answer script recorded for this student.
            </p>
          ) : (
            questionReviews.map((question, index) => (
              <div
                key={question.question_id || index}
                className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-800 font-bold text-[10px]"
                    >
                      Q{index + 1}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px]"
                    >
                      {question.subject || "General"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${getQuestionStatusBadgeClass(question.status)}`}
                    >
                      {question.status}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    <span>Type: {question.question_type}</span>
                    <span className="mx-1.5">|</span>
                    <span>Marks: {formatReportNumber(question.marks)}</span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-xs font-semibold leading-relaxed text-slate-900 whitespace-pre-wrap mt-1">
                  {question.question_text}
                </p>

                {/* Options */}
                {question.options && Object.keys(question.options).length > 0 && (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-slate-700"
                      >
                        <span className="font-bold text-slate-900 mr-1.5">{key}.</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Student Answer vs Correct Answer */}
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Student Answer
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatAnswerDisplay(question.student_answer)}
                    </span>
                  </div>
                  <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                      Correct Answer
                    </span>
                    <span className="font-semibold text-emerald-900">
                      {formatCorrectAnswersDisplay(question.correct_answers)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Date stamp at bottom right */}
      <div className="text-right text-[11px] text-slate-500 mt-8">
        Date: {formatReportDate()}
      </div>
    </div>
  );
}
