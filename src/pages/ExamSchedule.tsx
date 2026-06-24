import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar, Clock, Building, Users, Plus, Loader2, Trash2, CheckCircle, FileText, RefreshCw, ArrowRight, Search, X } from 'lucide-react';
import { examAPI, scheduleAPI } from '../services/api';
import PaginationControls, { DEFAULT_PAGINATION, paginationFromDrf } from '../components/PaginationControls';
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

interface Schedule {
  id: number;
  exam: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

interface ExamScheduleProps {
  gradientClass: string;
}

const sortSchedulesByLatest = (scheduleList: Schedule[]) =>
  [...scheduleList].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });

export function ExamSchedule({ gradientClass }: ExamScheduleProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [todaysExams, setTodaysExams] = useState<Exam[]>([]);
  const [filteredLeftExams, setFilteredLeftExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduledExamIds, setScheduledExamIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Filter states
  const [leftFilter, setLeftFilter] = useState<'today' | 'all' | 'unscheduled'>('today');
  const [draftRightFilter, setDraftRightFilter] = useState<'today' | 'all'>('all');
  const [appliedRightFilter, setAppliedRightFilter] = useState<'today' | 'all'>('all');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  
  // Dialog state for scheduling
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedExamForSchedule, setSelectedExamForSchedule] = useState<Exam | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string>('');

  useEffect(() => {
    loadExams();
    loadScheduleLookup();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [page, appliedSearch, appliedRightFilter, reloadKey]);

  useEffect(() => {
    filterLeftPanelExams();
  }, [exams, todaysExams, leftFilter]);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const response = await examAPI.getAllExamsForLookup();
      const examData = response.results || response;
      setExams(examData);
      
      // Filter today's exams
      const today = new Date().toISOString().split('T')[0];
      const todaysExamsList = examData.filter((exam: Exam) => {
        const examDate = new Date(exam.created_at).toISOString().split('T')[0];
        return examDate === today;
      });
      setTodaysExams(todaysExamsList);
      
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getAllSchedules({
        page,
        search: appliedSearch || undefined,
        date_filter: appliedRightFilter === 'today' ? 'today' : undefined,
      });
      const scheduleData = response.results || response.data || response;
      setSchedules(Array.isArray(scheduleData) ? sortSchedulesByLatest(scheduleData) : []);
      setPagination(paginationFromDrf(response, page));
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load schedules');
      setSchedules([]);
      setPagination(DEFAULT_PAGINATION);
    }
  };

  const loadScheduleLookup = async () => {
    try {
      const response = await scheduleAPI.getAllSchedulesForLookup();
      const scheduleData = response.results || response.data || response;
      setScheduledExamIds(
        Array.isArray(scheduleData)
          ? scheduleData.filter((schedule: Schedule) => schedule.is_active).map((schedule: Schedule) => schedule.exam)
          : [],
      );
    } catch (error) {
      console.error('Error loading schedule lookup:', error);
    }
  };

  const filterLeftPanelExams = () => {
    let filtered: Exam[] = [];
    
    switch (leftFilter) {
      case 'today':
        filtered = todaysExams;
        break;
      case 'all':
        filtered = exams;
        break;
      case 'unscheduled':
        filtered = exams.filter(exam => !isExamScheduled(exam.id));
        break;
      default:
        filtered = todaysExams;
    }
    
    setFilteredLeftExams(filtered);
  };

  const handleSearchSchedules = () => {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
    setAppliedRightFilter(draftRightFilter);
    setReloadKey((current) => current + 1);
  };

  const handleClearSchedules = () => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftRightFilter('all');
    setAppliedRightFilter('all');
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const handleQuestionClick = (exam: Exam) => {
    setSelectedExamForSchedule(exam);
    setScheduleTime('');
    setShowScheduleDialog(true);
  };

  const handleAddToSchedule = async () => {
    if (!selectedExamForSchedule || !scheduleTime) {
      toast.error('Please select a time for scheduling');
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const scheduleData = {
        exam_id: selectedExamForSchedule.id,
        start_time: new Date(scheduleTime).toISOString(),
        is_active: true
      };

      await scheduleAPI.createSchedule(scheduleData);
      toast.success('Exam added to schedule successfully!');
      
      // Close dialog and reload schedules
      setShowScheduleDialog(false);
      setSelectedExamForSchedule(null);
      setScheduleTime('');
      await loadSchedules();
      await loadScheduleLookup();
      
    } catch (error) {
      console.error('Error adding to schedule:', error);
      toast.error('Failed to add to schedule: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    setDeletingId(scheduleId);
    try {
      await scheduleAPI.deleteSchedule(scheduleId);
      toast.success('Schedule deleted successfully');
      setReloadKey((current) => current + 1);
      await loadScheduleLookup();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getExamDetails = (examId: number) => {
    return exams.find(exam => exam.id === examId);
  };

  const isExamScheduled = (examId: number) => {
    return scheduledExamIds.includes(examId);
  };

  // Get current date and time for min attribute
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Today's Questions */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Calendar className="h-5 w-5 text-blue-600" />
              Questions
            </CardTitle>

            {/* Left Panel Filter */}
            <div className="mt-4">
              <Select value={leftFilter} onValueChange={(value: 'today' | 'all' | 'unscheduled') => setLeftFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today Only</SelectItem>
                  <SelectItem value="all">All Exams</SelectItem>
                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading questions...</p>
              </div>
            ) : filteredLeftExams.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {leftFilter === 'today' ? 'No Questions Today' : 
                   leftFilter === 'unscheduled' ? 'No Unscheduled Questions' : 
                   'No Questions Available'}
                </h3>
                <p className="text-gray-600">
                  {leftFilter === 'today' ? 'No questions were created today.' :
                   leftFilter === 'unscheduled' ? 'All questions have been scheduled.' :
                   'No questions are available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLeftExams.map((exam) => (
                  <Card 
                    key={exam.id} 
                    className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleQuestionClick(exam)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            Question Set #{exam.id}
                          </h4>
                          <p className="text-sm text-blue-600 font-medium">
                            {exam.department} - {exam.semester}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          leftFilter === 'today' ? "bg-blue-50 text-blue-700" :
                          leftFilter === 'unscheduled' ? "bg-orange-50 text-orange-700" :
                          isExamScheduled(exam.id) ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"
                        }>
                          {leftFilter === 'today' ? 'Today' :
                           leftFilter === 'unscheduled' ? 'Unscheduled' :
                           isExamScheduled(exam.id) ? 'Scheduled' : 'Available'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{exam.present_question}/{exam.total_questions} questions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{exam.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{exam.total_marks} marks</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{isExamScheduled(exam.id) ? 'Scheduled' : 'Not Scheduled'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Created: {new Date(exam.created_at).toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-1 text-blue-600">
                          <span className="text-xs font-medium">Click to schedule</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Scheduled Exams */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Clock className="h-5 w-5 text-green-600" />
                  Scheduled Exams
                </CardTitle>

                {/* Right Panel Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Select value={draftRightFilter} onValueChange={(value: 'today' | 'all') => setDraftRightFilter(value)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schedules</SelectItem>
                      <SelectItem value="today">Today Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                    <Input
                      placeholder="Search by semester or department..."
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSearchSchedules();
                        }
                      }}
                      className="w-full pl-7"
                    />
                  </div>
                  <Button
                    onClick={handleClearSchedules}
                    variant="outline"
                    size="sm"
                    disabled={
                      isLoading ||
                      (!draftSearch &&
                        !appliedSearch &&
                        draftRightFilter === 'all' &&
                        appliedRightFilter === 'all')
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setReloadKey((current) => current + 1)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {appliedRightFilter === 'today' ? 'No Schedules Today' : 
                   appliedSearch ? 'No Matching Schedules' : 'No Schedules Found'}
                </h3>
                <p className="text-gray-600">
                  {appliedRightFilter === 'today' ? 'No exams are scheduled for today.' :
                   appliedSearch ? 'No schedules match this search.' :
                   'Schedule exams from questions on the left.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {schedules.map((schedule) => {
                  const exam = getExamDetails(schedule.exam);
                  return (
                    <Card key={schedule.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              Question Set #{schedule.exam}
                              {exam && ` - ${exam.department}`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Schedule ID: {schedule.id}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={schedule.is_active ? "default" : "secondary"}
                              className={schedule.is_active 
                                ? "bg-green-500 hover:bg-green-600" 
                                : "bg-gray-400"
                              }
                            >
                              {schedule.is_active ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                'Inactive'
                              )}
                            </Badge>
                            <Button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 p-1 h-8 w-8"
                              disabled={deletingId === schedule.id}
                            >
                              {deletingId === schedule.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {exam && (
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                            <span>{exam.semester}</span>
                            <span>{exam.duration_minutes} min</span>
                            <span>{exam.present_question}/{exam.total_questions} questions</span>
                            <span>{exam.total_marks} marks</span>
                          </div>
                        )}
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Start:</span>
                            <span>{formatDateTime(schedule.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-600" />
                            <span className="font-medium">End:</span>
                            <span>{formatDateTime(schedule.end_time)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <PaginationControls
                  pagination={pagination}
                  onPageChange={setPage}
                  isLoading={isLoading}
                  itemLabel="schedules"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Schedule Question Set
            </DialogTitle>
            <DialogDescription>
              Set the time for this question set to be scheduled as an exam
            </DialogDescription>
          </DialogHeader>
          
          {selectedExamForSchedule && (
            <div className="space-y-4">
              {/* Selected Question Details */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Question Set Details</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span><strong>Department:</strong> {selectedExamForSchedule.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span><strong>Semester:</strong> {selectedExamForSchedule.semester}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span><strong>Questions:</strong> {selectedExamForSchedule.present_question}/{selectedExamForSchedule.total_questions}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span><strong>Duration:</strong> {selectedExamForSchedule.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    <span><strong>Total Marks:</strong> {selectedExamForSchedule.total_marks}</span>
                  </div>
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Schedule Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  min={getCurrentDateTime()}
                  className="h-11"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowScheduleDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToSchedule}
                  disabled={isCreatingSchedule || !scheduleTime}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isCreatingSchedule ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
