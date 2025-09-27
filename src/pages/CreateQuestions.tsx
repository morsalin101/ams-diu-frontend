import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Settings, BarChart3, HelpCircle, Clock, Award, Building, Calendar, Loader2, FileText, Plus, X, Edit, Eye, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { QuestionManager, Question } from '../components/QuestionManager';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';

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
    Mathematics: 0,
    English: 0,
    Bangla: 0,
    GK: 0,
    Chemistry: 0,
    Physics: 0
  });

  const [examConfig, setExamConfig] = useState({
    totalQuestions: 50,
    timeMinutes: 120,
    totalMarks: 100,
    department: '',
    semester: ''
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsCount, setQuestionsCount] = useState<number>(0);

  const [showQuestions, setShowQuestions] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [examId, setExamId] = useState<number | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const subjects = ['Mathematics', 'English', 'Bangla', 'GK', 'Chemistry', 'Physics'];
  const departments = ['CSE', 'EEE', 'BBA', 'Pharmacy', 'Architecture', 'English'];
  const semesters = ['Spring25', 'Summer25', 'Fall25', 'Spring26', 'Summer26'];

  const handleSubjectPercentageChange = (subject: string, value: string) => {
    setSubjectPercentages(prev => ({
      ...prev,
      [subject]: parseInt(value) || 0
    }));
  };

  const handleCreateExam = async () => {
    setIsLoading(true);
    
    try {
      // Prepare API payload - only include subjects with values > 0
      const subjects: { [key: string]: number } = {};
      
      // Add subjects from our form that have values > 0
      Object.entries(subjectPercentages).forEach(([key, value]) => {
        if (value > 0) {
          subjects[key] = value;
        }
      });
      
      // If no subjects selected, show error
      if (Object.keys(subjects).length === 0) {
        toast.error('Please select at least one subject with a percentage > 0');
        setIsLoading(false);
        return;
      }

      const examData = {
        department: examConfig.department,
        semester: examConfig.semester,
        total_questions: examConfig.totalQuestions,
        duration_minutes: examConfig.timeMinutes,
        subject_distribution: subjects,
        except_semesters: [] // Add logic for this if needed
      };
      
      // Call API to create exam
      const response = await examAPI.createExam(examData);
      
      setExamId(response.exam_id);
      toast.success(`Exam created successfully! ID: ${response.exam_id}`);
      
      // Load questions for the created exam
      await loadExamQuestions(response.exam_id);
      
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Failed to create exam: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadExamQuestions = async (examId: number) => {
    setIsLoadingQuestions(true);
    
    try {
      const response = await examAPI.getExamQuestions(examId);
      
      // Handle paginated response - extract results array and count
      const questionsData = response.results || response;
      const totalCount = response.count || questionsData.length;
      
      // Store the count
      setQuestionsCount(totalCount);
      
      // Transform API response to match our Question interface
      const transformedQuestions = questionsData.map((q: any) => {
        // Transform options from object to array format
        let optionsArray = [];
        if (q.options && typeof q.options === 'object') {
          optionsArray = Object.values(q.options);
        } else if (Array.isArray(q.options)) {
          optionsArray = q.options;
        }
        
        // Parse answer if it's a JSON string
        let answer = q.answer;
        if (typeof answer === 'string' && answer.startsWith('[')) {
          try {
            const parsed = JSON.parse(answer);
            answer = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (e) {
            // Keep original if parsing fails
          }
        }
        
        return {
          id: q.id,
          subject: q.subject || 'General',
          questions: q.question_text || '',
          type: q.type === 'option' ? 'option' : 'text',
          options: optionsArray,
          answer: answer,
          marks: q.marks || 1
        };
      });
      
      setQuestions(transformedQuestions);
      setShowQuestions(true);
      toast.success(`Loaded ${transformedQuestions.length} questions`);
      
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsLoadingQuestions(false);
    }
  };



  const handleResetExam = () => {
    setExamId(null);
    setQuestions([]);
    setQuestionsCount(0);
    setShowQuestions(false);
    setExamConfig({
      totalQuestions: 50,
      timeMinutes: 120,
      totalMarks: 100,
      department: '',
      semester: ''
    });
    setSubjectPercentages({
      Mathematics: 0,
      English: 0,
      Bangla: 0,
      GK: 0,
      Chemistry: 0,
      Physics: 0
    });
    toast.success('Exam cleared successfully');
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
              disabled={totalPercentage !== 100 || !examConfig.department || !examConfig.semester || isLoading}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base font-bold bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Exam...
                </>
              ) : (
                'Create Exam'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Management using QuestionManager */}
      {showQuestions && (
        <QuestionManager
          examId={examId}
          questions={questions}
          questionsCount={questionsCount}
          isLoadingQuestions={isLoadingQuestions}
          onQuestionsChange={setQuestions}
          onQuestionCountChange={setQuestionsCount}
          examConfig={examConfig}
          subjectPercentages={subjectPercentages}
          showPaperView={showPaperView}
          onShowPaperViewChange={setShowPaperView}
          showResetButton={true}
          onReset={handleResetExam}
          title="Generated Questions"
        />
      )}
    </div>
  );
}
