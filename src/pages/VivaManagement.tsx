import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Award, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2,
  Building2,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Save,
  X
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { vivaRubricsAPI, departmentAPI } from '../services/api';

interface VivaManagementProps {
  gradientClass: string;
}

interface VivaRubrics {
  id: number;
  department: number;
  department_name: string;
  department_shortname: string;
  rubrics: string;
  marks: number;
}

interface Department {
  id: number;
  name: string;
  shortname: string;
}

export function VivaManagement({ gradientClass }: VivaManagementProps) {
  const { canRead, canWrite } = usePermissions();
  
  // State management
  const [rubrics, setRubrics] = useState<VivaRubrics[]>([]);
  const [filteredRubrics, setFilteredRubrics] = useState<VivaRubrics[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRubrics, setEditingRubrics] = useState<VivaRubrics | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    department: '',
    rubrics: '',
    marks: ''
  });

  useEffect(() => {
    if (canRead()) {
      loadRubrics();
      loadDepartments();
    }
  }, []);

  useEffect(() => {
    filterRubrics();
  }, [rubrics, searchTerm, departmentFilter]);

  const filterRubrics = () => {
    let filtered = rubrics;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(rubric =>
        rubric.rubrics.toLowerCase().includes(term) ||
        rubric.department_name.toLowerCase().includes(term) ||
        rubric.department_shortname.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(rubric => rubric.department.toString() === departmentFilter);
    }

    setFilteredRubrics(filtered);
  };

  const loadRubrics = async () => {
    try {
      setIsLoading(true);
      const data = await vivaRubricsAPI.getAllRubrics();
      
      if (data.success) {
        setRubrics(data.rubrics);
        toast.success(data.message || `Loaded ${data.count} viva rubrics`);
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

  const loadDepartments = async () => {
    try {
      const data = await departmentAPI.getAllDepartments();
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (error: any) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canWrite()) {
      toast.error('You do not have permission to create viva rubrics');
      return;
    }

    try {
      const rubricData = {
        department: parseInt(formData.department),
        rubrics: formData.rubrics,
        marks: parseInt(formData.marks)
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

    try {
      const rubricData = {
        department: parseInt(formData.department),
        rubrics: formData.rubrics,
        marks: parseInt(formData.marks)
      };

      const data = await vivaRubricsAPI.updateRubrics(editingRubrics.id, rubricData);
      
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

    if (!confirm('Are you sure you want to delete this viva rubrics? This action cannot be undone.')) {
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
      department: rubric.department.toString(),
      rubrics: rubric.rubrics,
      marks: rubric.marks.toString()
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      department: '',
      rubrics: '',
      marks: ''
    });
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
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className={`rounded-lg p-6 text-white bg-gradient-to-r from-[#2E3094] to-[#4C51BF]`}>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
          <Award className="h-8 w-8" />
          Viva Rubrics Management
        </h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Manage viva rubrics and scoring criteria for different departments.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search rubrics or departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
           <SelectContent>
                       <SelectItem value="all">All Departments</SelectItem>
                       {departments && departments.map(dept => (
                         <SelectItem key={dept.id} value={dept.id.toString()}>
                           {dept.shortname} - {dept.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
          </Select>

          <Button
            onClick={loadRubrics}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {canWrite() && (
            <Button onClick={handleCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rubrics
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rubrics</p>
                <p className="text-2xl font-bold text-blue-600">{rubrics.length}</p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Set(rubrics.map(r => r.department)).size}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-purple-600">{filteredRubrics.length}</p>
              </div>
              <Search className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
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
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Rubrics Found</h3>
                <p className="text-gray-600">
                  {rubrics.length === 0 
                    ? "No viva rubrics available." 
                    : "Try adjusting your search or filter criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRubrics.map((rubric) => (
              <Card key={rubric.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Rubric Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          {rubric.department_shortname}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Award className="h-3 w-3 mr-1" />
                          {rubric.marks} marks
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {rubric.rubrics}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {rubric.department_name}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {canWrite() && (
                      <div className="flex lg:flex-col gap-2">
                        <Button
                          onClick={() => openEditDialog(rubric)}
                          variant="outline"
                          size="sm"
                          className="flex-1 lg:flex-none text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(rubric.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 lg:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Viva Rubrics</DialogTitle>
            <DialogDescription>
              Add new viva rubrics for a department.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments && departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.shortname} - {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-rubrics">Rubrics</Label>
              <Input
                id="create-rubrics"
                value={formData.rubrics}
                onChange={(e) => setFormData({...formData, rubrics: e.target.value})}
                placeholder="Enter rubrics name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-marks">Marks</Label>
              <Input
                id="create-marks"
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData({...formData, marks: e.target.value})}
                placeholder="Enter marks"
                min="1"
                required
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
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
              Update the viva rubrics information.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments && departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.shortname} - {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-rubrics">Rubrics</Label>
              <Input
                id="edit-rubrics"
                value={formData.rubrics}
                onChange={(e) => setFormData({...formData, rubrics: e.target.value})}
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
                onChange={(e) => setFormData({...formData, marks: e.target.value})}
                placeholder="Enter marks"
                min="1"
                required
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Update Rubrics
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}