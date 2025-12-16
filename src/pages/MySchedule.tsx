import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, Clock, BookOpen, Building, RefreshCw, FileSearch } from 'lucide-react';
import { studentAssignmentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ExamDetails {
  id: number;
  department: string;
  semester: string;
  total_questions: number;
  present_question: number;
  total_marks: number;
  duration_minutes: number;
  except_semesters: string[];
  language: string;
  faculty: string;
  created_at: string;
  updated_at: string;
}

interface Schedule {
  id: number;
  exam: ExamDetails;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

interface TeacherScheduleResponse {
  success: boolean;
  teacher: {
    id: number;
    username: string;
    email: string;
  };
  count: number;
  schedules: Schedule[];
  message: string;
}

const MySchedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const response: TeacherScheduleResponse = await studentAssignmentAPI.getTeacherSchedule(user.id);
      if (response.success) {
        setSchedules(response.schedules || []);
      }
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      toast.error(error.message || 'Failed to load schedule');
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (startTime: string): boolean => {
    return new Date(startTime) > new Date();
  };

  const isTodaySchedule = (startTime: string): boolean => {
    const today = new Date();
    const scheduleDate = new Date(startTime);
    return (
      scheduleDate.getFullYear() === today.getFullYear() &&
      scheduleDate.getMonth() === today.getMonth() &&
      scheduleDate.getDate() === today.getDate()
    );
  };

  const getFilteredSchedules = (): Schedule[] => {
    if (filterDate === 'today') {
      return schedules.filter(schedule => isTodaySchedule(schedule.start_time));
    }
    return schedules;
  };

  const filteredSchedules = getFilteredSchedules();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSearch className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
            <p className="text-gray-600">View your assigned exam schedules</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadSchedule} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Schedule</CardTitle>
          <CardDescription>Filter schedules by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={filterDate === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterDate('all')}
              className={filterDate === 'all' ? 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF]' : ''}
            >
              All Schedules
            </Button>
            <Button
              variant={filterDate === 'today' ? 'default' : 'outline'}
              onClick={() => setFilterDate('today')}
              className={filterDate === 'today' ? 'bg-gradient-to-r from-[#2E3094] to-[#4C51BF]' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exam Schedules</span>
            <Badge variant="outline">{filteredSchedules.length} schedules</Badge>
          </CardTitle>
          <CardDescription>
            {filterDate === 'today' ? "Today's exam schedules" : 'List of all exams scheduled for you'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading schedule...</span>
            </div>
          ) : filteredSchedules.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className={`p-4 ${isUpcoming(schedule.start_time) ? 'border-blue-500 border-2' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {schedule.exam.department}
                            </h3>
                            <p className="text-sm text-gray-600">{schedule.exam.semester}</p>
                          </div>
                        </div>
                        {isUpcoming(schedule.start_time) && (
                          <Badge variant="default" className="bg-blue-600">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatDate(schedule.start_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {schedule.exam.total_questions} Questions
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {schedule.exam.total_marks} Marks
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {schedule.exam.duration_minutes} Minutes
                        </Badge>
                        {schedule.exam.language && (
                          <Badge variant="outline" className="text-xs">
                            {schedule.exam.language}
                          </Badge>
                        )}
                        {schedule.exam.faculty && (
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {schedule.exam.faculty}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2">
                      {schedule.is_active ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileSearch className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No schedules found</p>
              <p className="text-sm">
                {filterDate === 'today' 
                  ? "You don't have any exams scheduled for today" 
                  : "You don't have any exam schedules assigned yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MySchedule;
