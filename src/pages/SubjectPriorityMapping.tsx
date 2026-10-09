import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RefreshCw,
  Building,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { subjectPriorityAPI, departmentAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface PriorityItem {
  id?: number;
  subject_id: number;
  subject_name: string;
  priority: number;
}

interface AvailableSubject {
  id: number;
  subject_name: string;
  is_department_subject: boolean;
}

interface DepartmentPriorityOverview {
  department_id: number;
  department_name: string;
  department_shortname: string;
  priorities: PriorityItem[];
}

export default function SubjectPriorityMapping() {
  const { canRead, canWrite, canDelete } = usePermissions();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<string>('');
  const [allOverviews, setAllOverviews] = useState<DepartmentPriorityOverview[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      loadInitialData();
    }
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [deptRes, allRes] = await Promise.all([
        departmentAPI.getAllDepartments(),
        subjectPriorityAPI.getAllPriorities(),
      ]);

      const deptList: Department[] = deptRes?.data || deptRes || [];
      setDepartments(deptList);

      if (allRes?.success && allRes?.data) {
        setAllOverviews(allRes.data);
      }

      // Default select the first department if none selected
      if (!selectedDeptId && deptList.length > 0) {
        const firstDept = deptList[0];
        setSelectedDeptId(firstDept.id.toString());
        loadDepartmentPriority(firstDept.id);
      }
    } catch (error: any) {
      console.error('Error loading initial priority data:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartmentPriority = async (deptId: number) => {
    try {
      setIsLoading(true);
      const res = await subjectPriorityAPI.getDepartmentPriorities(deptId);
      if (res?.success && res?.data) {
        setPriorities(res.data.priorities || []);
        setAvailableSubjects(res.data.available_subjects || []);
      } else {
        setPriorities([]);
        setAvailableSubjects([]);
      }
      setSelectedSubjectToAdd('');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error loading department priorities:', error);
      toast.error('Failed to load subject priorities for department');
      setPriorities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentChange = (deptIdStr: string) => {
    if (hasChanges) {
      setConfirmDialog({
        open: true,
        title: 'Unsaved Changes',
        description: 'You have unsaved changes in the priority list. Switching department will discard them. Do you want to proceed?',
        variant: 'warning',
        confirmText: 'Discard & Switch',
        cancelText: 'Stay',
        onConfirm: () => {
          setSelectedDeptId(deptIdStr);
          loadDepartmentPriority(Number(deptIdStr));
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
      return;
    }

    setSelectedDeptId(deptIdStr);
    loadDepartmentPriority(Number(deptIdStr));
  };

  // Reordering functions
  const movePriorityUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...priorities];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;

    // Re-index priorities
    const updated = newItems.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setPriorities(updated);
    setHasChanges(true);
  };

  const movePriorityDown = (index: number) => {
    if (index === priorities.length - 1) return;
    const newItems = [...priorities];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;

    // Re-index priorities
    const updated = newItems.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setPriorities(updated);
    setHasChanges(true);
  };

  const removePriorityItem = (index: number) => {
    const newItems = priorities.filter((_, idx) => idx !== index);
    const updated = newItems.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setPriorities(updated);
    setHasChanges(true);
  };

  const handleAddSubject = () => {
    if (!selectedSubjectToAdd) return;
    const subjectId = Number(selectedSubjectToAdd);
    const subjectObj = availableSubjects.find((s) => s.id === subjectId);
    if (!subjectObj) return;

    if (priorities.some((p) => p.subject_id === subjectId)) {
      toast.error('This subject is already in the priority list.');
      return;
    }

    const newItem: PriorityItem = {
      subject_id: subjectObj.id,
      subject_name: subjectObj.subject_name,
      priority: priorities.length + 1,
    };

    setPriorities([...priorities, newItem]);
    setSelectedSubjectToAdd('');
    setHasChanges(true);
  };

  const handleAddAllDepartmentSubjects = () => {
    const assignedIds = new Set(priorities.map((p) => p.subject_id));
    const deptOnlySubjects = availableSubjects.filter(
      (s) => s.is_department_subject && !assignedIds.has(s.id)
    );

    if (deptOnlySubjects.length === 0) {
      toast.error('All mapped curriculum subjects are already in the priority list.');
      return;
    }

    let currentPriority = priorities.length;
    const newItems = [...priorities];
    deptOnlySubjects.forEach((sub) => {
      currentPriority += 1;
      newItems.push({
        subject_id: sub.id,
        subject_name: sub.subject_name,
        priority: currentPriority,
      });
    });

    setPriorities(newItems);
    setHasChanges(true);
    toast.success(`Added ${deptOnlySubjects.length} department subjects to priority list`);
  };

  const handleSave = async () => {
    if (!selectedDeptId) {
      toast.error('Please select a department');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        department_id: Number(selectedDeptId),
        subject_ids: priorities.map((p) => p.subject_id),
      };

      const res = await subjectPriorityAPI.saveDepartmentPriorities(payload);
      if (res?.success) {
        toast.success(res.message || 'Subject priorities saved successfully!');
        setHasChanges(false);
        // Refresh department data and overview list
        await Promise.all([
          loadDepartmentPriority(Number(selectedDeptId)),
          loadAllOverviews(),
        ]);
      } else {
        toast.error(res?.message || 'Failed to save subject priorities');
      }
    } catch (error: any) {
      console.error('Error saving priorities:', error);
      toast.error(error?.message || 'Failed to save subject priorities');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedDeptId) return;
    const currentDept = departments.find((d) => d.id === Number(selectedDeptId));
    const deptName = currentDept?.department_shortname || currentDept?.department_name || 'department';

    setConfirmDialog({
      open: true,
      title: 'Reset Subject Priorities',
      description: (
        <span>
          Are you sure you want to remove all configured subject priorities for <strong>{deptName}</strong>?
          The system will fall back to default tie-breaking rules (written + viva total, then MCQ marks).
        </span>
      ),
      variant: 'danger',
      confirmText: 'Reset Priorities',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
          await subjectPriorityAPI.deleteDepartmentPriorities(Number(selectedDeptId));
          toast.success(`Subject priorities for ${deptName} have been reset.`);
          setPriorities([]);
          setHasChanges(false);
          await loadAllOverviews();
        } catch (error: any) {
          console.error('Error resetting priorities:', error);
          toast.error(error?.message || 'Failed to reset priorities');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, isLoading: false }));
        }
      },
    });
  };

  const loadAllOverviews = async () => {
    try {
      const res = await subjectPriorityAPI.getAllPriorities();
      if (res?.success && res?.data) {
        setAllOverviews(res.data);
      }
    } catch (err) {
      console.error('Error loading overviews:', err);
    }
  };

  // Filter available subjects not yet in the priority list
  const unassignedSubjects = availableSubjects.filter(
    (sub) => !priorities.some((p) => p.subject_id === sub.id)
  );

  const selectedDepartmentObj = departments.find((d) => d.id === Number(selectedDeptId));

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Access Denied</h3>
          <p className="text-gray-600">You do not have permission to access Subject Priority Mapping.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-[#2E3094]/10 to-[#4C51BF]/20 rounded-xl text-[#2E3094]">
            <ArrowDownUp className="w-7 h-7 text-[#2E3094]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subject Priority Mapping</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure department-wise subject order for sequential tie-breaking during student merit ranking and admission selection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedDeptId) loadDepartmentPriority(Number(selectedDeptId));
              loadAllOverviews();
            }}
            disabled={isLoading}
            className="border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Department Selection & Subject Ingestion */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                <Building className="w-4 h-4 text-[#2E3094]" />
                Select Department
              </CardTitle>
              <CardDescription>
                Choose the department to view or adjust subject priority sequence.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Department
                </label>
                <Select value={selectedDeptId} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="w-full bg-white border-gray-200 focus:ring-[#2E3094]">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.department_name} ({dept.department_shortname})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDepartmentObj && (
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                  <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    {selectedDepartmentObj.department_name}
                  </div>
                  <p className="text-blue-700">
                    Department Code: <span className="font-mono font-medium">{selectedDepartmentObj.department_shortname}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Subject to Priority Card */}
          {canWrite() && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                  <Plus className="w-4 h-4 text-[#2E3094]" />
                  Add Subject to Priority
                </CardTitle>
                <CardDescription>
                  Append subjects into the priority sequence for this department.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Available Subject
                  </label>
                  <Select value={selectedSubjectToAdd} onValueChange={setSelectedSubjectToAdd}>
                    <SelectTrigger className="w-full bg-white border-gray-200 focus:ring-[#2E3094]">
                      <SelectValue placeholder={unassignedSubjects.length === 0 ? "All subjects added" : "Choose a subject to add"} />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedSubjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {sub.subject_name} {sub.is_department_subject && "★ (Dept Syllabus)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleAddSubject}
                    disabled={!selectedSubjectToAdd}
                    className="w-full bg-[#2E3094] hover:bg-[#252778] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Priority List
                  </Button>
                </div>

                {availableSubjects.some((s) => s.is_department_subject && !priorities.some((p) => p.subject_id === s.id)) && (
                  <div className="pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddAllDepartmentSubjects}
                      className="w-full border-dashed border-gray-300 text-gray-700 hover:border-[#2E3094] hover:text-[#2E3094]"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                      Add All Mapped Department Subjects
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Guidance Box */}
          <Card className="border-amber-200/80 bg-amber-50/50 shadow-none">
            <CardContent className="pt-4 pb-4 text-xs text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                How Sequential Tie-Breaking Works:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-amber-800/90 leading-relaxed">
                <li>
                  <strong>Different Total Marks:</strong> Student with higher total marks always wins.
                </li>
                <li>
                  <strong>Equal Total Marks:</strong> The system sequentially compares marks starting with <strong>Priority #1</strong>.
                </li>
                <li>
                  If Priority #1 marks are tied, <strong>Priority #2</strong> is compared, then #3, #4, etc.
                </li>
                <li>
                  <strong>Fallback:</strong> If all priority subjects are equal, standard rules (written+viva total, then MCQ marks) apply.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ordered Priority Chain & Arrangement Manager */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#2E3094]" />
                  Priority Order: {selectedDepartmentObj?.department_shortname || 'Department'}
                </CardTitle>
                <CardDescription className="mt-1">
                  Arrange subjects from highest priority (Rank #1) to lowest priority.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {canDelete() && priorities.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Reset
                  </Button>
                )}

                {canWrite() && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || (!hasChanges && priorities.length === 0)}
                    className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white hover:opacity-95 shadow-sm"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    )}
                    Save Priority Mapping
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Visual Priority Chain Banner */}
              <div className="p-4 bg-gradient-to-r from-gray-50 via-slate-50 to-indigo-50/40 rounded-xl border border-gray-200/70">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>Current Priority Sequence</span>
                  {hasChanges && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] py-0">
                      Unsaved changes
                    </Badge>
                  )}
                </div>

                {priorities.length === 0 ? (
                  <div className="text-sm text-gray-500 italic py-1">
                    No subject priorities configured. Default tie-breaking rules will be used.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {priorities.map((item, idx) => (
                      <React.Fragment key={item.subject_id}>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-xs text-sm font-medium text-gray-800">
                          <span className="w-5 h-5 rounded-full bg-[#2E3094] text-white text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{item.subject_name}</span>
                        </div>
                        {idx < priorities.length - 1 && (
                          <span className="text-gray-400 font-bold text-xs">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Reordering List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  <span>Priority Rank & Subject</span>
                  <span>Sequential Actions</span>
                </div>

                {priorities.length === 0 ? (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <BookOpen className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <h4 className="text-sm font-semibold text-gray-700">No Subjects in Priority List</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      Select a subject on the left panel and click &quot;Add to Priority List&quot; to begin constructing the tie-breaking order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {priorities.map((item, index) => {
                      const isTop = index === 0;
                      const isBottom = index === priorities.length - 1;

                      return (
                        <div
                          key={item.subject_id}
                          className="flex items-center justify-between p-3.5 bg-white border border-gray-200 hover:border-[#2E3094]/40 rounded-xl shadow-xs transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2E3094]/10 text-[#2E3094] font-bold text-sm">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                {item.subject_name}
                                {index === 0 && (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 text-[10px] py-0 font-medium">
                                    Highest Priority
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Priority Level {index + 1} of {priorities.length}
                              </div>
                            </div>
                          </div>

                          {/* Reordering and Delete controls */}
                          {canWrite() && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => movePriorityUp(index)}
                                disabled={isTop}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-[#2E3094] hover:bg-indigo-50 border-gray-200 disabled:opacity-30"
                                title="Move Up (Increase Priority)"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => movePriorityDown(index)}
                                disabled={isBottom}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-[#2E3094] hover:bg-indigo-50 border-gray-200 disabled:opacity-30"
                                title="Move Down (Decrease Priority)"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePriorityItem(index)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 border-gray-200"
                                title="Remove Subject from Priority"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* University Overview Table */}
      <Card className="border-gray-200 shadow-sm mt-8">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
            <Building className="w-4 h-4 text-[#2E3094]" />
            Department Priority Mappings Overview
          </CardTitle>
          <CardDescription>
            Overview of configured subject priority mappings across all academic departments.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Configured Priority Sequence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allOverviews.map((overview) => {
                  const isConfigured = overview.priorities && overview.priorities.length > 0;
                  const isCurrent = Number(selectedDeptId) === overview.department_id;

                  return (
                    <tr
                      key={overview.department_id}
                      className={`hover:bg-gray-50/80 transition-colors ${isCurrent ? 'bg-indigo-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {overview.department_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">
                        <Badge variant="outline" className="border-gray-200 bg-gray-50">
                          {overview.department_shortname || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {isConfigured ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {overview.priorities.map((p, idx) => (
                              <React.Fragment key={p.subject_id || idx}>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-700">
                                  <span className="text-[10px] text-gray-500 font-bold">#{idx + 1}</span>
                                  {p.subject_name}
                                </span>
                                {idx < overview.priorities.length - 1 && (
                                  <span className="text-gray-400 text-xs">›</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">
                            Standard fallback (Written+Viva, MCQ, Student ID)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isConfigured ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">
                            {overview.priorities.length} Subjects Prioritized
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200 text-xs">
                            Default Rules
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDepartmentChange(overview.department_id.toString())}
                          className="text-[#2E3094] hover:bg-indigo-50 text-xs font-medium"
                        >
                          Configure
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
