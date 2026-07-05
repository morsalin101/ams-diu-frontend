import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  Filter,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { usePermissions } from '../hooks/usePermissions';
import { MathText } from '../components/MathText';
import {
  QuestionEditorFields,
  type EditableQuestion,
} from '../components/ScrappedQuestionEditor';
import { examAPI } from '../services/api';

interface QuestionBankItem {
  id: number;
  subject: string;
  questions: unknown;
  type: 'option' | 'text';
  text?: string | null;
  options?: unknown;
  answer?: unknown;
  marks: number;
  semester: string;
  department_shortname: string;
}

interface DeleteQuestionsProps {
  gradientClass?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pickDisplayValue(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return (
    value.english ??
    value.both ??
    value.bangla ??
    Object.values(value).find(item => {
      if (Array.isArray(item)) {
        return item.length > 0;
      }

      if (isRecord(item)) {
        return Object.keys(item).length > 0;
      }

      return item !== null && item !== undefined && String(item).trim() !== '';
    }) ??
    ''
  );
}

function stringifyDisplayValue(value: unknown): string {
  const displayValue = pickDisplayValue(value);

  if (displayValue === null || displayValue === undefined) {
    return '';
  }

  if (typeof displayValue === 'string') {
    return displayValue;
  }

  if (typeof displayValue === 'number' || typeof displayValue === 'boolean') {
    return String(displayValue);
  }

  if (Array.isArray(displayValue)) {
    return displayValue
      .map(item => stringifyDisplayValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (isRecord(displayValue)) {
    return Object.values(displayValue)
      .map(item => stringifyDisplayValue(item))
      .filter(Boolean)
      .join(', ');
  }

  return String(displayValue);
}

function getQuestionText(question: QuestionBankItem) {
  return stringifyDisplayValue(parseOptions(question.questions));
}

// Separate language variants for the preview (empty string when absent).
function getQuestionLanguages(question: QuestionBankItem) {
  const parsed = parseOptions(question.questions);
  const record = isRecord(parsed) ? parsed : {};
  return {
    bangla: typeof record.bangla === 'string' ? record.bangla.trim() : '',
    english: typeof record.english === 'string' ? record.english.trim() : '',
  };
}

const EDIT_ENG_KEYS = ['A', 'B', 'C', 'D'];
const EDIT_BANG_KEYS = ['ক', 'খ', 'গ', 'ঘ'];
const BENGALI_CHARS = /[ঀ-৿]/;

// The question bank holds two generations of data: the current
// {both, english} structure and flat legacy shapes ({"A": "..."} records,
// arrays, plain answer lists). Adapt anything into the editor's shape.
function adaptOptionsForEdit(raw: unknown): {
  both: Record<string, string>;
  english: Record<string, string>;
} {
  const parsed = parseOptions(raw);

  if (isRecord(parsed) && (isRecord(parsed.both) || isRecord(parsed.english))) {
    return {
      both: isRecord(parsed.both) ? (parsed.both as Record<string, string>) : {},
      english: isRecord(parsed.english) ? (parsed.english as Record<string, string>) : {},
    };
  }

  if (Array.isArray(parsed)) {
    const english: Record<string, string> = {};
    parsed.slice(0, 4).forEach((value, index) => {
      english[EDIT_ENG_KEYS[index]] = stringifyDisplayValue(value);
    });
    return { both: {}, english };
  }

  if (isRecord(parsed)) {
    const keys = Object.keys(parsed);
    if (keys.some(key => EDIT_BANG_KEYS.includes(key.trim()))) {
      const both: Record<string, string> = {};
      keys.forEach(key => {
        both[key.trim()] = stringifyDisplayValue(parsed[key]);
      });
      return { both, english: {} };
    }
    const english: Record<string, string> = {};
    keys.forEach(key => {
      english[key.trim().toUpperCase()] = stringifyDisplayValue(parsed[key]);
    });
    return { both: {}, english };
  }

  return { both: {}, english: {} };
}

function adaptAnswerForEdit(
  raw: unknown,
  options: { both: Record<string, string>; english: Record<string, string> },
): { both: string[]; english: string[] } {
  const parsed = parseOptions(raw);

  if (isRecord(parsed) && ('both' in parsed || 'english' in parsed)) {
    const toList = (value: unknown) =>
      Array.isArray(value) ? value.map(item => stringifyDisplayValue(item)).filter(Boolean) : [];
    return { both: toList(parsed.both), english: toList(parsed.english) };
  }

  const values = Array.isArray(parsed)
    ? parsed.map(item => stringifyDisplayValue(item)).filter(Boolean)
    : stringifyDisplayValue(parsed)
      ? [stringifyDisplayValue(parsed)]
      : [];

  const both: string[] = [];
  const english: string[] = [];
  values.forEach(value => {
    const token = value.trim();
    if (EDIT_BANG_KEYS.includes(token)) {
      both.push(token);
      return;
    }
    if (EDIT_ENG_KEYS.includes(token.toUpperCase())) {
      english.push(token.toUpperCase());
      return;
    }
    // Legacy answers sometimes store the option text instead of the key.
    const englishKey = Object.entries(options.english).find(
      ([, optionValue]) => optionValue.trim().toLowerCase() === token.toLowerCase(),
    )?.[0];
    if (englishKey) english.push(englishKey);
    const banglaKey = Object.entries(options.both).find(
      ([, optionValue]) => optionValue.trim().toLowerCase() === token.toLowerCase(),
    )?.[0];
    if (banglaKey) both.push(banglaKey);
  });

  return { both: both.slice(0, 1), english: english.slice(0, 1) };
}

function getAnswerValues(answer: unknown): string[] {
  const displayAnswer = pickDisplayValue(parseOptions(answer));

  if (Array.isArray(displayAnswer)) {
    return displayAnswer
      .map(item => stringifyDisplayValue(item))
      .filter(Boolean);
  }

  if (isRecord(displayAnswer)) {
    return Object.values(displayAnswer)
      .map(item => stringifyDisplayValue(item))
      .filter(Boolean);
  }

  const answerText = stringifyDisplayValue(displayAnswer);
  return answerText ? [answerText] : [];
}

// Tolerates both JSON strings and Python-repr strings ({'both': ...}, None,
// True/False) — same approach as BlockedQuestions, which handles this data.
function parseOptions(options: unknown): unknown {
  if (typeof options !== 'string') {
    return options;
  }

  const trimmed = options.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return options;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(
        trimmed
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
          .replace(/'/g, '"'),
      );
    } catch {
      return options;
    }
  }
}

function compareQuestions(
  left: QuestionBankItem,
  right: QuestionBankItem,
  sortBy: 'id' | 'subject' | 'marks' | 'semester',
  order: 'asc' | 'desc',
) {
  const direction = order === 'asc' ? 1 : -1;

  if (sortBy === 'subject') {
    return left.subject.localeCompare(right.subject) * direction;
  }

  if (sortBy === 'marks') {
    return (left.marks - right.marks) * direction;
  }

  if (sortBy === 'semester') {
    return left.semester.localeCompare(right.semester) * direction;
  }

  return (left.id - right.id) * direction;
}

export function DeleteQuestions({ gradientClass = '' }: DeleteQuestionsProps) {
  const { canRead, canWrite, canDelete } = usePermissions();
  const hasReadAccess = canRead();
  const hasWriteAccess = canWrite();
  const hasDeleteAccess = canDelete();

  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [marksFilter, setMarksFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'id' | 'subject' | 'marks' | 'semester'>(
    'id',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewQuestion, setPreviewQuestion] =
    useState<QuestionBankItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editDraft, setEditDraft] = useState<EditableQuestion | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditDialog = (question: QuestionBankItem) => {
    let { bangla, english } = getQuestionLanguages(question);
    if (!bangla && !english) {
      // Legacy rows store the question as one plain string.
      const merged = getQuestionText(question);
      if (BENGALI_CHARS.test(merged)) {
        bangla = merged;
      } else {
        english = merged;
      }
    }

    const options = adaptOptionsForEdit(question.options);
    setEditingQuestion(question);
    setEditDraft({
      subject: question.subject ?? '',
      question_bangla: bangla,
      question_english: english,
      options,
      answer: adaptAnswerForEdit(question.answer, options),
      semester: question.semester ?? '',
      department: question.department_shortname ?? 'CSE',
      qno: question.id,
    });
  };

  const closeEditDialog = () => {
    setEditingQuestion(null);
    setEditDraft(null);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion || !editDraft) return;

    setIsSavingEdit(true);
    try {
      const bangla = editDraft.question_bangla.trim();
      const english = editDraft.question_english.trim();
      const response = await examAPI.updateQuestionBankItem(editingQuestion.id, {
        subject: editDraft.subject.trim(),
        question_bangla: bangla,
        question_english: english,
        question_both: english ? `${bangla} (${english})`.trim() : bangla,
        options: editDraft.options,
        answer: editDraft.answer,
        semester: editDraft.semester.trim(),
        department: (editDraft.department || 'CSE').trim(),
      });

      if (response?.success === false) {
        throw response;
      }

      toast.success('Question updated successfully');
      closeEditDialog();
      await loadQuestions();
    } catch (error: any) {
      console.error('Error updating question:', error);
      const issues = Array.isArray(error?.issues) ? ` ${error.issues.join(' ')}` : '';
      toast.error((error?.message || 'Failed to update question') + issues, { duration: 8000 });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await examAPI.getQuestionBank();
      const nextQuestions = response?.questions || [];
      setQuestions(nextQuestions);
      setSelectedQuestionIds([]);
    } catch (error: any) {
      console.error('Error loading question bank:', error);
      toast.error(error?.message || 'Failed to load question bank');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasReadAccess) {
      loadQuestions();
    }
  }, [hasReadAccess]);

