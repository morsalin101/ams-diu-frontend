import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Mic, PenTool, X, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import { downloadDomAsPdf } from "../lib/dom-to-pdf";
import { type StudentAdmissionDetailReport } from "../lib/student-report";
import { admissionResultsAPI } from "../services/api";
import { StudentAdmissionReportContent } from "./StudentAdmissionReportContent";
import { StudentVivaReportContent } from "./StudentVivaReportContent";
import { StudentWrittenReportContent } from "./StudentWrittenReportContent";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

export type ReportTab = "admission" | "written" | "viva";

export interface StudentAdmissionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId?: number | null;
  studentId?: number | null;
  studentName?: string;
  report?: StudentAdmissionDetailReport | null;
  initialTab?: ReportTab;
}

export function StudentAdmissionReportDialog({
  open,
  onOpenChange,
  examId,
  studentId,
  studentName,
  report: reportProp,
  initialTab = "admission",
}: StudentAdmissionReportDialogProps) {
  const [internalReport, setInternalReport] = useState<StudentAdmissionDetailReport | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const report = reportProp || internalReport;

  // Sync activeTab when modal opens or initialTab changes
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || "admission");
    }
  }, [open, initialTab]);

  // Load report data if not provided as prop
  useEffect(() => {
    if (!open) {
      return;
    }

    if (reportProp) {
      setInternalReport(reportProp);
      return;
    }

    if (!examId || !studentId) {
      return;
    }

    let isMounted = true;

    const loadReport = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await admissionResultsAPI.getStudentDetailReport(examId, studentId);
        if (!isMounted) {
          return;
        }

        setInternalReport(response?.data || null);
      } catch (reportError: any) {
        if (!isMounted) {
          return;
        }

        console.error("Error loading student admission report:", reportError);
        setInternalReport(null);
        setError(reportError?.message || "Failed to load student report");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [open, examId, studentId, reportProp]);

  // Download action corresponding to the currently active report tab
  const applicantName =
    report?.student?.full_name || report?.student?.username || studentName || "Candidate";
  const serialId = report?.student?.application_serial || "";

  const handleDownload = async () => {
    if (!report) return;
    setIsDownloading(true);
    
    let filename = `Report_${(applicantName || "Student").replace(/\s+/g, "_")}_${serialId}.pdf`;
    if (activeTab === "admission") filename = `Admission_${filename}`;
    if (activeTab === "written") filename = `Written_${filename}`;
    if (activeTab === "viva") filename = `Viva_${filename}`;

    try {
      await downloadDomAsPdf("report-pdf-content", filename);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-[92vw] md:w-[850px] lg:w-[860px] max-w-[860px] h-[92vh] max-h-[92vh] overflow-hidden p-0 flex flex-col gap-0 border-slate-300 shadow-2xl rounded-xl bg-slate-100 sm:max-w-[860px] [&>button]:hidden">
        {/* Accessible Dialog Title for screen readers & Radix UI */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            {activeTab === "admission"
              ? "Student Admission Report"
              : activeTab === "written"
                ? "Written Examination Report"
                : "Viva Examination Report"}
          </DialogTitle>
          <DialogDescription>
            {applicantName
              ? `Detailed candidate assessment report for ${applicantName}`
              : "Detailed candidate assessment report"}
          </DialogDescription>
        </DialogHeader>

        {/* Polished, Space-Efficient Top Bar */}
        <div className="bg-gradient-to-r from-[#1c1e5a] via-[#242777] to-[#2E3094] text-white px-3 sm:px-5 py-2.5 sm:py-3 border-b border-indigo-950/40 flex-shrink-0 shadow-md">
          {/* Top Row: Title, Subtitle, Download Action, and Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-blue-200 border border-white/10 shadow-inner">
                {activeTab === "admission" ? (
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : activeTab === "written" ? (
                  <PenTool className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {activeTab === "admission"
                      ? "Student Admission Report"
                      : activeTab === "written"
                        ? "Written Examination Report"
                        : "Viva Examination Report"}
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-blue-100/80 truncate">
                  {applicantName}
                  {serialId ? ` • Serial: ${serialId}` : ""}
                </p>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={!report || isDownloading || isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3.5 shadow-sm border border-emerald-400/30 transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-[#1c1e5a]"
                aria-label="Download PDF report"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">Download</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white/80 hover:text-white hover:bg-white/15 h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {/* Segmented Tab Switcher Row */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="inline-flex w-full sm:w-auto p-0.5 sm:p-1 bg-black/25 backdrop-blur-sm rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("admission")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "admission"
                    ? "bg-white text-[#202272] shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Admission Report</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("written")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "written"
                    ? "bg-white text-[#202272] shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Written Report</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("viva")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "viva"
                    ? "bg-white text-[#202272] shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Viva Report</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[11px] text-blue-200/70">
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>

        {/* Scrollable Document Area: Fills width efficiently without extra empty padding */}
        <ScrollArea className="flex-1 w-full overflow-y-auto bg-slate-200/70">
          <div className="p-2 sm:p-4 md:p-5 flex justify-center w-full min-h-full">
            {isLoading ? (
              <div className="flex min-h-[380px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#2E3094]" />
                  <p className="text-sm font-medium text-slate-700">Loading student report...</p>
                </div>
              </div>
            ) : error ? (
              <Card className="border-rose-200 bg-rose-50 max-w-xl mx-auto my-12 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4 text-rose-700">
                  <XCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Could not load this report</p>
                    <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : !report ? (
              <Card className="border-slate-200 bg-slate-50 max-w-xl mx-auto my-12 shadow-sm">
                <CardContent className="p-6 text-center text-sm text-slate-600">
                  No report data is available for this student yet.
                </CardContent>
              </Card>
            ) : (
              /* The Paper Sheet Container: Designed to match authentic A4 document styling with zero horizontal waste */
              <div 
                id="report-pdf-content"
                className="w-full max-w-[700px] bg-white border border-slate-300/80 rounded-lg shadow-md p-3.5 sm:p-6 md:p-8 text-slate-900 transition-all"
              >
                {activeTab === "admission" && <StudentAdmissionReportContent report={report} />}
                {activeTab === "written" && <StudentWrittenReportContent report={report} />}
                {activeTab === "viva" && <StudentVivaReportContent report={report} />}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
