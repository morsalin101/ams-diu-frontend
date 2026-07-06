import jsPDF from "jspdf";

import diuLogo from "../assets/diu-logo.png";
import { formatSemesterLabel } from "./semester";

let logoDataUrlPromise: Promise<string> | null = null;

export function formatReportDate(value = new Date()) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function loadDiuLogoDataUrl() {
  if (logoDataUrlPromise) {
    return logoDataUrlPromise;
  }

  logoDataUrlPromise = fetch(diuLogo)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to load logo"));
          reader.readAsDataURL(blob);
        }),
    );

  return logoDataUrlPromise;
}

export function drawDiuPdfChrome(
  doc: jsPDF,
  {
    logoDataUrl,
    semester,
    facultyName,
    departmentName,
    dateLabel = formatReportDate(),
    rightLabel,
  }: {
    logoDataUrl: string;
    semester: string;
    facultyName: string;
    departmentName: string;
    dateLabel?: string;
    rightLabel?: string;
  },
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const marginX = 26;
  const logoWidth = 62;
  const logoX = centerX - logoWidth / 2;

  doc.addImage(logoDataUrl, "PNG", logoX, 22, logoWidth, 62);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Daffodil International University", centerX, 102, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Admission Test Result, ${formatSemesterLabel(semester)}`, centerX, 122, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Faculty of ${facultyName}`, centerX, 140, { align: "center" });
  doc.text(`Department of ${departmentName}`, centerX, 156, {
    align: "center",
  });
  doc.text(`Exam Date: ${dateLabel}`, centerX, 172, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (rightLabel) {
    doc.text(rightLabel, pageWidth - marginX, 18, { align: "right" });
  }
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - marginX, pageHeight - 12, {
    align: "right",
  });
  // Generated-on stamp, bottom-left (always today, distinct from the exam date above).
  doc.text(formatReportDate(), marginX, pageHeight - 12, { align: "left" });
}

type Signatory = {
  name: string;
  details: string[];
};

export const RESULT_SHEET_SIGNATORIES: Signatory[] = [
  {
    name: "Md. Abbas Ali Khan",
    details: [
      "Convener, Admission Test Committee, FSIT",
      "Assistant Professor",
      "Department of Computer Science and Engineering",
      "Daffodil International University",
    ],
  },
  {
    name: "Professor Dr. Sheak Rashed Haider Noori",
    details: [
      "Professor & Head",
      "Department of Computer Science and Engineering",
      "Daffodil International University",
    ],
  },
  {
    name: "Professor Dr. Md. Fokhray Hossain",
    details: [
      "Dean & Professor",
      "Faculty of Science and Information Technology",
      "Daffodil International University",
    ],
  },
];

const SIGNATURE_LAYOUT = {
  marginX: 26,
  columnGap: 8,
  signatureLineHeight: 30, // vertical space reserved for the handwritten signature above the line
  signatureLineLength: 110, // length of the underline below the signature
  // Distance from the line to the name's baseline. jsPDF renders text with
  // the y-coordinate as the baseline, so the top of the letters extends ~7pt
  // above the baseline for a 9pt font. We need this gap to be larger than the
  // ascent + a small margin so the name appears clearly *under* the line.
  signatureGapAfterLine: 11,
  // Single-line requirement: every detail must fit on one line inside its
  // column, so font sizes are tuned to keep the longest lines (e.g.
  // "Department of Computer Science and Engineering") on a single line.
  nameSize: 9,
  nameGap: 14,
  detailSize: 7,
  lineHeight: 13,
  bottomPadding: 6,
} as const;

function getColumnGeometry(pageWidth: number) {
  const usableWidth = pageWidth - SIGNATURE_LAYOUT.marginX * 2;
  const columnCount = RESULT_SHEET_SIGNATORIES.length;
  const columnWidth =
    (usableWidth - SIGNATURE_LAYOUT.columnGap * (columnCount - 1)) / columnCount;
  return { columnWidth, columnCount };
}

