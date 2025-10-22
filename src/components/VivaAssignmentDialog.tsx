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
        className="max-w-[98vw] w-[98vw] max-h-[95vh] overflow-y-auto flex flex-col"
        style={{ 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          minHeight: '90vh',
          minWidth: '98vw'
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Create Viva Assignments</DialogTitle>
          <DialogDescription className="text-base">
            Assign multiple students to a teacher for viva examination with specific time and room details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pt-6">
            {/* Student Selection Panel */}
            <div className="space-y-6 flex flex-col h-full">
              <div className="flex-shrink-0">
                <Label className="text-xl font-semibold text-gray-800 mb-4 block">Select Students</Label>
                
                {/* Student Search */}
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search students by name, username, or ID..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="pl-11 h-12 text-base"
                    />
                  </div>
                  {studentSearchTerm && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setStudentSearchTerm('')}
                      className="px-4"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                
                {/* Results count and Select All */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base text-gray-600">
                    Showing {filteredStudents.length} of {students.length} available students
                    {studentSearchTerm && (
                      <span className="ml-2 text-blue-600 font-medium">
                        (filtered by "{studentSearchTerm}")
                      </span>
                    )}
                  </div>
                  {filteredStudents.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label className="text-sm font-medium cursor-pointer">
                        Select All ({filteredStudents.length})
                      </Label>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Student List - Table Format */}
              <div className="flex-1 border-2 border-gray-200 rounded-lg overflow-hidden">
                <div className="h-full overflow-y-auto">
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
                    <Table className="text-sm">
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <Checkbox
                              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Student ID</TableHead>
                          <TableHead className="font-semibold">Username</TableHead>
                          <TableHead className="font-semibold">Department</TableHead>
                          <TableHead className="font-semibold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow 
                            key={student.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleStudentToggle(student.id, !selectedStudents.includes(student.id))}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => handleStudentToggle(student.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell className="font-mono text-sm">{student.f_id}</TableCell>
                            <TableCell className="text-gray-600">@{student.username}</TableCell>
                            <TableCell className="text-gray-600">{student.department_shortname || 'N/A'}</TableCell>
                            <TableCell className="text-center">
                              {isCreatedToday(student.created_at) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  New Today
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
              <div className="flex-shrink-0 text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-semibold text-blue-800">
                  Selected: {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Assignment Details Panel */}
            <div className="space-y-6 flex flex-col h-full">
              <Label className="text-xl font-semibold text-gray-800 mb-4 block">Assignment Details</Label>
              
              <div className="flex-1 space-y-6">
                {/* Teacher Selection */}
                <div className="space-y-3">
                  <Label htmlFor="teacher" className="text-lg font-medium">Teacher *</Label>
                  <Select
                    value={assignmentForm.teacher_id}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, teacher_id: value })}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{teacher.username}</span>
                            <span className="text-sm text-gray-500">
                              {teacher.department_details.department_name} ({teacher.department_details.department_shortname})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule Selection */}
                <div className="space-y-3">
                  <Label htmlFor="schedule" className="text-lg font-medium">Schedule *</Label>
                  <Select
                    value={assignmentForm.schedule_id}
                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, schedule_id: value })}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select a schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No schedules available</div>
                      ) : (
                        schedules.map(schedule => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {schedule.exam_details ? (
                                  `${schedule.exam_details.department} - ${schedule.exam_details.semester}`
                                ) : (
                                  `Schedule ID: ${schedule.id}`
                                )}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(schedule.start_time).toLocaleDateString()} | {' '}
                                {new Date(schedule.start_time).toLocaleTimeString()} - {' '}
                                {new Date(schedule.end_time).toLocaleTimeString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time and Room */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="time" className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time *
                    </Label>
                    <Input
                      type="time"
                      value={assignmentForm.time}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, time: e.target.value })}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="room" className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Room *
                    </Label>
                    <Input
                      value={assignmentForm.room}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, room: e.target.value })}
                      placeholder="e.g., Room 301"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                {/* Assignment Summary */}
                {selectedStudents.length > 0 && assignmentForm.teacher_id && assignmentForm.schedule_id && assignmentForm.time && assignmentForm.room && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Assignment Summary</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>• {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} will be assigned</p>
                      <p>• Teacher: {selectedTeacher?.username}</p>
                      <p>• Schedule: {selectedSchedule ? 
                        (selectedSchedule.exam_details ? 
                          `${selectedSchedule.exam_details.department} - ${selectedSchedule.exam_details.semester}` : 
                          `Schedule ID: ${selectedSchedule.id}`
                        ) : ''}</p>
                      <p>• Time: {assignmentForm.time}</p>
                      <p>• Room: {assignmentForm.room}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex justify-end gap-4 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  size="lg"
                  className="px-8"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignment}
                  disabled={isLoading || selectedStudents.length === 0 || !assignmentForm.teacher_id || !assignmentForm.schedule_id || !assignmentForm.time || !assignmentForm.room}
                  className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] px-8"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Assign Students ({selectedStudents.length})
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