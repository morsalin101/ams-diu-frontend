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
      <div className="sticky top-0 bg-white border-b border-gray-200 px-3 md:px-6 py-3 flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold">Question Paper Preview</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Question Paper Content */}
      <div className="max-w-4xl mx-auto p-3 md:p-6 lg:p-8 bg-white">
        {/* Header with Logo and University Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-gray-800">
          {/* University Logo */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm md:text-lg">DIU</span>
              </div>
            </div>
          </div>
          
          {/* University Details */}
          <div className="flex-1 text-center">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 mb-2">
              Daffodil International University
            </h1>
            <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-1">
              Faculty of Science and Information Technology
            </h2>
            <h3 className="text-base font-medium text-gray-600 mb-2">
              Admission Test, {examConfig.semester}
            </h3>
            <p className="text-sm text-gray-600">
              <strong>Sub:</strong> General Knowledge
            </p>
          </div>

          {/* Student Info Section */}
          <div className="w-full md:w-auto md:flex-shrink-0 text-center md:text-right space-y-2">
            <div className="border border-gray-300 p-2 md:p-3 min-w-[180px] md:min-w-[200px]">
              <p className="text-sm font-medium mb-2">Student's Name:</p>
              <div className="border-b border-gray-300 h-6 mb-3"></div>
              
              <p className="text-sm font-medium mb-2">Serial No:</p>
              <div className="border-b border-gray-300 h-6 mb-3"></div>
              
              <p className="text-sm font-medium mb-2">Department:</p>
              <div className="border-b border-gray-300 h-6"></div>
            </div>
            <div className="text-right mt-4">
              <p className="text-lg font-bold">Total Marks: {totalMarks}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 underline">
            Answer the following questions with (✓) mark
          </h3>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
              <div>
                <p><strong>Time:</strong> {examConfig.timeMinutes} minutes</p>
                <p><strong>Total Questions:</strong> {questions.length}</p>
              </div>
              <div>
                <p><strong>Department:</strong> {examConfig.department}</p>
                <p><strong>Total Marks:</strong> {totalMarks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-300 rounded-lg p-4">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-800">
                    {index + 1}. {question.questions}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {question.subject}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {question.type === 'option' ? 'Multiple Choice' : 'Text Answer'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-600">
                    Marks: {question.marks}
                  </span>
                </div>
              </div>

              {/* Question Content */}
              {question.type === 'option' && question.options ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-3 md:mt-4">
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
                    >
                      <div className="w-6 h-6 border-2 border-gray-300 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{option}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="border border-gray-300 rounded p-4 min-h-[80px] bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2">Answer:</p>
                    <div className="space-y-2">
                      {[1, 2, 3].map((line) => (
                        <div key={line} className="border-b border-gray-300 h-6"></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Please mark your answers clearly and completely.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                <strong>Time Allowed:</strong> {examConfig.timeMinutes} minutes
              </p>
              <p className="text-sm text-gray-600">
                <strong>Full Marks:</strong> {totalMarks}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}