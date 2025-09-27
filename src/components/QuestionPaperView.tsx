import { useState } from 'react';
import { Question } from './CreateQuestions';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';

interface QuestionPaperViewProps {
  questions: Question[];
  examConfig: {
    totalQuestions: number;
    timeMinutes: number;
    totalMarks: number;
    department: string;
    semester: string;
  };
  onClose: () => void;
}

export function QuestionPaperView({ questions, examConfig, onClose }: QuestionPaperViewProps) {
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  
  // Group questions by subject
  const questionsBySubject = questions.reduce((acc, question, index) => {
    const subject = question.subject;
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push({ ...question, originalIndex: index });
    return acc;
  }, {} as Record<string, (Question & { originalIndex: number })[]>);
  
  const subjects = Object.keys(questionsBySubject);
  const [activeTab, setActiveTab] = useState(subjects[0] || 'All');
  
  // Show all questions if 'All' tab is selected or if there's only one subject
  const shouldShowAllQuestions = activeTab === 'All' || subjects.length <= 1;
  const displayQuestions = shouldShowAllQuestions 
    ? questions.map((q, index) => ({ ...q, originalIndex: index }))
    : questionsBySubject[activeTab] || [];
  
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header Controls */}
      <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] border-b-2 border-gray-300 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 md:gap-3">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#4C51BF] font-bold text-xs md:text-sm">Q</span>
          </div>
          <span className="hidden sm:inline">Question Paper Preview</span>
          <span className="sm:hidden">Paper Preview</span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 border border-white/30 p-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Question Paper Content */}
      <div className="max-w-4xl mx-auto p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 p-3 sm:p-6 lg:p-8">
        
          {/* Header with Logo and University Info - UPDATED DESIGN */}
          <div className="flex items-center justify-between pb-4 sm:pb-6 border-b-2 border-gray-500">
            {/* Left Section: Logo and University Info */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* University Logo (Placeholder) */}
              <img src="/diu_logo.png" alt="DIU Logo" className="w-16 h-16 sm:w-20 sm:h-20" />
              
              {/* University Details */}
              <div className="text-left">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                  Daffodil International University
                </h1>
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700 leading-tight mt-1">
                  Faculty of Science and Information Technology
                </h2>
                <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-600 mt-1">
                  Admission Test {examConfig.semester}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mt-1">
                  <strong className="text-gray-800">Sub:</strong> General Knowledge
                </p>
              </div>
            </div>

            {/* Right Section: Student and Total Marks Info */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm sm:text-base text-gray-700 font-semibold leading-tight">Student's Name:</p>
              <p className="text-sm sm:text-base text-gray-700 font-semibold leading-tight mt-2">Serial No:</p>
              <p className="text-sm sm:text-base text-gray-700 font-semibold leading-tight mt-2">Department:</p>
              <p className="text-sm sm:text-base text-gray-800 font-bold mt-4">
                Total Marks: {totalMarks}
              </p>
            </div>
          </div>
          
          {/* Instructions and other info - ADJUSTED DESIGN */}
          <div className="my-6 sm:my-8">
            <div className="border-b-2 border-gray-500 pb-2">
              <p className="text-sm sm:text-base font-medium text-gray-800">
                Answer the following questions with a (✓) mark.
              </p>
            </div>
          </div>
          
          {/* Subject Tabs */}
          {subjects.length > 1 && (
            <div className="mb-8 sm:mb-12">
              <div className="border-b-2 border-gray-200">
                <div className="flex flex-wrap gap-2 pb-4">
                  <button
                    onClick={() => setActiveTab('All')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                      activeTab === 'All'
                        ? 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white border-b-2 border-transparent'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-2 border-transparent hover:border-gray-300'
                    }`}
                  >
                    All Questions ({questions.length})
                  </button>
                  {subjects.map((subject) => {
                    const subjectQuestions = questionsBySubject[subject];
                    const subjectMarks = subjectQuestions.reduce((sum, q) => sum + q.marks, 0);
                    return (
                      <button
                        key={subject}
                        onClick={() => setActiveTab(subject)}
                        className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-lg font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 ${
                          activeTab === subject
                            ? 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white border-b-2 border-transparent'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-2 border-transparent hover:border-gray-300'
                        }`}
                      >
                        <span>{subject}</span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            activeTab === subject
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {subjectQuestions.length}q • {subjectMarks}m
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Tab Content */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#4C51BF]/30 p-4 sm:p-6 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg sm:text-xl font-bold text-[#2E3094]">
                    {shouldShowAllQuestions ? 'All Questions' : activeTab}
                  </h3>
                  <Badge variant="outline" className="bg-white border-[#4C51BF] text-[#2E3094]">
                    {displayQuestions.length} Questions
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base font-semibold text-[#2E3094]">
                    Total Marks: {displayQuestions.reduce((sum, q) => sum + q.marks, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6 sm:space-y-8">
            {displayQuestions.map((question, index) => (
              <div key={question.id} className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 bg-white transition-shadow">
                {/* Question Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                        {shouldShowAllQuestions ? question.originalIndex + 1 : `${activeTab.charAt(0)}${index + 1}`}
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-gray-800 leading-tight">
                        {question.questions}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-10 sm:ml-11">
                      <span className="text-xs sm:text-sm bg-gradient-to-r from-[#4C51BF]/20 to-[#667EEA]/20 text-[#2E3094] px-2 sm:px-3 py-1 rounded-full font-semibold border border-[#4C51BF]/30">
                        {question.subject}
                      </span>
                      <span className="text-xs sm:text-sm bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full font-medium border border-gray-300">
                        {question.type === 'option' ? 'Multiple Choice' : 'Text Answer'}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white px-3 sm:px-4 py-2 rounded-lg inline-block">
                      <span className="text-xs sm:text-sm font-bold">
                        Marks: {question.marks}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question Content */}
                {question.type === 'option' && question.options ? (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-4 sm:mt-6 ml-10 sm:ml-11">
                    {question.options.map((option, optIndex) => (
                      <div 
                        key={optIndex}
                        className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-[#4C51BF]/50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                      >
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-[#4C51BF] rounded-full flex items-center justify-center flex-shrink-0 bg-white mt-0.5">
                          <span className="text-xs sm:text-sm font-bold text-[#2E3094]">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                        </div>
                        <span className="text-sm sm:text-base text-gray-800 font-medium leading-relaxed">{option}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 sm:mt-6 ml-10 sm:ml-11">
                    <div className="border-2 border-gray-200 rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[120px] bg-gradient-to-br from-gray-50 to-blue-50">
                      <p className="text-xs sm:text-sm text-[#2E3094] mb-3 sm:mb-4 font-semibold">Answer:</p>
                      <div className="space-y-3 sm:space-y-4">
                        {[1, 2, 3, 4].map((line) => (
                          <div key={line} className="border-b-2 border-gray-400 h-6 sm:h-8"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t-2 sm:border-t-4 border-gray-300 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"></div>
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="text-center">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-orange-400 p-3 sm:p-4 rounded-r-lg">
                  <p className="text-sm sm:text-base text-gray-800 font-semibold">
                    <strong className="text-orange-600">Note:</strong> Please mark your answers clearly and completely.
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white px-4 sm:px-6 py-3 rounded-lg inline-block">
                  <p className="text-sm sm:text-base font-bold mb-1">
                    <strong>Time Allowed:</strong> {examConfig.timeMinutes} minutes
                  </p>
                  <p className="text-sm sm:text-base font-bold">
                    <strong>Full Marks:</strong> {totalMarks}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}