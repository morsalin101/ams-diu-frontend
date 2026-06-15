import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Settings, Building, Loader2, FileText, Plus, Trash2, Save, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { examAPI, subjectAPI, subjectDepartmentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { buildAcademicSemesterOptions } from '../lib/semester';
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

export function CreateQuestions({ gradientClass: _gradientClass }: CreateQuestionsProps) {
  const { user } = useAuth();
  const { canWrite, canRead } = usePermissions();
  
  // State management
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
  const [examConfig, setExamConfig] = useState({
    semester: '',
    duration_minutes: 0,
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

  // Load department subjects on component mount
  useEffect(() => {
    if (user?.department_details?.id) {
      loadDepartmentSubjects(user.department_details.id);
    }
  }, [user]);

  // Load subjects for user's department
  const loadDepartmentSubjects = async (departmentId: number) => {
    try {
      setIsLoadingSubjects(true);
      const response = await subjectDepartmentAPI.getDepartmentSubjects(departmentId);
      
      if (response && (response.success !== false)) {
        const data = response.data || response;
        
        // Handle the response format: {department_id, subject_ids, subjects}
        if (data.subject_ids && data.subject_ids.length > 0) {
          // Get all subjects and filter by the subject_ids
          const allSubjectsResponse = await subjectAPI.getAllSubjects();
          const allSubjects = allSubjectsResponse.success ? allSubjectsResponse.data : allSubjectsResponse;
          
          const filteredSubjects = allSubjects.filter((subject: any) => 
            data.subject_ids.includes(subject.id)
          );
          
          setDepartmentSubjects(filteredSubjects);
        } else {
          // No subjects mapped to this department
          setDepartmentSubjects([]);
          toast.success('No subjects mapped to your department');
        }
      } else {
        throw new Error(response.message || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Error loading department subjects:', error);
      toast.error('Failed to load department subjects');
      
      // Fallback: try to load all subjects
      try {
        const subjectsResponse = await subjectAPI.getAllSubjects();
        const allSubjects = subjectsResponse.success ? subjectsResponse.data : subjectsResponse;
        setDepartmentSubjects(allSubjects);
        toast.success('Loaded all subjects as fallback');
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
        setDepartmentSubjects([]);
      }
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Generate exam questions
  const handleCreateExam = async () => {
    if (!user?.department_details?.id) {
      toast.error('User department not found');
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

    if (!user?.department_details?.id) {
      toast.error('User department not found');
      return;
    }

    const invalidSubjects = selectedSubjects.filter(s => !s.subject || s.marks <= 0);
    if (invalidSubjects.length > 0) {
      toast.error('Please fill in all subject details with valid marks');
      return;
    }

    try {
      setIsLoading(true);
      const examData = {
        department_id: user.department_details.id,
        semester: examConfig.semester,
        duration_minutes: examConfig.duration_minutes,
        language: examConfig.language,
        faculty: examConfig.faculty,
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
    if (!user?.department_details?.id || generatedQuestions.length === 0) return;

    if (!examConfig.semester) {
      toast.error('Please select a semester');
      return;
    }

    try {
      setIsLoading(true);
      const examData = {
        department: user.department_details.department_name,
        semester: examConfig.semester,
        total_questions: generatedQuestions.length,
        total_marks: totalMarks,
        duration_minutes: examConfig.duration_minutes,
        except_semesters: [], // You can add logic to fill this if needed
        language: examConfig.language,
        faculty: examConfig.faculty,
        questions: generatedQuestions.map(q => ({
          ...q,
          department_shortname: user.department_details?.department_shortname || ''
        })),
        // Optionally add other fields as needed
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
    if (!user?.department_details?.id) return;

    try {
      setIsLoading(true);
      const regenerateData = {
        department_id: user.department_details.id,
        semester: examConfig.semester,
        duration_minutes: examConfig.duration_minutes,
        language: examConfig.language,
        faculty: examConfig.faculty,
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

  const handleRefillMissingQuestions = async () => {
    if (!user?.department_details?.id) {
      toast.error('User department not found');
      return;
    }

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
            department_id: user.department_details.id,
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
    if (!user?.department_details?.id) {
      toast.error('User department not found');
      return;
    }

    if (examSaved) {
      toast.error('Saved exams cannot be regenerated from this draft view.');
      return;
    }

    try {
      setRegeneratingQuestionId(question.id);
      const response = await examAPI.regenerateQuestion({
        department_id: user.department_details.id,
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
    setExamConfig({
      semester: '',
      duration_minutes: 90,
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
      {user?.department_details && (
        <div className="flex items-center gap-2 rounded-md border border-[#3a3ea5]/20 bg-[#3a3ea5]/5 px-3 py-2 text-sm font-medium text-slate-700">
          <Building className="w-4 h-4 text-[#3a3ea5]" />
          <span>
            Department: {user.department_details.department_shortname} - {user.department_details.department_name}
          </span>
        </div>
      )}

      {/* Exam Configuration */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-[#2E3094]/10 to-[#4C51BF]/10">
          <CardTitle className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-[#4C51BF]" />
            <span>Exam Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure your exam parameters and select subjects
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                type="number"
                value={examConfig.duration_minutes}
                onChange={(e) => setExamConfig(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 90 }))}
                min="30"
                max="300"
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
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty</Label>
              <Select
                value={examConfig.faculty}
                onValueChange={(value) => setExamConfig(prev => ({ ...prev, faculty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map(faculty => (
                    <SelectItem key={faculty} value={faculty}>{faculty}</SelectItem>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          type="number"
                          placeholder="0"
                          value={marks || ''}
                          onChange={(e) => {
                            const newMarks = parseInt(e.target.value) || 0;
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
                          min="0"
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
                    Regenerate
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
                <TabsList className="grid w-full grid-cols-1 mb-6 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:w-auto">
                  {subjects.map((subject) => (
                    <TabsTrigger 
                      key={subject} 
                      value={subject}
                      className="flex items-center gap-2 px-4 py-2"
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
                                {getQuestionDisplayText(question)}
                              </p>
                            </div>
                            
                            {question.type === 'option' && question.options && (
                              <div className="ml-4 space-y-2">
                                {(() => {
                                  // Handle object-based options like {"A": "option1", "B": "option2"}
                                  if (typeof question.options === 'object' && !Array.isArray(question.options)) {
                                    const optionEntries = Object.entries(question.options as Record<string, string>);
                                    const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
                                    
                                    return optionEntries.map(([key, value]) => (
                                      <div key={key} className={`flex items-center gap-3 p-2 rounded ${
                                        correctAnswers.includes(key) 
                                          ? 'bg-green-50 border border-green-200' 
                                          : 'bg-white border border-gray-200'
                                      }`}>
                                        <span className="text-sm font-semibold text-gray-600 min-w-[20px]">
                                          {key})
                                        </span>
                                        <span className={correctAnswers.includes(key) ? 'font-semibold text-green-700' : 'text-gray-700'}>
                                          {value}
                                        </span>
                                        {correctAnswers.includes(key) && (
                                          <Badge variant="outline" className="ml-auto text-xs text-green-700 bg-green-100 border-green-300">
                                            ✓ Correct
                                          </Badge>
                                        )}
                                      </div>
                                    ));
                                  }
                                  
                                  // Handle array or string options (legacy format)
                                  let options: string[] = [];
                                  if (typeof question.options === 'string') {
                                    try {
                                      options = JSON.parse(question.options);
                                    } catch {
                                      options = question.options.split(',');
                                    }
                                  } else if (Array.isArray(question.options)) {
                                    options = question.options;
                                  }
                                  
                                  return options.map((option, optIndex) => {
                                    const isCorrect = option === question.answer;
                                    return (
                                      <div key={optIndex} className={`flex items-center gap-3 p-2 rounded ${
                                        isCorrect 
                                          ? 'bg-green-50 border border-green-200' 
                                          : 'bg-white border border-gray-200'
                                      }`}>
                                        <span className="text-sm font-semibold text-gray-600 min-w-[20px]">
                                          {String.fromCharCode(65 + optIndex)})
                                        </span>
                                        <span className={isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}>
                                          {option}
                                        </span>
                                        {isCorrect && (
                                          <Badge variant="outline" className="ml-auto text-xs text-green-700 bg-green-100 border-green-300">
                                            ✓ Correct
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
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
