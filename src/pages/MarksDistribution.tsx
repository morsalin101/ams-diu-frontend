import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  BarChart3, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2,
  Building2,
  GraduationCap,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Save,
  X,
  Target
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { marksDistributionAPI, departmentAPI } from '../services/api';

interface MarksDistributionProps {
  gradientClass: string;
}

interface MarksDistribution {
  id: number;
  department: number;
  department_name: string;
  department_shortname: string;
  ssc: number;
  hsc: number;
  diploma: number;
  main_marks: number;
}

interface Department {
  id: number;
  name: string;
  shortname: string;
}

export function MarksDistribution({ gradientClass }: MarksDistributionProps) {
  const { canRead, canWrite } = usePermissions();
  
  // State management
  const [distributions, setDistributions] = useState<MarksDistribution[]>([]);
  const [filteredDistributions, setFilteredDistributions] = useState<MarksDistribution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    department: '',
    ssc: '',
    hsc: '',
    diploma: '',
    main_marks: ''
  });

  useEffect(() => {
    if (canRead()) {
      loadMarksDistribution();
      loadDepartments();
    }
  }, []);

  useEffect(() => {
    filterDistributions();
  }, [distributions, searchTerm, departmentFilter]);

  const filterDistributions = () => {
    let filtered = distributions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(dist =>
        dist.department_name.toLowerCase().includes(term) ||
        dist.department_shortname.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(dist => dist.department.toString() === departmentFilter);
    }

    setFilteredDistributions(filtered);
  };

  const loadMarksDistribution = async () => {
    try {
      setIsLoading(true);
      const data = await marksDistributionAPI.getAllMarksDistribution();
      
      if (data.success) {
        setDistributions(data.marks_distribution);
        toast.success(data.message || `Loaded ${data.count} marks distribution records`);
      } else {
        throw new Error(data.message || 'Failed to load marks distribution');
      }
    } catch (error: any) {
      console.error('Error loading marks distribution:', error);
      toast.error(error.message || 'Failed to load marks distribution');
      setDistributions([]);
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
      toast.error('You do not have permission to create marks distribution');
      return;
    }

    // Validate total equals 100
    const total = parseInt(formData.ssc) + parseInt(formData.hsc) + parseInt(formData.diploma) + parseInt(formData.main_marks);
    if (total !== 100) {
      toast.error('Total marks distribution must equal 100%');
      return;
    }

    try {
      const distributionData = {
        department: parseInt(formData.department),
        ssc: parseInt(formData.ssc),
        hsc: parseInt(formData.hsc),
        diploma: parseInt(formData.diploma),
        main_marks: parseInt(formData.main_marks)
      };

      const data = await marksDistributionAPI.createMarksDistribution(distributionData);
      
      if (data.success) {
        toast.success('Marks distribution created successfully');
        setShowCreateDialog(false);
        resetForm();
        loadMarksDistribution();
      } else {
        throw new Error(data.message || 'Failed to create marks distribution');
      }
    } catch (error: any) {
      console.error('Error creating marks distribution:', error);
      toast.error(error.message || 'Failed to create marks distribution');
    }
  };

  const handleDelete = async (distributionId: number) => {
    if (!canWrite()) {
      toast.error('You do not have permission to delete marks distribution');
      return;
    }

    if (!confirm('Are you sure you want to delete this marks distribution? This action cannot be undone.')) {
      return;
    }

    try {
      const data = await marksDistributionAPI.deleteMarksDistribution(distributionId);
      
      if (data.success) {
        toast.success('Marks distribution deleted successfully');
        loadMarksDistribution();
      } else {
        throw new Error(data.message || 'Failed to delete marks distribution');
      }
    } catch (error: any) {
      console.error('Error deleting marks distribution:', error);
      toast.error(error.message || 'Failed to delete marks distribution');
    }
  };

  const resetForm = () => {
    setFormData({
      department: '',
      ssc: '',
      hsc: '',
      diploma: '',
      main_marks: ''
    });
  };

  const handleCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const calculateTotal = () => {
    const ssc = parseInt(formData.ssc) || 0;
    const hsc = parseInt(formData.hsc) || 0;
    const diploma = parseInt(formData.diploma) || 0;
    const main_marks = parseInt(formData.main_marks) || 0;
    return ssc + hsc + diploma + main_marks;
  };

  const getTotalColor = () => {
    const total = calculateTotal();
    if (total === 100) return 'text-green-600';
    if (total > 100) return 'text-red-600';
    return 'text-orange-600';
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
          <BarChart3 className="h-8 w-8" />
          Marks Distribution Management
        </h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          Manage marks distribution for SSC, HSC, Diploma and Main marks across departments.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search departments..."
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
            onClick={loadMarksDistribution}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {canWrite() && (
            <Button onClick={handleCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Distribution
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{distributions.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Set(distributions.map(d => d.department)).size}
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
                <p className="text-sm font-medium text-gray-600">Avg Main Marks</p>
                <p className="text-2xl font-bold text-purple-600">
                  {distributions.length > 0 ? Math.round(distributions.reduce((sum, d) => sum + d.main_marks, 0) / distributions.length) : 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-orange-600">{filteredDistributions.length}</p>
              </div>
              <Search className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading marks distribution...</p>
          </div>
        </div>
      )}

      {/* Distribution List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredDistributions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Marks Distribution Found</h3>
                <p className="text-gray-600">
                  {distributions.length === 0 
                    ? "No marks distribution records available." 
                    : "Try adjusting your search or filter criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDistributions.map((distribution) => (
              <Card key={distribution.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Distribution Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          {distribution.department_shortname}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Total: {distribution.ssc + distribution.hsc + distribution.diploma + distribution.main_marks}%
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">
                          {distribution.department_name}
                        </h3>
                        
                        {/* Marks Distribution Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-blue-700">SSC</p>
                            <p className="text-lg font-bold text-blue-600">{distribution.ssc}%</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-green-700">HSC</p>
                            <p className="text-lg font-bold text-green-600">{distribution.hsc}%</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-orange-700">Diploma</p>
                            <p className="text-lg font-bold text-orange-600">{distribution.diploma}%</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-purple-700">Main Marks</p>
                            <p className="text-lg font-bold text-purple-600">{distribution.main_marks}%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {canWrite() && (
                      <div className="flex lg:flex-col gap-2">
                        <Button
                          onClick={() => handleDelete(distribution.id)}
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
            <DialogTitle>Create Marks Distribution</DialogTitle>
            <DialogDescription>
              Set marks distribution for a department. Total must equal 100%.
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-ssc">SSC (%)</Label>
                <Input
                  id="create-ssc"
                  type="number"
                  value={formData.ssc}
                  onChange={(e) => setFormData({...formData, ssc: e.target.value})}
                  placeholder="SSC marks"
                  min="0"
                  max="100"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-hsc">HSC (%)</Label>
                <Input
                  id="create-hsc"
                  type="number"
                  value={formData.hsc}
                  onChange={(e) => setFormData({...formData, hsc: e.target.value})}
                  placeholder="HSC marks"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-diploma">Diploma (%)</Label>
                <Input
                  id="create-diploma"
                  type="number"
                  value={formData.diploma}
                  onChange={(e) => setFormData({...formData, diploma: e.target.value})}
                  placeholder="Diploma marks"
                  min="0"
                  max="100"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-main-marks">Main Marks (%)</Label>
                <Input
                  id="create-main-marks"
                  type="number"
                  value={formData.main_marks}
                  onChange={(e) => setFormData({...formData, main_marks: e.target.value})}
                  placeholder="Main marks"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            {/* Total Display */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className={`font-bold text-lg ${getTotalColor()}`}>
                  {calculateTotal()}%
                </span>
              </div>
              {calculateTotal() !== 100 && (
                <p className="text-sm text-red-600 mt-1">
                  Total must equal 100% (currently {calculateTotal()}%)
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={calculateTotal() !== 100}>
                <Save className="h-4 w-4 mr-2" />
                Create Distribution
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}