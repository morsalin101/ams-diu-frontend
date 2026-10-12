import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Layers, Plus, Trash2, RefreshCw, Building, BookOpen, GraduationCap } from 'lucide-react';
import { subjectFacultyAPI, subjectDepartmentAPI, facultyAPI, departmentAPI, subjectAPI, facultyDepartmentAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_code: string;
}

interface Department {
  id: number;
  department_name: string;
}

interface Subject {
  id: number;
  subject_name: string;
}

interface FacultyMapping {
  id: number;
  faculty_id: number;
  faculty_name: string;
  faculty_code: string;
  subject_ids: number[];
  subjects: { id: number; subject_name: string }[];
}

interface DepartmentMapping {
  id: number;
  department_id: number;
  department_name: string;
  subject_ids: number[];
  subjects: string | { id: number; subject_name: string }[];
}

const SubjectDepartmentMapping: React.FC = () => {
  const { canRead, canWrite, canDelete } = usePermissions();
  const [activeTab, setActiveTab] = useState<'faculty' | 'department'>('faculty');
  const [facultyMappings, setFacultyMappings] = useState<FacultyMapping[]>([]);
  const [deptMappings, setDeptMappings] = useState<DepartmentMapping[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyDeptMap, setFacultyDeptMap] = useState<Record<number, number[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    description: null,
    onConfirm: () => {},
  });

  useEffect(() => {
    if (canRead()) {
      loadAllData();
    }
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadFacultyMappings(),
        loadDeptMappings(),
        loadFaculties(),
        loadDepartments(),
        loadSubjects(),
        loadFacultyDepartmentRelationships(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFacultyMappings = async () => {
    try {
      const response = await subjectFacultyAPI.getAllMappings();
      if (Array.isArray(response)) {
        setFacultyMappings(response);
      } else if (response.success && response.data) {
        setFacultyMappings(response.data);
      } else {
        setFacultyMappings([]);
      }
    } catch (error) {
      console.error('Error loading faculty subject mappings:', error);
      setFacultyMappings([]);
    }
  };

  const loadDeptMappings = async () => {
    try {
      const response = await subjectDepartmentAPI.getAllMappings();
      if (Array.isArray(response)) {
        setDeptMappings(response);
      } else if (response.success && response.data) {
        setDeptMappings(response.data);
      } else {
        setDeptMappings([]);
      }
    } catch (error) {
      console.error('Error loading dept mappings:', error);
      setDeptMappings([]);
    }
  };

  const loadFaculties = async () => {
    try {
      const response = await facultyAPI.getAllFaculties();
      if (response.success && response.data) {
        setFaculties(response.data);
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAllSubjects();
      if (response.success && response.data) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadFacultyDepartmentRelationships = async () => {
    try {
      const response = await facultyDepartmentAPI.getAllMappings();
      const list = response?.data || response || [];
      const map: Record<number, number[]> = {};
      list.forEach((item: any) => {
        if (item.faculty_id && item.department_ids) {
          map[item.faculty_id] = item.department_ids;
        }
      });
      setFacultyDeptMap(map);
    } catch (error) {
      console.error('Error loading faculty department relationships:', error);
    }
  };

  const handleCreateMapping = async () => {
    if (!canWrite()) {
      toast.error('You do not have permission to create mappings');
      return;
    }

    if (activeTab === 'faculty') {
      if (!selectedFaculty || selectedSubjects.length === 0) {
        toast.error('Please select a faculty and at least one subject');
        return;
      }

      try {
        const response = await subjectFacultyAPI.createMapping({
          faculty: parseInt(selectedFaculty),
          subject_ids: selectedSubjects,
        });
        if (response.success) {
          toast.success('Faculty subject mapping created successfully');
          loadFacultyMappings();
          resetForm();
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to create faculty subject mapping');
      }
    } else {
      if (!selectedDepartment || selectedSubjects.length === 0) {
        toast.error('Please select a department and at least one subject');
        return;
      }

      try {
        const response = await subjectDepartmentAPI.createMapping({
          department: parseInt(selectedDepartment),
          subject_ids: selectedSubjects,
        });
        if (response.success) {
          toast.success('Department subject mapping created successfully');
          loadDeptMappings();
          resetForm();
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to create department subject mapping');
      }
    }
  };

  const handleDeleteFacultyMapping = (mappingId: number, facultyName: string) => {
    if (!canDelete()) {
      toast.error('You do not have permission to delete mappings');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Faculty Mapping?',
      variant: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      description: (
        <span>
          Are you sure you want to delete the mapping for faculty{' '}
          <strong className="text-gray-900 font-semibold">{facultyName}</strong>? All mapped subjects will be unlinked from this faculty and its departments.
        </span>
      ),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await subjectFacultyAPI.deleteMapping(mappingId);
          if (response.success) {
            toast.success('Faculty mapping deleted successfully');
            setConfirmDialog(prev => ({ ...prev, open: false, isLoading: false }));
            loadFacultyMappings();
          } else {
            toast.error(response.message || 'Failed to delete mapping');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to delete mapping');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleDeleteDeptMapping = (mappingId: number, departmentName: string) => {
    if (!canDelete()) {
      toast.error('You do not have permission to delete mappings');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Department Mapping?',
      variant: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      description: (
        <span>
          Are you sure you want to delete the legacy mapping for department{' '}
          <strong className="text-gray-900 font-semibold">{departmentName}</strong>?
        </span>
      ),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await subjectDepartmentAPI.deleteMapping(mappingId);
          if (response.success) {
            toast.success('Department mapping deleted successfully');
            setConfirmDialog(prev => ({ ...prev, open: false, isLoading: false }));
            loadDeptMappings();
          } else {
            toast.error(response.message || 'Failed to delete mapping');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to delete mapping');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const resetForm = () => {
    setSelectedFaculty('');
    setSelectedDepartment('');
    setSelectedSubjects([]);
    setIsDialogOpen(false);
  };

  const handleSubjectToggle = (subjectId: number, checked: boolean) => {
    if (checked) {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    } else {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    }
  };

  const getInheritedDepartmentNames = (facultyId: number) => {
    const deptIds = facultyDeptMap[facultyId] || [];
    return deptIds
      .map(id => departments.find(d => d.id === id)?.department_name)
      .filter(Boolean);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Mapping Management</h1>
          <p className="text-sm text-gray-500">
            Configure subject assignments at the faculty level so all departments automatically inherit exam subjects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canWrite() && (
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'faculty' ? 'Map Faculty Subjects' : 'Map Dept Subjects'}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'faculty' | 'department')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="faculty" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>Faculty Level (Recommended)</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {facultyMappings.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="department" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span>Department Overrides</span>
            <Badge variant="outline" className="ml-1 text-xs">
              {deptMappings.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Faculty Mappings */}
        <TabsContent value="faculty" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Faculty-Level Subject Mappings
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  Departments under each faculty inherit these subjects automatically
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-indigo-600 animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading faculty mappings...</span>
                </div>
              ) : facultyMappings.length > 0 ? (
                <div className="space-y-4">
                  {facultyMappings.map((mapping) => {
                    const inheritedDepts = getInheritedDepartmentNames(mapping.faculty_id);
                    return (
                      <Card key={mapping.id} className="p-4 border-l-4 border-l-indigo-600 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm">
                                {mapping.faculty_code || 'FACULTY'}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-base">{mapping.faculty_name}</h3>
                                <p className="text-xs text-gray-500">Faculty ID: {mapping.faculty_id}</p>
                              </div>
                            </div>

                            {/* Subjects */}
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Assigned Subjects ({mapping.subject_ids?.length || 0}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {mapping.subject_ids && mapping.subject_ids.map((subId) => {
                                  const subject = subjects.find(s => s.id === subId);
                                  return (
                                    <Badge key={subId} variant="secondary" className="bg-indigo-50 text-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 py-1 px-2.5">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                      {subject ? subject.subject_name : `Subject #${subId}`}
                                    </Badge>
                                  );
                                })}
                                {(!mapping.subject_ids || mapping.subject_ids.length === 0) && (
                                  <span className="text-xs text-gray-400">No subjects assigned</span>
                                )}
                              </div>
                            </div>

                            {/* Inheriting Departments */}
                            <div className="pt-2 border-t border-gray-100">
                              <p className="mb-1 text-xs text-gray-500 font-medium">
                                Inheriting Departments ({inheritedDepts.length}):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {inheritedDepts.map((dName, idx) => (
                                  <span key={idx} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    <Building className="w-3 h-3 mr-1 text-gray-400" />
                                    {dName}
                                  </span>
                                ))}
                                {inheritedDepts.length === 0 && (
                                  <span className="text-xs text-amber-600">No departments mapped to this faculty yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {canDelete() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteFacultyMapping(mapping.id, mapping.faculty_name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No faculty-subject mappings found</p>
                  <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
                    Configure faculty-level subject mappings to allow departments to share exam subjects effortlessly.
                  </p>
                  {canWrite() && (
                    <Button onClick={() => setIsDialogOpen(true)} className="mt-4 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Faculty Mapping
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Department Mappings (Legacy) */}
        <TabsContent value="department" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  Department-Specific Subject Overrides
                </span>
                <Badge variant="outline">{deptMappings.length} overrides</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading department mappings...</span>
                </div>
              ) : deptMappings.length > 0 ? (
                <div className="space-y-4">
                  {deptMappings.map((mapping) => (
                    <Card key={mapping.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Building className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{mapping.department_name}</h3>
                              <p className="text-xs text-gray-500">Department ID: {mapping.department_id}</p>
                            </div>
                          </div>
                          <div className="ml-11">
                            <p className="mb-2 text-xs font-medium text-gray-600">Department Specific Subjects:</p>
                            <div className="flex flex-wrap gap-2">
                              {mapping.subject_ids && mapping.subject_ids.map((subId) => {
                                const subject = subjects.find(s => s.id === subId);
                                return (
                                  <Badge key={subId} variant="secondary" className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {subject ? subject.subject_name : `Subject #${subId}`}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        {canDelete() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDeptMapping(mapping.id, mapping.department_name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-base font-medium">No department-specific overrides</p>
                  <p className="text-xs text-gray-400 mt-1">All departments inherit subjects from their parent faculty.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'faculty' ? 'Create Faculty-Subject Mapping' : 'Create Department-Subject Mapping'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'faculty'
                ? 'Assign subjects to a faculty. All departments within this faculty will inherit these subjects.'
                : 'Assign custom subjects to an individual department override.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {activeTab === 'faculty' ? (
              <div>
                <Label htmlFor="faculty">Faculty</Label>
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((fac) => {
                      const existing = facultyMappings.find(m => m.faculty_id === fac.id);
                      return (
                        <SelectItem key={fac.id} value={fac.id.toString()}>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-600" />
                            <span>{fac.faculty_name} ({fac.faculty_code})</span>
                            {existing && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Mapped
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => {
                      const existing = deptMappings.find(m => m.department_id === dept.id);
                      return (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            <span>{dept.department_name}</span>
                            {existing && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Mapped
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Subject Selection */}
            <div>
              <Label className="text-base font-medium">Select Subjects</Label>
              <p className="mb-3 text-xs text-gray-500">Check the subjects to associate with this {activeTab}</p>
              <div className="grid grid-cols-1 gap-3 p-3 overflow-y-auto border rounded-lg md:grid-cols-2 max-h-60 bg-gray-50/50">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-100 hover:border-indigo-200 transition-colors">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) => handleSubjectToggle(subject.id, !!checked)}
                    />
                    <label
                      htmlFor={`subject-${subject.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600 font-medium text-gray-700"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      {subject.subject_name}
                    </label>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleCreateMapping} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
                Save Mapping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
};

export default SubjectDepartmentMapping;
