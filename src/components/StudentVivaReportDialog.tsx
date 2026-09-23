import { type StudentAdmissionDetailReport } from "../lib/student-report";
import { StudentAdmissionReportDialog } from "./StudentAdmissionReportDialog";

export interface StudentVivaReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: StudentAdmissionDetailReport | null;
  examId?: number | null;
  studentId?: number | null;
  studentName?: string;
}

export function StudentVivaReportDialog({
  open,
  onOpenChange,
  report,
  examId,
  studentId,
  studentName,
}: StudentVivaReportDialogProps) {
  return (
    <StudentAdmissionReportDialog
      open={open}
      onOpenChange={onOpenChange}
      report={report}
      examId={examId}
      studentId={studentId}
      studentName={studentName}
      initialTab="viva"
    />
  );
}
