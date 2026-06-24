import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FileText, Eye, Edit, Search, Filter, Calendar, Building, Users, Clock, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { QuestionManager, Question } from '../components/QuestionManager';
import { QuestionPaperView } from '../components/QuestionPaperView';
import { admissionResultsAPI, departmentAPI, examAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Exam {
  id: number;
  department: string;
  semester: string;
  total_questions: number;
  present_question: number;
  total_marks: number;
  duration_minutes: number;
  except_semesters: string[];
  created_at: string;
}

interface DepartmentOption {
  department_shortname?: string | null;
}

interface AllQuestionsProps {
  gradientClass: string;
}

export function AllQuestions({ gradientClass: _gradientClass }: AllQuestionsProps) {
  const { canRead, canEdit, canDelete } = usePermissions();
  const regularButtonClass =
    'border border-[#d9daf0] bg-[#ffffff] text-[#2E3094] hover:bg-[#8082b5] hover:text-white';
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftDepartmentFilter, setDraftDepartmentFilter] = useState('all');
  const [appliedDepartmentFilter, setAppliedDepartmentFilter] = useState('all');
  const [draftSemesterFilter, setDraftSemesterFilter] = useState('all');
  const [appliedSemesterFilter, setAppliedSemesterFilter] = useState('all');
  const [draftDateFilter, setDraftDateFilter] = useState('all');
  const [appliedDateFilter, setAppliedDateFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Question management state
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showQuestionManager, setShowQuestionManager] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAllExams();
  }, [
    page,
    appliedSearch,
    appliedDepartmentFilter,
    appliedSemesterFilter,
    appliedDateFilter,
    reloadKey,
  ]);

  const loadAllExams = async () => {
    setIsLoading(true);
    try {
      const response = await examAPI.getAllExams({
        page,
        search: appliedSearch || undefined,
        department: appliedDepartmentFilter !== 'all' ? appliedDepartmentFilter : undefined,
        semester: appliedSemesterFilter !== 'all' ? appliedSemesterFilter : undefined,
        date_filter: appliedDateFilter === 'today' ? 'today' : undefined,
      });
      const examData = response.results || response;
      const nextPagination = paginationFromDrf(response, page);
      const count = nextPagination.count || examData.length;
      
      setExams(examData);
      setPagination(nextPagination);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams: ' + ((error as any)?.message || 'Unknown error'));
      setExams([]);
      setPagination(DEFAULT_PAGINATION);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [departmentResponse, semesterResponse] = await Promise.all([
        departmentAPI.getAllDepartments(),
        admissionResultsAPI.getSemesterOptions(),
      ]);

      const departmentRows: DepartmentOption[] = Array.isArray(departmentResponse?.data)
        ? departmentResponse.data
        : [];
      setDepartments(
        Array.from(
          new Set(
            departmentRows
              .map((department) => department.department_shortname?.trim())
              .filter((shortname): shortname is string => Boolean(shortname)),
          ),
        ).sort(),
      );
      setSemesters(Array.isArray(semesterResponse?.semesters) ? semesterResponse.semesters : []);
    } catch (error) {
      console.error('Error loading exam filter options:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedDepartmentFilter(draftDepartmentFilter);
    setAppliedSemesterFilter(draftSemesterFilter);
    setAppliedDateFilter(draftDateFilter);
    setReloadKey((current) => current + 1);
  };

  const handleClearFilters = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftDepartmentFilter('all');
    setAppliedDepartmentFilter('all');
    setDraftSemesterFilter('all');
    setAppliedSemesterFilter('all');
    setDraftDateFilter('all');
    setAppliedDateFilter('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleViewQuestions = async (examId: number, isViewMode: boolean = true) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    setSelectedExamId(examId);
    setSelectedExam(exam);
    setIsLoadingQuestions(true);
    
    if (isViewMode) {
      setShowPaperView(true);
    } else {
      setShowQuestionManager(true);
      setIsReadOnlyMode(false);
    }
    
    try {
      const response = await examAPI.getExamQuestions(examId);
      const questionsData = response.results || response;
      
      // Transform API response to match our Question interface
      const transformedQuestions: Question[] = questionsData.map((q: any) => ({
        id: q.id,
        subject: q.subject,
        questions: q.question_text,
        type: q.type,
        text: q.text,
        options: q.options ? Object.values(q.options) : undefined,
        answer: q.type === 'option' ? Object.keys(q.options || {})[0] : q.answer,
        marks: q.marks || 1
      }));
      
      setQuestions(transformedQuestions);
      setQuestionsCount(transformedQuestions.length);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleCloseQuestionManager = () => {
    setShowQuestionManager(false);
    setShowPaperView(false);
    setSelectedExamId(null);
    setSelectedExam(null);
    setQuestions([]);
    setQuestionsCount(0);
    
    // Refresh the exams list to get updated question counts
    loadAllExams();
  };

  const handleClosePaperView = () => {
    setShowPaperView(false);
    setSelectedExamId(null);
    setSelectedExam(null);
    setQuestions([]);
    setQuestionsCount(0);
  };

  const handleDeleteExam = async (id: number) => {
    setDeletingId(id);
    try {
      await examAPI.deleteExam(id);
      setExams((prev) => prev.filter((exam) => exam.id !== id));
      setReloadKey((current) => current + 1);
      toast.success('Exam deleted successfully');
    } catch {
      toast.error('Failed to delete exam');
    } finally {
      setDeletingId(null);
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

  const hasAppliedFilters =
    appliedSearch ||
    appliedDepartmentFilter !== 'all' ||
    appliedSemesterFilter !== 'all' ||
    appliedDateFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <Link to="/create-questions">
          <Button className={regularButtonClass}>+Create Questions</Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <Card className="gap-0 border-2 border-gray-200">
        <CardHeader className="py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-2 sm:px-5 sm:pt-2 sm:pb-3">
          <div className="flex flex-col items-end gap-4 sm:flex-row">
            {/* Search */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <Input
                  placeholder="Search by department, semester, or exam ID..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="w-full space-y-2 sm:w-48">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <Select value={draftDepartmentFilter} onValueChange={setDraftDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester Filter */}
            <div className="w-full space-y-2 sm:w-48">
              <label className="text-sm font-medium text-gray-700">Semester</label>
              <Select value={draftSemesterFilter} onValueChange={setDraftSemesterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="w-full space-y-2 sm:w-48">
              <label className="text-sm font-medium text-gray-700">Date Filter</label>
              <Select value={draftDateFilter} onValueChange={setDraftDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className={cn('w-full sm:w-auto', regularButtonClass)}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>

            <Button
              onClick={handleClearFilters}
              disabled={
                isLoading ||
                (!draftSearch &&
                  !appliedSearch &&
                  draftDepartmentFilter === 'all' &&
                  appliedDepartmentFilter === 'all' &&
                  draftSemesterFilter === 'all' &&
                  appliedSemesterFilter === 'all' &&
                  draftDateFilter === 'all' &&
                  appliedDateFilter === 'all')
              }
              variant="outline"
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>

            {/* Refresh Button */}
            <Button
              onClick={() => setReloadKey((current) => current + 1)}
              disabled={isLoading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Exams Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading exams...</p>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">No exams found</h3>
          <p className="text-gray-600">
            {hasAppliedFilters
              ? 'Try adjusting your search criteria or filters.'
              : 'No exams have been created yet.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="transition-shadow duration-200 border-2 border-gray-200 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-bold text-gray-800">
                        Exam #{exam.id}
                      </CardTitle>
                      <Badge
                        variant={exam.present_question === exam.total_questions ? "default" : "secondary"}
                        className={exam.present_question === exam.total_questions
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-yellow-500 hover:bg-yellow-600 text-white"
                        }
                      >
                        {exam.present_question}/{exam.total_questions}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm text-gray-600">
                      Created {formatDate(exam.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{exam.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{exam.semester}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>{exam.total_marks} marks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>{exam.duration_minutes} min</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Questions Progress</span>
                        <span>{Math.round((exam.present_question / exam.total_questions) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(exam.present_question / exam.total_questions) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {canRead() && (
                        <Button
                          onClick={() => handleViewQuestions(exam.id, true)}
                          variant="default"
                          size="sm"
                          className={cn(
                            'flex-1',
                            regularButtonClass,
                          )}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                      {canEdit() && (
                        <Button
                          onClick={() => handleViewQuestions(exam.id, false)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {canDelete() && (
                        <Button
                          onClick={() => handleDeleteExam(exam.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          disabled={deletingId === exam.id}
                        >
                          {deletingId === exam.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            isLoading={isLoading}
            itemLabel="exams"
          />
        </Card>
      )}

      {/* Question Paper View */}
      {showPaperView && selectedExam && (
        <QuestionPaperView
          questions={questions}
          examConfig={{
            totalQuestions: selectedExam.total_questions,
            timeMinutes: selectedExam.duration_minutes,
            totalMarks: selectedExam.total_marks,
            department: selectedExam.department,
            semester: selectedExam.semester
          }}
          onClose={handleClosePaperView}
        />
      )}

      {/* Question Manager Dialog */}
      <Dialog open={showQuestionManager} onOpenChange={setShowQuestionManager}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden mx-2 sm:mx-0 p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">
                  {isReadOnlyMode ? 'View Questions' : 'Manage Questions'} - Exam #{selectedExamId}
                </DialogTitle>
                <DialogDescription className="mt-2 text-base">
                  {selectedExam && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">{selectedExam.department}</Badge>
                      <Badge variant="outline">{selectedExam.semester}</Badge>
                      <Badge variant="outline">{selectedExam.total_marks} marks</Badge>
                      <Badge variant="outline">{selectedExam.duration_minutes} min</Badge>
                    </div>
                  )}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseQuestionManager}
                className="text-gray-600 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            {selectedExamId && (
              <QuestionManager
                examId={selectedExamId}
                questions={questions}
                questionsCount={questionsCount}
                isLoadingQuestions={isLoadingQuestions}
                onQuestionsChange={setQuestions}
                onQuestionCountChange={setQuestionsCount}
                examConfig={{
                  totalQuestions: selectedExam?.total_questions || 0,
                  timeMinutes: selectedExam?.duration_minutes || 0,
                  totalMarks: selectedExam?.total_marks || 0,
                  department: selectedExam?.department || '',
                  semester: selectedExam?.semester || ''
                }}
                title={isReadOnlyMode ? 'Question Preview' : 'Exam Questions'}
                description={isReadOnlyMode ? 'View all questions in this exam' : 'View, edit, and manage questions for this exam'}
                readOnly={isReadOnlyMode}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
