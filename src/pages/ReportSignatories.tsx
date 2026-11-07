import { useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, Loader2, Save, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { usePermissions } from "../hooks/usePermissions";
import {
  departmentAPI,
  facultyAPI,
  facultyDepartmentAPI,
  reportSignatoryAPI,
} from "../services/api";

type Role = "CONVENOR" | "DEPARTMENT_HEAD" | "DEAN";

interface Department {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface Faculty {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
}

interface FacultyMapping {
  faculty?: number;
  faculty_id?: number;
  department_ids: number[];
}

export interface ReportSignatoryRecord {
  id: number;
  role: Role;
  name: string;
  designation: string;
  department: number | null;
  department_name?: string | null;
  department_shortname?: string | null;
  faculty: number | null;
  faculty_name?: string | null;
  faculty_shortname?: string | null;
}

interface PersonForm {
  name: string;
  designation: string;
}

const EMPTY_PERSON: PersonForm = { name: "", designation: "" };

export default function ReportSignatories() {
  const { canRead, canWrite, canDelete } = usePermissions();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [mappings, setMappings] = useState<FacultyMapping[]>([]);
  const [records, setRecords] = useState<ReportSignatoryRecord[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [convenor, setConvenor] = useState<PersonForm>(EMPTY_PERSON);
  const [departmentHead, setDepartmentHead] = useState<PersonForm>(EMPTY_PERSON);
  const [dean, setDean] = useState<PersonForm>(EMPTY_PERSON);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<"department" | "faculty" | null>(null);

  const selectedDepartment = useMemo(
    () => departments.find((item) => item.id === Number(departmentId)) || null,
    [departmentId, departments],
  );
  const selectedFaculty = useMemo(
    () => faculties.find((item) => item.id === Number(facultyId)) || null,
    [faculties, facultyId],
  );

  const findRecord = (role: Role) =>
    records.find((record) => {
      if (role === "DEAN") {
        return record.role === role && record.faculty === Number(facultyId);
      }
      return record.role === role && record.department === Number(departmentId);
    });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [departmentResponse, facultyResponse, mappingResponse, signatoryResponse] =
        await Promise.all([
          departmentAPI.getAllDepartments(),
          facultyAPI.getAllFaculties(),
          facultyDepartmentAPI.getAllMappings(),
          reportSignatoryAPI.getAll(),
        ]);
      const nextDepartments = departmentResponse?.data || [];
      const nextFaculties = facultyResponse?.data || [];
      const nextMappings = Array.isArray(mappingResponse)
        ? mappingResponse
        : mappingResponse?.data || [];
      setDepartments(nextDepartments);
      setFaculties(nextFaculties);
      setMappings(nextMappings);
      setRecords(signatoryResponse?.data || []);
      setDepartmentId((current) => current || String(nextDepartments[0]?.id || ""));
      setFacultyId((current) => current || String(nextFaculties[0]?.id || ""));
    } catch (error: any) {
      console.error("Failed to load report signatories:", error);
      toast.error(error?.message || "Failed to load report signatories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canRead()) void loadData();
  }, []);

  useEffect(() => {
    if (!departmentId) return;
    const mapping = mappings.find((item) =>
      item.department_ids?.includes(Number(departmentId)),
    );
    const mappedFacultyId = mapping?.faculty_id ?? mapping?.faculty;
    if (mappedFacultyId) setFacultyId(String(mappedFacultyId));
  }, [departmentId, mappings]);

  useEffect(() => {
    const convenorRecord = records.find(
      (item) => item.role === "CONVENOR" && item.department === Number(departmentId),
    );
    const headRecord = records.find(
      (item) => item.role === "DEPARTMENT_HEAD" && item.department === Number(departmentId),
    );
    setConvenor(
      convenorRecord
        ? { name: convenorRecord.name, designation: convenorRecord.designation }
        : EMPTY_PERSON,
    );
    setDepartmentHead(
      headRecord ? { name: headRecord.name, designation: headRecord.designation } : EMPTY_PERSON,
    );
  }, [departmentId, records]);

  useEffect(() => {
    const deanRecord = records.find(
      (item) => item.role === "DEAN" && item.faculty === Number(facultyId),
    );
    setDean(
      deanRecord ? { name: deanRecord.name, designation: deanRecord.designation } : EMPTY_PERSON,
    );
  }, [facultyId, records]);

  const saveDepartmentSignatories = async () => {
    if (!departmentId || !convenor.name.trim() || !convenor.designation.trim()
      || !departmentHead.name.trim() || !departmentHead.designation.trim()) {
      toast.error("Complete both Convenor and Department Head details.");
      return;
    }
    setSavingSection("department");
    try {
      await Promise.all([
        reportSignatoryAPI.save({
          role: "CONVENOR",
          name: convenor.name.trim(),
          designation: convenor.designation.trim(),
          department: Number(departmentId),
          faculty: null,
        }),
        reportSignatoryAPI.save({
          role: "DEPARTMENT_HEAD",
          name: departmentHead.name.trim(),
          designation: departmentHead.designation.trim(),
          department: Number(departmentId),
          faculty: null,
        }),
      ]);
      toast.success("Department report signatories saved.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save department signatories");
    } finally {
      setSavingSection(null);
    }
  };

  const saveDean = async () => {
    if (!facultyId || !dean.name.trim() || !dean.designation.trim()) {
      toast.error("Complete the Dean details.");
      return;
    }
    setSavingSection("faculty");
    try {
      await reportSignatoryAPI.save({
        role: "DEAN",
        name: dean.name.trim(),
        designation: dean.designation.trim(),
        department: null,
        faculty: Number(facultyId),
      });
      toast.success("Faculty Dean saved.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save Faculty Dean");
    } finally {
      setSavingSection(null);
    }
  };

  const removeRecord = async (role: Role) => {
    const record = findRecord(role);
    if (!record) return;
    try {
      await reportSignatoryAPI.remove(record.id);
      toast.success("Report signatory removed.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove report signatory");
    }
  };

  if (!canRead()) {
    return <div className="rounded-lg border bg-white p-8 text-center">Access denied.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report Signatories</h1>
        <p className="mt-1 text-sm text-slate-600">
          Map the people printed at the bottom of admission result-sheet PDFs.
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#2E3094]" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#2E3094]" />
                Department Signatories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.department_shortname} — {department.department_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PersonFields
                title="Convenor, Admission Test Committee"
                value={convenor}
                onChange={setConvenor}
              />
              <PersonFields
                title="Department Head"
                value={departmentHead}
                onChange={setDepartmentHead}
              />

              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <div className="flex gap-2">
                  {canDelete() && findRecord("CONVENOR") && (
                    <Button variant="outline" size="sm" onClick={() => void removeRecord("CONVENOR")}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Remove Convenor
                    </Button>
                  )}
                  {canDelete() && findRecord("DEPARTMENT_HEAD") && (
                    <Button variant="outline" size="sm" onClick={() => void removeRecord("DEPARTMENT_HEAD")}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Remove Head
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => void saveDepartmentSignatories()}
                  disabled={!canWrite() || savingSection !== null}
                  className="bg-[#2E3094] hover:bg-[#242677]"
                >
                  {savingSection === "department" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Department Details
                </Button>
              </div>
              {selectedDepartment && (
                <p className="text-xs text-slate-500">
                  These two signatures will be used for {selectedDepartment.department_shortname} result sheets.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#2E3094]" />
                Faculty Dean
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Faculty</Label>
                <Select value={facultyId} onValueChange={setFacultyId}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={String(faculty.id)}>
                        {faculty.faculty_shortname} — {faculty.faculty_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PersonFields title="Dean" value={dean} onChange={setDean} icon="dean" />

              <div className="flex justify-between gap-2 border-t pt-4">
                {canDelete() && findRecord("DEAN") ? (
                  <Button variant="outline" size="sm" onClick={() => void removeRecord("DEAN")}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove Dean
                  </Button>
                ) : <span />}
                <Button
                  onClick={() => void saveDean()}
                  disabled={!canWrite() || savingSection !== null}
                  className="bg-[#2E3094] hover:bg-[#242677]"
                >
                  {savingSection === "faculty" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Dean Details
                </Button>
              </div>
              {selectedFaculty && (
                <p className="text-xs text-slate-500">
                  This signature will be used for all {selectedFaculty.faculty_shortname} department result sheets.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PersonFields({
  title,
  value,
  onChange,
  icon = "person",
}: {
  title: string;
  value: PersonForm;
  onChange: (value: PersonForm) => void;
  icon?: "person" | "dean";
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        {icon === "dean" ? <GraduationCap className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="Enter full name"
          />
        </div>
        <div className="space-y-2">
          <Label>Designation</Label>
          <Input
            value={value.designation}
            onChange={(event) => onChange({ ...value, designation: event.target.value })}
            placeholder="e.g. Professor & Head"
          />
        </div>
      </div>
    </div>
  );
}
