import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { loadDiuLogoDataUrl, formatReportDate } from "./diu-report-pdf";
import { ensureUnicodePdfFont, UNICODE_PDF_FONT_FAMILY } from "./pdf-unicode-font";
import { formatSemesterLabel } from "./semester";
import {
  formatReportNumber,
  formatAnswerDisplay,
  formatCorrectAnswersDisplay,
  getVivaTotalMarks,
  getVivaObtainedMarks,
  type StudentAdmissionDetailReport,
} from "./student-report";

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

function drawPdfHeader(
  doc: jsPDF,
  logoDataUrl: string,
  report: StudentAdmissionDetailReport,
  title?: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const marginX = 36;

  // DIU Logo centered at top
  const logoWidth = 46;
  const logoHeight = 46;
  const logoX = centerX - logoWidth / 2;
  try {
    doc.addImage(logoDataUrl, "PNG", logoX, 22, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Could not draw logo on PDF:", err);
  }

  // University title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Daffodil International University", centerX, 80, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const semesterStr = formatSemesterLabel(report.written_exam.semester);
  doc.text(`Admission Test Result, ${semesterStr}`, centerX, 94, { align: "center" });

  // Faculty and Department
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const facultyName = report.written_exam.faculty || "Science and Information Technology";
  doc.text(`Faculty of ${facultyName}`, centerX, 107, { align: "center" });

  const departmentText = (report.written_exam.department || "Computer Science & Engineering").trim();
  const deptLine = /^department\s+of\b/i.test(departmentText)
    ? departmentText
    : `Department of ${departmentText}`;
  doc.text(deptLine, centerX, 119, { align: "center" });

  // Exam Date
  const examDate = formatDateOnly(
    report.written_exam.exam_date || report.written_exam.schedule_start_time,
  );
  doc.text(`Exam Date: ${examDate}`, centerX, 131, { align: "center" });

  // Double horizontal rule
  const lineY = 138;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.0);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  doc.setLineWidth(0.4);
  doc.line(marginX, lineY + 2.5, pageWidth - marginX, lineY + 2.5);

  let currentY = lineY + 12;

  // Optional Section Title (e.g. "Viva Examination Report" or "Written Examination Report")
  if (title) {
    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, centerX, currentY, { align: "center" });
    const textWidth = doc.getTextWidth(title);
    doc.setLineWidth(0.8);
    doc.line(centerX - textWidth / 2, currentY + 2, centerX + textWidth / 2, currentY + 2);
    currentY += 14;
  }

  return currentY;
}

