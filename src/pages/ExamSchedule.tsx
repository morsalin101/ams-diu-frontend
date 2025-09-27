import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Calendar, Clock, Building, Users, Plus, Loader2, Trash2, CheckCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { examAPI, scheduleAPI } from '../services/api';
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

export function ExamSchedule({ gradientClass }: ExamScheduleProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Form state
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    loadExams();
    loadSchedules();
  }, []);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const response = await examAPI.getAllExams();
      const examData = response.results || response;
      setExams(examData);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getAllSchedules();
      const scheduleData = response.results || response;
      setSchedules(scheduleData);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load schedules');
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedExamId || !startTime) {
      toast.error('Please select an exam and start time');
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const scheduleData = {
        exam_id: parseInt(selectedExamId),
        start_time: new Date(startTime).toISOString(),
        is_active: isActive
      };

      const response = await scheduleAPI.createSchedule(scheduleData);
      toast.success('Exam schedule created successfully!');
      
      // Reset form
      setSelectedExamId('');
      setStartTime('');
      setIsActive(true);
      
      // Reload schedules
      loadSchedules();
      
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule: ' + ((error as any)?.message || 'Unknown error'));
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    setDeletingId(scheduleId);
    try {
      await scheduleAPI.deleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
      toast.success('Schedule deleted successfully');
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
    return schedules.some(schedule => schedule.exam === examId && schedule.is_active);
  };

  // Get current date and time for min attribute
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r from-[#4C51BF] to-[#667EEA] ${gradientClass} rounded-lg p-4 sm:p-6 text-white`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">Exam Schedule</h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Schedule exams with specific start times and manage exam timetables.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Schedule Form */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Plus className="h-5 w-5 text-green-600" />
              Create New Schedule
            </CardTitle>
            <CardDescription>
              Select an exam and set the start time to create a new schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Exam Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Select Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose an exam to schedule" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">Exam #{exam.id} - {exam.department}</span>
                        <span className="text-xs text-gray-500">
                          {exam.semester} • {exam.present_question}/{exam.total_questions} questions • {exam.duration_minutes} min
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExamId && isExamScheduled(parseInt(selectedExamId)) && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>This exam is already scheduled</span>
                </div>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Start Time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min={getCurrentDateTime()}
                className="h-11"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="is-active" className="text-sm font-medium text-gray-700">
                Active Schedule
              </Label>
            </div>

            {/* Selected Exam Details */}
            {selectedExamId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Selected Exam Details</h4>
                {(() => {
                  const exam = getExamDetails(parseInt(selectedExamId));
                  return exam ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span>{exam.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span>{exam.semester}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span>{exam.present_question}/{exam.total_questions} questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span>{exam.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-red-600" />
                        <span>{exam.total_marks} marks</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreateSchedule}
              disabled={isCreatingSchedule || !selectedExamId || !startTime}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 font-semibold h-11"
            >
              {isCreatingSchedule ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Schedule...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Schedules */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Scheduled Exams
                </CardTitle>
                <CardDescription>
                  View all scheduled exams and their timings
                </CardDescription>
              </div>
              <Button
                onClick={loadSchedules}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Schedules Found</h3>
                <p className="text-gray-600">Create your first exam schedule to get started.</p>
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
                              Exam #{schedule.exam}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}