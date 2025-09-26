import { Question } from './CreateQuestions';
import { Button } from './ui/button';
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
        {/* Header with Logo and University Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-10 pb-6 sm:pb-8 border-b-2 sm:border-b-4 border-gray-300 relative">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"></div>
          {/* University Logo */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#2E3094] to-[#4C51BF] rounded-full flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#4C51BF] font-bold text-base sm:text-lg md:text-xl">DIU</span>
              </div>
            </div>
          </div>
          
          {/* University Details */}
          <div className="flex-1 text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3 tracking-wide leading-tight">
              Daffodil International University
            </h1>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-[#4C51BF] mb-2 leading-tight">
              Faculty of Science and Information Technology
            </h2>
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-700 mb-2 sm:mb-3 bg-gradient-to-r from-[#2E3094]/10 to-[#4C51BF]/10 px-3 sm:px-4 py-1 sm:py-2 rounded-lg inline-block">
              Admission Test, {examConfig.semester}
            </h3>
            <p className="text-sm sm:text-base text-gray-700 font-medium">
              <strong className="text-[#2E3094]">Subject:</strong> General Knowledge
            </p>
          </div>

          {/* Student Info Section */}
          <div className="w-full md:w-auto md:flex-shrink-0 text-center md:text-right space-y-3">
            <div className="border-2 border-[#4C51BF] rounded-lg p-3 sm:p-4 md:p-5 min-w-0 sm:min-w-[200px] md:min-w-[240px] bg-gradient-to-br from-blue-50 to-purple-50">
              <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-[#2E3094] text-left">Student's Name:</p>
              <div className="border-b-2 border-gray-400 h-6 sm:h-8 mb-3 sm:mb-4"></div>
              
              <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-[#2E3094] text-left">Serial No:</p>
              <div className="border-b-2 border-gray-400 h-6 sm:h-8 mb-3 sm:mb-4"></div>
              
              <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-[#2E3094] text-left">Department:</p>
              <div className="border-b-2 border-gray-400 h-6 sm:h-8"></div>
            </div>
            <div className="text-center md:text-right mt-4 sm:mt-6">
              <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                <p className="text-base sm:text-lg font-bold">Total Marks: {totalMarks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8 sm:mb-12">
          <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white p-4 sm:p-6 rounded-lg sm:rounded-xl mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
              <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[#4C51BF] font-bold text-sm">!</span>
              </span>
              <span className="leading-tight">Answer the following questions with (✓) mark</span>
            </h3>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-[#4C51BF]/30 p-4 sm:p-6 rounded-lg sm:rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm md:text-base">
              <div className="space-y-2">
                <p className="flex items-center gap-2 flex-wrap"><strong className="text-[#2E3094] whitespace-nowrap">Time:</strong> <span className="bg-white px-2 sm:px-3 py-1 rounded-full border border-gray-200 text-xs sm:text-sm">{examConfig.timeMinutes} minutes</span></p>
                <p className="flex items-center gap-2 flex-wrap"><strong className="text-[#2E3094] whitespace-nowrap">Total Questions:</strong> <span className="bg-white px-2 sm:px-3 py-1 rounded-full border border-gray-200 text-xs sm:text-sm">{questions.length}</span></p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 flex-wrap"><strong className="text-[#2E3094] whitespace-nowrap">Department:</strong> <span className="bg-white px-2 sm:px-3 py-1 rounded-full border border-gray-200 text-xs sm:text-sm">{examConfig.department}</span></p>
                <p className="flex items-center gap-2 flex-wrap"><strong className="text-[#2E3094] whitespace-nowrap">Total Marks:</strong> <span className="bg-white px-2 sm:px-3 py-1 rounded-full border border-gray-200 text-xs sm:text-sm">{totalMarks}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 bg-white transition-shadow">
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                      {index + 1}
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