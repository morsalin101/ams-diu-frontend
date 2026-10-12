import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Award,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Building2,
  GraduationCap,
  AlertTriangle,
  Loader2,
  Save,
  X,
  Filter,
  Layers,
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { vivaRubricsAPI, departmentAPI, facultyAPI } from '../services/api';

interface VivaManagementProps {
  gradientClass: string;
}

interface VivaRubrics {
  id: number;
  department?: number | null;
  department_name?: string;
  department_shortname?: string;
  faculty?: number | null;
  faculty_name?: string;
  faculty_code?: string;
  rubrics: string;
  marks: number;
}

interface Department {
  id: number;
  department_name: string;
  department_shortname?: string;
}

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_code: string;
}

export function VivaManagement({ gradientClass }: VivaManagementProps) {
  const { canRead, canWrite } = usePermissions();

  // State management
  const [rubrics, setRubrics] = useState<VivaRubrics[]>([]);
  const [filteredRubrics, setFilteredRubrics] = useState<VivaRubrics[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'faculty' | 'department'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRubrics, setEditingRubrics] = useState<VivaRubrics | null>(null);

  // Form states
  const [formScope, setFormScope] = useState<'faculty' | 'department'>('faculty');
  const [formData, setFormData] = useState({
    faculty: '',
    department: '',
    rubrics: '',
    marks: '',
  });

  useEffect(() => {
    if (canRead()) {
      loadRubrics();
      loadDepartmentsAndFaculties();
    }
  }, []);

  useEffect(() => {
    filterRubrics();
  }, [rubrics, searchTerm, scopeFilter, departmentFilter, facultyFilter]);

  const filterRubrics = () => {
    let filtered = rubrics;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        rubric =>
          rubric.rubrics.toLowerCase().includes(term) ||
          (rubric.department_name && rubric.department_name.toLowerCase().includes(term)) ||
          (rubric.department_shortname && rubric.department_shortname.toLowerCase().includes(term)) ||
          (rubric.faculty_name && rubric.faculty_name.toLowerCase().includes(term)) ||
          (rubric.faculty_code && rubric.faculty_code.toLowerCase().includes(term)),
      );
    }

    // Scope filter
    if (scopeFilter === 'faculty') {
      filtered = filtered.filter(rubric => Boolean(rubric.faculty));
    } else if (scopeFilter === 'department') {
      filtered = filtered.filter(rubric => Boolean(rubric.department));
    }

    // Faculty filter
    if (facultyFilter !== 'all') {
      filtered = filtered.filter(
        rubric => rubric.faculty?.toString() === facultyFilter,
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(
        rubric => rubric.department?.toString() === departmentFilter,
      );
    }

    setFilteredRubrics(filtered);
  };

  const loadRubrics = async () => {
    try {
      setIsLoading(true);
      const data = await vivaRubricsAPI.getAllRubrics();

      if (data.success) {
        setRubrics(data.rubrics || []);
        toast.success(data.message || `Loaded ${(data.rubrics || []).length} viva rubrics`);
      } else {
        throw new Error(data.message || 'Failed to load viva rubrics');
      }
    } catch (error: any) {
      console.error('Error loading viva rubrics:', error);
      toast.error(error.message || 'Failed to load viva rubrics');
      setRubrics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartmentsAndFaculties = async () => {
    try {
      const [deptRes, facRes] = await Promise.all([
        departmentAPI.getAllDepartments(),
        facultyAPI.getAllFaculties(),
      ]);

      if (deptRes.success) {
        setDepartments(deptRes.data || deptRes.departments || []);
      }
      if (facRes.success) {
        setFaculties(facRes.data || facRes.faculties || []);
      }
    } catch (error: any) {
      console.error('Error loading departments or faculties:', error);
      toast.error('Failed to load faculties/departments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite()) {
      toast.error('You do not have permission to create viva rubrics');
      return;
    }

    if (!formData.faculty) {
      toast.error('Please select a faculty');
      return;
    }

    try {
      const rubricData: any = {
        faculty: parseInt(formData.faculty),
        rubrics: formData.rubrics,
        marks: parseInt(formData.marks),
      };

      const data = await vivaRubricsAPI.createRubrics(rubricData);

      if (data.success) {
        toast.success('Viva rubrics created successfully');
        setShowCreateDialog(false);
        resetForm();
        loadRubrics();
      } else {
        throw new Error(data.message || 'Failed to create viva rubrics');
      }
    } catch (error: any) {
      console.error('Error creating viva rubrics:', error);
      toast.error(error.message || 'Failed to create viva rubrics');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite() || !editingRubrics) {
      toast.error('You do not have permission to edit viva rubrics');
      return;
    }

    if (!formData.faculty) {
      toast.error('Please select a faculty');
      return;
    }

    try {
      const rubricData: any = {
        faculty: parseInt(formData.faculty),
        department: null,
        rubrics: formData.rubrics,
        marks: parseInt(formData.marks),
      };

      const data = await vivaRubricsAPI.updateRubrics(
        editingRubrics.id,
        rubricData,
      );

      if (data.success) {
        toast.success('Viva rubrics updated successfully');
        setShowEditDialog(false);
        setEditingRubrics(null);
        resetForm();
        loadRubrics();
      } else {
        throw new Error(data.message || 'Failed to update viva rubrics');
      }
    } catch (error: any) {
      console.error('Error updating viva rubrics:', error);
      toast.error(error.message || 'Failed to update viva rubrics');
    }
  };

  const handleDelete = async (rubricsId: number) => {
    if (!canWrite()) {
      toast.error('You do not have permission to delete viva rubrics');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to delete this viva rubrics? This action cannot be undone.',
      )
    ) {
      return;
    }

    try {
      const data = await vivaRubricsAPI.deleteRubrics(rubricsId);

      if (data.success) {
        toast.success('Viva rubrics deleted successfully');
        loadRubrics();
      } else {
        throw new Error(data.message || 'Failed to delete viva rubrics');
      }
    } catch (error: any) {
      console.error('Error deleting viva rubrics:', error);
      toast.error(error.message || 'Failed to delete viva rubrics');
    }
  };

  const openEditDialog = (rubric: VivaRubrics) => {
    setEditingRubrics(rubric);
    setFormData({
      faculty: rubric.faculty?.toString() || '',
      department: '',
      rubrics: rubric.rubrics,
      marks: rubric.marks.toString(),
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      faculty: '',
      department: '',
      rubrics: '',
      marks: '',
    });
    setFormScope('faculty');
  };

  const handleCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Permission check
  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const facultyRubricsCount = rubrics.filter(r => Boolean(r.faculty)).length;
  const deptRubricsCount = rubrics.filter(r => Boolean(r.department)).length;

  return (
    <div className="p-4 space-y-6 sm:p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rubrics</p>
                <p className="text-2xl font-bold text-blue-600">{rubrics.length}</p>
              </div>
              <Award className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Faculty-Level (Shared)</p>
                <p className="text-2xl font-bold text-purple-600">{facultyRubricsCount}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Department Overrides</p>
                <p className="text-2xl font-bold text-emerald-600">{deptRubricsCount}</p>
              </div>
              <Building2 className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-amber-600">{filteredRubrics.length}</p>
              </div>
              <Search className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="gap-0 border-2 border-gray-200">
        <CardHeader className="py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-3 pb-4 sm:px-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="relative">
              <Label htmlFor="viva-search" className="block mb-2">
                Search
              </Label>
              <Search className="absolute w-4 h-4 text-gray-400 left-3 top-9" />
              <Input
                id="viva-search"
                placeholder="Search rubrics, faculty, dept..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <Label className="block mb-2">Scope Filter</Label>
              <Select
                value={scopeFilter}
                onValueChange={(val: any) => setScopeFilter(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Scopes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="faculty">Faculty-Level (Shared)</SelectItem>
                  <SelectItem value="department">Department-Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block mb-2">Faculty Filter</Label>
              <Select
                value={facultyFilter}
                onValueChange={setFacultyFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  {faculties.map(fac => (
                    <SelectItem key={fac.id} value={fac.id.toString()}>
                      {fac.faculty_code} - {fac.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="block mb-2">Department Filter</Label>
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.department_shortname || dept.department_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-1">
                <Button
                  onClick={loadRubrics}
                  disabled={isLoading}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </Button>

                {canWrite() && (
                  <Button onClick={handleCreateDialog} className="h-10 shrink-0">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading viva rubrics...</p>
          </div>
        </div>
      )}

      {/* Rubrics List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredRubrics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-800">
                  No Rubrics Found
                </h3>
                <p className="text-gray-600">
                  {rubrics.length === 0
                    ? 'No viva rubrics available.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRubrics.map(rubric => {
              const isFacultyScope = Boolean(rubric.faculty);

              return (
                <Card
                  key={rubric.id}
                  className="transition-shadow hover:shadow-md border-l-4"
                  style={{
                    borderLeftColor: isFacultyScope ? '#9333ea' : '#3b82f6',
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* Rubric Content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isFacultyScope ? (
                            <Badge
                              variant="outline"
                              className="text-purple-700 border-purple-300 bg-purple-50 font-semibold flex items-center gap-1"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              Faculty Level (Shared): {rubric.faculty_code || rubric.faculty_name}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-blue-700 border-blue-300 bg-blue-50 font-semibold flex items-center gap-1"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              Department: {rubric.department_shortname || rubric.department_name}
                            </Badge>
                          )}

                          <Badge
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 bg-emerald-50"
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {rubric.marks} marks
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {rubric.rubrics}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {isFacultyScope
                              ? `Applies to all departments under ${rubric.faculty_name || rubric.faculty_code}`
                              : `Specific to ${rubric.department_name}`}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      {canWrite() && (
                        <div className="flex gap-2 lg:flex-row">
                          <Button
                            onClick={() => openEditDialog(rubric)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(rubric.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Viva Rubrics</DialogTitle>
            <DialogDescription>
              Define viva assessment criteria at Faculty or Department level.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-faculty">Faculty *</Label>
              <Select
                value={formData.faculty}
                onValueChange={value =>
                  setFormData({ ...formData, faculty: value })
                }
              >
                <SelectTrigger id="create-faculty">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map(fac => (
                    <SelectItem key={fac.id} value={fac.id.toString()}>
                      {fac.faculty_code} - {fac.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Rubrics configured for this faculty will be shared across all constituent departments.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-rubrics">Rubrics Criterion</Label>
              <Input
                id="create-rubrics"
                value={formData.rubrics}
                onChange={e =>
                  setFormData({ ...formData, rubrics: e.target.value })
                }
                placeholder="e.g. Technical Communication & Problem Solving"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-marks">Marks</Label>
              <Input
                id="create-marks"
                type="number"
                value={formData.marks}
                onChange={e =>
                  setFormData({ ...formData, marks: e.target.value })
                }
                placeholder="Enter marks (e.g. 10)"
                min="1"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Create Rubrics
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Viva Rubrics</DialogTitle>
            <DialogDescription>
              Update rubric criterion or assigned scope.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-faculty">Faculty *</Label>
              <Select
                value={formData.faculty}
                onValueChange={value =>
                  setFormData({ ...formData, faculty: value })
                }
              >
                <SelectTrigger id="edit-faculty">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map(fac => (
                    <SelectItem key={fac.id} value={fac.id.toString()}>
                      {fac.faculty_code} - {fac.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rubrics">Rubrics Criterion</Label>
              <Input
                id="edit-rubrics"
                value={formData.rubrics}
                onChange={e =>
                  setFormData({ ...formData, rubrics: e.target.value })
                }
                placeholder="Enter rubrics name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-marks">Marks</Label>
              <Input
                id="edit-marks"
                type="number"
                value={formData.marks}
                onChange={e =>
                  setFormData({ ...formData, marks: e.target.value })
                }
                placeholder="Enter marks"
                min="1"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Update Rubrics
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
