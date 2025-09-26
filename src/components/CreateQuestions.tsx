import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Plus, Edit, Eye, Trash2, X, Save, FileText, Settings, BarChart3, HelpCircle, Clock, Award, Building, Calendar } from 'lucide-react';
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
    <div className="space-y-4 sm:space-y-6">
      <div className={`bg-gradient-to-r from-[#4C51BF] to-[#667EEA] ${gradientClass} rounded-lg p-4 sm:p-6 text-white`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Create Questions</h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Configure exam parameters and manage questions for your courses.
        </p>
      </div>

      {/* Exam Configuration */}
      <Card className="border-2 border-gray-200 mb-6 sm:mb-8">
        <CardHeader className="pb-4 sm:pb-6 border-b border-gray-100 bg-gradient-to-r from-[#2E3094]/10 to-[#4C51BF]/10 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-white rounded-lg border border-gray-100">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-[#4C51BF]" />
            </div>
            <span className="leading-tight">Exam Configuration</span>
          </CardTitle>
          <CardDescription className="text-gray-600 font-medium mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed">
            Set up the basic parameters for your exam with precision and clarity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8 pt-4 sm:pt-6 p-4 sm:p-6">
          {/* Subject Percentages */}
          <div className="bg-gradient-to-br from-[#2E3094]/5 to-[#4C51BF]/10 p-4 sm:p-6 rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-gray-100">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#2E3094]" />
              </div>
              <Label className="text-lg sm:text-xl font-bold text-gray-800">Subject Distribution</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {subjects.map(subject => (
                <div key={subject} className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"></div>
                    <Label htmlFor={subject} className="capitalize font-bold text-gray-800 text-sm sm:text-base">{subject}</Label>
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <Input
                      id={subject}
                      type="number"
                      min="0"
                      max="100"
                      value={subjectPercentages[subject as keyof typeof subjectPercentages]}
                      onChange={(e) => handleSubjectPercentageChange(subject, e.target.value)}
                      className="w-20 sm:w-24 h-10 sm:h-12 text-center font-bold text-lg sm:text-xl border-2 border-gray-200 focus:border-[#4C51BF]"
                    />
                    <span className="text-base sm:text-lg text-gray-600 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-base sm:text-lg font-bold text-gray-700">Total Distribution:</span>
                <Badge 
                  variant={totalPercentage === 100 ? "default" : "destructive"} 
                  className={`font-bold text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2 ${
                    totalPercentage === 100 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                >
                  {totalPercentage}%
                </Badge>
              </div>
              {totalPercentage !== 100 && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs sm:text-sm text-red-600 font-semibold">Must equal 100%</span>
                </div>
              )}
            </div>
          </div>

          {/* Exam Details */}
          <div className="bg-gradient-to-br from-[#4C51BF]/5 to-[#667EEA]/10 p-4 sm:p-6 rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-6">
              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-gray-100">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#4C51BF]" />
              </div>
              <Label className="text-lg sm:text-xl font-bold text-gray-800">Exam Details</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 text-[#4C51BF]" />
                  <Label htmlFor="questions" className="font-semibold text-gray-700 text-sm sm:text-base leading-tight">Total Questions</Label>
                </div>
                <Input
                  id="questions"
                  type="number"
                  value={examConfig.totalQuestions}
                  onChange={(e) => setExamConfig(prev => ({
                    ...prev,
                    totalQuestions: parseInt(e.target.value) || 0
                  }))}
                  className="font-bold text-center text-base border-2 border-gray-200 focus:border-[#4C51BF] h-10"
                />
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-[#2E3094]" />
                  <Label htmlFor="time" className="font-semibold text-gray-700 text-sm sm:text-base leading-tight">Time (minutes)</Label>
                </div>
                <Input
                  id="time"
                  type="number"
                  value={examConfig.timeMinutes}
                  onChange={(e) => setExamConfig(prev => ({
                    ...prev,
                    timeMinutes: parseInt(e.target.value) || 0
                  }))}
                  className="font-bold text-center text-base border-2 border-gray-200 focus:border-[#2E3094] h-10"
                />
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-3 w-3 sm:h-4 sm:w-4 text-[#667EEA]" />
                  <Label htmlFor="marks" className="font-semibold text-gray-700 text-sm sm:text-base leading-tight">Total Marks</Label>
                </div>
                <Input
                  id="marks"
                  type="number"
                  value={examConfig.totalMarks}
                  onChange={(e) => setExamConfig(prev => ({
                    ...prev,
                    totalMarks: parseInt(e.target.value) || 0
                  }))}
                  className="font-bold text-center text-base border-2 border-gray-200 focus:border-[#667EEA] h-10"
                />
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-3 w-3 sm:h-4 sm:w-4 text-[#4C51BF]" />
                  <Label htmlFor="department" className="font-semibold text-gray-700 text-sm sm:text-base leading-tight">Department</Label>
                </div>
                <Select
                  value={examConfig.department}
                  onValueChange={(value) => setExamConfig(prev => ({
                    ...prev,
                    department: value
                  }))}
                >
                  <SelectTrigger className="font-bold h-10 border-2 border-gray-200 focus:border-[#4C51BF] text-sm sm:text-base">
                    <SelectValue placeholder="Select dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-[#2E3094]" />
                  <Label htmlFor="semester" className="font-semibold text-gray-700 text-sm sm:text-base leading-tight">Semester</Label>
                </div>
                <Select
                  value={examConfig.semester}
                  onValueChange={(value) => setExamConfig(prev => ({
                    ...prev,
                    semester: value
                  }))}
                >
                  <SelectTrigger className="font-bold h-10 border-2 border-gray-200 focus:border-[#2E3094] text-sm sm:text-base">
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
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleCreateExam}
              disabled={totalPercentage !== 100 || !examConfig.department || !examConfig.semester}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base font-bold bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 text-white"
            >
              Create Exam
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Management */}
      {showQuestions && (
        <Card className="border-2 border-gray-200 shadow-lg mb-6 sm:mb-8">
          <CardHeader className="pb-4 sm:pb-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <span className="leading-tight">Generated Questions</span>
                </CardTitle>
                <CardDescription className="text-gray-600 font-medium mt-1 sm:mt-2 text-sm sm:text-base">
                  Review and manage your exam questions
                </CardDescription>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <Button onClick={() => setShowPaperView(true)} variant="default" size="sm" className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold shadow-md text-xs sm:text-sm">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View Paper</span>
                  <span className="sm:hidden">View</span>
                </Button>
                <Button onClick={handleAddNewQuestion} variant="outline" size="sm" className="flex-1 sm:flex-none border-2 border-gray-300 hover:border-blue-400 font-semibold text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Question</span>
                  <span className="sm:hidden">Add</span>
                </Button>
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
                        <Input
                          type="number"
                          value={question.marks}
                          onChange={(e) => {
                            const newMarks = parseInt(e.target.value) || 1;
                            setQuestions(prev => 
                              prev.map(q => q.id === question.id ? { ...q, marks: newMarks } : q)
                            );
                          }}
                          className="w-14 sm:w-16 h-7 sm:h-8 text-center font-bold border-2 border-gray-200 text-sm"
                          min="1"
                        />
                      </div>
                      
                      <div className="flex flex-row lg:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                          className="border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 p-2"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        
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

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 p-2"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
                    value={editingQuestion.subject.toLowerCase()}
                    onValueChange={(value) => setEditingQuestion(prev => 
                      prev ? { ...prev, subject: value.charAt(0).toUpperCase() + value.slice(1) } : null
                    )}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
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
                          checked={editingQuestion.answer === option}
                          onChange={() => setEditingQuestion(prev => 
                            prev ? { ...prev, answer: option } : null
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
                  onClick={handleSaveQuestion}
                  className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] font-semibold text-white text-sm sm:text-base h-9 sm:h-10"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