  useEffect(() => {
    setSelectedQuestionIds([]);
  }, [
    searchTerm,
    subjectFilter,
    semesterFilter,
    departmentFilter,
    typeFilter,
    marksFilter,
    sortBy,
    sortOrder,
  ]);

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...questions]
      .filter(question => {
        const questionText = getQuestionText(question).toLowerCase();
        const matchesSearch =
          !normalizedSearch ||
          questionText.includes(normalizedSearch) ||
          question.subject.toLowerCase().includes(normalizedSearch) ||
          question.semester.toLowerCase().includes(normalizedSearch) ||
          question.department_shortname
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(question.id).includes(normalizedSearch);

        const matchesSubject =
          subjectFilter === 'all' || question.subject === subjectFilter;
        const matchesSemester =
          semesterFilter === 'all' || question.semester === semesterFilter;
        const matchesDepartment =
          departmentFilter === 'all' ||
          question.department_shortname === departmentFilter;
        const matchesType =
          typeFilter === 'all' || question.type === typeFilter;
        const matchesMarks =
          marksFilter === 'all' || String(question.marks) === marksFilter;

        return (
          matchesSearch &&
          matchesSubject &&
          matchesSemester &&
          matchesDepartment &&
          matchesType &&
          matchesMarks
        );
      })
      .sort((left, right) => compareQuestions(left, right, sortBy, sortOrder));
  }, [
    questions,
    searchTerm,
    subjectFilter,
    semesterFilter,
    departmentFilter,
    typeFilter,
    marksFilter,
    sortBy,
    sortOrder,
  ]);

  const uniqueSubjects = useMemo(
    () =>
      Array.from(new Set(questions.map(question => question.subject))).sort(),
    [questions],
  );
  const uniqueSemesters = useMemo(
    () =>
      Array.from(new Set(questions.map(question => question.semester))).sort(),
    [questions],
  );
  const uniqueDepartments = useMemo(
    () =>
      Array.from(
        new Set(questions.map(question => question.department_shortname)),
      ).sort(),
    [questions],
  );
  const uniqueMarks = useMemo(
    () =>
      Array.from(new Set(questions.map(question => question.marks)))
        .sort((left, right) => left - right)
        .map(String),
    [questions],
  );

  const selectedVisibleIds = filteredQuestions
    .map(question => question.id)
    .filter(id => selectedQuestionIds.includes(id));
  const allVisibleSelected =
    filteredQuestions.length > 0 &&
    selectedVisibleIds.length === filteredQuestions.length;

  const clearFilters = () => {
    setSearchTerm('');
    setSubjectFilter('all');
    setSemesterFilter('all');
    setDepartmentFilter('all');
    setTypeFilter('all');
    setMarksFilter('all');
    setSortBy('id');
    setSortOrder('desc');
  };

  const toggleQuestion = (questionId: number, checked: boolean) => {
    setSelectedQuestionIds(currentIds => {
      if (checked) {
        return [...new Set([...currentIds, questionId])];
      }

      return currentIds.filter(id => id !== questionId);
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds(currentIds => [
        ...new Set([
          ...currentIds,
          ...filteredQuestions.map(question => question.id),
        ]),
      ]);
      return;
    }

    const visibleIdSet = new Set(
      filteredQuestions.map(question => question.id),
    );
    setSelectedQuestionIds(currentIds =>
      currentIds.filter(id => !visibleIdSet.has(id)),
    );
  };

  const handleDeleteSingle = async (question: QuestionBankItem) => {
    if (!hasDeleteAccess) {
      toast.error('You do not have permission to delete questions.');
      return;
    }

    const confirmed = window.confirm(
      `Delete question #${question.id} permanently from the question bank?`,
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await examAPI.deleteQuestionBankItem(question.id);
      toast.success(`Question #${question.id} deleted successfully.`);
      setQuestions(currentQuestions =>
        currentQuestions.filter(item => item.id !== question.id),
      );
      setSelectedQuestionIds(currentIds =>
        currentIds.filter(id => id !== question.id),
      );
      if (previewQuestion?.id === question.id) {
        setPreviewQuestion(null);
      }
    } catch (error: any) {
      console.error('Error deleting question-bank item:', error);
      toast.error(error?.message || 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasDeleteAccess) {
      toast.error('You do not have permission to delete questions.');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      toast.error('Select at least one question to delete.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedQuestionIds.length} selected question(s) permanently from the question bank?`,
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const response =
        await examAPI.bulkDeleteQuestionBankItems(selectedQuestionIds);
      const deletedIds = response?.deleted_ids || selectedQuestionIds;

      setQuestions(currentQuestions =>
        currentQuestions.filter(question => !deletedIds.includes(question.id)),
      );
      setSelectedQuestionIds([]);
      if (previewQuestion && deletedIds.includes(previewQuestion.id)) {
        setPreviewQuestion(null);
      }

      toast.success(
        response?.message ||
          `Deleted ${deletedIds.length} question(s) successfully.`,
      );
    } catch (error: any) {
      console.error('Error bulk deleting question-bank items:', error);
      toast.error(error?.message || 'Failed to delete selected questions');
    } finally {
      setIsDeleting(false);
    }
  };

  const previewOptionSets = previewQuestion
    ? adaptOptionsForEdit(previewQuestion.options)
    : { both: {}, english: {} };
  const previewAdaptedAnswer = previewQuestion
    ? adaptAnswerForEdit(previewQuestion.answer, previewOptionSets)
    : { both: [], english: [] };
  const buildPreviewOptions = (map: Record<string, string>, answerKeys: string[]) =>
    Object.entries(map)
      .map(([key, value]) => ({
        key,
        value: stringifyDisplayValue(value),
        isCorrect: answerKeys.includes(key),
      }))
      .filter(option => option.value);
  const previewBanglaOptions = buildPreviewOptions(previewOptionSets.both, previewAdaptedAnswer.both);
  const previewEnglishOptions = buildPreviewOptions(previewOptionSets.english, previewAdaptedAnswer.english);
  const renderPreviewOptionSet = (
    title: string,
    options: { key: string; value: string; isCorrect: boolean }[],
  ) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-gray-500 uppercase">{title}</Label>
      {options.map(option => (
        <div
          key={`${title}-${option.key}`}
          className={`rounded-md border p-3 text-sm ${
            option.isCorrect
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <div className="flex flex-wrap items-start gap-2">
            <span className="font-semibold">{option.key}.</span>
            <span className="flex-1 min-w-0 break-words">
              <MathText text={String(option.value ?? '')} />
            </span>
            {option.isCorrect ? (
              <Badge variant="outline" className="text-green-700 bg-green-100 border-green-300">
                Correct
              </Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
  const previewAnswers = previewQuestion
    ? getAnswerValues(previewQuestion.answer)
    : [];
  const previewAnswerText =
    previewAnswers.length > 0
      ? previewAnswers.join(', ')
      : stringifyDisplayValue(previewQuestion?.text);

  if (!hasReadAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
      <Card className="gap-0 border-2 border-gray-200">
        <CardHeader className="py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-3 space-y-3 sm:px-5 sm:space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="question-search">Search</Label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  id="question-search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search by question text, subject, semester, department, or ID"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {uniqueSemesters.map(semester => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {uniqueDepartments.map(department => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="option">Multiple choice</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marks</Label>
              <Select value={marksFilter} onValueChange={setMarksFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All marks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All marks</SelectItem>
                  {uniqueMarks.map(marks => (
                    <SelectItem key={marks} value={marks}>
                      {marks}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(
                  value: 'id' | 'subject' | 'marks' | 'semester',
                ) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">ID</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="marks">Marks</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Order</Label>
              <Select
                value={sortOrder}
                onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
              <Button
                variant="outline"
                onClick={loadQuestions}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {hasDeleteAccess && (
              <Button
                onClick={handleBulkDelete}
                disabled={selectedQuestionIds.length === 0 || isDeleting}
                className="text-white bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Selected ({selectedQuestionIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasDeleteAccess ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You can view question-bank items here, but delete actions are
            disabled for your role.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading question bank...</p>
          </div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card className="border-2 border-gray-300 border-dashed">
          <CardContent className="py-8 text-center">
            <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-600">
              No Questions Found
            </h3>
            <p className="text-gray-500">
              {questions.length === 0
                ? 'No reusable question-bank items are available yet.'
                : 'No question-bank items match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden border-2 border-gray-200 lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={checked =>
                            toggleAllVisible(Boolean(checked))
                          }
                          disabled={
                            !hasDeleteAccess || filteredQuestions.length === 0
                          }
                          aria-label="Select all visible questions"
                        />
                      </TableHead>
                      <TableHead>SL</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead className="text-center">Details</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question, index) => {
                      const isChecked = selectedQuestionIds.includes(
                        question.id,
                      );

                      return (
                        <TableRow key={question.id}>
                          <TableCell>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={checked =>
                                toggleQuestion(question.id, Boolean(checked))
                              }
                              disabled={!hasDeleteAccess}
                              aria-label={`Select question ${question.id}`}
                            />
                          </TableCell>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            #{question.id}
                          </TableCell>
                          <TableCell className="max-w-xl">
                            <div className="text-sm text-gray-800 line-clamp-2">
                              <MathText text={getQuestionText(question)} />
                            </div>
                          </TableCell>
                          <TableCell>{question.subject}</TableCell>
                          <TableCell>{question.semester}</TableCell>
                          <TableCell>{question.department_shortname}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {question.type === 'option' ? 'MCQ' : 'Text'}
                            </Badge>
                          </TableCell>
                          <TableCell>{question.marks}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                              onClick={() => setPreviewQuestion(question)}
                              title={`View question #${question.id} details`}
                              aria-label={`View question ${question.id} details`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="ml-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => openEditDialog(question)}
                              disabled={!hasWriteAccess}
                              title={`Edit question #${question.id}`}
                              aria-label={`Edit question ${question.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteSingle(question)}
                              disabled={!hasDeleteAccess || isDeleting}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filteredQuestions.map(question => {
              const isChecked = selectedQuestionIds.includes(question.id);

              return (
                <Card key={question.id} className="border-2 border-gray-200">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={checked =>
                          toggleQuestion(question.id, Boolean(checked))
                        }
                        disabled={!hasDeleteAccess}
                        aria-label={`Select question ${question.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">#{question.id}</Badge>
                          <Badge variant="outline">{question.subject}</Badge>
                          <Badge variant="secondary">
                            {question.marks} marks
                          </Badge>
                          <Badge variant="outline">
                            {question.type === 'option' ? 'MCQ' : 'Text'}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium text-gray-800 break-words">
                          <MathText text={getQuestionText(question)} />
                        </p>

                        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-gray-700">
                              Semester:
                            </span>{' '}
                            {question.semester}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Department:
                            </span>{' '}
                            {question.department_shortname}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                            onClick={() => setPreviewQuestion(question)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                            onClick={() => openEditDialog(question)}
                            disabled={!hasWriteAccess}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteSingle(question)}
                            disabled={!hasDeleteAccess || isDeleting}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(previewQuestion)}
        onOpenChange={open => {
          if (!open) {
            setPreviewQuestion(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
          {previewQuestion ? (
            <>
              <DialogHeader>
                <DialogTitle>Question Details</DialogTitle>
                <DialogDescription>
                  Review the full question before deleting it from the question
                  bank.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">#{previewQuestion.id}</Badge>
                  <Badge variant="outline">{previewQuestion.subject}</Badge>
                  <Badge variant="outline">{previewQuestion.semester}</Badge>
                  <Badge variant="outline">
                    {previewQuestion.department_shortname}
                  </Badge>
                  <Badge variant="secondary">
                    {previewQuestion.type === 'option' ? 'MCQ' : 'Text'}
                  </Badge>
                  <Badge variant="secondary">
                    {previewQuestion.marks} marks
                  </Badge>
                </div>

                {(() => {
                  const { bangla, english } = getQuestionLanguages(previewQuestion);
                  if (!bangla && !english) {
                    return (
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-800">Question</Label>
                        <div className="p-3 border rounded-md bg-gray-50">
                          <p className="text-sm leading-relaxed text-gray-800 break-words whitespace-pre-wrap">
                            <MathText text={getQuestionText(previewQuestion) || 'No question text available.'} />
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {bangla ? (
                        <div className="space-y-2">
                          <Label className="font-semibold text-gray-800">Question (Bangla)</Label>
                          <div className="p-3 border rounded-md bg-gray-50">
                            <p className="text-sm leading-relaxed text-gray-800 break-words whitespace-pre-wrap">
                              <MathText text={bangla} />
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {english ? (
                        <div className="space-y-2">
                          <Label className="font-semibold text-gray-800">Question (English)</Label>
                          <div className="p-3 border rounded-md bg-gray-50">
                            <p className="text-sm leading-relaxed text-gray-800 break-words whitespace-pre-wrap">
                              <MathText text={english} />
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {previewQuestion.type === 'option' ? (
                  <div className="space-y-4">
                    <Label className="font-semibold text-gray-800">
                      Options
                    </Label>
                    {previewBanglaOptions.length > 0 || previewEnglishOptions.length > 0 ? (
                      <>
                        {previewBanglaOptions.length > 0
                          ? renderPreviewOptionSet('Options (ক / খ / গ / ঘ)', previewBanglaOptions)
                          : null}
                        {previewEnglishOptions.length > 0
                          ? renderPreviewOptionSet('English options (A / B / C / D)', previewEnglishOptions)
                          : null}
                      </>
                    ) : (
                      <p className="p-3 text-sm text-gray-600 border rounded-md bg-gray-50">
                        No options available.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label className="font-semibold text-gray-800">
                    {previewQuestion.type === 'option'
                      ? 'Answer'
                      : 'Text Answer'}
                  </Label>
                  <div className="p-3 bg-white border rounded-md">
                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                      {previewAnswerText || 'No answer available.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingQuestion)}
        onOpenChange={open => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
          {editingQuestion && editDraft ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Question #{editingQuestion.id}</DialogTitle>
                <DialogDescription>
                  Update the question and save. Changes are validated with the
                  same rules as question inserts.
                </DialogDescription>
              </DialogHeader>

              <QuestionEditorFields
                question={editDraft}
                radioGroupId={`edit-${editingQuestion.id}`}
                onChange={setEditDraft}
              />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={closeEditDialog} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
