"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { UserPlus, Search, Loader2, Clock, MapPin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { vivaAssignmentAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  username: string;
  f_id: string;
  full_name: string;
  email: string;
  department_shortname?: string;
  ssc?: number;
  hsc?: number;
  diploma?: number;
  created_at: string;
}

interface Teacher {
  id: number;
  username: string;
  email: string;
  created_at: string;
  role_details: {
    id: number;
    role_name: string;
  };
  department_details: {
    id: number;
    department_name: string;
    department_shortname: string;
  };
}

interface Schedule {
  id: number;
  exam: number;
  exam_details: {
    id: number;
    department: string;
    semester: string;
    total_questions: number;
    present_question: number;
    total_marks: number;
    duration_minutes: number;
    language: string;
    faculty: string;
    department_shortnames: string[];
    created_at: string;
    updated_at: string;
  };
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

interface VivaAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  teachers: Teacher[];
  schedules: Schedule[];
  onAssignmentComplete: () => void;
}

export function VivaAssignmentDialog({
  open,
  onOpenChange,
  students,
  teachers,
  schedules,
  onAssignmentComplete
}: VivaAssignmentDialogProps) {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // Debug logging
  console.log('VivaAssignmentDialog - Schedules received:', schedules);

  const sortedSchedules = [...schedules].sort((a, b) => b.id - a.id);
  
  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: '',
    schedule_id: '',
    time: '',
    room: ''
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedStudents([]);
      setAssignmentForm({ teacher_id: '', schedule_id: '', time: '', room: '' });
      setStudentSearchTerm('');
    }
  }, [open]);

  // Helper function to check if student was created today
  const isCreatedToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const matchesSearch = !studentSearchTerm || 
      student.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.f_id.toLowerCase().includes(studentSearchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Handle bulk assignment
  const handleAssignment = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!assignmentForm.teacher_id || !assignmentForm.schedule_id || !assignmentForm.time || !assignmentForm.room) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert time from "HH:MM" format to "HH:MM:SS" format
      const formatTimeForAPI = (timeString: string) => {
        // Add seconds if not present (HH:MM -> HH:MM:00)
        return timeString.includes(':') && timeString.split(':').length === 2 
          ? `${timeString}:00` 
          : timeString;
      };
      
      const assignmentData = {
        assignments: selectedStudents.map(studentId => {
          // Find the selected schedule to get the exam ID
          const selectedSchedule = schedules.find(s => s.id.toString() === assignmentForm.schedule_id);
          const examId = selectedSchedule ? selectedSchedule.exam : parseInt(assignmentForm.schedule_id);
          
          return {
            student: studentId,
            teacher: parseInt(assignmentForm.teacher_id),
            exam: examId, // Use exam ID from the selected schedule
            time: formatTimeForAPI(assignmentForm.time), // Convert to HH:MM:SS format
            room: assignmentForm.room
          };
        })
      };

      console.log('Assignment Data being sent:', assignmentData);
      const response = await vivaAssignmentAPI.createAssignments(assignmentData);
      if (response && (response.success !== false)) {
        toast.success(`Successfully assigned ${selectedStudents.length} students`);
        onOpenChange(false);
        onAssignmentComplete();
      } else {
        toast.error(response.message || 'Failed to assign students');
      }
    } catch (error: any) {
      console.error('Error assigning students:', error);
      toast.error(error.message || 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStudentSearchTerm('');
    setSelectedStudents([]);
    onOpenChange(false);
  };

  const handleStudentToggle = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const selectedTeacher = teachers.find(t => t.id.toString() === assignmentForm.teacher_id);
  const selectedSchedule = schedules.find(s => s.id.toString() === assignmentForm.schedule_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!w-[96vw] !max-w-[1280px] h-[92dvh] max-h-[92dvh] overflow-hidden flex flex-col p-4 sm:p-6"
        style={{ 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b pr-8">
          <DialogTitle className="text-xl sm:text-2xl font-bold">Create Viva Assignments</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Assign multiple students to a teacher for viva examination with specific time and room details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(620px,1.25fr)_minmax(360px,0.75fr)] gap-4 xl:gap-6 h-full min-h-0 pt-4 sm:pt-6 overflow-y-auto xl:overflow-hidden">
            {/* Student Selection Panel */}
            <div className="space-y-4 flex flex-col h-full min-h-[420px] xl:min-h-0">
              <div className="flex-shrink-0">
                <Label className="text-lg font-semibold text-gray-800 mb-3 block">Select Students</Label>
                
                {/* Student Search */}
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(260px,1fr)_auto] gap-3 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, username, or ID..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                  {studentSearchTerm && (
                    <Button
                      variant="outline"
                      onClick={() => setStudentSearchTerm('')}
                      className="px-3 h-10 text-sm"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                
                {/* Results count and Select All */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="text-sm text-gray-600">
                    Showing {filteredStudents.length} of {students.length}
                    {studentSearchTerm && (
                      <span className="ml-2 text-blue-600 font-medium text-xs">
                        ({studentSearchTerm})
                      </span>
                    )}
                  </div>
                  {filteredStudents.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label className="text-xs font-medium cursor-pointer">
                        All ({filteredStudents.length})
                      </Label>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Student List - Table Format */}
              <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden min-h-0">
                <div className="h-full min-h-0 overflow-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 p-4">
                      <div className="text-gray-400 mb-4">
                        <UserPlus className="h-16 w-16 mx-auto" />
                      </div>
                      <p className="text-lg font-medium text-gray-500">
                        {studentSearchTerm ? 'No students match your search' : 'No available students to assign'}
                      </p>
                      {studentSearchTerm && (
                        <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
                      )}
                    </div>
                  ) : (
                    <Table className="text-sm w-full">
                      <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                        <TableRow>
                          <TableHead className="w-10 text-center px-2">
                            <Checkbox
                              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="font-semibold px-2">Name</TableHead>
                          <TableHead className="font-semibold px-2">ID</TableHead>
                          <TableHead className="font-semibold px-2">Username</TableHead>
                          <TableHead className="font-semibold px-2 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow 
                            key={student.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleStudentToggle(student.id, !selectedStudents.includes(student.id))}
                          >
                            <TableCell className="text-center px-2">
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => handleStudentToggle(student.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium px-2 whitespace-nowrap">{student.full_name}</TableCell>
                            <TableCell className="font-mono text-xs px-2 whitespace-nowrap">{student.f_id}</TableCell>
                            <TableCell className="text-gray-600 px-2 whitespace-nowrap">@{student.username}</TableCell>
                            <TableCell className="text-center px-2">
                              {isCreatedToday(student.created_at) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                  New
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
              
              {/* Selected count */}
              <div className="flex-shrink-0 text-center py-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800">
                  Selected: {selectedStudents.length}
                </p>
              </div>
            </div>

            {/* Assignment Details Panel */}
            <div className="space-y-5 flex flex-col h-full min-h-[360px] xl:min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto pr-3 space-y-5">
                <div className="flex-shrink-0">
                  <Label className="text-lg font-semibold text-gray-800 block">Assignment Details</Label>
                </div>
              
                {/* Form Fields Container */}
                <div className="space-y-5">
                {/* Teacher Selection */}
                <div className="space-y-2">
                  <Label htmlFor="teacher" className="font-medium text-sm">Teacher *</Label>
                  <Select
                    value={assignmentForm.teacher_id}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, teacher_id: value })}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{teacher.username}</span>
                            <span className="text-xs text-gray-500">
                              {teacher.department_details.department_shortname}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule Selection */}
                <div className="space-y-2">
                  <Label htmlFor="schedule" className="font-medium text-sm">Schedule *</Label>
                  <Select
                    value={assignmentForm.schedule_id}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, schedule_id: value })}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select a schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedSchedules.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No schedules available</div>
                      ) : (
                        sortedSchedules.map(schedule => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {schedule.exam_details ? (
                                  `${schedule.exam_details.department} - ${schedule.exam_details.semester}`
                                ) : (
                                  `Schedule ID: ${schedule.id}`
                                )}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(schedule.start_time).toLocaleDateString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time and Room */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="time" className="font-medium text-sm flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Time *
                    </Label>
                    <Input
                      type="time"
                      value={assignmentForm.time}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, time: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room" className="font-medium text-sm flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Room *
                    </Label>
                    <Input
                      value={assignmentForm.room}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, room: e.target.value })}
                      placeholder="e.g., 301"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Assignment Summary */}
                {selectedStudents.length > 0 && assignmentForm.teacher_id && assignmentForm.schedule_id && assignmentForm.time && assignmentForm.room && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                    <h4 className="font-semibold text-green-800 mb-1 text-sm">Summary</h4>
                    <div className="text-xs text-green-700 space-y-0.5">
                      <p>• {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}</p>
                      <p>• Teacher: {selectedTeacher?.username}</p>
                      <p>• Time: {assignmentForm.time}</p>
                      <p>• Room: {assignmentForm.room}</p>
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="px-6 h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignment}
                  disabled={isLoading || selectedStudents.length === 0 || !assignmentForm.teacher_id || !assignmentForm.schedule_id || !assignmentForm.time || !assignmentForm.room}
                  className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] px-6 h-10 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign ({selectedStudents.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
