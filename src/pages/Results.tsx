import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FilePlus, 
  Search, 
  RefreshCw, 
  Eye, 
  BarChart3,
  User, 
  BookOpen,
  Calendar,
  Building2,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Target,
  Users,
  Trophy
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { examAPI } from '../services/api';

interface ResultsProps {
  gradientClass: string;
}

interface ExamResult {
  student_id: number;
  exam_id: number;
  student_name: string;
  exam_details: {
    department: string;
    semester: string;
    total_questions: number;
  };
  results: {
    correct_answers: number;
    wrong_answers: number;
    score_percentage: number;
  };
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    score_percentage: number;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: {
    pagination: {
      count: number;
      current_page: number;
      total_pages: number;
      page_size: number;
      has_next: boolean;
      has_previous: boolean;
    };
    results: ExamResult[];
    filters: {
      semester: string | null;
      teacher_id: number;
      teacher_name: string;
    };
  };
  message: string;
}

export function Results({ gradientClass }: ResultsProps) {
  const { user } = useAuth();
  const { canRead } = usePermissions();
  
  // State management
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog states
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Load exam results
  useEffect(() => {
    if (canRead() && user?.id) {
      loadExamResults();
    }
  }, [user?.id, currentPage]);

  // Filter results based on search and filters
  useEffect(() => {
    let filtered = examResults;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.exam_details.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.exam_details.semester.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Semester filter
    if (semesterFilter !== 'all') {
      filtered = filtered.filter(result => result.exam_details.semester === semesterFilter);
    }

    // Performance filter
    if (performanceFilter !== 'all') {
      filtered = filtered.filter(result => {
        const score = result.results.score_percentage;
        switch (performanceFilter) {
          case 'excellent': return score >= 90;
          case 'good': return score >= 80 && score < 90;
          case 'average': return score >= 60 && score < 80;
          case 'below-average': return score >= 40 && score < 60;
          case 'poor': return score < 40;
          default: return true;
        }
      });
    }

    setFilteredResults(filtered);
  }, [examResults, searchTerm, semesterFilter, performanceFilter]);

  const loadExamResults = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await examAPI.getAllResultsByTeacher(user.id);
      
      if (data.success) {
        setExamResults(data.data.results);
        setTotalPages(data.data.pagination.total_pages);
        setTotalCount(data.data.pagination.count);
        setCurrentPage(data.data.pagination.current_page);
        toast.success(data.message || `Loaded ${data.data.results.length} exam results`);
      } else {
        throw new Error(data.message || 'Failed to load exam results');
      }
    } catch (error: any) {
      console.error('Error loading exam results:', error);
      toast.error(error.message || 'Failed to load exam results');
      setExamResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openResultDialog = (result: ExamResult) => {
    setSelectedResult(result);
    setShowResultDialog(true);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 60) return 'Average';
    if (percentage >= 40) return 'Below Average';
    return 'Poor';
  };

  const getPerformanceBadgeIcon = (percentage: number) => {
    if (percentage >= 90) return Trophy;
    if (percentage >= 80) return Award;
    if (percentage >= 60) return Target;
    return AlertTriangle;
  };

  // Get unique values for filters
  const uniqueSemesters = Array.from(new Set(examResults.map(r => r.exam_details.semester)));

  // Calculate statistics
  const averageScore = examResults.length > 0 
    ? examResults.reduce((sum, result) => sum + result.results.score_percentage, 0) / examResults.length 
    : 0;
  const excellentCount = examResults.filter(r => r.results.score_percentage >= 90).length;
  const goodCount = examResults.filter(r => r.results.score_percentage >= 80 && r.results.score_percentage < 90).length;
  const totalStudents = examResults.length;

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 flex items-center gap-3">
          <FilePlus className="h-8 w-8" />
          Exam Results
        </h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Comprehensive analysis of student exam performance and results.
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{totalStudents} students</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>{formatPercentage(averageScore)} avg</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{excellentCount} excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span>{goodCount} good</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
            <div className="text-xs text-blue-700">Total Students</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{excellentCount}</div>
            <div className="text-xs text-purple-700">Excellent (90%+)</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{goodCount}</div>
            <div className="text-xs text-green-700">Good (80-89%)</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">{formatPercentage(averageScore)}</div>
            <div className="text-xs text-yellow-700">Average Score</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-indigo-600">
              {formatPercentage(totalStudents > 0 ? (examResults.filter(r => r.results.score_percentage >= 60).length / totalStudents) * 100 : 0)}
            </div>
            <div className="text-xs text-indigo-700">Pass Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Students</Label>
              <Input
                id="search"
                placeholder="Search by name, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {uniqueSemesters.map(semester => (
                    <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performance">Performance</Label>
              <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All performance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Performance</SelectItem>
                  <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                  <SelectItem value="good">Good (80-89%)</SelectItem>
                  <SelectItem value="average">Average (60-79%)</SelectItem>
                  <SelectItem value="below-average">Below Average (40-59%)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={loadExamResults} 
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

      {/* Results List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading exam results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="text-center py-8">
              <FilePlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Results Found</h3>
              <p className="text-gray-500">
                {examResults.length === 0 
                  ? "No exam results available yet."
                  : "No results match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredResults.map((result) => {
              const PerformanceIcon = getPerformanceBadgeIcon(result.results.score_percentage);
              return (
                <Card key={`${result.student_id}-${result.exam_id}`} className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-gray-500" />
                          <span className="font-semibold text-lg">{result.student_name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getPerformanceColor(result.results.score_percentage)} font-medium`}
                        >
                          <PerformanceIcon className="h-3 w-3 mr-1" />
                          {formatPercentage(result.results.score_percentage)}
                        </Badge>
                        <Button
                          onClick={() => openResultDialog(result)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                        <div className="font-bold text-green-600">{result.results.correct_answers}</div>
                        <div className="text-xs text-green-700">Correct</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                        <div className="font-bold text-red-600">{result.results.wrong_answers}</div>
                        <div className="text-xs text-red-700">Wrong</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <div className="font-bold text-blue-600">{result.exam_details.total_questions}</div>
                        <div className="text-xs text-blue-700">Total</div>
                      </div>
                    </div>

                    {/* Exam Info */}
                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{result.exam_details.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{result.exam_details.semester}</span>
                      </div>
                    </div>

                    {/* Top Subjects Preview */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Subject Performance:</h4>
                      <div className="space-y-1">
                        {result.subjects
                          .sort((a, b) => b.score_percentage - a.score_percentage)
                          .slice(0, 2)
                          .map((subject) => (
                            <div key={subject.subject_id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{subject.subject_name}</span>
                              <Badge 
                                variant="outline" 
                                className={`${getPerformanceColor(subject.score_percentage)} text-xs`}
                              >
                                {formatPercentage(subject.score_percentage)}
                              </Badge>
                            </div>
                          ))}
                        {result.subjects.length > 2 && (
                          <div className="text-xs text-gray-500 text-center mt-1">
                            +{result.subjects.length - 2} more subjects
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Result Details Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Result Analysis
            </DialogTitle>
            <DialogDescription>
              Complete performance breakdown for {selectedResult?.student_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6">
              {/* Student Overview */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {selectedResult.student_name}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>Department:</strong> {selectedResult.exam_details.department}</p>
                        <p><strong>Semester:</strong> {selectedResult.exam_details.semester}</p>
                        <p><strong>Total Questions:</strong> {selectedResult.exam_details.total_questions}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getPerformanceColor(selectedResult.results.score_percentage)}`}>
                        {React.createElement(getPerformanceBadgeIcon(selectedResult.results.score_percentage), { className: "h-5 w-5" })}
                        <div>
                          <div className="font-bold text-lg">{formatPercentage(selectedResult.results.score_percentage)}</div>
                          <div className="text-xs">{getPerformanceLabel(selectedResult.results.score_percentage)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Performance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{selectedResult.results.correct_answers}</div>
                    <div className="text-sm text-green-700">Correct Answers</div>
                  </CardContent>
                </Card>
                
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{selectedResult.results.wrong_answers}</div>
                    <div className="text-sm text-red-700">Wrong Answers</div>
                  </CardContent>
                </Card>
                
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{formatPercentage(selectedResult.results.score_percentage)}</div>
                    <div className="text-sm text-blue-700">Overall Score</div>
                  </CardContent>
                </Card>
              </div>

              {/* Subject-wise Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Subject-wise Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedResult.subjects
                      .sort((a, b) => b.score_percentage - a.score_percentage)
                      .map((subject) => {
                        const SubjectIcon = getPerformanceBadgeIcon(subject.score_percentage);
                        return (
                          <div key={subject.subject_id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-500" />
                                {subject.subject_name}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`${getPerformanceColor(subject.score_percentage)} font-medium`}
                              >
                                <SubjectIcon className="h-3 w-3 mr-1" />
                                {formatPercentage(subject.score_percentage)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-xs text-center">
                              <div className="bg-white p-2 rounded">
                                <div className="font-semibold">{subject.total_questions}</div>
                                <div className="text-gray-600">Total</div>
                              </div>
                              <div className="bg-green-100 p-2 rounded">
                                <div className="font-semibold text-green-600">{subject.correct_answers}</div>
                                <div className="text-gray-600">Correct</div>
                              </div>
                              <div className="bg-red-100 p-2 rounded">
                                <div className="font-semibold text-red-600">{subject.wrong_answers}</div>
                                <div className="text-gray-600">Wrong</div>
                              </div>
                              <div className="bg-blue-100 p-2 rounded">
                                <div className="font-semibold text-blue-600">
                                  {subject.total_questions - subject.correct_answers - subject.wrong_answers}
                                </div>
                                <div className="text-gray-600">Skipped</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}