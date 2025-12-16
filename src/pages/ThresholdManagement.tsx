import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sliders, Plus, Trash2, RefreshCw, AlertCircle, Building, FileText } from 'lucide-react';
import { thresholdAPI, departmentAPI, examAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface Exam {
  id: number;
  department: string;
  semester: string;
  total_marks: number;
  duration_minutes: number;
}

interface ThresholdMapping {
  id: number;
  exam_id: number;
  exam_name: string;
  department_id: number;
  department_name: string;
  department_shortname: string;
  min_threshold_mark: number;
  created_at: string;
  updated_at: string;
}

interface ThresholdFormData {
  department_id: number;
  threshold: number;
}

const ThresholdManagement: React.FC = () => {
  const [thresholds, setThresholds] = useState<ThresholdMapping[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [mappings, setMappings] = useState<ThresholdFormData[]>([]);
  const [filterExamId, setFilterExamId] = useState<string>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (filterExamId && filterExamId !== 'all') {
      loadThresholds(parseInt(filterExamId));
    } else {
      loadThresholds();
    }
  }, [filterExamId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDepartments(),
        loadExams(),
        loadThresholds()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error: any) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const loadExams = async () => {
    try {
      const response = await examAPI.getAllExams();
      const examData = response.results || response;
      setExams(examData);
    } catch (error: any) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
    }
  };

  const loadThresholds = async (examId?: number) => {
    try {
      const params = examId ? { exam_id: examId } : {};
      const response = await thresholdAPI.getThresholdMappings(params);
      if (response.success) {
        setThresholds(response.thresholds || []);
      }
    } catch (error: any) {
      console.error('Error loading thresholds:', error);
      toast.error('Failed to load thresholds');
    }
  };

  const handleOpenDialog = () => {
    setSelectedExamId(null);
    setMappings([{ department_id: 0, threshold: 0 }]);
    setIsDialogOpen(true);
  };

  const handleAddMapping = () => {
    setMappings([...mappings, { department_id: 0, threshold: 0 }]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: keyof ThresholdFormData, value: number) => {
    const updatedMappings = [...mappings];
    updatedMappings[index][field] = value;
    setMappings(updatedMappings);
  };

  const handleSubmit = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }

    const validMappings = mappings.filter(m => m.department_id > 0 && m.threshold > 0);
    if (validMappings.length === 0) {
      toast.error('Please add at least one valid department threshold mapping');
      return;
    }

    // Check for duplicate departments
    const departmentIds = validMappings.map(m => m.department_id);
    const hasDuplicates = departmentIds.length !== new Set(departmentIds).size;
    if (hasDuplicates) {
      toast.error('Cannot add the same department multiple times');
      return;
    }

    try {
      const data = {
        exam_id: selectedExamId,
        mappings: validMappings
      };

      const response = await thresholdAPI.setThresholdMappings(data);
      if (response.success) {
        toast.success(response.message || 'Threshold mappings saved successfully');
        setIsDialogOpen(false);
        loadThresholds();
      }
    } catch (error: any) {
      console.error('Error saving thresholds:', error);
      toast.error(error.message || 'Failed to save threshold mappings');
    }
  };

  const handleDeleteThreshold = async (thresholdId: number, departmentName: string) => {
    if (!confirm(`Are you sure you want to delete the threshold for "${departmentName}"?`)) {
      return;
    }

    try {
      const response = await thresholdAPI.deleteThreshold(thresholdId);
      if (response.success) {
        toast.success('Threshold deleted successfully');
        loadThresholds();
      }
    } catch (error: any) {
      console.error('Error deleting threshold:', error);
      toast.error(error.message || 'Failed to delete threshold');
    }
  };

  const getExamName = (examId: number): string => {
    const exam = exams.find(e => e.id === examId);
    return exam ? `${exam.department} - ${exam.semester}` : 'Unknown Exam';
  };

  const getSelectedExamTotalMarks = (): number => {
    if (!selectedExamId) return 0;
    const exam = exams.find(e => e.id === selectedExamId);
    return exam?.total_marks || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sliders className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Threshold Management</h1>
            <p className="text-gray-600">Manage department admission threshold marks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadThresholds()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenDialog} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
            <Plus className="h-4 w-4 mr-2" />
            Set Thresholds
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Thresholds</CardTitle>
          <CardDescription>Filter thresholds by exam</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filter-exam">Select Exam</Label>
              <Select value={filterExamId} onValueChange={setFilterExamId}>
                <SelectTrigger id="filter-exam">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.department} - {exam.semester} (Total: {exam.total_marks} marks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filterExamId && filterExamId !== 'all' && (
              <Button variant="outline" onClick={() => setFilterExamId('all')}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thresholds List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Department Thresholds</span>
            <Badge variant="outline">{thresholds.length} thresholds</Badge>
          </CardTitle>
          <CardDescription>
            List of all department threshold mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2">Loading thresholds...</span>
            </div>
          ) : thresholds.length > 0 ? (
            <div className="space-y-4">
              {/* Group by exam */}
              {Object.entries(
                thresholds.reduce((acc, threshold) => {
                  const examKey = threshold.exam_name || getExamName(threshold.exam_id);
                  if (!acc[examKey]) acc[examKey] = [];
                  acc[examKey].push(threshold);
                  return acc;
                }, {} as Record<string, ThresholdMapping[]>)
              ).map(([examName, examThresholds]) => (
                <div key={examName} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{examName}</h3>
                    <Badge variant="secondary">{examThresholds.length} departments</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {examThresholds.map((threshold) => (
                      <Card key={threshold.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Building className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">
                                {threshold.department_name}
                              </h4>
                              <p className="text-xs text-blue-600 font-medium">
                                {threshold.department_shortname}
                              </p>
                              <div className="mt-1 flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  Min: {threshold.min_threshold_mark} marks
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteThreshold(threshold.id, threshold.department_name)}
                            className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Sliders className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No thresholds found</p>
              <p className="text-sm">Set department thresholds to get started</p>
              <Button onClick={handleOpenDialog} className="mt-4 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
                <Plus className="h-4 w-4 mr-2" />
                Set Thresholds
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Department Thresholds</DialogTitle>
            <DialogDescription>
              Set minimum marks required for admission to each department
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Exam Selection */}
            <div>
              <Label htmlFor="exam">Select Exam *</Label>
              <Select 
                value={selectedExamId?.toString()} 
                onValueChange={(value) => setSelectedExamId(parseInt(value))}
              >
                <SelectTrigger id="exam">
                  <SelectValue placeholder="Select an exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.department} - {exam.semester} (Total: {exam.total_marks} marks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExamId && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Maximum threshold: {getSelectedExamTotalMarks()} marks
                  </span>
                </div>
              )}
            </div>

            {/* Mappings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Department Thresholds</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddMapping}
                  disabled={!selectedExamId}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Department
                </Button>
              </div>

              {mappings.map((mapping, index) => (
                <Card key={index} className="p-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`dept-${index}`} className="text-xs">Department</Label>
                      <Select
                        value={mapping.department_id > 0 ? mapping.department_id.toString() : undefined}
                        onValueChange={(value) => handleMappingChange(index, 'department_id', parseInt(value))}
                      >
                        <SelectTrigger id={`dept-${index}`} className="h-9">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.department_shortname} - {dept.department_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`threshold-${index}`} className="text-xs">Min. Marks</Label>
                      <Input
                        id={`threshold-${index}`}
                        type="number"
                        min="0"
                        max={getSelectedExamTotalMarks()}
                        step="0.01"
                        value={mapping.threshold || ''}
                        onChange={(e) => handleMappingChange(index, 'threshold', parseFloat(e.target.value))}
                        placeholder="0.0"
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMapping(index)}
                      disabled={mappings.length === 1}
                      className="text-red-600 hover:text-red-700 h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"
                disabled={!selectedExamId}
              >
                Save Thresholds
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThresholdManagement;
