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

export interface FacultyOption {
  id: number;
  faculty_name: string;
  faculty_shortname: string;
}

interface FacultyMultiSelectProps {
  options: FacultyOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
}

export function FacultyMultiSelect({
  options,
  selectedIds,
  onChange,
  disabled = false,
}: FacultyMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = selectedIds.length === 0 || selectedIds.length === options.length;

  const triggerLabel = useMemo(() => {
    if (options.length === 0) {
      return "No faculties available";
    }
    if (selectedIds.length === 1) {
      return options.find((option) => option.id === selectedIds[0])?.faculty_shortname
        || "1 faculty";
    }
    if (allSelected) {
      return "All faculties";
    }
    return `${selectedIds.length} faculties selected`;
  }, [allSelected, options, selectedIds]);

  const toggleFaculty = (facultyId: number) => {
    if (allSelected) {
      onChange([facultyId]);
      return;
    }

    const nextIds = selectedIdSet.has(facultyId)
      ? selectedIds.filter((selectedId) => selectedId !== facultyId)
      : [...selectedIds, facultyId];
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
          <CommandInput placeholder="Search faculties..." />
          <CommandList>
            <CommandEmpty>No faculty found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="All faculties" onSelect={() => onChange([])}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    allSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                All faculties
              </CommandItem>
              {options.map((option) => {
                const isSelected = allSelected || selectedIdSet.has(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={`${option.faculty_shortname} ${option.faculty_name}`}
                    onSelect={() => toggleFaculty(option.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">
                      {option.faculty_shortname} — {option.faculty_name}
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
