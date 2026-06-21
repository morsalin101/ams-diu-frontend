import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileCheck, 
  Search, 
  RefreshCw, 
  BarChart3,
  BookOpen,
  Calendar,
  Building2,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { usePermissions } from '../hooks/usePermissions';
import { formatSemesterLabel, sortSemesterValues } from '../lib/semester';
import toast from 'react-hot-toast';
import { admissionResultsAPI, examAPI } from '../services/api';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';

interface PublishedExamsProps {
  gradientClass: string;
}

interface PublishedExam {
  id: number;
  exam: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  exam_details: {
    id: number;
    department: string;
    semester: string;
    total_questions: number;
  };
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

export function PublishedExams({ gradientClass }: PublishedExamsProps) {
  const { canRead, canWrite } = usePermissions();
  
  // State management
  const [publishedExams, setPublishedExams] = useState<PublishedExam[]>([]);
  const [filteredExams, setFilteredExams] = useState<PublishedExam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [appliedSemesterFilter, setAppliedSemesterFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [appliedDepartmentFilter, setAppliedDepartmentFilter] = useState('all');
  const [publishedPage, setPublishedPage] = useState(1);
  const [publishedPagination, setPublishedPagination] = useState(DEFAULT_PAGINATION);
  const [publishedFilterOptions, setPublishedFilterOptions] = useState<{
    departments?: string[];
    semesters?: string[];
  }>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [preparingExamId, setPreparingExamId] = useState<number | null>(null);
  
  // Dialog states
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Load published exams
  useEffect(() => {
    if (canRead()) {
      loadPublishedExams();
    }
  }, [publishedPage, appliedSearch, appliedSemesterFilter, appliedDepartmentFilter, reloadKey]);

  // Filter published exams
  useEffect(() => {
    setFilteredExams(publishedExams);
  }, [publishedExams]);

  const loadPublishedExams = async () => {
    try {
      setIsLoading(true);
      const data = await examAPI.getPublishedExams({
        page: publishedPage,
        search: appliedSearch || undefined,
        semester: appliedSemesterFilter !== 'all' ? appliedSemesterFilter : undefined,
        department: appliedDepartmentFilter !== 'all' ? appliedDepartmentFilter : undefined,
      });
      
      if (data.success) {
        setPublishedExams(data.data);
        setPublishedPagination(paginationFromDrf(data, publishedPage));
        setPublishedFilterOptions(data.filter_options || {});
      } else {
        throw new Error(data.message || 'Failed to load published exams');
      }
    } catch (error: any) {
      console.error('Error loading published exams:', error);
      toast.error(error.message || 'Failed to load published exams');
      setPublishedExams([]);
      setPublishedPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePublicationStatus = async (examId: number) => {
    if (!canWrite()) {
      toast.error('You do not have permission to modify publication status');
      return;
    }

    try {
      setIsToggling(examId);
      const data = await examAPI.toggleExamPublication(examId);
      
      if (data.success) {
        // Update local state
        setPublishedExams(prev => 
          prev.map(exam => 
            exam.exam === examId 
              ? { ...exam, is_published: !exam.is_published, published_at: !exam.is_published ? new Date().toISOString() : null }
              : exam
          )
        );
        setReloadKey((current) => current + 1);
        toast.success(data.message || 'Publication status updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update publication status');
      }
    } catch (error: any) {
      console.error('Error toggling publication status:', error);
      toast.error(error.message || 'Failed to update publication status');
    } finally {
      setIsToggling(null);
    }
  };

  const openResultDialog = (result: ExamResult) => {
    setSelectedResult(result);
    setShowResultDialog(true);
  };

  const handlePrepareAdmissionBoard = async (examId: number) => {
    try {
      setPreparingExamId(examId);
      const response = await admissionResultsAPI.calculateResults({ exam_id: examId });
      toast.success(response?.message || `Admission board prepared for exam ${examId}`);
    } catch (error: any) {
      console.error('Error preparing admission board:', error);
      toast.error(error?.message || 'Failed to prepare admission board');
    } finally {
      setPreparingExamId(null);
    }
  };

  const handleSearch = () => {
    setPublishedPage(1);
    setAppliedSearch(searchTerm.trim());
    setAppliedSemesterFilter(semesterFilter);
    setAppliedDepartmentFilter(departmentFilter);
    setReloadKey((current) => current + 1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setSemesterFilter('all');
    setAppliedSemesterFilter('all');
    setDepartmentFilter('all');
    setAppliedDepartmentFilter('all');
    setPublishedPage(1);
    setReloadKey((current) => current + 1);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Average';
    return 'Needs Improvement';
  };

  // Get unique values for filters
  const uniqueSemesters = sortSemesterValues(publishedFilterOptions.semesters || []);
  const uniqueDepartments = Array.from(new Set(publishedFilterOptions.departments || [])).sort();
  const hasAppliedFilters =
    appliedSearch ||
    appliedSemesterFilter !== 'all' ||
    appliedDepartmentFilter !== 'all';

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
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <Badge variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          {publishedPagination.count} total exams
        </Badge>
        <Badge variant="outline" className="gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {publishedExams.filter(exam => exam.is_published).length} published on page
        </Badge>
        <Badge variant="outline" className="gap-2">
          <XCircle className="h-4 w-4 text-rose-600" />
          {publishedExams.filter(exam => !exam.is_published).length} unpublished on page
        </Badge>
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
              <Label htmlFor="search">Search Exams</Label>
              <Input
                id="search"
                placeholder="Search by department or semester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
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
                    <SelectItem key={semester} value={semester}>{formatSemesterLabel(semester)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(department => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button
                  onClick={handleClearSearch}
                  variant="outline"
                  className="flex-1"
                  disabled={
                    isLoading ||
                    (!searchTerm &&
                      !appliedSearch &&
                      semesterFilter === 'all' &&
                      appliedSemesterFilter === 'all' &&
                      departmentFilter === 'all' &&
                      appliedDepartmentFilter === 'all')
                  }
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={() => setReloadKey((current) => current + 1)}
                  variant="outline"
                  disabled={isLoading}
                  aria-label="Refresh published exams"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
        ) : filteredExams.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="text-center py-8">
              <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Published Exams</h3>
              <p className="text-gray-500">
                {hasAppliedFilters
                  ? "No exams match your current search."
                  : "No published exams available yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-gray-500" />
                      <span className="font-semibold text-lg">Exam #{exam.exam}</span>
                    </div>
                    <Badge 
                      variant={exam.is_published ? "default" : "secondary"}
                      className={exam.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {exam.is_published ? 'Published' : 'Unpublished'}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => togglePublicationStatus(exam.exam)}
                      disabled={isToggling === exam.exam}
                      variant={exam.is_published ? "destructive" : "default"}
                      size="sm"
                      className={exam.is_published ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                    >
                      {isToggling === exam.exam ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        exam.is_published ? (
                          <XCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )
                      )}
                      {exam.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      onClick={() => handlePrepareAdmissionBoard(exam.exam)}
                      disabled={preparingExamId === exam.exam}
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      {preparingExamId === exam.exam ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Prepare Board
                    </Button>
                  </div>
                </div>

                {/* Exam Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{exam.exam_details.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{formatSemesterLabel(exam.exam_details.semester)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{exam.exam_details.total_questions} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Created: {formatDate(exam.created_at)}
                    </span>
                  </div>
                </div>

                {/* Publication Status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Publication Details:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={exam.is_published ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                    >
                      Status: {exam.is_published ? 'Published' : 'Unpublished'}
                    </Badge>
                    {exam.published_at && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Published: {formatDate(exam.published_at)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      Last Updated: {formatDate(exam.updated_at)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {!isLoading && filteredExams.length > 0 && (
          <PaginationControls
            pagination={publishedPagination}
            onPageChange={setPublishedPage}
            isLoading={isLoading}
            itemLabel="exams"
          />
        )}
      </div>

      {/* Result Details Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Exam Results
            </DialogTitle>
            <DialogDescription>
              Complete performance analysis for {selectedResult?.student_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6">
              {/* Student Overview */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{selectedResult.student_name}</h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>Department:</strong> {selectedResult.exam_details.department}</p>
                        <p><strong>Semester:</strong> {formatSemesterLabel(selectedResult.exam_details.semester)}</p>
                        <p><strong>Total Questions:</strong> {selectedResult.exam_details.total_questions}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getGradeColor(selectedResult.results.score_percentage)}`}>
                        <Award className="h-5 w-5" />
                        <div>
                          <div className="font-bold text-lg">{formatPercentage(selectedResult.results.score_percentage)}</div>
                          <div className="text-xs">{getGradeLabel(selectedResult.results.score_percentage)}</div>
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
                    Subject-wise Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedResult.subjects.map((subject) => (
                      <div key={subject.subject_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{subject.subject_name}</h4>
                          <Badge 
                            variant="outline" 
                            className={`${getGradeColor(subject.score_percentage)} font-medium`}
                          >
                            {formatPercentage(subject.score_percentage)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-semibold">{subject.total_questions}</div>
                            <div className="text-gray-600">Total Questions</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-semibold text-green-600">{subject.correct_answers}</div>
                            <div className="text-gray-600">Correct</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="font-semibold text-red-600">{subject.wrong_answers}</div>
                            <div className="text-gray-600">Wrong</div>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="font-semibold text-blue-600">{formatPercentage(subject.score_percentage)}</div>
                            <div className="text-gray-600">Score</div>
                          </div>
                        </div>
                      </div>
                    ))}
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
