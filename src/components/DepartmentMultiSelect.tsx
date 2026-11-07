import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "../lib/utils";

export interface DepartmentOption {
  id: number;
  department_name: string;
  department_shortname: string;
}

interface DepartmentMultiSelectProps {
  options: DepartmentOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
  allLabel?: string;
}

export function DepartmentMultiSelect({
  options,
  selectedIds,
  onChange,
  disabled = false,
  allLabel = "All departments",
}: DepartmentMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = selectedIds.length === 0 || selectedIds.length === options.length;

  const triggerLabel = useMemo(() => {
    if (options.length === 0) {
      return "No departments available";
    }
    if (selectedIds.length === 1) {
      return options.find((option) => option.id === selectedIds[0])?.department_shortname
        || "1 department";
    }
    if (allSelected) {
      return allLabel;
    }
    return `${selectedIds.length} departments selected`;
  }, [allLabel, allSelected, options, selectedIds]);

  const toggleDepartment = (departmentId: number) => {
    if (allSelected) {
      onChange([departmentId]);
      return;
    }

    const nextIds = selectedIdSet.has(departmentId)
      ? selectedIds.filter((selectedId) => selectedId !== departmentId)
      : [...selectedIds, departmentId];

    // Empty and every-option selection both use the canonical "all" value.
    onChange(nextIds.length === 0 || nextIds.length === options.length ? [] : nextIds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search departments..." />
          <CommandList>
            <CommandEmpty>No department found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={allLabel} onSelect={() => onChange([])}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    allSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                {allLabel}
              </CommandItem>
              {options.map((option) => {
                const isSelected = allSelected || selectedIdSet.has(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={`${option.department_shortname} ${option.department_name}`}
                    onSelect={() => toggleDepartment(option.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">
                      {option.department_shortname} — {option.department_name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
