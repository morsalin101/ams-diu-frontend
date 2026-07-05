'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Loader2,
  Award,
  ClipboardList,
  MessageSquare,
  Save,
  X,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { vivaMarksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface VivaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentResult: any;
  onVivaMarksAdded: () => void;
}

interface Rubric {
  id: number;
  department: number;
  department_name: string;
  department_shortname: string;
  rubrics: string;
  marks: number;
}

interface VivaMarksData {
  marks: number;
  rubrics_marks: { [key: string]: number };
  remarks: string;
}

interface SaveFeedback {
  tone: 'success' | 'warning';
  message: string;
  weightedTotal?: number;
  resultStatus?: string;
}

export function VivaModal({
  open,
  onOpenChange,
  studentResult,
  onVivaMarksAdded,
}: VivaModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);

  // Form state
  const [vivaMarks, setVivaMarks] = useState<VivaMarksData>({
    marks: 0,
    rubrics_marks: {},
    remarks: '',
  });
  // Raw text for each rubric input so partial/decimal entries (e.g. "3." or
  // "3.5") type smoothly without being coerced back to an integer.
  const [rubricInputs, setRubricInputs] = useState<{ [key: string]: string }>({});

  // Load rubrics when modal opens
  useEffect(() => {
    if (open && studentResult && user?.department_details?.id) {
      loadRubrics();
      // Reset form
      const existingRubricMarks = studentResult.viva_marks?.rubrics_marks || {};
      setVivaMarks({
        marks: studentResult.viva_marks?.marks || 0,
        rubrics_marks: existingRubricMarks,
        remarks: studentResult.viva_marks?.remarks || '',
      });
      setRubricInputs(
        Object.fromEntries(
          Object.entries(existingRubricMarks).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      );
      setSaveFeedback(null);
    }
  }, [open, studentResult, user?.department_details?.id]);

  // Calculate total marks from rubrics
  useEffect(() => {
    const total = Object.values(vivaMarks.rubrics_marks).reduce(
      (sum: number, mark: number) => sum + (mark || 0),
      0,
    );
    setVivaMarks(prev => ({ ...prev, marks: total }));
  }, [vivaMarks.rubrics_marks]);

  const loadRubrics = async () => {
    if (!user?.department_details?.id) {
      toast.error('Department information not available');
      return;
    }

    try {
      setLoadingRubrics(true);
      // Use the teacher's department ID from authentication data
      const departmentId = user.department_details.id;
      console.log('Loading rubrics for department ID:', departmentId);

      const response = await vivaMarksAPI.getRubricsByDepartment(departmentId);

      if (response && response.success) {
        setRubrics(response.rubrics || []);
        console.log('Loaded rubrics:', response.rubrics);
      } else {
        setRubrics([]);
        toast.error(response?.message || 'Failed to load rubrics');
      }
    } catch (error: any) {
      console.error('Error loading rubrics:', error);
      toast.error(error.message || 'Failed to load rubrics');
      setRubrics([]);
    } finally {
      setLoadingRubrics(false);
    }
  };

  const handleRubricMarksChange = (rubricId: number, rawValue: string) => {
    // Accept only a valid decimal-in-progress: digits with at most one dot.
    // This lets teachers type either integers or floats (e.g. "4" or "3.5").
    if (rawValue !== '' && !/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    const rubric = rubrics.find(r => r.id === rubricId);
    const numeric = rawValue === '' ? 0 : parseFloat(rawValue);

    if (rubric && !Number.isNaN(numeric) && numeric > rubric.marks) {
      toast.error(
        `Marks cannot exceed maximum of ${rubric.marks} for ${rubric.rubrics}`,
      );
      return;
    }

    setRubricInputs(prev => ({ ...prev, [rubricId]: rawValue }));
    setVivaMarks(prev => ({
      ...prev,
      rubrics_marks: {
        ...prev.rubrics_marks,
        [rubricId]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }));
  };

  const handleSaveVivaMarks = async () => {
    if (!studentResult) return;

    // Validation
    if (vivaMarks.marks < 0) {
      toast.error('Total marks cannot be negative');
      return;
    }

    try {
      setIsLoading(true);
      setSaveFeedback(null);

      console.log('Sending viva marks data:', {
        student_id: studentResult.student_id,
        marks_data: vivaMarks,
      });

      const response = await vivaMarksAPI.addVivaMarks(
        studentResult.student_id,
        {
          ...vivaMarks,
          exam_id: studentResult.exam_id,
        },
      );

      if (response?.success || response?.viva_saved) {
        const refreshedResult = response?.recalculated_result;
        const successMessage = refreshedResult
          ? `Viva saved. Total ${refreshedResult.weighted_total_marks}, status ${refreshedResult.result_status}.`
          : response?.message || 'Viva marks saved successfully';
        setSaveFeedback({
          tone: response?.success ? 'success' : 'warning',
          message: response?.message || successMessage,
          weightedTotal: refreshedResult?.weighted_total_marks,
          resultStatus: refreshedResult?.result_status,
        });

        if (response?.success) {
          toast.success(successMessage);
          onVivaMarksAdded();
          onOpenChange(false);
        } else {
          toast.success(response?.message || successMessage);
          onVivaMarksAdded();
        }
      } else {
        toast.error(response?.message || 'Failed to save viva marks');
      }
    } catch (error: any) {
      console.error('Error saving viva marks:', error);
      toast.error(error.message || 'Failed to save viva marks');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalMaxMarks = () => {
    return rubrics.reduce((total, rubric) => total + rubric.marks, 0);
  };

  const getMarksColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-purple-600';
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!studentResult) return null;

  const isVivaCompleted = studentResult.viva_marks?.marks > 0;
  const totalMaxMarks = getTotalMaxMarks();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 md:h-auto md:max-h-[92vh] md:w-[94vw] md:max-w-[94vw] md:gap-1.5 md:rounded-lg md:p-6 xl:max-w-[1400px]">
        {/* Mobile layout */}
        <div className="flex h-full min-h-0 flex-col md:hidden">
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2E3094] hover:bg-slate-100 active:scale-90"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight text-[#2E3094]">
                  {studentResult.student_name}
                </h1>
                <p className="truncate text-xs text-slate-500">
                  {isVivaCompleted ? 'Update' : 'Give'} Viva Marks •{' '}
                  {studentResult.exam_details.semester}
                </p>
              </div>
            </div>
            {isVivaCompleted ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                <Award className="h-3.5 w-3.5" />
                Completed
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pending
              </span>
            )}
          </header>

          <main className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50 px-4 py-6">
            {/* Summary */}
            <section className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Written Score
                </span>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-[#2E3094]">
                    {studentResult.results.score_percentage.toFixed(1)}%
                  </span>
                  <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5">
                    <span className="text-[11px] font-medium text-slate-600">
                      {studentResult.results.correct_answers} /{' '}
                      {studentResult.exam_details.total_questions} Correct
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#2E3094] p-4 shadow-md">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Current Viva
                </span>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-white">
                    {vivaMarks.marks}
                  </span>
                  <span className="text-base font-semibold text-white/60">
                    {' '}
                    / {totalMaxMarks}
                  </span>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-[#FFB59D] transition-all duration-500"
                      style={{
                        width: `${totalMaxMarks > 0 ? Math.min((vivaMarks.marks / totalMaxMarks) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Rubrics */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <ClipboardList className="h-5 w-5 text-[#2E3094]" />
                Assessment Rubrics
              </h2>

              {loadingRubrics ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center text-slate-400">
                  <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#2E3094]" />
                  <p className="text-sm">Loading assessment rubrics...</p>
                </div>
              ) : rubrics.length === 0 ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-slate-400">
                  <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
                  <p className="text-sm font-medium text-slate-600">
                    No rubrics available
                  </p>
                  <p className="text-xs">
                    Please configure rubrics for this department.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rubrics.map(rubric => (
                    <div
                      key={rubric.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-snug text-slate-900">
                            {rubric.rubrics}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                            {rubric.department_shortname} Module
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={rubricInputs[rubric.id] ?? ''}
                            onChange={e =>
                              handleRubricMarksChange(rubric.id, e.target.value)
                            }
                            placeholder="0"
                            className="h-11 w-16 border-slate-300 text-center text-lg font-bold text-[#2E3094] focus-visible:ring-[#2E3094]"
                          />
                          <span className="text-sm font-semibold text-slate-400">
                            / {rubric.marks}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Remarks */}
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">
                  Overall Remarks
                </h2>
                <span className="ml-auto text-xs text-slate-400">(Optional)</span>
              </div>
              <Textarea
                rows={4}
                value={vivaMarks.remarks}
                onChange={e =>
                  setVivaMarks(prev => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Record observations, student strengths, and areas for improvement..."
                className="resize-none rounded-xl border-slate-200 bg-slate-50 text-sm"
              />
            </section>
          </main>

          {/* Footer actions */}
          <div className="flex flex-shrink-0 items-center gap-3 border-t border-slate-200 bg-white p-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-12 flex-1 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVivaMarks}
              disabled={isLoading || rubrics.length === 0}
              className="h-12 flex-[2] rounded-xl bg-[#2E3094] font-semibold text-white hover:bg-[#1E2078]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isVivaCompleted ? 'Update Marks' : 'Save Marks'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-slate-200/80 mt-1">
          <DialogTitle className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#2E3094]/10 p-2.5 rounded-xl">
                <Award className="h-6 w-6 text-[#2E3094]" />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[22px] font-extrabold text-slate-800 tracking-tight">
                  Viva Assessment:{' '}
                  <span className="text-[#2E3094]">
                    {studentResult.student_name}
                  </span>
                </span>
                <span className="text-[13px] font-semibold text-slate-500">
                  {isVivaCompleted
                    ? 'Update viva marks and assessment'
                    : 'Complete the assessment rubrics for this student'}
                </span>
              </div>
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm self-start md:self-auto mr-4">
              <span className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                {studentResult.exam_details.department}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">
                {studentResult.exam_details.semester}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 mt-2 overflow-y-auto overflow-x-hidden pr-1">
          <div className="w-full lg:w-[300px] min-w-0 flex flex-col gap-3">
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#556987] uppercase tracking-wider mb-2">
                      Written Score
                    </h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-[#2E3094]">
                        {studentResult.results.score_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#F4F7FB] rounded-full px-3 py-1.5 text-xs font-bold text-[#2E3094] border border-[#E5E9F5]">
                    {studentResult.results.correct_answers} /{' '}
                    {studentResult.exam_details.total_questions} Correct
                  </div>
                </div>

                <div className="h-px bg-[#E5E9F5] w-full"></div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[11px] font-bold text-[#556987] uppercase tracking-wider">
                      Viva Status
                    </h4>
                    {isVivaCompleted ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-none px-2.5 py-0.5 font-semibold">
                        <Award className="h-3.5 w-3.5 mr-1.5" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-600 border border-amber-200 shadow-none px-2.5 py-0.5 font-semibold"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                        Pending
                      </Badge>
                    )}
                  </div>

                  {isVivaCompleted ? (
                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
                      <p className="font-bold text-emerald-800 text-sm">
                        Current Marks
                      </p>
                      <div className="flex items-end gap-1">
                        <span
                          className={`text-2xl font-extrabold ${getMarksColor(studentResult.viva_marks.marks, totalMaxMarks)}`}
                        >
                          {studentResult.viva_marks.marks}
                        </span>
                        <span className="text-sm text-slate-400 font-bold mb-0.5">
                          / {totalMaxMarks}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                      <p className="text-sm text-amber-700 font-medium leading-relaxed">
                        Assessment incomplete. Fill out the rubrics on the right
                        side to finalize grading.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-slate-100 bg-white">
                <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-700">
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                  </div>
                  Overall Remarks{' '}
                  <span className="text-slate-400 font-medium text-xs ml-1">
                    (Optional)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <Textarea
                  id="remarks"
                  placeholder="Record observations, student strengths, and areas for improvement..."
                  value={vivaMarks.remarks}
                  onChange={e =>
                    setVivaMarks(prev => ({ ...prev, remarks: e.target.value }))
                  }
                  className="flex-1 min-h-[140px] resize-none border-0 focus-visible:ring-0 rounded-none bg-transparent p-5 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </CardContent>
            </Card>

            {saveFeedback && (
              <Card
                className={
                  saveFeedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm'
                    : 'border-amber-200 bg-amber-50 rounded-2xl shadow-sm'
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {saveFeedback.tone === 'success' ? (
                      <Award className="h-5 w-5 text-emerald-700 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p
                        className={
                          saveFeedback.tone === 'success'
                            ? 'font-medium text-emerald-800'
                            : 'font-medium text-amber-800'
                        }
                      >
                        {saveFeedback.message}
                      </p>
                      {(saveFeedback.weightedTotal !== undefined ||
                        saveFeedback.resultStatus) && (
                        <p
                          className={
                            saveFeedback.tone === 'success'
                              ? 'text-sm text-emerald-700'
                              : 'text-sm text-amber-700'
                          }
                        >
                          {saveFeedback.weightedTotal !== undefined
                            ? `Updated total: ${saveFeedback.weightedTotal}`
                            : null}
                          {saveFeedback.weightedTotal !== undefined &&
                          saveFeedback.resultStatus
                            ? ' | '
                            : null}
                          {saveFeedback.resultStatus
                            ? `Result status: ${saveFeedback.resultStatus}`
                            : null}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="w-full lg:w-2/3 min-w-0 flex flex-col min-h-0">
            <Card className="flex flex-col border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden min-h-0">
              <CardHeader className="py-5 px-6 border-b border-slate-100 bg-white flex flex-row items-center justify-between flex-shrink-0">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                  </div>
                  Assessment Rubrics
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Marks
                  </span>
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-xl font-extrabold ${vivaMarks.marks === 0 ? 'text-red-500' : 'text-[#2E3094]'}`}
                    >
                      {vivaMarks.marks}
                    </span>
                    <span className="text-slate-400 font-bold text-sm mb-[2px]">
                      / {totalMaxMarks}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 overflow-y-auto p-4">
                {loadingRubrics ? (
                  <div className="min-h-[320px] flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                    <p>Loading assessment rubrics...</p>
                  </div>
                ) : rubrics.length === 0 ? (
                  <div className="min-h-[320px] flex flex-col items-center justify-center text-gray-400">
                    <AlertTriangle className="h-10 w-10 text-yellow-400 mb-4" />
                    <p className="text-gray-600 font-medium">
                      No rubrics available
                    </p>
                    <p className="text-sm">
                      Please configure rubrics for this department.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rubrics.map(rubric => (
                      <div
                        key={rubric.id}
                        className="group border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 mt-1">
                            <h4 className="font-semibold text-gray-800 text-base leading-tight mb-1">
                              {rubric.rubrics}
                            </h4>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                              {rubric.department_shortname} Module
                            </p>
                          </div>
                          <div className="flex items-center justify-end w-32 shrink-0">
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={rubricInputs[rubric.id] ?? ''}
                                onChange={e =>
                                  handleRubricMarksChange(
                                    rubric.id,
                                    e.target.value,
                                  )
                                }
                                className="w-20 pr-8 text-right font-semibold text-lg border-gray-300 focus-visible:ring-blue-500 h-11"
                                placeholder="0"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                                /{rubric.marks}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ease-out ${(vivaMarks.rubrics_marks[rubric.id] || 0) === rubric.marks ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{
                              width: `${Math.min(((vivaMarks.rubrics_marks[rubric.id] || 0) / rubric.marks) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 mt-2 bg-white">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-32 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl h-11"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {rubrics.length > 0 && (
            <Button
              onClick={handleSaveVivaMarks}
              disabled={isLoading}
              className="w-48 bg-[#2E3094] hover:bg-[#1E2078] text-white font-bold shadow-md hover:shadow-lg rounded-xl h-11"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isVivaCompleted ? 'Update Marks' : 'Save Marks'}
                </>
              )}
            </Button>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}