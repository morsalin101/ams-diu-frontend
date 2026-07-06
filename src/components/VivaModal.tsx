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
  Eye,
  FileText,
} from 'lucide-react';
import { vivaMarksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface VivaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentResult: any;
  onVivaMarksAdded: () => void;
  onViewWrittenResult?: () => void;
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
  onViewWrittenResult,
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
    // Round to 2dp so float sums like 0.1+0.2 don't send 7.30000000000001.
    setVivaMarks(prev => ({ ...prev, marks: Math.round(total * 100) / 100 }));
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
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 md:h-auto md:max-h-[92vh] md:w-[92vw] md:max-w-[820px] md:gap-1.5 md:rounded-lg md:p-6 lg:w-[94vw] lg:max-w-[960px] xl:max-w-[1080px] 2xl:max-w-[1180px] [&>button]:hidden">
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <ClipboardList className="h-5 w-5 text-[#2E3094]" />
                  Assessment Rubrics
                </h2>
                {onViewWrittenResult && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onViewWrittenResult}
                    className="ml-auto h-9 shrink-0 whitespace-nowrap border-[#2E3094]/30 px-3 text-xs font-semibold text-[#2E3094] hover:bg-[#2E3094]/5"
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    Written Result
                  </Button>
                )}
              </div>

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
          {/* Header */}
          <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 lg:px-6 lg:py-5">
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 lg:h-12 lg:w-12">
                <Award className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-800 lg:text-xl">
                  Viva Assessment:{' '}
                  <span className="text-indigo-900">
                    {studentResult.student_name}
                  </span>
                </h2>
                <p className="truncate text-xs text-slate-500 sm:text-sm">
                  {isVivaCompleted
                    ? 'Update viva marks and assessment'
                    : 'Complete the assessment rubrics for this student'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 lg:gap-4">
              <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 sm:flex lg:px-4">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                  {studentResult.exam_details.department}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {studentResult.exam_details.semester}
                </span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            </div>
          </header>

          {/* Body */}
          <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-slate-50/60 p-4 lg:flex-row lg:gap-5 lg:p-5 xl:gap-6 custom-scrollbar">
            {/* Left Sidebar */}
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[240px] xl:w-[260px]">
              {/* Written Score Card */}
              <div
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5"
                data-purpose="written-score-card"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Written Score
                  </h3>
                  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                    {studentResult.results.correct_answers} /{' '}
                    {studentResult.exam_details.total_questions} Correct
                  </span>
                </div>
                <div className="mb-3 text-3xl font-black text-indigo-900 lg:text-4xl">
                  {studentResult.results.score_percentage.toFixed(1)}%
                </div>
                <hr className="mb-3 border-gray-100" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      Viva Status
                    </h3>
                    {isVivaCompleted ? (
                      <span className="inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                        <Award className="mr-1 h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  {isVivaCompleted ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-100/50 bg-emerald-50/30 p-3">
                      <span className="text-sm font-bold text-emerald-700">
                        Current Marks
                      </span>
                      <div className="text-base font-bold text-emerald-800">
                        {studentResult.viva_marks.marks}{' '}
                        <span className="text-xs font-medium text-emerald-600/60">
                          / {totalMaxMarks}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-100/50 bg-amber-50/30 p-3">
                      <p className="text-xs font-medium leading-relaxed text-amber-700">
                        Assessment incomplete. Fill out the rubrics on the
                        right side to finalize grading.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks Section */}
              <div
                className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5"
                data-purpose="remarks-card"
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">
                      Overall Remarks
                    </h3>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Optional
                  </span>
                </div>
                <div className="relative flex-1 p-3">
                  <Textarea
                    id="remarks-desktop"
                    placeholder="Record observations, student strengths, and areas for improvement..."
                    value={vivaMarks.remarks}
                    onChange={e =>
                      setVivaMarks(prev => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    className="min-h-[120px] h-full w-full resize-none rounded-xl border border-gray-200 bg-slate-50/50 p-3 text-sm text-slate-600 placeholder:text-slate-300 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </aside>

            {/* Main Content - Rubrics */}
            <section
              className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-100 bg-gray-50/50 p-4 lg:p-4 xl:p-5"
              data-purpose="rubrics-section"
            >
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400">
                    <ClipboardList className="h-4 w-4 lg:h-5 lg:w-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 lg:text-lg">
                    Assessment Rubrics
                  </h2>
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Total Marks{' '}
                  <span className="ml-2 text-base font-black text-indigo-900 lg:text-lg">
                    {vivaMarks.marks}{' '}
                    <span className="text-xs font-bold text-slate-400">
                      / {totalMaxMarks}
                    </span>
                  </span>
                </div>
              </header>

              {/* Rubrics List */}
              <div
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 lg:space-y-3"
                data-purpose="rubrics-list"
              >
                {loadingRubrics ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-gray-400">
                    <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
                    <p>Loading assessment rubrics...</p>
                  </div>
                ) : rubrics.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-gray-400">
                    <AlertTriangle className="mb-3 h-8 w-8 text-yellow-400 lg:h-10 lg:w-10" />
                    <p className="font-medium text-gray-600">
                      No rubrics available
                    </p>
                    <p className="text-sm">
                      Please configure rubrics for this department.
                    </p>
                  </div>
                ) : (
                  rubrics.map(rubric => {
                    const currentMarks =
                      vivaMarks.rubrics_marks[rubric.id] || 0;
                    const percentage =
                      rubric.marks > 0
                        ? Math.min((currentMarks / rubric.marks) * 100, 100)
                        : 0;
                    const isFull = currentMarks === rubric.marks && rubric.marks > 0;
                    return (
                      <div
                        key={rubric.id}
                        className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md lg:p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3 lg:mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-bold text-slate-800">
                              {rubric.rubrics}
                            </h4>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {rubric.department_shortname} Module
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 lg:px-3 lg:py-1.5">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={rubricInputs[rubric.id] ?? ''}
                              onChange={e =>
                                handleRubricMarksChange(rubric.id, e.target.value)
                              }
                              className="h-6 w-12 border-0 bg-transparent p-0 text-right text-base font-bold text-slate-800 shadow-none focus-visible:ring-0"
                              placeholder="0"
                            />
                            <span className="ml-1 text-xs text-slate-400">
                              / {rubric.marks}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full transition-all duration-300 ease-out ${isFull ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${percentage}%` }}
                            data-purpose="progress-bar"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-3 lg:px-6 lg:py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-gray-50 hover:text-slate-800 lg:px-6"
              data-purpose="cancel-button"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            {rubrics.length > 0 && (
              <Button
                onClick={handleSaveVivaMarks}
                disabled={isLoading}
                className="h-10 rounded-lg bg-indigo-900 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-950 lg:px-6"
                data-purpose="submit-button"
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
            )}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}