/**
 * Total height (in pt) occupied by the signature block. Used to decide whether
 * the block fits on the current page or needs to be pushed to a new page.
 *
 * Each signatory's details are rendered on a single line per row, so the
 * height only depends on the signatory with the most detail rows.
 */
export function getSignatureBlockHeight(doc: jsPDF): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { columnWidth } = getColumnGeometry(pageWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(SIGNATURE_LAYOUT.detailSize);

  // Sanity-check that every detail line actually fits inside its column at
  // the current font size. If a line is too long, log a warning so the caller
  // can spot configuration drift early.
  RESULT_SHEET_SIGNATORIES.forEach((signatory) => {
    signatory.details.forEach((line) => {
      const width = doc.getTextWidth(line);
      if (width > columnWidth) {
        console.warn(
          `Signatory detail exceeds column width: "${line}" (${width.toFixed(
            1,
          )}pt > ${columnWidth.toFixed(1)}pt)`,
        );
      }
    });
  });

  const maxDetails = Math.max(
    ...RESULT_SHEET_SIGNATORIES.map((signatory) => signatory.details.length),
  );

  return (
    SIGNATURE_LAYOUT.signatureLineHeight +
    SIGNATURE_LAYOUT.signatureGapAfterLine +
    SIGNATURE_LAYOUT.nameGap +
    maxDetails * SIGNATURE_LAYOUT.lineHeight +
    SIGNATURE_LAYOUT.bottomPadding
  );
}

/**
 * Render the signature block starting at `startY`. The block is laid out as
 * N equal-width columns (one per signatory) side by side. Each column has:
 *   - a horizontal line marking where the handwritten signature goes
 *   - the signatory's name (bold, centered, single line)
 *   - the signatory's designation details (normal, centered, single line)
 *
 * Each row is rendered as a single line — if a string does not fit it will
 * overflow visually rather than wrap, by design.
 *
 * Caller is responsible for choosing a Y that fits (use
 * `getSignatureBlockHeight` to check before).
 */
export function drawSignatureBlock(
  doc: jsPDF,
  startY: number,
  {
    marginX = SIGNATURE_LAYOUT.marginX,
    columnGap = SIGNATURE_LAYOUT.columnGap,
    signatureLineHeight = SIGNATURE_LAYOUT.signatureLineHeight,
    signatureLineLength = SIGNATURE_LAYOUT.signatureLineLength,
    signatureGapAfterLine = SIGNATURE_LAYOUT.signatureGapAfterLine,
    nameSize = SIGNATURE_LAYOUT.nameSize,
    nameGap = SIGNATURE_LAYOUT.nameGap,
    detailSize = SIGNATURE_LAYOUT.detailSize,
    lineHeight = SIGNATURE_LAYOUT.lineHeight,
  }: {
    marginX?: number;
    columnGap?: number;
    signatureLineHeight?: number;
    signatureLineLength?: number;
    signatureGapAfterLine?: number;
    nameSize?: number;
    nameGap?: number;
    detailSize?: number;
    lineHeight?: number;
  } = {},
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginX * 2;
  const columnCount = RESULT_SHEET_SIGNATORIES.length;
  const columnWidth = (usableWidth - columnGap * (columnCount - 1)) / columnCount;

  const signatureLineY = startY + signatureLineHeight;
  const nameY = signatureLineY + signatureGapAfterLine;
  const firstDetailY = nameY + nameGap;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.setTextColor(15, 23, 42);

  RESULT_SHEET_SIGNATORIES.forEach((signatory, index) => {
    const columnX = marginX + index * (columnWidth + columnGap);
    const centerX = columnX + columnWidth / 2;

    // Signature underline
    doc.line(
      centerX - signatureLineLength / 2,
      signatureLineY,
      centerX + signatureLineLength / 2,
      signatureLineY,
    );

    // Name (bold, centered, single line)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameSize);
    doc.text(signatory.name, centerX, nameY, { align: "center" });

    // Details (normal, centered, single line — no wrap)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(detailSize);
    let detailY = firstDetailY;
    signatory.details.forEach((line) => {
      doc.text(line, centerX, detailY, { align: "center" });
      detailY += lineHeight;
    });
  });
}
