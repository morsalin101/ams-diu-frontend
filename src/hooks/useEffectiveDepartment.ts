import { useEffect, useState } from "react";

import { departmentAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { EffectiveDepartment } from "../lib/admission";

const CSE_FALLBACK_SHORTNAME = "CSE";

const matchesCseDepartment = (department: EffectiveDepartment) =>
  department.department_shortname?.toUpperCase() === CSE_FALLBACK_SHORTNAME ||
  department.department_name?.toUpperCase().includes("COMPUTER SCIENCE");

export function useEffectiveDepartment() {
  const { user } = useAuth();
  const [department, setDepartment] = useState<EffectiveDepartment | null>(
    user?.department_details ?? null,
  );
  const [isFallback, setIsFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(!user?.department_details);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.department_details) {
      setDepartment(user.department_details);
      setIsFallback(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadFallbackDepartment = async () => {
      setIsLoading(true);
      try {
        const response = await departmentAPI.getAllDepartments();
        const departments = response?.data || [];
        const cseDepartment = departments.find(matchesCseDepartment) || null;

        if (!isMounted) {
          return;
        }

        setDepartment(cseDepartment);
        setIsFallback(Boolean(cseDepartment));
        setError(cseDepartment ? null : "CSE department could not be resolved.");
      } catch (departmentError: any) {
        if (!isMounted) {
          return;
        }

        setError(departmentError?.message || "Failed to load fallback department.");
        setDepartment(null);
        setIsFallback(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFallbackDepartment();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return {
    department,
    isFallback,
    isLoading,
    error,
  };
}
