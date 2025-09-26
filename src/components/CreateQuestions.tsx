import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Plus, Edit, Eye, Trash2, X, Save, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { QuestionPaperView } from './QuestionPaperView';

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

interface CreateQuestionsProps {
  gradientClass: string;
}

// Comprehensive dummy data for demonstration
const generateDummyQuestions = (subjectPercentages: any, totalQuestions: number): Question[] => {
  const questionBank = {
    math: [
      {
        questions: 'What is the derivative of x²?',
        type: 'option' as const,
        options: ['2x', 'x²', '2', 'x'],
        answer: '2x',
        marks: 2
      },
      {
        questions: 'Solve for x: 2x + 5 = 13',
        type: 'option' as const,
        options: ['4', '6', '8', '9'],
        answer: '4',
        marks: 1
      },
      {
        questions: 'What is the area of a circle with radius 5?',
        type: 'option' as const,
        options: ['25π', '10π', '5π', '15π'],
        answer: '25π',
        marks: 2
      },
      {
        questions: 'Find the integral of 3x² dx',
        type: 'text' as const,
        text: 'x³ + C',
        marks: 3
      }
    ],
    english: [
      {
        questions: 'Define the term "metaphor" in literature.',
        type: 'text' as const,
        text: 'A figure of speech that makes an implicit comparison between two unlike things.',
        marks: 3
      },
      {
        questions: 'Who wrote "Romeo and Juliet"?',
        type: 'option' as const,
        options: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'],
        answer: 'William Shakespeare',
        marks: 1
      },
      {
        questions: 'What is the past tense of "run"?',
        type: 'option' as const,
        options: ['ran', 'runned', 'running', 'runs'],
        answer: 'ran',
        marks: 1
      }
    ],
    bangla: [
      {
        questions: 'বাংলা ভাষার জনক কে?',
        type: 'option' as const,
        options: ['রবীন্দ্রনাথ ঠাকুর', 'কাজী নজরুল ইসলাম', 'মাইকেল মধুসূদন দত্ত', 'ঈশ্বরচন্দ্র বিদ্যাসাগর'],
        answer: 'ঈশ্বরচন্দ্র বিদ্যাসাগর',
        marks: 2
      },
      {
        questions: '"গীতাঞ্জলি" কাব্যগ্রন্থের রচয়িতা কে?',
        type: 'option' as const,
        options: ['রবীন্দ্রনাথ ঠাকুর', 'কাজী নজরুল ইসলাম', 'জীবনানন্দ দাশ', 'সুকান্ত ভট্টাচার্য'],
        answer: 'রবীন্দ্রনাথ ঠাকুর',
        marks: 1
      }
    ],
    gk: [
      {
        questions: 'What is the capital of Bangladesh?',
        type: 'option' as const,
        options: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'],
        answer: 'Dhaka',
        marks: 1
      },
      {
        questions: 'Who is the current Prime Minister of Bangladesh?',
        type: 'text' as const,
        text: 'Sheikh Hasina',
        marks: 2
      },
      {
        questions: 'In which year did Bangladesh gain independence?',
        type: 'option' as const,
        options: ['1971', '1970', '1972', '1975'],
        answer: '1971',
        marks: 1
      }
    ],
    chemistry: [
      {
        questions: 'What is the chemical formula for water?',
        type: 'option' as const,
        options: ['H2O', 'CO2', 'NaCl', 'H2SO4'],
        answer: 'H2O',
        marks: 1
      },
      {
        questions: 'What is the atomic number of Carbon?',
        type: 'option' as const,
        options: ['6', '8', '12', '14'],
        answer: '6',
        marks: 1
      },
      {
        questions: 'Name the process by which plants make their own food.',
        type: 'text' as const,
        text: 'Photosynthesis',
        marks: 2
      }
    ],
    physics: [
      {
        questions: 'What is the speed of light in vacuum?',
        type: 'option' as const,
        options: ['3×10⁸ m/s', '3×10⁶ m/s', '3×10⁹ m/s', '3×10⁷ m/s'],
        answer: '3×10⁸ m/s',
        marks: 2
      },
      {
        questions: 'What is Newton\'s first law of motion?',
        type: 'text' as const,
        text: 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force.',
        marks: 3
      },
      {
        questions: 'What is the unit of electric current?',
        type: 'option' as const,
        options: ['Ampere', 'Volt', 'Ohm', 'Watt'],
        answer: 'Ampere',
        marks: 1
      }
    ]
  };

  const generatedQuestions: Question[] = [];
  let questionId = 1;

  // Generate questions based on subject percentages
  Object.entries(subjectPercentages).forEach(([subject, percentage]) => {
    const questionsCount = Math.round((Number(percentage) / 100) * totalQuestions);
    const availableQuestions = questionBank[subject as keyof typeof questionBank] || [];
    
    for (let i = 0; i < questionsCount && i < availableQuestions.length; i++) {
      const baseQuestion = availableQuestions[i % availableQuestions.length];
      generatedQuestions.push({
        id: questionId++,
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        questions: baseQuestion.questions,
        type: baseQuestion.type,
        options: baseQuestion.options,
        answer: baseQuestion.answer,
        text: baseQuestion.type === 'text' ? baseQuestion.text : undefined,
        marks: baseQuestion.marks
      });
    }
  });

  return generatedQuestions;
};

