import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertTriangle, RefreshCw, CheckCircle, Eye, Calendar, User, MessageSquare } from 'lucide-react';
import { examAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

interface BlockedQuestion {
  id: number;
  subject: string;
  questions: string;
  type: string;
  text?: string;
  options?: string;
  answer: string;
  marks: number;
  semester: string;
  department_shortname: string;
  original_question_id: number;
  remarks: string;
  creator: number;
  creator_username: string;
  issue_solved: boolean;
  created_at: string;
  updated_at: string;
}

const BlockedQuestions: React.FC = () => {
  const [blockedQuestions, setBlockedQuestions] = useState<BlockedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<BlockedQuestion | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { canRead, canWrite } = usePermissions();

  useEffect(() => {
    if (canRead()) {
      loadBlockedQuestions();
    }
  }, [canRead]);

  const loadBlockedQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await examAPI.getBlockedQuestions();
      
      // Handle both array response and object response
      const questions = Array.isArray(response) ? response : (response.data || []);
      setBlockedQuestions(questions);
    } catch (error: any) {
      console.error('Error loading blocked questions:', error);
      toast.error('Failed to load blocked questions');
      setBlockedQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockQuestion = async (question: BlockedQuestion) => {
    if (!canWrite()) {
      toast.error('You do not have permission to unblock questions');
      return;
    }

    try {
      const response = await examAPI.unblockQuestion({
        question_id: question.original_question_id
      });

      if (response && (response.success !== false)) {
        toast.success('Question unblocked successfully');
        loadBlockedQuestions(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to unblock question');
      }
    } catch (error: any) {
      console.error('Error unblocking question:', error);
      toast.error(error.message || 'Failed to unblock question');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseOptions = (optionsString: string) => {
    try {
      return JSON.parse(optionsString);
    } catch {
      return optionsString ? optionsString.split(',') : [];
    }
  };

  const openDetailsDialog = (question: BlockedQuestion) => {
    setSelectedQuestion(question);
    setShowDetailsDialog(true);
  };

  // Permission check
  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-lg p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Blocked Questions</h1>
        <p className="text-white/90 leading-relaxed">
          Manage questions that have been blocked due to issues or concerns.
        </p>
      </div>

      {/* Actions Bar */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-gray-800">
                Total Blocked Questions: {blockedQuestions.length}
              </span>
            </div>
            <Button
              onClick={loadBlockedQuestions}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Questions List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading blocked questions...</p>
          </div>
        </div>
      ) : blockedQuestions.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No blocked questions</h3>
          <p className="text-gray-600">All questions are currently available for use.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {blockedQuestions.map((question) => (
            <Card key={question.id} className="border-2 border-red-100 bg-red-50/30">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Question Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-white">
                        {question.subject}
                      </Badge>
                      <Badge variant="secondary">
                        {question.marks} marks
                      </Badge>
                      <Badge variant="outline">
                        {question.department_shortname}
                      </Badge>
                      <Badge variant="outline">
                        {question.semester}
                      </Badge>
                      {question.issue_solved && (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Issue Solved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="font-medium text-gray-800 mb-2 line-clamp-2">
                      {question.questions}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Blocked by: {question.creator_username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(question.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 italic">
                        "{question.remarks}"
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2">
                    <Button
                      onClick={() => openDetailsDialog(question)}
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    
                    {canWrite() && (
                      <Button
                        onClick={() => handleUnblockQuestion(question)}
                        variant="outline"
                        size="sm"
                        className="flex-1 lg:flex-none border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Unblock
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Question Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Blocked Question Details</DialogTitle>
            <DialogDescription>
              Review the complete question information and blocking details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-4">
              {/* Question Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedQuestion.subject}</Badge>
                  <Badge variant="secondary">{selectedQuestion.marks} marks</Badge>
                  <Badge variant="outline">{selectedQuestion.department_shortname}</Badge>
                  <Badge variant="outline">{selectedQuestion.semester}</Badge>
                  <Badge variant="outline">Type: {selectedQuestion.type}</Badge>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Question:</h4>
                  <p className="text-gray-800">{selectedQuestion.questions}</p>
                </div>
              </div>

              {/* Options for multiple choice */}
              {selectedQuestion.type === 'option' && selectedQuestion.options && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Options:</h4>
                  <div className="space-y-1">
                    {parseOptions(selectedQuestion.options).map((option: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="font-medium">
                          {String.fromCharCode(65 + index)})
                        </span>
                        <span className={option === selectedQuestion.answer ? 'font-semibold text-green-600' : ''}>
                          {option}
                        </span>
                        {option === selectedQuestion.answer && (
                          <Badge variant="outline" className="text-xs">Correct</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer for text questions */}
              {selectedQuestion.type === 'text' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Answer:</h4>
                  <p className="text-gray-800">{selectedQuestion.answer}</p>
                </div>
              )}

              {/* Blocking Details */}
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                <h4 className="font-semibold mb-2 text-red-800">Blocking Information:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Blocked by:</strong> {selectedQuestion.creator_username}</p>
                  <p><strong>Date:</strong> {formatDate(selectedQuestion.created_at)}</p>
                  <p><strong>Remarks:</strong> {selectedQuestion.remarks}</p>
                  <p>
                    <strong>Status:</strong> 
                    <Badge className={selectedQuestion.issue_solved ? 'bg-green-500 ml-2' : 'bg-red-500 ml-2'}>
                      {selectedQuestion.issue_solved ? 'Issue Solved' : 'Pending'}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Actions */}
              {canWrite() && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={() => setShowDetailsDialog(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleUnblockQuestion(selectedQuestion);
                      setShowDetailsDialog(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Unblock Question
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlockedQuestions;