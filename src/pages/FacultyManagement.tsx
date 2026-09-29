import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, Landmark, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { facultyAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
  created_at?: string;
}

const FacultyManagement: React.FC = () => {
  const { canRead, canWrite, canEdit, canDelete } = usePermissions();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [formData, setFormData] = useState({
    faculty_name: '',
    faculty_shortname: '',
  });
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
      loadFaculties();
    }
  }, []);

  const loadFaculties = async () => {
    try {
      setIsLoading(true);
      const response = await facultyAPI.getAllFaculties();
      if (response.success && response.data) {
        setFaculties(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Error loading faculties:', error);
      toast.error('Failed to load faculties');
      setFaculties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFaculty = async () => {
    if (!canWrite()) {
      toast.error('You do not have permission to create faculties');
      return;
    }

    if (!formData.faculty_name.trim() || !formData.faculty_shortname.trim()) {
      toast.error('Faculty name and short name are required');
      return;
    }

    try {
      const response = await facultyAPI.createFaculty(formData);
      if (response.success) {
        toast.success('Faculty created successfully');
        loadFaculties();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating faculty:', error);
      toast.error(error.message || 'Failed to create faculty');
    }
  };

  const handleUpdateFaculty = async () => {
    if (!canEdit()) {
      toast.error('You do not have permission to edit faculties');
      return;
    }

    if (!editingFaculty || !formData.faculty_name.trim() || !formData.faculty_shortname.trim()) {
      toast.error('Faculty name and short name are required');
      return;
    }

    try {
      const response = await facultyAPI.updateFaculty(editingFaculty.id, formData);
      if (response.success) {
        toast.success('Faculty updated successfully');
        loadFaculties();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error updating faculty:', error);
      toast.error(error.message || 'Failed to update faculty');
    }
  };

  const handleDeleteFaculty = (facultyId: number, facultyName: string) => {
    if (!canDelete()) {
      toast.error('You do not have permission to delete faculties');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Faculty?',
      variant: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      description: (
        <span>
          Are you sure you want to delete{' '}
          <strong className="text-gray-900 font-semibold">{facultyName}</strong>? This action cannot be undone.
        </span>
      ),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await facultyAPI.deleteFaculty(facultyId);
          if (response.success) {
            toast.success('Faculty deleted successfully');
            setConfirmDialog(prev => ({ ...prev, open: false, isLoading: false }));
            loadFaculties();
          } else {
            toast.error(response.message || 'Failed to delete faculty');
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error: any) {
          console.error('Error deleting faculty:', error);
          toast.error(error.message || 'Failed to delete faculty');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({ faculty_name: '', faculty_shortname: '' });
    setEditingFaculty(null);
    setIsDialogOpen(false);
  };

  const openCreateDialog = () => {
    if (!canWrite()) {
      toast.error('You do not have permission to create faculties');
      return;
    }

    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (faculty: Faculty) => {
    if (!canEdit()) {
      toast.error('You do not have permission to edit faculties');
      return;
    }

    setEditingFaculty(faculty);
    setFormData({
      faculty_name: faculty.faculty_name,
      faculty_shortname: faculty.faculty_shortname,
    });
    setIsDialogOpen(true);
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
        <Button variant="outline" onClick={loadFaculties} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {canWrite() && (
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
            <Plus className="w-4 h-4 mr-2" />
            Add Faculty
          </Button>
        )}
      </div>

      {/* Faculties List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              All Faculties
            </span>
            <Badge variant="outline">{faculties.length} faculties</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
              <span className="ml-2">Loading faculties...</span>
            </div>
          ) : faculties.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {faculties.map((faculty) => (
                <Card key={faculty.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Landmark className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{faculty.faculty_name}</h3>
                        <p className="text-sm font-medium text-blue-600">{faculty.faculty_shortname}</p>
                        <p className="text-xs text-gray-500">ID: {faculty.id}</p>
                      </div>
                    </div>
                    {(canEdit() || canDelete()) && (
                      <div className="flex gap-1">
                        {canEdit() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(faculty)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                        {canDelete() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFaculty(faculty.id, faculty.faculty_name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
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
              <Landmark className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No faculties found</p>
              <p className="text-sm">
                {canWrite() ? 'Create your first faculty to get started' : 'No faculties are available yet'}
              </p>
              {canWrite() && (
                <Button onClick={openCreateDialog} className="mt-4 bg-gradient-to-r from-[#2E3094] to-[#4C51BF]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Faculty
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFaculty ? 'Edit Faculty' : 'Create New Faculty'}
            </DialogTitle>
            <DialogDescription>
              {editingFaculty 
                ? 'Update the faculty information below.'
                : 'Enter the details for the new faculty.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="faculty_name">Faculty Name</Label>
              <Input
                id="faculty_name"
                value={formData.faculty_name}
                onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                placeholder="Enter faculty name"
              />
            </div>
            <div>
              <Label htmlFor="faculty_shortname">Faculty Short Name</Label>
              <Input
                id="faculty_shortname"
                value={formData.faculty_shortname}
                onChange={(e) => setFormData({ ...formData, faculty_shortname: e.target.value })}
                placeholder="Enter faculty short name (e.g., FSIT, FE)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={editingFaculty ? handleUpdateFaculty : handleCreateFaculty}
                className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF]"
                disabled={editingFaculty ? !canEdit() : !canWrite()}
              >
                {editingFaculty ? 'Update' : 'Create'}
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

export default FacultyManagement;
