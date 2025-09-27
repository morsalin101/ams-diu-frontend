import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Plus, Edit, Eye, Trash2, X, Save, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { QuestionPaperView } from './QuestionPaperView';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';

export interface Question {
  id: number;
  subject: string;
  questions: string;
  type: 'option' | 'text';
  text?: string;
  options?: string[];
  answer?: string | string[];
  marks: number;
}

interface QuestionManagerProps {
  examId: number | null;
  questions: Question[];
  questionsCount: number;
  isLoadingQuestions: boolean;
  onQuestionsChange: (questions: Question[]) => void;
  onQuestionCountChange: (count: number) => void;
  examConfig?: any;
  subjectPercentages?: any;
  showPaperView?: boolean;
  onShowPaperViewChange?: (show: boolean) => void;
  showResetButton?: boolean;
  onReset?: () => void;
  title?: string;
  description?: string;
  readOnly?: boolean;
}

export function QuestionManager({
  examId,
  questions,
  questionsCount,
  isLoadingQuestions,
  onQuestionsChange,
  onQuestionCountChange,
  examConfig,
  subjectPercentages = {},
  showPaperView = false,
  onShowPaperViewChange,
  showResetButton = false,
  onReset,
  title = 'Questions Management',
  description = 'Review and manage your exam questions',
  readOnly = false
}: QuestionManagerProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const subjects = ['Mathematics', 'English', 'Bangla', 'GK', 'Chemistry', 'Physics'];

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
  };

  const handleSaveQuestion = async () => {
    if (editingQuestion && examId) {
      setIsLoading(true);
      
      try {
        // Prepare question data for API
        let questionData;
        
        if (editingQuestion.type === 'option') {
          // For multiple choice questions
          const optionsObject: { [key: string]: string } = {};
          editingQuestion.options?.forEach((option, index) => {
            if (option.trim()) {
              optionsObject[String.fromCharCode(65 + index)] = option;
            }
          });
          
          questionData = {
            subject: editingQuestion.subject,
            question_text: editingQuestion.questions,
            type: 'option',
            text: null,
            options: optionsObject,
            answer: `['${editingQuestion.answer}']`,
            marks: editingQuestion.marks
          };
        } else {
          // For text questions
          questionData = {
            subject: editingQuestion.subject,
            question_text: editingQuestion.questions,
            type: 'text',
            text: editingQuestion.answer || '',
            options: null,
            answer: editingQuestion.answer || '',
            marks: editingQuestion.marks
          };
        }
        
        // Check if this is a new question (negative ID means it's temporary)
        const isNewQuestion = editingQuestion.id < 0;
        
        if (isNewQuestion) {
          // Add new question
          const response = await examAPI.addQuestion(examId, questionData);
          
          // Update local state with the real ID from API response
          const updatedQuestions = questions.map(q => 
            q.id === editingQuestion.id ? { ...editingQuestion, id: response.id } : q
          );
          onQuestionsChange(updatedQuestions);
          onQuestionCountChange(questionsCount + 1);
          toast.success('Question added successfully!');
        } else {
          // Update existing question
          await examAPI.editQuestion(examId, editingQuestion.id, questionData);
          
          // Update local state
          const updatedQuestions = questions.map(q => 
            q.id === editingQuestion.id ? editingQuestion : q
          );
          onQuestionsChange(updatedQuestions);
          toast.success('Question updated successfully!');
        }
        
        setEditingQuestion(null);
        
      } catch (error) {
        console.error('Error saving question:', error);
        toast.error('Failed to save question: ' + ((error as any)?.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!examId) return;
    
    setIsLoading(true);
    
    try {
      // Call API to delete question
      await examAPI.deleteQuestion(examId, id);
      
      // Update local state
      const updatedQuestions = questions.filter(q => q.id !== id);
      onQuestionsChange(updatedQuestions);
      onQuestionCountChange(questionsCount - 1);
      toast.success('Question deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewQuestion = () => {
    if (!examId) {
      toast.error('Please create an exam first');
      return;
    }
    
    const newQuestion: Question = {
      id: -Date.now(), // Negative ID for new questions
      subject: Object.keys(subjectPercentages).find(s => subjectPercentages[s as keyof typeof subjectPercentages] > 0) || 'Mathematics',
      questions: '',
      type: 'option',
      options: ['', '', '', ''],
      answer: '',
      marks: 1
    };
    
    // Add to local state and open edit dialog immediately
    onQuestionsChange([...questions, newQuestion]);
    setEditingQuestion(newQuestion);
  };

  const handleUpdateMarks = (questionId: number, newMarks: number) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, marks: newMarks } : q
    );
    onQuestionsChange(updatedQuestions);
  };

  return (
    <>
      <Card className="border-2 border-gray-200 shadow-lg mb-6 sm:mb-8">
        <CardHeader className="pb-4 sm:pb-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
                  {isLoadingQuestions ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
                  ) : (
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  )}
                </div>
                <span className="leading-tight">
                  {isLoadingQuestions ? 'Loading Questions...' : title}
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium mt-1 sm:mt-2 text-sm sm:text-base">
                {examId && <span className="text-blue-600 font-semibold">Exam ID: {examId} • </span>}
                <span className="text-green-600 font-semibold">Total Questions: {questionsCount} • </span>
                {description}
              </CardDescription>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              {onShowPaperViewChange && (
                <Button 
                  onClick={() => onShowPaperViewChange(true)} 
                  variant="default" 
                  size="sm" 
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold shadow-md text-xs sm:text-sm"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View Paper</span>
                  <span className="sm:hidden">View</span>
                </Button>
              )}
              {!readOnly && (
                <Button 
                  onClick={handleAddNewQuestion} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none border-2 border-gray-300 hover:border-blue-400 font-semibold text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Question</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
              {!readOnly && showResetButton && onReset && (
                <Button 
                  onClick={onReset} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Reset Exam</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id} className="border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold px-2 sm:px-3 py-1 text-xs sm:text-sm">{question.subject}</Badge>
                      <Badge variant="outline" className="border-gray-300 text-gray-700 font-medium px-2 sm:px-3 py-1 text-xs sm:text-sm">{question.type}</Badge>
                      <span className="text-xs sm:text-sm text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">Question #{index + 1}</span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base leading-relaxed">{question.questions}</p>
                    {question.type === 'option' && question.options && (
                      <div className="grid grid-cols-1 gap-2 sm:gap-3 mt-3 sm:mt-4">
                        {question.options.map((option, optIndex) => (
                          <div 
                            key={optIndex}
                            className={`p-2 sm:p-3 text-xs sm:text-sm rounded-lg border-2 font-medium ${
                              option === question.answer 
                                ? 'bg-green-50 border-green-300 text-green-800 shadow-sm' 
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="font-bold text-xs sm:text-sm">{String.fromCharCode(65 + optIndex)}.</span> {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-start gap-3 lg:gap-4 w-full lg:w-auto">
                    <div className="text-center bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
                      <Label className="text-xs text-gray-600 font-semibold block mb-1">Marks</Label>
                      {readOnly ? (
                        <div className="w-14 sm:w-16 h-7 sm:h-8 flex items-center justify-center font-bold text-sm bg-white border-2 border-gray-200 rounded">
                          {question.marks}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          value={question.marks}
                          onChange={(e) => {
                            const newMarks = parseInt(e.target.value) || 1;
                            handleUpdateMarks(question.id, newMarks);
                          }}
                          className="w-14 sm:w-16 h-7 sm:h-8 text-center font-bold border-2 border-gray-200 text-sm"
                          min="1"
                        />
                      )}
                    </div>
                    
                    <div className="flex flex-row lg:flex-col gap-2">
                      {!readOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                          className="border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 p-2"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-2 border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700 p-2">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-2 sm:mx-0">
                          <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg">Question Preview</DialogTitle>
                            <DialogDescription className="text-sm sm:text-base">
                              {question.subject} - {question.type} question
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 sm:space-y-4">
                            <div>
                              <Label className="font-semibold text-sm sm:text-base">Question:</Label>
                              <p className="mt-1 text-sm sm:text-base">{question.questions}</p>
                            </div>
                            {question.type === 'option' && question.options && (
                              <div>
                                <Label className="font-semibold text-sm sm:text-base">Options:</Label>
                                <div className="space-y-2 mt-2">
                                  {question.options.map((option, optIndex) => (
                                    <div 
                                      key={optIndex}
                                      className={`p-2 sm:p-3 rounded border text-sm sm:text-base ${
                                        option === question.answer 
                                          ? 'bg-green-100 border-green-300 text-green-800' 
                                          : 'bg-white border-gray-300'
                                      }`}
                                    >
                                      <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}
                                      {option === question.answer && (
                                        <Badge className="ml-2 text-xs" variant="default">Correct</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div>
                              <Label className="font-semibold text-sm sm:text-base">Marks: {question.marks}</Label>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {!readOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          disabled={isLoading}
                          className="border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 p-2 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Edit Question Dialog */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Edit Question</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Modify the question details below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 p-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base font-medium">Subject</Label>
                  <Select
                    value={editingQuestion.subject}
                    onValueChange={(value) => setEditingQuestion(prev => 
                      prev ? { ...prev, subject: value } : null
                    )}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base font-medium">Question Type</Label>
                  <Select
                    value={editingQuestion.type}
                    onValueChange={(value: 'option' | 'text') => setEditingQuestion(prev => 
                      prev ? { ...prev, type: value } : null
                    )}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option">Multiple Choice</SelectItem>
                      <SelectItem value="text">Text Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-medium">Question</Label>
                <Textarea
                  value={editingQuestion.questions}
                  onChange={(e) => setEditingQuestion(prev => 
                    prev ? { ...prev, questions: e.target.value } : null
                  )}
                  rows={3}
                  className="text-sm sm:text-base"
                />
              </div>

              {editingQuestion.type === 'option' && (
                <div className="space-y-3 sm:space-y-4">
                  <Label className="text-sm sm:text-base font-medium">Options</Label>
                  {editingQuestion.options?.map((option, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-0">
                      <span className="font-medium w-6 text-sm sm:text-base">{String.fromCharCode(65 + index)}.</span>
                      <Input
                        value={option}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        onChange={(e) => {
                          const newOptions = [...(editingQuestion.options || [])];
                          newOptions[index] = e.target.value;
                          setEditingQuestion(prev => 
                            prev ? { ...prev, options: newOptions } : null
                          );
                        }}
                        className="flex-1 text-sm sm:text-base h-9 sm:h-10"
                      />
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={editingQuestion.answer === String.fromCharCode(65 + index)}
                          onChange={() => setEditingQuestion(prev => 
                            prev ? { ...prev, answer: String.fromCharCode(65 + index) } : null
                          )}
                          className="w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <Label className="text-xs sm:text-sm">Correct</Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-medium">Marks</Label>
                <Input
                  type="number"
                  value={editingQuestion.marks}
                  onChange={(e) => setEditingQuestion(prev => 
                    prev ? { ...prev, marks: parseInt(e.target.value) || 1 } : null
                  )}
                  min="1"
                  className="w-20 sm:w-24 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingQuestion(null)}
                  className="w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base h-9 sm:h-10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Validation before saving
                    if (!editingQuestion?.questions.trim()) {
                      toast.error('Please enter a question');
                      return;
                    }
                    if (editingQuestion.type === 'option') {
                      const validOptions = editingQuestion.options?.filter(opt => opt.trim()).length || 0;
                      if (validOptions < 2) {
                        toast.error('Please enter at least 2 options');
                        return;
                      }
                      if (!editingQuestion.answer) {
                        toast.error('Please select the correct answer');
                        return;
                      }
                    }
                    handleSaveQuestion();
                  }}
                  disabled={isLoading}
                  className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] font-semibold text-white text-sm sm:text-base h-9 sm:h-10 disabled:from-gray-400 disabled:to-gray-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Save Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Question Paper View */}
      {showPaperView && examConfig && onShowPaperViewChange && (
        <QuestionPaperView
          questions={questions}
          examConfig={examConfig}
          onClose={() => onShowPaperViewChange(false)}
        />
      )}
    </>
  );
}