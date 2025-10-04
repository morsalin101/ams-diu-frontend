import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertTriangle, RefreshCw, Eye, Calendar, User, MessageSquare, Search, Slash, FileText, Clock, Building2, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { examAPI } from '../services/api';

interface BlockedQuestion {
  id: number;
  subject: string;
  questions: string;
  type: 'option' | 'text';
  text?: string | null;
  options?: Record<string, string> | null;
  answer: string[] | string;
  marks: number;
  semester: string;
  department_shortname: string;
  original_question_id: number;
  remarks: string;
  creator: number;
  creator_username?: string;
  issue_solved: boolean;
  created_at: string;
  updated_at: string;
}

export function BlockedQuestions({ gradientClass }: { gradientClass: string }) {
  const [blockedQuestions, setBlockedQuestions] = useState<BlockedQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<BlockedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<BlockedQuestion | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { canRead } = usePermissions();

  useEffect(() => {
    if (canRead()) {
      loadBlockedQuestions();
    }
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [blockedQuestions, searchTerm, subjectFilter, statusFilter]);

  const filterQuestions = () => {
    let filtered = blockedQuestions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(question =>
        question.questions.toLowerCase().includes(term) ||
        question.subject.toLowerCase().includes(term) ||
        question.remarks.toLowerCase().includes(term) ||
        question.creator_username?.toLowerCase().includes(term)
      );
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(question => question.subject === subjectFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'solved') {
        filtered = filtered.filter(question => question.issue_solved);
      } else if (statusFilter === 'unsolved') {
        filtered = filtered.filter(question => !question.issue_solved);
      }
    }

    setFilteredQuestions(filtered);
  };

  const loadBlockedQuestions = async () => {
    setIsLoading(true);
    try {
      // Use the examAPI function with proper base URL
      const data = await examAPI.getAllBlockedQuestions();
      
      if (data.success && data.questions) {
        setBlockedQuestions(data.questions);
        toast.success(`Loaded ${data.count} blocked questions`);
      } else {
        throw new Error(data.message || 'Failed to load blocked questions');
      }
    } catch (error: any) {
      console.error('Error loading blocked questions:', error);
      toast.error(error.message || 'Failed to load blocked questions');
      setBlockedQuestions([]);
    } finally {
      setIsLoading(false);
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

  const openDetailsDialog = (question: BlockedQuestion) => {
    setSelectedQuestion(question);
    setShowDetailsDialog(true);
  };

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(blockedQuestions.map(q => q.subject)));

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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className={`rounded-lg p-4 sm:p-6 text-white bg-gradient-to-tr from-[#2E3094] to-[#4C51BF]`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8" />
          Blocked Questions
        </h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          View and review questions that have been blocked from exam generation.
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{filteredQuestions.length} questions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{filteredQuestions.filter(q => q.issue_solved).length} resolved</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Questions</Label>
              <Input
                id="search"
                placeholder="Search by question, subject, or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unsolved">Unsolved</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={loadBlockedQuestions} 
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
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
      ) : filteredQuestions.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="text-center py-8">
            <Slash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Blocked Questions</h3>
            <p className="text-gray-500">
              {blockedQuestions.length === 0 
                ? "No questions have been blocked yet."
                : "No questions match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
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
                        <span>Blocked by: {question.creator_username || `User ${question.creator}`}</span>
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
                      View Details
                    </Button>
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
                  <div className="space-y-2">
                    {typeof selectedQuestion.options === 'object' && selectedQuestion.options !== null ? (
                      Object.entries(selectedQuestion.options).map(([key, value]) => {
                        const correctAnswers = Array.isArray(selectedQuestion.answer) ? selectedQuestion.answer : [selectedQuestion.answer];
                        const isCorrect = correctAnswers.includes(key);
                        return (
                          <div key={key} className={`flex items-center gap-2 p-2 rounded ${
                            isCorrect ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                          }`}>
                            <span className="font-medium text-gray-700">{key})</span>
                            <span className={isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}>
                              {String(value)}
                            </span>
                            {isCorrect && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">✓ Correct</Badge>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-600">{String(selectedQuestion.options)}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Answer for text questions */}
              {selectedQuestion.type === 'text' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Answer:</h4>
                  <p className="text-gray-800">
                    {Array.isArray(selectedQuestion.answer) ? selectedQuestion.answer.join(', ') : selectedQuestion.answer}
                  </p>
                </div>
              )}

              {/* Blocking Details */}
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                <h4 className="font-semibold mb-2 text-red-800">Blocking Information:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Blocked by:</strong> {selectedQuestion.creator_username || `User ${selectedQuestion.creator}`}</p>
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
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setShowDetailsDialog(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit functionality removed for now */}
    </div>
  );
}