export function CreateQuestions({ gradientClass }: CreateQuestionsProps) {
  const [subjectPercentages, setSubjectPercentages] = useState({
    math: 30,
    english: 20,
    bangla: 15,
    gk: 10,
    chemistry: 15,
    physics: 10
  });

  const [examConfig, setExamConfig] = useState({
    totalQuestions: 50,
    timeMinutes: 120,
    totalMarks: 100,
    department: '',
    semester: ''
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);

  const subjects = ['math', 'english', 'bangla', 'gk', 'chemistry', 'physics'];
  const departments = ['CSE', 'EEE', 'BBA', 'Pharmacy', 'Architecture', 'English'];
  const semesters = ['Spring25', 'Summer25', 'Fall25', 'Spring26', 'Summer26'];

  const handleSubjectPercentageChange = (subject: string, value: string) => {
    setSubjectPercentages(prev => ({
      ...prev,
      [subject]: parseInt(value) || 0
    }));
  };

  const handleCreateExam = () => {
    // Generate dummy questions based on configuration
    const generatedQuestions = generateDummyQuestions(subjectPercentages, examConfig.totalQuestions);
    setQuestions(generatedQuestions);
    setShowQuestions(true);
    
    // Here you would typically call your backend API
    console.log('Creating exam with config:', examConfig);
    console.log('Subject percentages:', subjectPercentages);
    console.log('Generated questions:', generatedQuestions);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
  };

  const handleSaveQuestion = () => {
    if (editingQuestion) {
      setQuestions(prev => 
        prev.map(q => q.id === editingQuestion.id ? editingQuestion : q)
      );
      setEditingQuestion(null);
    }
  };

  const handleDeleteQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAddNewQuestion = () => {
    const newQuestion: Question = {
      id: Date.now(),
      subject: 'Math',
      questions: '',
      type: 'option',
      options: ['', '', '', ''],
      answer: '',
      marks: 1
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingQuestion(newQuestion);
  };

  const totalPercentage = Object.values(subjectPercentages).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r from-[#4C51BF] to-[#667EEA] ${gradientClass} rounded-lg p-6 text-white`}>
        <h1 className="text-2xl font-bold mb-2">Create Questions</h1>
        <p className="text-white/90">
          Configure exam parameters and manage questions for your courses.
        </p>
      </div>

      {/* Exam Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Configuration</CardTitle>
          <CardDescription>
            Set up the basic parameters for your exam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Percentages */}
          <div>
            <Label className="text-base font-semibold mb-4 block">Subject Distribution</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {subjects.map(subject => (
                <div key={subject} className="space-y-2">
                  <Label htmlFor={subject} className="capitalize">{subject}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={subject}
                      type="number"
                      min="0"
                      max="100"
                      value={subjectPercentages[subject as keyof typeof subjectPercentages]}
                      onChange={(e) => handleSubjectPercentageChange(subject, e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">Total:</span>
              <Badge variant={totalPercentage === 100 ? "default" : "destructive"}>
                {totalPercentage}%
              </Badge>
              {totalPercentage !== 100 && (
                <span className="text-xs text-red-500">Must equal 100%</span>
              )}
            </div>
          </div>

          {/* Exam Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="questions">Total Questions</Label>
              <Input
                id="questions"
                type="number"
                value={examConfig.totalQuestions}
                onChange={(e) => setExamConfig(prev => ({
                  ...prev,
                  totalQuestions: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time (minutes)</Label>
              <Input
                id="time"
                type="number"
                value={examConfig.timeMinutes}
                onChange={(e) => setExamConfig(prev => ({
                  ...prev,
                  timeMinutes: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marks">Total Marks</Label>
              <Input
                id="marks"
                type="number"
                value={examConfig.totalMarks}
                onChange={(e) => setExamConfig(prev => ({
                  ...prev,
                  totalMarks: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={examConfig.department}
                onValueChange={(value) => setExamConfig(prev => ({
                  ...prev,
                  department: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dept" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={examConfig.semester}
                onValueChange={(value) => setExamConfig(prev => ({
                  ...prev,
                  semester: value
                }))}
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
          </div>

          <Button 
            onClick={handleCreateExam}
            disabled={totalPercentage !== 100 || !examConfig.department || !examConfig.semester}
            className="w-full sm:w-auto"
          >
            Create Exam
          </Button>
        </CardContent>
      </Card>

      {/* Questions Management */}
      {showQuestions && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Questions</CardTitle>
                <CardDescription>
                  Review and manage your exam questions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowPaperView(true)} variant="default" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Paper
                </Button>
                <Button onClick={handleAddNewQuestion} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{question.subject}</Badge>
                        <Badge variant="outline">{question.type}</Badge>
                        <span className="text-sm text-gray-500">Question #{index + 1}</span>
                      </div>
                      <p className="font-medium">{question.questions}</p>
                      {question.type === 'option' && question.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {question.options.map((option, optIndex) => (
                            <div 
                              key={optIndex}
                              className={`p-2 text-sm rounded border ${
                                option === question.answer 
                                  ? 'bg-green-100 border-green-300 text-green-800' 
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <Label className="text-xs text-gray-500">Marks</Label>
                        <Input
                          type="number"
                          value={question.marks}
                          onChange={(e) => {
                            const newMarks = parseInt(e.target.value) || 1;
                            setQuestions(prev => 
                              prev.map(q => q.id === question.id ? { ...q, marks: newMarks } : q)
                            );
                          }}
                          className="w-16 h-8 text-center"
                          min="1"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Question Preview</DialogTitle>
                              <DialogDescription>
                                {question.subject} - {question.type} question
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="font-semibold">Question:</Label>
                                <p className="mt-1">{question.questions}</p>
                              </div>
                              {question.type === 'option' && question.options && (
                                <div>
                                  <Label className="font-semibold">Options:</Label>
                                  <div className="space-y-2 mt-2">
                                    {question.options.map((option, optIndex) => (
                                      <div 
                                        key={optIndex}
                                        className={`p-3 rounded border ${
                                          option === question.answer 
                                            ? 'bg-green-100 border-green-300 text-green-800' 
                                            : 'bg-white border-gray-300'
                                        }`}
                                      >
                                        <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}
                                        {option === question.answer && (
                                          <Badge className="ml-2" variant="default">Correct</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div>
                                <Label className="font-semibold">Marks: {question.marks}</Label>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Question Dialog */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Modify the question details below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={editingQuestion.subject.toLowerCase()}
                    onValueChange={(value) => setEditingQuestion(prev => 
                      prev ? { ...prev, subject: value.charAt(0).toUpperCase() + value.slice(1) } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject.charAt(0).toUpperCase() + subject.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={editingQuestion.type}
                    onValueChange={(value: 'option' | 'text') => setEditingQuestion(prev => 
                      prev ? { ...prev, type: value } : null
                    )}
                  >
                    <SelectTrigger>
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
                <Label>Question</Label>
                <Textarea
                  value={editingQuestion.questions}
                  onChange={(e) => setEditingQuestion(prev => 
                    prev ? { ...prev, questions: e.target.value } : null
                  )}
                  rows={3}
                />
              </div>

              {editingQuestion.type === 'option' && (
                <div className="space-y-4">
                  <Label>Options</Label>
                  {editingQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="font-medium w-6">{String.fromCharCode(65 + index)}.</span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(editingQuestion.options || [])];
                          newOptions[index] = e.target.value;
                          setEditingQuestion(prev => 
                            prev ? { ...prev, options: newOptions } : null
                          );
                        }}
                        className="flex-1"
                      />
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={editingQuestion.answer === option}
                        onChange={() => setEditingQuestion(prev => 
                          prev ? { ...prev, answer: option } : null
                        )}
                        className="w-4 h-4"
                      />
                      <Label className="text-sm">Correct</Label>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Marks</Label>
                <Input
                  type="number"
                  value={editingQuestion.marks}
                  onChange={(e) => setEditingQuestion(prev => 
                    prev ? { ...prev, marks: parseInt(e.target.value) || 1 } : null
                  )}
                  min="1"
                  className="w-24"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveQuestion}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Question Paper View */}
      {showPaperView && (
        <QuestionPaperView
          questions={questions}
          examConfig={examConfig}
          onClose={() => setShowPaperView(false)}
        />
      )}
    </div>
  );
}
