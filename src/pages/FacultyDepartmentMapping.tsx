import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, Layers, Plus, Trash2, Edit, RefreshCw, Building, Landmark, X } from 'lucide-react';
import { facultyDepartmentAPI, facultyAPI, departmentAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
}

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface Mapping {
  id: number;
  faculty_id: number;
  faculty_name: string;
  faculty_shortname: string;
  department_ids: number[];
  departments?: Department[];
}

const FacultyDepartmentMapping: React.FC = () => {
  const { canRead, canWrite, canEdit, canDelete } = usePermissions();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
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
      loadMappings();
      loadFaculties();
      loadDepartments();
    }
  }, []);

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const response = await facultyDepartmentAPI.getAllMappings();
      if (Array.isArray(response)) {
        setMappings(response);
      } else if (response.success && response.data) {
        setMappings(response.data);
      } else {
        setMappings([]);
      }
    } catch (error: any) {
      console.error('Error loading faculty-department mappings:', error);
      toast.error('Failed to load faculty-department mappings');
      setMappings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFaculties = async () => {
    try {
      const response = await facultyAPI.getAllFaculties();
      if (response.success && response.data) {
        setFaculties(response.data);
      }
    } catch (error: any) {
      console.error('Error loading faculties:', error);
      toast.error('Failed to load faculties');
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

  const handleOpenCreateDialog = () => {
    if (!canWrite()) {
      toast.error('You do not have permission to create faculty-department mappings');
      return;
    }
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (mapping: Mapping) => {
    if (!canEdit()) {
      toast.error('You do not have permission to edit faculty-department mappings');
      return;
    }
    setEditingMapping(mapping);
    setSelectedFaculty(mapping.faculty_id.toString());
    setSelectedDepartments(mapping.department_ids || []);
    setIsDialogOpen(true);
  };

  const handleSaveMapping = async () => {
    if (editingMapping) {
      if (!canEdit()) {
        toast.error('You do not have permission to edit faculty-department mappings');
        return;
      }

      if (selectedDepartments.length === 0) {
        toast.error('Please select at least one department');
        return;
      }

      try {
        const mappingData = {
          faculty: editingMapping.faculty_id,
          department_ids: selectedDepartments,
        };

        const response = await facultyDepartmentAPI.updateMapping(editingMapping.id, mappingData);
        if (response.success) {
          toast.success('Mapping updated successfully');
          loadMappings();
          resetForm();
        }
      } catch (error: any) {
        console.error('Error updating mapping:', error);
        toast.error(error.message || 'Failed to update mapping');
      }
    } else {
      if (!canWrite()) {
        toast.error('You do not have permission to create faculty-department mappings');
        return;
      }

      if (!selectedFaculty || selectedDepartments.length === 0) {
        toast.error('Please select a faculty and at least one department');
        return;
      }

      try {
        const mappingData = {
          faculty: parseInt(selectedFaculty),
          department_ids: selectedDepartments,
        };

        const response = await facultyDepartmentAPI.createMapping(mappingData);
        if (response.success) {
          toast.success('Mapping created successfully');
          loadMappings();
          resetForm();
        }
      } catch (error: any) {
        console.error('Error creating mapping:', error);
        toast.error(error.message || 'Failed to create mapping');
      }
    }
  };

  const handleDeleteMapping = (mappingId: number, facultyName: string) => {
    if (!canDelete()) {
      toast.error('You do not have permission to delete faculty-department mappings');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Mapping?',
      variant: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      description: (
        <span>
          Are you sure you want to delete the mapping for{' '}
          <strong className="text-gray-900 font-semibold">{facultyName}</strong>? All mapped departments will be unlinked from this faculty.
        </span>
      ),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await facultyDepartmentAPI.deleteMapping(mappingId);
          if (response.success) {
            toast.success('Mapping deleted successfully');
            setConfirmDialog(prev => ({ ...prev, open: false, isLoading: false }));
            loadMappings();
          } else {
            toast.error(response.message || 'Failed to delete mapping');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          console.error('Error deleting mapping:', error);
          toast.error(error.message || 'Failed to delete mapping');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleUnmapDepartment = (mappingId: number, departmentId: number, departmentName: string, facultyName: string) => {
    if (!canEdit()) {
      toast.error('You do not have permission to modify faculty-department mappings');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Remove Department?',
      variant: 'danger',
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
      description: (
        <span>
          Are you sure you want to remove{' '}
          <strong className="text-gray-900 font-semibold">{departmentName}</strong>{' '}
          from <strong className="text-gray-900 font-semibold">{facultyName}</strong>?
        </span>
      ),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await facultyDepartmentAPI.removeDepartments(mappingId, [departmentId]);
          if (response.success) {
            toast.success(`Removed "${departmentName}" successfully`);
            setConfirmDialog(prev => ({ ...prev, open: false, isLoading: false }));
            loadMappings();
          } else {
            toast.error(response.message || 'Failed to remove department');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          console.error('Error removing department:', error);
          toast.error(error.message || 'Failed to remove department');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const resetForm = () => {
    setSelectedFaculty('');
    setSelectedDepartments([]);
    setEditingMapping(null);
    setIsDialogOpen(false);
  };

  const handleDepartmentToggle = (deptId: number, checked: boolean) => {
    if (checked) {
      setSelectedDepartments([...selectedDepartments, deptId]);
    } else {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    }
  };

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={loadMappings} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {canWrite() && (
          <Button onClick={handleOpenCreateDialog} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
            <Plus className="w-4 h-4 mr-2" />
            Create Mapping
          </Button>
        )}
      </div>

      {/* Mappings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Faculty-Department Mappings
            </span>
            <Badge variant="outline">{mappings.length} mappings</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
              <span className="ml-2">Loading mappings...</span>
            </div>
          ) : mappings.length > 0 ? (
            <div className="space-y-4">
              {mappings.map((mapping) => (
                <Card key={mapping.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Landmark className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{mapping.faculty_name}</h3>
                          <p className="text-sm font-medium text-blue-600">
                            {mapping.faculty_shortname}
                            <span className="text-xs text-gray-500 ml-2">ID: {mapping.faculty_id}</span>
                          </p>
                        </div>
                      </div>
                      <div className="ml-11">
                        <p className="mb-2 text-sm font-medium text-gray-700">Mapped Departments:</p>
                        <div className="flex flex-wrap gap-2">
                          {(mapping.department_ids || []).map((deptId) => {
                            const dept = departments.find(d => d.id === deptId);
                            const deptName = dept ? dept.department_name : `Department #${deptId}`;
                            const deptShort = dept?.department_shortname ? ` (${dept.department_shortname})` : '';

                            return (
                              <Badge key={deptId} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
                                <Building className="w-3 h-3 text-blue-600" />
                                <span>{deptName}{deptShort}</span>
                                {canEdit() && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnmapDepartment(mapping.id, deptId, deptName, mapping.faculty_name)}
                                    className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Unmap Department"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                        {(!mapping.department_ids || mapping.department_ids.length === 0) && (
                          <p className="text-sm text-gray-400">No departments mapped</p>
                        )}
                      </div>
                    </div>
                    {(canEdit() || canDelete()) && (
                      <div className="flex items-center gap-1">
                        {canEdit() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(mapping)}
                            title="Edit Mapping"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMapping(mapping.id, mapping.faculty_name)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No mappings found</p>
              <p className="text-sm">
                {canWrite() ? 'Create your first faculty-department mapping to get started' : 'No mappings are available yet'}
              </p>
              {canWrite() && (
                <Button onClick={handleOpenCreateDialog} className="mt-4 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Mapping
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? `Edit Mapping - ${editingMapping.faculty_name}` : 'Create Faculty-Department Mapping'}
            </DialogTitle>
            <DialogDescription>
              {editingMapping 
                ? 'Select or unselect the departments to map to this faculty.'
                : 'Select a faculty and the departments to map to it.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Faculty Selection */}
            <div>
              <Label htmlFor="faculty">Faculty</Label>
              {editingMapping ? (
                <div className="flex items-center gap-2 p-2.5 mt-1.5 bg-gray-50 border rounded-md">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-800">{editingMapping.faculty_name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{editingMapping.faculty_shortname}</Badge>
                </div>
              ) : (
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((faculty) => {
                      const existingMapping = mappings.find(m => m.faculty_id === faculty.id);
                      return (
                        <SelectItem key={faculty.id} value={faculty.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4" />
                            <span>{faculty.faculty_name} ({faculty.faculty_shortname})</span>
                            {existingMapping && (
                              <Badge variant="outline" className="text-xs">
                                Already mapped
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Department Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-base font-medium">Departments</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDepartments(departments.map(d => d.id))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDepartments([])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <p className="mb-3 text-sm text-gray-500">Select departments to map to this faculty</p>
              <div className="grid grid-cols-1 gap-3 p-3 overflow-y-auto border rounded-lg md:grid-cols-2 max-h-60">
                {departments.map((department) => (
                  <div key={department.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${department.id}`}
                      checked={selectedDepartments.includes(department.id)}
                      onCheckedChange={(checked) => 
                        handleDepartmentToggle(department.id, !!checked)
                      }
                    />
                    <label
                      htmlFor={`dept-${department.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600"
                    >
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      <span>{department.department_name}</span>
                      {department.department_shortname && (
                        <span className="text-xs text-gray-400">({department.department_shortname})</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {selectedDepartments.length} department{selectedDepartments.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveMapping}
                className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"
                disabled={
                  editingMapping 
                    ? !canEdit() || selectedDepartments.length === 0 
                    : !canWrite() || !selectedFaculty || selectedDepartments.length === 0
                }
              >
                {editingMapping ? 'Update Mapping' : 'Create Mapping'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (SweetAlert-style) */}
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

export default FacultyDepartmentMapping;