// -------------------------------------------------------------
// 1. Template 1: AMS Individual Student Test Report
// -------------------------------------------------------------
export async function downloadIndividualTestReportPdf(report: StudentAdmissionDetailReport) {
  const logoDataUrl = await loadDiuLogoDataUrl();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const col1X = marginX + 4;
  const col2X = marginX + 265;

  let y = drawPdfHeader(doc, logoDataUrl, report);

  // --- Student Information ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Student Information", marginX, y);
  y += 14;

  doc.setFontSize(9);
  const applicantName = report.student.full_name || report.student.username;
  const serialId = report.student.application_serial || "N/A";
  const isDiploma = report.student.academic_type === "DIPLOMA";
  const hscLabel = isDiploma ? "Diploma GPA" : "HSC GPA";
  const hscVal = isDiploma
    ? formatReportNumber(report.student.diploma)
    : formatReportNumber(report.student.hsc);
  const sscVal = formatReportNumber(report.student.ssc);

  // Line 1
  doc.setFont("helvetica", "normal");
  doc.text("Applicant Name", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(applicantName, col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Applicant Serial ID", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(serialId, col2X + 95, y);
  y += 13;

  // Line 2
  doc.setFont("helvetica", "normal");
  doc.text(hscLabel, col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(hscVal, col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("SSC GPA", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(sscVal, col2X + 95, y);
  y += 16;

  // --- Admission Details ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Admission Details", marginX, y);
  y += 13;

  // Written Examination
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(9.5);
  doc.text("Written Examination", marginX, y);
  y += 13;

  doc.setFontSize(8.5);
  // Row 1
  doc.setFont("helvetica", "normal");
  doc.text("Exam ID", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(`EXM${report.written_exam.exam_id}`, col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Exam Duration", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.written_exam.duration_display || "50 Minutes", col2X + 95, y);
  y += 12;

  // Row 2
  doc.setFont("helvetica", "normal");
  doc.text("Total Questions", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(report.written_summary.total_questions || 50), col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Total Marks", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatReportNumber(report.written_summary.total_marks || 50), col2X + 95, y);
  y += 12;

  // Row 3
  doc.setFont("helvetica", "normal");
  doc.text("Invigilator's Name", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.written_exam.assigned_teacher || "Invigilator_Name", col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Exam Time", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatTimeOnly(report.written_exam.schedule_start_time), col2X + 95, y);
  y += 15;

  // Viva Examination
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(9.5);
  doc.text("Viva Examination", marginX, y);
  y += 13;

  doc.setFontSize(8.5);
  // Row 1
  doc.setFont("helvetica", "normal");
  doc.text("Invigilator's Name", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.viva.teacher || "Invigilator_Name2", col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Room No.", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.viva.room || "KT-205", col2X + 95, y);
  y += 12;

  // Row 2
  doc.setFont("helvetica", "normal");
  const vivaTotalMarks = getVivaTotalMarks(report);
  const vivaObtainedMarks = getVivaObtainedMarks(report);

  doc.setFont("helvetica", "normal");
  doc.text("Exam Time", col1X, y);
  doc.text(":", col1X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatTimeOnly(report.viva.scheduled_at || report.viva.time), col1X + 95, y);

  doc.setFont("helvetica", "normal");
  doc.text("Total Marks", col2X, y);
  doc.text(":", col2X + 85, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatReportNumber(vivaTotalMarks), col2X + 95, y);
  y += 16;

  // --- Result Summary ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Result Summary", marginX, y);
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

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

  const summaryHead = [
    [
      { content: "Assessment", rowSpan: 2, styles: { halign: "left" as const, valign: "middle" as const } },
      { content: "Score", colSpan: 2, styles: { halign: "center" as const } },
      { content: "Score Contribution", colSpan: 2, styles: { halign: "center" as const } },
    ],
    [
      { content: "Total", styles: { halign: "center" as const } },
      { content: "Obtained", styles: { halign: "center" as const } },
      { content: "Total", styles: { halign: "center" as const } },
      { content: "Obtained", styles: { halign: "center" as const } },
    ],
  ];

  const summaryBody = [
    [
      "Written Exam [1]",
      formatReportNumber(report.written_summary.total_marks || 50),
      formatReportNumber(report.written_summary.obtained_marks || 0),
      formatReportNumber(writtenWeight),
      formatReportNumber(report.final_result.written_contribution || 0),
    ],
    [
      "Viva [2]",
      formatReportNumber(vivaTotalMarks),
      formatReportNumber(vivaObtainedMarks),
      formatReportNumber(vivaWeight),
      formatReportNumber(report.final_result.viva_contribution || 0),
    ],
    [
      `${hscLabel} [3]`,
      isDiploma ? "4" : "5",
      formatReportNumber(report.final_result.academic_score || hscVal),
      formatReportNumber(academicWeight),
      formatReportNumber(report.final_result.academic_contribution || 0),
    ],
    [
      "SSC GPA [4]",
      "5",
      formatReportNumber(report.final_result.ssc_score || sscVal),
      formatReportNumber(sscWeight),
      formatReportNumber(report.final_result.ssc_contribution || 0),
    ],
    [
      { content: "Final Weighted Score [5]", styles: { fontStyle: "bold" as const } },
      "",
      "",
      { content: "100", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      {
        content: formatReportNumber(report.final_result.weighted_total),
        styles: { fontStyle: "bold" as const, halign: "center" as const },
      },
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: summaryHead,
    body: summaryBody,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [15, 23, 42],
      lineColor: [30, 41, 59],
      lineWidth: 0.5,
      cellPadding: 3.5,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 165 },
      1: { cellWidth: 80, halign: "center" },
      2: { cellWidth: 80, halign: "center" },
      3: { cellWidth: 95, halign: "center" },
      4: { cellWidth: 103, halign: "center" },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 14;

  // --- Final Score Box ---
  const boxWidth = 230;
  const boxHeight = 56;
  const boxX = (pageWidth - boxWidth) / 2;
  const boxY = y;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.0);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8, 8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Final Score: ${formatReportNumber(report.final_result.weighted_total)}/100`,
    pageWidth / 2,
    boxY + 16,
    { align: "center" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Pass Mark: ${formatReportNumber(report.final_result.threshold ?? 40)}`,
    pageWidth / 2,
    boxY + 31,
    { align: "center" },
  );

  const status = report.final_result.result_status || "ACCEPTED";
  const isAccepted = status === "SELECTED" || status === "ACCEPTED";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (isAccepted) {
    doc.setTextColor(21, 128, 61); // green
  } else if (status === "REJECTED") {
    doc.setTextColor(225, 29, 72); // rose
  } else {
    doc.setTextColor(180, 83, 9); // amber
  }
  doc.text(
    `Final Result: ${isAccepted ? "ACCEPTED" : status}`,
    pageWidth / 2,
    boxY + 47,
    { align: "center" },
  );

  y = boxY + boxHeight + 14;

  // --- Bottom Box: How Final Score is Calculated & Mark Distribution ---
  const bottomBoxWidth = pageWidth - marginX * 2;
  const bottomBoxHeight = 118;
  const bottomBoxX = marginX;
  const bottomBoxY = y;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.rect(bottomBoxX, bottomBoxY, bottomBoxWidth, bottomBoxHeight, "S");

  // Left Column: How Final Score is Calculated
  let leftY = bottomBoxY + 12;
  const leftX = bottomBoxX + 10;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("How the Final Score is Calculated", leftX, leftY);
  leftY += 11;

  doc.setFontSize(7.5);
  // Item 1
  doc.setFont("helvetica", "bolditalic");
  doc.text("1. Written Exam Contribution", leftX, leftY);
  leftY += 9;
  doc.setFont("helvetica", "italic");
  doc.text(`(Obtained written exam marks / Total written exam marks) * ${writtenWeight}`, leftX + 8, leftY);
  leftY += 10;

  // Item 2
  doc.setFont("helvetica", "bolditalic");
  doc.text("2. Viva Contribution", leftX, leftY);
  leftY += 9;
  doc.setFont("helvetica", "italic");
  doc.text(`(Obtained viva marks / Total viva marks) * ${vivaWeight}`, leftX + 8, leftY);
  leftY += 10;

  // Item 3
  doc.setFont("helvetica", "bolditalic");
  doc.text("3. SSC GPA Contribution", leftX, leftY);
  leftY += 9;
  doc.setFont("helvetica", "italic");
  doc.text(`(Obtained SSC GPA / 5) * ${sscWeight}`, leftX + 8, leftY);
  leftY += 10;

  // Item 4
  doc.setFont("helvetica", "bolditalic");
  doc.text(`4. ${hscLabel} Contribution`, leftX, leftY);
  leftY += 9;
  doc.setFont("helvetica", "italic");
  doc.text(`(Obtained ${hscLabel} / ${isDiploma ? 4 : 5}) * ${academicWeight}`, leftX + 8, leftY);
  leftY += 10;

  // Item 5
  doc.setFont("helvetica", "bolditalic");
  doc.text("5. Final Weighted Score", leftX, leftY);
  leftY += 9;
  doc.setFont("helvetica", "italic");
  doc.text("SSC GPA Contribution + HSC GPA Contribution + Written Exam Contribution + Viva Contribution", leftX + 8, leftY);

  // Right Column: Mark Distribution Table
  const rightTableX = bottomBoxX + bottomBoxWidth - 145;
  const rightTableY = bottomBoxY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Mark Distribution", rightTableX + 22, rightTableY + 6);

  const markDistBody = [
    ["Written", `${writtenWeight}%`],
    ["Viva", `${vivaWeight}%`],
    [isDiploma ? "Diploma" : "HSC", `${academicWeight}%`],
    ["SSC", `${sscWeight}%`],
    ["Total", "100%"],
  ];

  autoTable(doc, {
    startY: rightTableY + 10,
    body: markDistBody,
    margin: { left: rightTableX, right: bottomBoxX + 10 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [15, 23, 42],
      lineColor: [30, 41, 59],
      lineWidth: 0.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 55, halign: "center" },
    },
  });

  // Date at bottom right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatReportDate()}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 16, {
    align: "right",
  });

  const safeFilename = `Admission_Report_${(applicantName || "Student").replace(/\s+/g, "_")}_${serialId}.pdf`;
  doc.save(safeFilename);
}

// -------------------------------------------------------------
// 2. Template 2: AMS Individual Student Viva Report
// -------------------------------------------------------------
export async function downloadIndividualVivaReportPdf(report: StudentAdmissionDetailReport) {
  const logoDataUrl = await loadDiuLogoDataUrl();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const col1X = marginX + 4;
  const col2X = marginX + 265;

  let y = drawPdfHeader(doc, logoDataUrl, report, "Viva Examination Report");

  // Applicant & Viva Information
  doc.setFontSize(9);
  const applicantName = report.student.full_name || report.student.username;
  const serialId = report.student.application_serial || "N/A";

  // Line 1
  doc.setFont("helvetica", "normal");
  doc.text("Applicant Name", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(applicantName, col1X + 100, y);

  doc.setFont("helvetica", "normal");
  doc.text("Applicant Serial ID", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(serialId, col2X + 100, y);
  y += 14;

  // Line 2
  doc.setFont("helvetica", "normal");
  doc.text("Invigilator's Name", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.viva.teacher || "Invigilator_Name2", col1X + 100, y);

  doc.setFont("helvetica", "normal");
  doc.text("Room No.", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.viva.room || "KT-205", col2X + 100, y);
  y += 14;

  const vivaTotalMarks = getVivaTotalMarks(report);
  const vivaObtainedMarks = getVivaObtainedMarks(report);

  // Line 3
  doc.setFont("helvetica", "normal");
  doc.text("Exam Time", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatTimeOnly(report.viva.scheduled_at || report.viva.time), col1X + 100, y);

  doc.setFont("helvetica", "normal");
  doc.text("Total Marks", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatReportNumber(vivaTotalMarks), col2X + 100, y);
  y += 20;

  // Result Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Result Summary", marginX, y);
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  const rubricRows = report.viva.rubric_rows || [];
  const vivaBody: any[] = rubricRows.map((row) => [
    row.criteria,
    formatReportNumber(row.max_marks),
    formatReportNumber(row.awarded_marks),
  ]);

  if (vivaBody.length === 0) {
    vivaBody.push(
      ["Viva Assessment", formatReportNumber(vivaTotalMarks), formatReportNumber(vivaObtainedMarks)],
    );
  }

  // Final Score Row
  vivaBody.push([
    { content: "Final Score", styles: { fontStyle: "bold" as const } },
    { content: formatReportNumber(vivaTotalMarks), styles: { fontStyle: "bold" as const, halign: "center" as const } },
    { content: formatReportNumber(vivaObtainedMarks), styles: { fontStyle: "bold" as const, halign: "center" as const } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Assessment Criteria", "Total Score", "Obtained Score"]],
    body: vivaBody,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: [15, 23, 42],
      lineColor: [30, 41, 59],
      lineWidth: 0.5,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 323 },
      1: { cellWidth: 100, halign: "center" },
      2: { cellWidth: 100, halign: "center" },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 20;

  // Remarks
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Remarks : ${report.viva.remarks || ""}`, marginX, y);
  y += 35;

  // Final Score Box
  const boxWidth = 200;
  const boxHeight = 44;
  const boxX = (pageWidth - boxWidth) / 2;
  const boxY = y;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.0);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8, 8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Final Score: ${formatReportNumber(vivaObtainedMarks)}/${formatReportNumber(vivaTotalMarks)}`,
    pageWidth / 2,
    boxY + 27,
    { align: "center" },
  );

  // Date at bottom right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatReportDate()}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 16, {
    align: "right",
  });

  const safeFilename = `Viva_Report_${(applicantName || "Student").replace(/\s+/g, "_")}_${serialId}.pdf`;
  doc.save(safeFilename);
}

// -------------------------------------------------------------
// 3. Template 3: AMS Individual Student Written Report
// -------------------------------------------------------------
export async function downloadIndividualWrittenReportPdf(report: StudentAdmissionDetailReport) {
  const logoDataUrl = await loadDiuLogoDataUrl();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // Ensure unicode font support for Bengali / questions
  await ensureUnicodePdfFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const col1X = marginX + 4;
  const col2X = marginX + 265;

  let y = drawPdfHeader(doc, logoDataUrl, report, "Written Examination Report");

  // Applicant & Written Info
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.setFontSize(9);
  const applicantName = report.student.full_name || report.student.username;
  const serialId = report.student.application_serial || "N/A";
  const isDiploma = report.student.academic_type === "DIPLOMA";
  const hscLabel = isDiploma ? "Diploma GPA" : "HSC GPA";
  const hscVal = isDiploma
    ? formatReportNumber(report.student.diploma)
    : formatReportNumber(report.student.hsc);
  const sscVal = formatReportNumber(report.student.ssc);

  // Line 1
  doc.text("Applicant Name", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(applicantName, col1X + 100, y);

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Applicant Serial ID", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(serialId, col2X + 100, y);
  y += 13;

  // Line 2
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text(hscLabel, col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(hscVal, col1X + 100, y);

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("SSC GPA", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(sscVal, col2X + 100, y);
  y += 13;

  // Line 3
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Exam ID", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(`EXM${report.written_exam.exam_id}`, col1X + 100, y);

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Exam Duration", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(report.written_exam.duration_display || "50 Minutes", col2X + 100, y);
  y += 13;

  // Line 4
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Total Questions", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(String(report.written_summary.total_questions || 50), col1X + 100, y);

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Total Marks", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(formatReportNumber(report.written_summary.total_marks || 50), col2X + 100, y);
  y += 13;

  // Line 5
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Invigilator's Name", col1X, y);
  doc.text(":", col1X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(report.written_exam.assigned_teacher || "Invigilator_Name", col1X + 100, y);

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.text("Exam Time", col2X, y);
  doc.text(":", col2X + 90, y);
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.text(formatTimeOnly(report.written_exam.schedule_start_time), col2X + 100, y);
  y += 18;

  // Subject Summary
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.setFontSize(11);
  doc.text("Subject Summary", marginX, y);
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  const subjectSummary = report.subject_summary || [];
  const subjectBody: any[] = subjectSummary.map((sub) => [
    sub.subject_name,
    String(sub.correct_answers ?? ""),
    String(sub.wrong_answers ?? ""),
    String(sub.skipped_answers ?? ""),
    formatReportNumber(sub.total_marks),
    formatReportNumber(sub.obtained_marks),
  ]);

  subjectBody.push([
    { content: "Final Score", styles: { fontStyle: "bold" as const } },
    { content: String(report.written_summary.correct_answers || 0), styles: { fontStyle: "bold" as const, halign: "center" as const } },
    { content: String(report.written_summary.wrong_answers || 0), styles: { fontStyle: "bold" as const, halign: "center" as const } },
    { content: String(report.written_summary.skipped_answers || 0), styles: { fontStyle: "bold" as const, halign: "center" as const } },
    { content: formatReportNumber(report.written_summary.total_marks || 50), styles: { fontStyle: "bold" as const, halign: "center" as const } },
    { content: formatReportNumber(report.written_summary.obtained_marks || 0), styles: { fontStyle: "bold" as const, halign: "center" as const } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Subject Name", "Correct", "Wrong", "Skipped", "Total Score", "Obtained Score"]],
    body: subjectBody,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    styles: {
      font: UNICODE_PDF_FONT_FAMILY,
      fontSize: 8.5,
      textColor: [15, 23, 42],
      lineColor: [30, 41, 59],
      lineWidth: 0.5,
      cellPadding: 3.5,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 163 },
      1: { cellWidth: 60, halign: "center" },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 60, halign: "center" },
      4: { cellWidth: 85, halign: "center" },
      5: { cellWidth: 95, halign: "center" },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 14;

  // Final Score Box
  const boxWidth = 200;
  const boxHeight = 44;
  const boxX = (pageWidth - boxWidth) / 2;
  const boxY = y;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.0);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8, 8, "S");

  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Final Score: ${formatReportNumber(report.written_summary.obtained_marks || 0)}/${formatReportNumber(report.written_summary.total_marks || 50)}`,
    pageWidth / 2,
    boxY + 27,
    { align: "center" },
  );

  y = boxY + boxHeight + 20;

  // Answer Script Section
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
  doc.setFontSize(11);
  doc.text("Answer Script", marginX, y);
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  const questions = report.question_reviews || [];
  doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${report.written_summary.correct_answers || 0} correct, ${report.written_summary.wrong_answers || 0} wrong, ${report.written_summary.skipped_answers || 0} skipped across ${questions.length} questions.`,
    marginX,
    y,
  );
  y += 12;

  // Render question reviews
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 40;

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const cardHeight = 68 + (q.options && Object.keys(q.options).length > 0 ? 30 : 0);

    // Check if new page needed
    if (y + cardHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = 36;
      doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Answer Script (Continued)", marginX, y);
      y += 14;
    }

    // Card background
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(250, 250, 252);
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, y, pageWidth - marginX * 2, cardHeight, 4, 4, "FD");

    let cardY = y + 12;
    doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Q${idx + 1}. [${q.subject || "General"}] - ${q.status}`, marginX + 8, cardY);

    doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Type: ${q.question_type} | Marks: ${formatReportNumber(q.marks)}`, pageWidth - marginX - 12, cardY, {
      align: "right",
    });
    cardY += 12;

    // Question text
    doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const qTextLines = doc.splitTextToSize(q.question_text || "", pageWidth - marginX * 2 - 20);
    doc.text(qTextLines.slice(0, 2), marginX + 8, cardY);
    cardY += Math.min(qTextLines.length, 2) * 10 + 2;

    // Options if any
    if (q.options && Object.keys(q.options).length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const optStr = Object.entries(q.options)
        .map(([k, v]) => `${k}. ${v}`)
        .join("   |   ");
      doc.text(doc.splitTextToSize(optStr, pageWidth - marginX * 2 - 20).slice(0, 1), marginX + 8, cardY);
      cardY += 11;
    }

    // Answers line
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Student: `, marginX + 8, cardY);
    doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatAnswerDisplay(q.student_answer), marginX + 46, cardY);

    const corrX = marginX + 250;
    doc.setFont(UNICODE_PDF_FONT_FAMILY, "normal");
    doc.setTextColor(21, 128, 61);
    doc.text(`Correct: `, corrX, cardY);
    doc.setFont(UNICODE_PDF_FONT_FAMILY, "bold");
    doc.text(formatCorrectAnswersDisplay(q.correct_answers), corrX + 42, cardY);

    y += cardHeight + 8;
  }

  // Date at bottom right of last page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatReportDate()}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 16, {
    align: "right",
  });

  const safeFilename = `Written_Report_${(applicantName || "Student").replace(/\s+/g, "_")}_${serialId}.pdf`;
  doc.save(safeFilename);
}
