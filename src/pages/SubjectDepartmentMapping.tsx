import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  GraduationCap,
  BookOpen,
  Building,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { subjectFacultyAPI, facultyAPI, departmentAPI, subjectAPI, facultyDepartmentAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_code?: string;
  faculty_shortname?: string;
}

interface Department {
  id: number;
  department_name: string;
  department_shortname?: string;
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

const SubjectDepartmentMapping: React.FC = () => {
  const { canRead, canWrite, canEdit, canDelete } = usePermissions();
  const [facultyMappings, setFacultyMappings] = useState<FacultyMapping[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyDeptMap, setFacultyDeptMap] = useState<Record<number, number[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');

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
      } else if (response && response.success && response.data) {
        setFacultyMappings(response.data);
      } else if (response && Array.isArray(response.data)) {
        setFacultyMappings(response.data);
      } else {
        setFacultyMappings([]);
      }
    } catch (error) {
      console.error('Error loading faculty subject mappings:', error);
      setFacultyMappings([]);
    }
  };

  const loadFaculties = async () => {
    try {
      const response = await facultyAPI.getAllFaculties();
      if (response && response.success && response.data) {
        setFaculties(response.data);
      } else if (Array.isArray(response)) {
        setFaculties(response);
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      if (response && response.success && response.data) {
        setDepartments(response.data);
      } else if (Array.isArray(response)) {
        setDepartments(response);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAllSubjects();
      if (response && response.success && response.data) {
        setSubjects(response.data);
      } else if (Array.isArray(response)) {
        setSubjects(response);
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
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.faculty_id && item.department_ids) {
            map[item.faculty_id] = item.department_ids;
          }
        });
      }
      setFacultyDeptMap(map);
    } catch (error) {
      console.error('Error loading faculty department relationships:', error);
    }
  };

  // Helper to get inheriting departments for a faculty
  const getInheritingDepartments = (facultyId: number): Department[] => {
    const deptIds = facultyDeptMap[facultyId] || [];
    return deptIds
      .map((id) => departments.find((d) => d.id === id))
      .filter((d): d is Department => Boolean(d));
  };

  // Open modal in create mode
  const handleOpenCreate = () => {
    if (!canWrite()) {
      toast.error('You do not have permission to create mappings');
      return;
    }
    setIsEditing(false);
    setEditingMappingId(null);
    setSelectedFaculty('');
    setSelectedSubjects([]);
    setSubjectFilter('');
    setIsDialogOpen(true);
  };

  // Open modal in edit mode
  const handleOpenEdit = (mapping: FacultyMapping) => {
    if (!canEdit()) {
      toast.error('You do not have permission to edit mappings');
      return;
    }
    setIsEditing(true);
    setEditingMappingId(mapping.id);
    setSelectedFaculty(mapping.faculty_id.toString());
    setSelectedSubjects(mapping.subject_ids ? [...mapping.subject_ids] : []);
    setSubjectFilter('');
    setIsDialogOpen(true);
  };

  // Save (Create or Update) mapping
  const handleSaveMapping = async () => {
    if (!selectedFaculty) {
      toast.error('Please select a faculty');
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      setIsSaving(true);
      const facultyId = parseInt(selectedFaculty, 10);

      if (isEditing && editingMappingId) {
        const response = await subjectFacultyAPI.updateMapping(editingMappingId, {
          faculty: facultyId,
          subject_ids: selectedSubjects,
        });
        if (response && (response.success || response.id)) {
          toast.success('Faculty subject mapping updated successfully');
          setIsDialogOpen(false);
          await loadFacultyMappings();
        } else {
          toast.error(response?.message || 'Failed to update mapping');
        }
      } else {
        const response = await subjectFacultyAPI.createMapping({
          faculty: facultyId,
          subject_ids: selectedSubjects,
        });
        if (response && (response.success || response.id)) {
          toast.success('Faculty subject mapping created successfully');
          setIsDialogOpen(false);
          await loadFacultyMappings();
        } else {
          toast.error(response?.message || 'Failed to create mapping');
        }
      }
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'string' ? error : 'Failed to save mapping');
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete mapping
  const handleDeleteMapping = (mappingId: number, facultyName: string) => {
    if (!canDelete()) {
      toast.error('You do not have permission to delete mappings');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Faculty Subject Mapping?',
      variant: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      description: (
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Are you sure you want to remove the subject mapping for{' '}
            <strong className="text-gray-900 font-semibold">{facultyName}</strong>?
          </p>
          <p className="text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            All member departments under this faculty will no longer inherit these subjects for questions, question sets, and exams.
          </p>
        </div>
      ),
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const response = await subjectFacultyAPI.deleteMapping(mappingId);
          if (response && response.success !== false) {
            toast.success('Faculty mapping deleted successfully');
            setConfirmDialog((prev) => ({ ...prev, open: false, isLoading: false }));
            await loadFacultyMappings();
          } else {
            toast.error(response?.message || 'Failed to delete mapping');
            setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          toast.error(error?.message || 'Failed to delete mapping');
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // Subject selection helpers
  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSelectAllFilteredSubjects = () => {
    const filteredIds = filteredDialogSubjects.map((s) => s.id);
    const newSelected = Array.from(new Set([...selectedSubjects, ...filteredIds]));
    setSelectedSubjects(newSelected);
  };

  const handleDeselectAllFilteredSubjects = () => {
    const filteredIds = new Set(filteredDialogSubjects.map((s) => s.id));
    setSelectedSubjects((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  // Filtered subjects inside dialog
  const filteredDialogSubjects = useMemo(() => {
    if (!subjectFilter.trim()) return subjects;
    const term = subjectFilter.toLowerCase();
    return subjects.filter((s) => s.subject_name.toLowerCase().includes(term));
  }, [subjects, subjectFilter]);

  // Filtered faculty mappings on main page
  const filteredMappings = useMemo(() => {
    if (!searchQuery.trim()) return facultyMappings;
    const term = searchQuery.toLowerCase();
    return facultyMappings.filter(
      (m) =>
        m.faculty_name.toLowerCase().includes(term) ||
        (m.faculty_code && m.faculty_code.toLowerCase().includes(term))
    );
  }, [facultyMappings, searchQuery]);

  // Set of faculty IDs that are already mapped
  const mappedFacultyIds = useMemo(() => {
    return new Set(facultyMappings.map((m) => m.faculty_id));
  }, [facultyMappings]);

  // Selected faculty object for modal preview
  const currentSelectedFacultyObj = useMemo(() => {
    if (!selectedFaculty) return null;
    const facId = parseInt(selectedFaculty, 10);
    return faculties.find((f) => f.id === facId) || null;
  }, [selectedFaculty, faculties]);

  // Selected faculty's inheriting departments for preview
  const previewInheritingDepartments = useMemo(() => {
    if (!currentSelectedFacultyObj) return [];
    return getInheritingDepartments(currentSelectedFacultyObj.id);
  }, [currentSelectedFacultyObj, departments, facultyDeptMap]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#2E3094] to-[#4C51BF] text-white rounded-xl shadow-md">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subject Faculty Mapping</h1>
              <p className="text-sm text-gray-500">
                Directly map subjects to faculties. All member departments automatically inherit these subjects for questions and exams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={loadAllData} disabled={isLoading} className="border-gray-300">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canWrite() && (
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#252778] hover:to-[#3e429c] text-white shadow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Map Faculty Subjects
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Configured Faculties</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {facultyMappings.length}{' '}
                <span className="text-xs font-normal text-gray-500">/ {faculties.length} total</span>
              </p>
            </div>
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Active Subjects</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{subjects.length}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Inheriting Departments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {departments.length}{' '}
                <span className="text-xs font-normal text-gray-500">auto-inherit via faculty</span>
              </p>
            </div>
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <Building className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search faculties by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50/50 border-gray-200"
          />
        </div>
        <div className="text-xs text-gray-500">
          Showing {filteredMappings.length} of {facultyMappings.length} mappings
        </div>
      </div>

      {/* Mappings List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-600">Loading faculty-subject mappings...</p>
            </div>
          </Card>
        ) : filteredMappings.length > 0 ? (
          filteredMappings.map((mapping) => {
            const inheritingDepts = getInheritingDepartments(mapping.faculty_id);
            const mappedSubjectIds = mapping.subject_ids || [];

            return (
              <Card
                key={mapping.id}
                className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Faculty Card Header */}
                <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="px-3 py-1.5 bg-[#2E3094] text-white rounded-lg font-bold text-xs tracking-wide shadow-sm">
                      {mapping.faculty_code || 'FACULTY'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg">{mapping.faculty_name}</h3>
                        <Badge variant="outline" className="text-xs bg-indigo-50/80 text-indigo-700 border-indigo-200">
                          {mappedSubjectIds.length} Subjects
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-blue-50/80 text-blue-700 border-blue-200">
                          {inheritingDepts.length} Inheriting Depts
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Faculty ID: {mapping.faculty_id}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {canEdit() && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(mapping)}
                        className="text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 border-gray-200"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Edit Mapping
                      </Button>
                    )}
                    {canDelete() && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteMapping(mapping.id, mapping.faculty_name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Assigned Subjects */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Assigned Subjects ({mappedSubjectIds.length})
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {mappedSubjectIds.length > 0 ? (
                        mappedSubjectIds.map((subId) => {
                          const subject = subjects.find((s) => s.id === subId);
                          return (
                            <Badge
                              key={subId}
                              variant="secondary"
                              className="bg-indigo-50/80 text-indigo-900 border border-indigo-200/80 hover:bg-indigo-100 py-1 px-3 text-xs flex items-center gap-1.5 font-medium"
                            >
                              <BookOpen className="w-3 h-3 text-indigo-500" />
                              {subject ? subject.subject_name : `Subject #${subId}`}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-400 italic">No subjects assigned to this faculty</span>
                      )}
                    </div>
                  </div>

                  {/* Inheriting Departments */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      Departments Automatically Inheriting These Subjects ({inheritingDepts.length}):
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {inheritingDepts.length > 0 ? (
                        inheritingDepts.map((dept) => (
                          <span
                            key={dept.id}
                            className="inline-flex items-center text-xs bg-gray-100/80 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200/60 font-medium"
                          >
                            <Building className="w-3 h-3 mr-1.5 text-gray-400" />
                            {dept.department_name}
                            {dept.department_shortname && (
                              <span className="ml-1 text-gray-500 font-normal">({dept.department_shortname})</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                          No departments currently linked under this faculty in Faculty-Department Mapping. Once linked, they will inherit these subjects automatically.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center border-dashed border-gray-300">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {searchQuery ? 'No matching faculty mappings found' : 'No Faculty-Subject Mappings Yet'}
              </h3>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search query or clear the filter.'
                  : 'Map subjects directly to faculties. All departments under each faculty automatically inherit exam subjects.'}
              </p>
              {canWrite() && !searchQuery && (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-2 bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Map Faculty Subjects
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create / Edit Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              {isEditing ? 'Edit Faculty-Subject Mapping' : 'Map Subjects to Faculty'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Select a faculty and choose the subjects. All departments belonging to this faculty will automatically inherit the selected subjects.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Faculty Selection */}
            <div className="space-y-2">
              <Label htmlFor="faculty-select" className="text-sm font-semibold text-gray-700">
                Select Faculty <span className="text-red-500">*</span>
              </Label>
              {isEditing ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-900">{currentSelectedFacultyObj?.faculty_name}</span>
                  </div>
                  {currentSelectedFacultyObj?.faculty_code && (
                    <Badge variant="secondary">{currentSelectedFacultyObj.faculty_code}</Badge>
                  )}
                </div>
              ) : (
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger id="faculty-select" className="w-full">
                    <SelectValue placeholder="Choose a faculty to map subjects..." />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((fac) => {
                      const alreadyMapped = mappedFacultyIds.has(fac.id);
                      return (
                        <SelectItem key={fac.id} value={fac.id.toString()}>
                          {fac.faculty_name} {fac.faculty_code ? `(${fac.faculty_code})` : ''}
                          {alreadyMapped ? ' — [Already Configured]' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Inheriting Departments Preview */}
            {currentSelectedFacultyObj && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-700" />
                  Member Departments that will inherit these subjects ({previewInheritingDepartments.length}):
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {previewInheritingDepartments.length > 0 ? (
                    previewInheritingDepartments.map((dept) => (
                      <span
                        key={dept.id}
                        className="text-xs bg-white text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-medium shadow-2xs"
                      >
                        {dept.department_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-700">
                      No departments mapped under this faculty yet in Faculty-Department Mapping.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Subject Selection */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Select Subjects <span className="text-red-500">*</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedSubjects.length} selected
                  </Badge>
                </Label>

                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllFilteredSubjects}
                    className="h-7 text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 px-2"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    Select All
                  </Button>
                  <span className="text-gray-300">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAllFilteredSubjects}
                    className="h-7 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-2"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Subject Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Filter subjects list..."
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Subjects Checkbox Grid */}
              <div className="border border-gray-200 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 bg-gray-50/30">
                {filteredDialogSubjects.length > 0 ? (
                  filteredDialogSubjects.map((subject) => {
                    const isChecked = selectedSubjects.includes(subject.id);
                    return (
                      <div
                        key={subject.id}
                        onClick={() => handleToggleSubject(subject.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium'
                            : 'bg-white border-gray-200/80 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleSubject(subject.id)}
                            id={`sub-${subject.id}`}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                          <label
                            htmlFor={`sub-${subject.id}`}
                            className="text-sm cursor-pointer select-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {subject.subject_name}
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">ID #{subject.id}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    {subjectFilter ? 'No subjects matched your filter.' : 'No subjects available in the system.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMapping}
              disabled={isSaving || !selectedFaculty || selectedSubjects.length === 0}
              className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#252778] hover:to-[#3e429c] text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Mapping'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
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
