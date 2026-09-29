import React from "react";
import {
  CalendarRange,
  Check,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type SortCategory = "score" | "exams" | "date";
export type ScoreSort = "score_high" | "score_low";
export type ExamsSort = "exams_most" | "exams_fewest";
export type DateSort = "latest" | "oldest" | "custom";

export interface ResultsSortFilterControlsProps {
  activeCategory: SortCategory;
  onCategoryChange: (category: SortCategory) => void;
  scoreSort: ScoreSort;
  onScoreSortChange: (sort: ScoreSort) => void;
  examsSort: ExamsSort;
  onExamsSortChange: (sort: ExamsSort) => void;
  dateSort: DateSort;
  onDateSortChange: (sort: DateSort) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onReset: () => void;
  isCustomized: boolean;
  disabled?: boolean;
}

export function ResultsSortFilterControls({
  activeCategory,
  onCategoryChange,
  scoreSort,
  onScoreSortChange,
  examsSort,
  onExamsSortChange,
  dateSort,
  onDateSortChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  isCustomized,
  disabled = false,
}: ResultsSortFilterControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center gap-y-3 gap-x-6 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2.5">
        
        {/* Title */}
        <div className="flex items-center gap-1.5 text-slate-700">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Sort & Filter
          </span>
        </div>

        {/* Controls Wrapper */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1">
          
          {/* SCORE */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-600 whitespace-nowrap">Score</Label>
            <Select
              value={activeCategory === "score" ? scoreSort : undefined}
              onValueChange={(val) => {
                onCategoryChange("score");
                onScoreSortChange(val as ScoreSort);
              }}
              disabled={disabled}
            >
              <SelectTrigger 
                className={`w-[135px] h-8 text-xs ${
                  activeCategory === "score" 
                    ? "border-blue-400 bg-blue-50/50 text-blue-700 ring-1 ring-blue-200" 
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {activeCategory === "score" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  <SelectValue placeholder="Select..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_high" className="text-xs">Highest Score</SelectItem>
                <SelectItem value="score_low" className="text-xs">Lowest Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* EXAM TAKEN */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-600 whitespace-nowrap">Exam Taken</Label>
            <Select
              value={activeCategory === "exams" ? examsSort : undefined}
              onValueChange={(val) => {
                onCategoryChange("exams");
                onExamsSortChange(val as ExamsSort);
              }}
              disabled={disabled}
            >
              <SelectTrigger 
                className={`w-[135px] h-8 text-xs ${
                  activeCategory === "exams" 
                    ? "border-indigo-400 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-200" 
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {activeCategory === "exams" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  <SelectValue placeholder="Select..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exams_most" className="text-xs">Most Taken</SelectItem>
                <SelectItem value="exams_fewest" className="text-xs">Fewest Taken</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DATE */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-600 whitespace-nowrap">Date</Label>
            <Select
              value={dateSort}
              onValueChange={(val) => {
                onCategoryChange("date");
                onDateSortChange(val as DateSort);
              }}
              disabled={disabled}
            >
              <SelectTrigger 
                className={`w-[125px] h-8 text-xs ${
                  (activeCategory === "date" || Boolean(startDate) || Boolean(endDate))
                    ? "border-emerald-400 bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-200" 
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {(activeCategory === "date" || Boolean(startDate) || Boolean(endDate)) && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <SelectValue placeholder="Select..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest" className="text-xs">Latest</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
                <SelectItem value="custom" className="text-xs font-medium text-emerald-700">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Button */}
        {isCustomized && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={disabled}
            className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 ml-auto"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Custom Date Range Panel */}
      {dateSort === "custom" && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50/40 p-2.5 text-xs shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
              <span>Select Date Range</span>
              {startDate && endDate && (
                <span className="text-[11px] font-normal text-emerald-700 ml-1">
                  ({startDate} to {endDate})
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  onStartDateChange(today);
                  onEndDateChange(today);
                }}
                disabled={disabled}
                className="h-6 px-2 text-[10px] bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  const end = d.toISOString().split("T")[0];
                  d.setDate(d.getDate() - 7);
                  const start = d.toISOString().split("T")[0];
                  onStartDateChange(start);
                  onEndDateChange(end);
                }}
                disabled={disabled}
                className="h-6 px-2 text-[10px] bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              >
                Last 7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  const end = d.toISOString().split("T")[0];
                  d.setDate(d.getDate() - 30);
                  const start = d.toISOString().split("T")[0];
                  onStartDateChange(start);
                  onEndDateChange(end);
                }}
                disabled={disabled}
                className="h-6 px-2 text-[10px] bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              >
                Last 30 Days
              </Button>
              {(startDate || endDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onStartDateChange("");
                    onEndDateChange("");
                  }}
                  disabled={disabled}
                  className="h-6 px-1.5 text-[10px] text-rose-700 hover:bg-rose-100"
                >
                  <X className="w-3 h-3 mr-0.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Date range inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="date-range-start" className="text-[11px] font-semibold text-emerald-950">
                From Date
              </Label>
              <Input
                id="date-range-start"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                disabled={disabled}
                className="h-8 bg-white text-xs border-emerald-200 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="date-range-end" className="text-[11px] font-semibold text-emerald-950">
                To Date
              </Label>
              <Input
                id="date-range-end"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                disabled={disabled}
                className="h-8 bg-white text-xs border-emerald-200 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
