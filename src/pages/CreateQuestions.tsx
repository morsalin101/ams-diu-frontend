import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Settings, Building, Loader2, FileText, Plus, Trash2, Save, RefreshCw, AlertTriangle, BookOpen, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { examAPI, subjectAPI, subjectDepartmentAPI, subjectFacultyAPI, departmentAPI, facultyAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { buildAcademicSemesterOptions } from '../lib/semester';
import { MathText } from '../components/MathText';
import toast from 'react-hot-toast';

interface CreateQuestionsProps {
  gradientClass: string;
}

interface Subject {
  id: number;
  subject_name: string;
  created_at: string;
}

interface Question {
  id: number;
  question_text?: string | string[] | Record<string, string>;
  questions?: string | string[] | Record<string, string>; // Backend might use either field
  subject: string;
  type: string;
  options?: string[] | string | Record<string, string>;
  answer: string | string[];
  marks: number;
}

interface MissingQuestionSlot {
  subject: string;
  marks: number;
}

interface ExamConfig {
  semester: string;
  duration_minutes: number | '';
  language: string;
  faculty: string;
}

interface DepartmentOption {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface FacultyOption {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
}

export function CreateQuestions({ gradientClass: _gradientClass }: CreateQuestionsProps) {
  const { user } = useAuth();
  const { canWrite, canRead } = usePermissions();

  const userAccessType = (user?.access_type || '').toUpperCase();
  const isSuperAdmin = user?.role_details?.role_name === 'superadmin' || user?.is_global_access || userAccessType === 'GLOBAL';
  const isFacultyUser = userAccessType === 'FACULTY' || Boolean(user?.faculty_details?.id && !user?.department_details?.id);
  const isDepartmentUser = !isSuperAdmin && !isFacultyUser;
  
  // State management
  const [examType, setExamType] = useState<'SCHEDULED' | 'CENTRAL'>('SCHEDULED');
  const [departmentList, setDepartmentList] = useState<DepartmentOption[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(user?.department_details?.id || null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(user?.faculty_details?.id || null);

  const [departmentSubjects, setDepartmentSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Array<{ subject: string; marks: number }>>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [excludedQuestions, setExcludedQuestions] = useState<number[]>([]);
  const [missingQuestionSlots, setMissingQuestionSlots] = useState<MissingQuestionSlot[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [examSaved, setExamSaved] = useState(false);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<number | null>(null);
  const [isRefillingMissingQuestions, setIsRefillingMissingQuestions] = useState(false);

  // Exam configuration
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    semester: '',
    duration_minutes: '',
    language: 'english',
    faculty: 'FSIT'
  });

  // Dialog states
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockingQuestion, setBlockingQuestion] = useState<Question | null>(null);
  const [blockRemarks, setBlockRemarks] = useState('');

  const faculties = ['FSIT', 'ENGINEERING'];
  const languages = ['english', 'both'];
  const semesters = buildAcademicSemesterOptions();

  // Load faculties and departments for dropdowns
  useEffect(() => {
    const loadOrgEntities = async () => {
      try {
        const [depRes, facRes] = await Promise.all([
          departmentAPI.getAllDepartments(),
          facultyAPI.getAllFaculties(),
        ]);
        if (depRes?.data) setDepartmentList(depRes.data);
        if (facRes?.data) setFacultyList(facRes.data);
      } catch (err) {
        console.error('Failed to load departments/faculties:', err);
      }
    };
    loadOrgEntities();
  }, []);

  // Sync initial department / faculty IDs when user loads
  useEffect(() => {
    if (user?.department_details?.id && !selectedDepartmentId) {
      setSelectedDepartmentId(user.department_details.id);
    }
    if (user?.faculty_details?.id && !selectedFacultyId) {
      setSelectedFacultyId(user.faculty_details.id);
    }
  }, [user]);

  // Load subjects whenever examType or selected target changes
  useEffect(() => {
    if (examType === 'SCHEDULED') {
      const deptId = selectedDepartmentId || user?.department_details?.id;
      if (deptId) {
        loadDepartmentSubjects(deptId);
      } else {
        setDepartmentSubjects([]);
      }
    } else {
      const facId = selectedFacultyId || user?.faculty_details?.id;
      if (facId) {
        loadFacultySubjects(facId);
      } else {
        setDepartmentSubjects([]);
      }
    }
  }, [examType, selectedDepartmentId, selectedFacultyId, user]);

  const getLanguageLabel = (language: string) => {
    if (language === 'both') {
      return 'Both (Bangla & English)';
    }

    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  const getValidatedDurationMinutes = () => {
    if (examConfig.duration_minutes === '') {
      toast.error('Please enter exam duration');
      return null;
    }

    if (examConfig.duration_minutes < 5 || examConfig.duration_minutes > 500) {
      toast.error('Duration must be between 5 and 500 minutes');
      return null;
    }

    return examConfig.duration_minutes;
  };

  // Load subjects for a department (inherited via parent faculty)
  const loadDepartmentSubjects = async (departmentId: number) => {
    try {
      setIsLoadingSubjects(true);
      const response = await subjectDepartmentAPI.getDepartmentSubjects(departmentId);
      
      let subjectList: any[] = [];
      if (response && (response.success !== false)) {
        const data = response.data || response;
        if (data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0) {
          subjectList = data.subjects;
        } else if (data.subject_ids && data.subject_ids.length > 0) {
          const allSubjectsResponse = await subjectAPI.getAllSubjects();
          const allSubjects = allSubjectsResponse.success ? allSubjectsResponse.data : allSubjectsResponse;
          subjectList = (allSubjects || []).filter((subject: any) => 
            data.subject_ids.includes(subject.id)
          );
        }
      }

      // If department has no mapped subjects, fallback to user's assigned faculty
      if (subjectList.length === 0 && (user?.faculty_details?.id || user?.faculty_id)) {
        const facultyId = user.faculty_details?.id || user.faculty_id;
        try {
          const facRes = await subjectFacultyAPI.getFacultySubjects(facultyId);
          if (facRes && facRes.success && facRes.data) {
            if (facRes.data.subjects && Array.isArray(facRes.data.subjects)) {
              subjectList = facRes.data.subjects;
            } else if (facRes.data.subject_ids) {
              const allSubjectsResponse = await subjectAPI.getAllSubjects();
              const allSubjects = allSubjectsResponse.success ? allSubjectsResponse.data : allSubjectsResponse;
              subjectList = (allSubjects || []).filter((s: any) => facRes.data.subject_ids.includes(s.id));
            }
          }
        } catch {
          // ignore fallback error
        }
      }

      if (subjectList.length > 0) {
        setDepartmentSubjects(subjectList);
      } else {
        setDepartmentSubjects([]);
        toast('No subjects mapped to this department or its faculty');
      }
    } catch (error: any) {
      console.error('Error loading department subjects:', error);
      toast.error('Failed to load department subjects');
      
      try {
        const subjectsResponse = await subjectAPI.getAllSubjects();
        const allSubjects = subjectsResponse.success ? subjectsResponse.data : subjectsResponse;
        setDepartmentSubjects(allSubjects);
      } catch {
        setDepartmentSubjects([]);
      }
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Load subjects mapped to a faculty (for Central exam)
  const loadFacultySubjects = async (facultyId: number) => {
    try {
      setIsLoadingSubjects(true);
      const facRes = await subjectFacultyAPI.getFacultySubjects(facultyId);
      let subjectIds: number[] = [];
      if (facRes && facRes.success && facRes.data?.subject_ids) {
        subjectIds = facRes.data.subject_ids;
      }

      if (subjectIds.length > 0) {
        const allSubjectsResponse = await subjectAPI.getAllSubjects();
        const allSubjects = allSubjectsResponse.success ? allSubjectsResponse.data : allSubjectsResponse;
        const filteredSubjects = allSubjects.filter((subject: any) => 
          subjectIds.includes(subject.id)
        );
        setDepartmentSubjects(filteredSubjects);
      } else {
        setDepartmentSubjects([]);
        toast('No subjects mapped to this faculty');
      }
    } catch (error: any) {
      console.error('Error loading faculty subjects:', error);
      toast.error('Failed to load faculty subjects');
      setDepartmentSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Generate exam questions
  const handleCreateExam = async () => {
    if (examType === 'SCHEDULED' && !selectedDepartmentId && !user?.department_details?.id) {
      toast.error('Please select a department');
      return;
    }

    if (examType === 'CENTRAL' && !selectedFacultyId && !user?.faculty_details?.id) {
      toast.error('Please select a faculty');
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    if (!examConfig.semester) {
      toast.error('Please select a semester');
      return;
    }

    const invalidSubjects = selectedSubjects.filter(s => !s.subject || s.marks <= 0);
    if (invalidSubjects.length > 0) {
      toast.error('Please fill in all subject details with valid marks');
      return;
    }

    const durationMinutes = getValidatedDurationMinutes();
    if (durationMinutes === null) return;

    try {
      setIsLoading(true);
      const effectiveDeptId = examType === 'SCHEDULED' ? (selectedDepartmentId || user?.department_details?.id) : undefined;
      const effectiveFacId = examType === 'CENTRAL' ? (selectedFacultyId || user?.faculty_details?.id) : undefined;
      const chosenFaculty = facultyList.find(f => f.id === effectiveFacId);

      const examData = {
        exam_type: examType,
        department_id: effectiveDeptId,
        faculty_id: effectiveFacId,
        semester: examConfig.semester,
        duration_minutes: durationMinutes,
        language: examConfig.language,
        faculty: chosenFaculty ? chosenFaculty.faculty_shortname : examConfig.faculty,
        subjects: selectedSubjects,
        regenerate: false,
        exclude_questions: []
      };

      const response = await examAPI.generateExam(examData);
      if (response && response.success) {
        const questions = response.data?.questions || [];
        setGeneratedQuestions(questions);
        setMissingQuestionSlots([]);
        setShowQuestions(true);
        setExamSaved(false);
        toast.success(`Generated ${questions.length} questions`);
      } else {
        toast.error(response.message || 'Failed to generate questions');
      }
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast.error(error.message || 'Failed to create exam');
    } finally {
      setIsLoading(false);
    }
  };

  // Save exam
  const handleSaveExam = async () => {
    if (generatedQuestions.length === 0) return;

    if (!examConfig.semester) {
      toast.error('Please select a semester');
      return;
    }

    const durationMinutes = getValidatedDurationMinutes();
    if (durationMinutes === null) return;

    try {
      setIsLoading(true);
      const effectiveDeptId = examType === 'SCHEDULED' ? (selectedDepartmentId || user?.department_details?.id) : undefined;
      const effectiveFacId = examType === 'CENTRAL' ? (selectedFacultyId || user?.faculty_details?.id) : undefined;
      const chosenDept = departmentList.find(d => d.id === effectiveDeptId) || user?.department_details;
      const chosenFaculty = facultyList.find(f => f.id === effectiveFacId);

      const departmentLabel = examType === 'CENTRAL'
        ? `Central (${chosenFaculty?.faculty_shortname || 'Faculty'})`
        : (chosenDept?.department_name || 'Department');

      const examData = {
        exam_type: examType,
        faculty_id: effectiveFacId,
        department_id: effectiveDeptId,
        department: departmentLabel,
        semester: examConfig.semester,
        total_questions: generatedQuestions.length,
        total_marks: totalMarks,
        duration_minutes: durationMinutes,
        except_semesters: [],
        language: examConfig.language,
        faculty: chosenFaculty ? chosenFaculty.faculty_shortname : examConfig.faculty,
        questions: generatedQuestions.map(q => ({
          ...q,
          department_shortname: chosenDept?.department_shortname || ''
        })),
      };

      const response = await examAPI.saveGeneratedExam(examData);
      if (response && (response.success !== false)) {
        setExamSaved(true);
        toast.success('Exam saved successfully!');
      } else {
        toast.error(response.message || 'Failed to save exam');
      }
    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast.error(error.message || 'Failed to save exam');
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate exam
  const handleRegenerateExam = async () => {
    const durationMinutes = getValidatedDurationMinutes();
    if (durationMinutes === null) return;

    try {
      setIsLoading(true);
      const effectiveDeptId = examType === 'SCHEDULED' ? (selectedDepartmentId || user?.department_details?.id) : undefined;
      const effectiveFacId = examType === 'CENTRAL' ? (selectedFacultyId || user?.faculty_details?.id) : undefined;
      const chosenFaculty = facultyList.find(f => f.id === effectiveFacId);

      const regenerateData = {
        exam_type: examType,
        department_id: effectiveDeptId,
        faculty_id: effectiveFacId,
        semester: examConfig.semester,
        duration_minutes: durationMinutes,
        language: examConfig.language,
        faculty: chosenFaculty ? chosenFaculty.faculty_shortname : examConfig.faculty,
        subjects: selectedSubjects,
        regenerate: true,
        exclude_questions: excludedQuestions
      };

      const response = await examAPI.generateExam(regenerateData);
      if (response && response.success) {
        const questions = response.data?.questions || [];
        setGeneratedQuestions(questions);
        setExcludedQuestions([]);
        setMissingQuestionSlots([]);
        toast.success(`Regenerated ${questions.length} questions`);
      } else {
        toast.error(response.message || 'Failed to regenerate questions');
      }
    } catch (error: any) {
      console.error('Error regenerating exam:', error);
      toast.error(error.message || 'Failed to regenerate exam');
    } finally {
      setIsLoading(false);
    }
  };

  const getQuestionDisplayText = (question: Question) => {
    const value = question.question_text || question.questions || '';
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.join(' ');
    }

    if (value && typeof value === 'object') {
      return (
        (value as Record<string, string>).english ||
        (value as Record<string, string>).both ||
        JSON.stringify(value)
      );
    }

    return String(value || '');
  };

  const getQuestionOptionEntries = (question: Question) => {
    const correctAnswers = (Array.isArray(question.answer) ? question.answer : [question.answer])
      .map(answer => String(answer));
    let options = question.options;

    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch {
        options = options.split(',').map(option => option.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(options)) {
      return options.map((option, index) => {
        const optionKey = String.fromCharCode(65 + index);
        const optionText = String(option);

        return {
          key: optionKey,
          text: optionText,
          isCorrect: correctAnswers.includes(optionKey) || correctAnswers.includes(optionText)
        };
      });
    }

    if (options && typeof options === 'object') {
      return Object.entries(options).map(([optionKey, option]) => {
        const optionText = String(option);

        return {
          key: optionKey,
          text: optionText,
          isCorrect: correctAnswers.includes(optionKey) || correctAnswers.includes(optionText)
        };
      });
    }

    return [];
  };

  const handleRefillMissingQuestions = async () => {
    const effectiveDeptId = examType === 'SCHEDULED' ? (selectedDepartmentId || user?.department_details?.id) : undefined;

    if (missingQuestionSlots.length === 0) {
      toast('No missing questions to regenerate');
      return;
    }

    const slotsToFill = [...missingQuestionSlots];
    let nextQuestions = [...generatedQuestions];
    const unfilledSlots: MissingQuestionSlot[] = [];
    let restoredCount = 0;

    try {
      setIsRefillingMissingQuestions(true);

      for (const slot of slotsToFill) {
        try {
          const response = await examAPI.regenerateQuestion({
            department_id: effectiveDeptId,
            subject: slot.subject,
            marks: slot.marks,
            language: examConfig.language,
            exclude_question_ids: Array.from(new Set([
              ...nextQuestions.map((item) => item.id),
              ...excludedQuestions,
            ])),
            exclude_question_texts: nextQuestions.map(getQuestionDisplayText),
          });

          const replacement = response?.data?.question;
          if (!replacement) {
            throw new Error(response?.message || 'No replacement question returned');
          }

          nextQuestions = [...nextQuestions, replacement];
          restoredCount += 1;
        } catch (error) {
          console.error('Error refilling missing question:', error);
          unfilledSlots.push(slot);
        }
      }

      if (restoredCount > 0) {
        setGeneratedQuestions(nextQuestions);
      }
      setMissingQuestionSlots(unfilledSlots);

      if (restoredCount === slotsToFill.length) {
        toast.success(`Regenerated ${restoredCount} missing question${restoredCount === 1 ? '' : 's'}`);
      } else if (restoredCount > 0) {
        toast.error(`Regenerated ${restoredCount} question${restoredCount === 1 ? '' : 's'}, but ${unfilledSlots.length} missing slot${unfilledSlots.length === 1 ? '' : 's'} could not be filled`);
      } else {
        toast.error('No replacement questions available for the missing slots');
      }
    } finally {
      setIsRefillingMissingQuestions(false);
    }
  };

  const handleRegenerateQuestion = async (question: Question) => {
    const effectiveDeptId = examType === 'SCHEDULED' ? (selectedDepartmentId || user?.department_details?.id) : undefined;

    if (examSaved) {
      toast.error('Saved exams cannot be regenerated from this draft view.');
      return;
    }

    try {
      setRegeneratingQuestionId(question.id);
      const response = await examAPI.regenerateQuestion({
        department_id: effectiveDeptId,
        subject: question.subject,
        marks: question.marks,
        language: examConfig.language,
        exclude_question_ids: generatedQuestions.map((item) => item.id),
        exclude_question_texts: generatedQuestions.map(getQuestionDisplayText),
      });

      const replacement = response?.data?.question;
      if (!replacement) {
        throw new Error(response?.message || 'No replacement question returned');
      }

      setGeneratedQuestions((currentQuestions) =>
        currentQuestions.map((item) =>
          item.id === question.id ? replacement : item
        )
      );
      toast.success('Question regenerated successfully');
    } catch (error: any) {
      console.error('Error regenerating question:', error);
      toast.error(error.message || 'Failed to regenerate question');
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  // Block question
  const handleBlockQuestion = async () => {
    if (!blockingQuestion || !blockRemarks.trim()) {
      toast.error('Please provide remarks for blocking this question');
      return;
    }

    try {
      const response = await examAPI.blockQuestion({
        question_id: blockingQuestion.id,
        remarks: blockRemarks
      });

      if (response && (response.success !== false)) {
        setExcludedQuestions(prev => [...prev, blockingQuestion.id]);
        setMissingQuestionSlots(prev => [
          ...prev,
          { subject: blockingQuestion.subject, marks: blockingQuestion.marks }
        ]);
        setGeneratedQuestions(currentQuestions => currentQuestions.filter(q => q.id !== blockingQuestion.id));
        setShowBlockDialog(false);
        setBlockingQuestion(null);
        setBlockRemarks('');
        toast.success('Question blocked successfully');
      } else {
        toast.error(response.message || 'Failed to block question');
      }
    } catch (error: any) {
      console.error('Error blocking question:', error);
      toast.error(error.message || 'Failed to block question');
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedSubjects([]);
    setGeneratedQuestions([]);
    setExcludedQuestions([]);
    setMissingQuestionSlots([]);
    setShowQuestions(false);
    setExamSaved(false);
    setExamType('SCHEDULED');
    setSelectedDepartmentId(user?.department_details?.id || null);
    setSelectedFacultyId(user?.faculty_details?.id || null);
    setExamConfig({
      semester: '',
      duration_minutes: '',
      language: 'english',
      faculty: 'FSIT'
    });
  };

  const totalMarks = selectedSubjects.reduce((sum, subject) => sum + subject.marks, 0);

  // Permission check
  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {user?.department_details && examType === 'SCHEDULED' && (
        <div className="flex items-center gap-2 rounded-md border border-[#3a3ea5]/20 bg-[#3a3ea5]/5 px-3 py-2 text-sm font-medium text-slate-700">
          <Building className="w-4 h-4 text-[#3a3ea5]" />
          <span>
            Department: {user.department_details.department_shortname} - {user.department_details.department_name}
          </span>
        </div>
      )}

      {/* Exam Configuration */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="py-4 bg-gradient-to-r from-[#2E3094]/10 to-[#4C51BF]/10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-[#4C51BF]" />
              <span className="leading-none">Exam Configuration</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Exam Type:</span>
              <div className="inline-flex rounded-md shadow-sm border border-gray-300 bg-white p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={examType === 'SCHEDULED' ? 'default' : 'ghost'}
                  onClick={() => {
                    setExamType('SCHEDULED');
                    setSelectedSubjects([]);
                    setGeneratedQuestions([]);
                  }}
                  className={`h-7 px-3 text-xs font-medium rounded ${
                    examType === 'SCHEDULED'
                      ? 'bg-[#2E3094] text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Scheduled
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDepartmentUser}
                  variant={examType === 'CENTRAL' ? 'default' : 'ghost'}
                  onClick={() => {
                    setExamType('CENTRAL');
                    setSelectedSubjects([]);
                    setGeneratedQuestions([]);
                  }}
                  title={isDepartmentUser ? 'Central exams require faculty or global access' : 'Central / Faculty-wide Exam'}
                  className={`h-7 px-3 text-xs font-medium rounded ${
                    examType === 'CENTRAL'
                      ? 'bg-purple-700 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Central
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Conditional Scope Target: Department for Scheduled, Faculty for Central */}
            {examType === 'SCHEDULED' ? (
              <div className="space-y-2">
                <Label htmlFor="department_scope">Department</Label>
                <Select
                  value={selectedDepartmentId ? selectedDepartmentId.toString() : ''}
                  onValueChange={(val) => {
                    setSelectedDepartmentId(Number(val));
                    setSelectedSubjects([]);
                    setGeneratedQuestions([]);
                  }}
                  disabled={!isSuperAdmin && Boolean(user?.department_details?.id)}
                >
                  <SelectTrigger id="department_scope">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentList.map(dep => (
                      <SelectItem key={dep.id} value={dep.id.toString()}>
                        {dep.department_shortname} - {dep.department_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="faculty_scope">Faculty (Central)</Label>
                <Select
                  value={selectedFacultyId ? selectedFacultyId.toString() : ''}
                  onValueChange={(val) => {
                    setSelectedFacultyId(Number(val));
                    setSelectedSubjects([]);
                    setGeneratedQuestions([]);
                  }}
                  disabled={!isSuperAdmin && Boolean(user?.faculty_details?.id && !user?.department_details?.id)}
                >
                  <SelectTrigger id="faculty_scope">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyList.map(fac => (
                      <SelectItem key={fac.id} value={fac.id.toString()}>
                        {fac.faculty_shortname} - {fac.faculty_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={examConfig.semester}
                onValueChange={(value) => setExamConfig(prev => ({ ...prev, semester: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder=""
                className="bg-white border-gray-300 shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                value={examConfig.duration_minutes}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setExamConfig(prev => ({
                    ...prev,
                    duration_minutes: digitsOnly === '' ? '' : Number(digitsOnly)
                  }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={examConfig.language}
                onValueChange={(value) => setExamConfig(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {getLanguageLabel(lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#4C51BF]" />
              <Label className="text-lg font-semibold">Subjects & Marks Distribution</Label>
              {totalMarks > 0 && (
                <Badge variant="outline">Total: {totalMarks} marks</Badge>
              )}
            </div>

            {isLoadingSubjects ? (
              <div className="py-4 text-center">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-600">Loading department subjects...</p>
              </div>
            ) : departmentSubjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {departmentSubjects.map((subject) => {
                  const existingSubject = selectedSubjects.find(s => s.subject === subject.subject_name);
                  const marks = existingSubject?.marks || 0;
                  
                  return (
                    <div key={subject.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="font-medium text-gray-800">
                          {subject.subject_name}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {marks} marks
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={marks || ''}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            const newMarks = digitsOnly === '' ? 0 : Number(digitsOnly);
                            const existing = selectedSubjects.find(s => s.subject === subject.subject_name);
                            
                            if (newMarks > 0) {
                              if (existing) {
                                // Update existing
                                setSelectedSubjects(prev => 
                                  prev.map(s => s.subject === subject.subject_name 
                                    ? { ...s, marks: newMarks } 
                                    : s
                                  )
                                );
                              } else {
                                // Add new
                                setSelectedSubjects(prev => [...prev, { subject: subject.subject_name, marks: newMarks }]);
                              }
                            } else {
                              // Remove if marks is 0
                              setSelectedSubjects(prev => prev.filter(s => s.subject !== subject.subject_name));
                            }
                          }}
                          className="w-20 text-center"
                          disabled={!canWrite()}
                        />
                        <span className="text-sm text-gray-600">marks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-2 font-medium">No subjects available</p>
                <p className="text-sm">No subjects are mapped to your department</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {canWrite() && (
            <div className="flex flex-col gap-3 pt-4 sm:flex-row ">
              <Button 
                onClick={handleCreateExam}
                disabled={selectedSubjects.length === 0 || !examConfig.semester || isLoading || isRefillingMissingQuestions}
                className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Exam
                  </>
                )}
              </Button>

              {generatedQuestions.length > 0 && (
                <>
                  <Button 
                    onClick={handleRegenerateExam}
                    disabled={isLoading || isRefillingMissingQuestions}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate All
                  </Button>

                  <Button 
                    onClick={handleSaveExam}
                    disabled={isLoading || isRefillingMissingQuestions || examSaved}
                    variant="outline"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {examSaved ? 'Saved' : 'Save Exam'}
                  </Button>
                </>
              )}

              <Button 
                onClick={handleReset}
                variant="destructive"
                className="ml-auto"
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions - Tab-wise by Subject */}
      {showQuestions && generatedQuestions.length > 0 && (() => {
        // Group questions by subject
        const questionsBySubject = generatedQuestions.reduce((acc, question) => {
          const subject = question.subject;
          if (!acc[subject]) {
            acc[subject] = [];
          }
          acc[subject].push(question);
          return acc;
        }, {} as Record<string, Question[]>);

        const subjects = Object.keys(questionsBySubject);
        const defaultSubject = subjects[0] || '';

        return (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>Generated Questions</span>
                  <Badge variant="outline">{generatedQuestions.length} questions</Badge>
                </div>
                {canWrite() && (
                  <Button
                    onClick={handleRefillMissingQuestions}
                    variant="outline"
                    size="sm"
                    disabled={isLoading || isRefillingMissingQuestions}
                  >
                    {isRefillingMissingQuestions ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultSubject} className="w-full">
                <TabsList className="grid w-full h-auto grid-cols-1 gap-2 p-0 mb-6 bg-transparent sm:grid-cols-2 md:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap lg:justify-start">
                  {subjects.map((subject) => (
                    <TabsTrigger 
                      key={subject} 
                      value={subject}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 shadow-sm hover:border-[#4C51BF] hover:bg-[#4C51BF]/5 data-[state=active]:border-[#2E3094] data-[state=active]:bg-[#2E3094]/10 data-[state=active]:text-[#2E3094] data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-[#2E3094]/20"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span className="truncate">{subject}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {questionsBySubject[subject].length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {subjects.map((subject) => (
                  <TabsContent key={subject} value={subject} className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {subject} Questions
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {questionsBySubject[subject].length} questions
                        </Badge>
                        <Badge variant="secondary">
                          {questionsBySubject[subject].reduce((sum, q) => sum + q.marks, 0)} marks total
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {questionsBySubject[subject].map((question, index) => (
                        <div key={question.id} className="p-4 border rounded-lg bg-gray-50/50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-white">
                                Q{index + 1}
                              </Badge>
                              <Badge variant="secondary">{question.marks} marks</Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.type === 'option' ? 'MCQ' : 'Text Answer'}
                              </Badge>
                            </div>
                            {canWrite() && (
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  onClick={() => handleRegenerateQuestion(question)}
                                  variant="ghost"
                                  size="sm"
                                  disabled={
                                    isLoading ||
                                    isRefillingMissingQuestions ||
                                    examSaved ||
                                    regeneratingQuestionId !== null
                                  }
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  {regeneratingQuestionId === question.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                  )}
                                  Regenerate
                                </Button>
                                <Button
                                  onClick={() => {
                                    setBlockingQuestion(question);
                                    setShowBlockDialog(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Block
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="p-3 bg-white border rounded">
                              <p className="font-medium text-gray-800">
                                <MathText text={String(getQuestionDisplayText(question) ?? '')} />
                              </p>
                            </div>
                            
                            {question.type === 'option' && question.options && (
                              <div className="ml-4 space-y-2">
                                {getQuestionOptionEntries(question).map((option) => (
                                  <div key={option.key} className={`flex items-center gap-3 p-2 rounded ${
                                    option.isCorrect
                                      ? 'bg-green-50 border border-green-200'
                                      : 'bg-white border border-gray-200'
                                  }`}>
                                    <span className="text-sm font-semibold text-gray-600 min-w-[20px]">
                                      {option.key})
                                    </span>
                                    <span className={option.isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}>
                                      <MathText text={String(option.text ?? '')} />
                                    </span>
                                    {option.isCorrect && (
                                      <Badge variant="outline" className="ml-auto text-xs text-green-700 bg-green-100 border-green-300">
                                        ✓ Correct
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'text' && (
                              <div className="p-3 ml-4 border border-green-200 rounded bg-green-50">
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="text-xs text-green-700 bg-green-100 border-green-300">
                                    Answer
                                  </Badge>
                                  <p className="text-sm font-medium text-green-700">
                                    {Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Block Question Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Question</DialogTitle>
            <DialogDescription>
              Provide a reason for blocking this question. It will be moved to the blocklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={blockRemarks}
                onChange={(e) => setBlockRemarks(e.target.value)}
                placeholder="Enter reason for blocking this question..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBlockQuestion} 
                variant="destructive"
                disabled={!blockRemarks.trim()}
                className='bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900'
              >
                Block Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
