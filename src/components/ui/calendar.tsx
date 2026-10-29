import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CalendarProps {
  selected?: Date | string | null;
  onSelect?: (date: Date) => void;
  className?: string;
  minDate?: Date;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Calendar({ selected, onSelect, className, minDate }: CalendarProps) {
  const selectedDate = selected
    ? typeof selected === "string"
      ? new Date(selected)
      : selected
    : null;

  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date()
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isToday = (d: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  const isSelected = (d: number) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === d
    );
  };

  const isPast = (d: number) => {
    if (!minDate) return false;
    const checkDate = new Date(year, month, d, 23, 59, 59);
    return checkDate < minDate;
  };

  return (
    <div className={cn("p-2 select-none w-64", className)}>
      {/* Header Month / Year controls */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {MONTHS[month]} {year}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {/* Previous month padding */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => {
          const d = daysInPrevMonth - firstDayOfMonth + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="text-[11px] text-slate-300 dark:text-slate-600 py-1"
            >
              {d}
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const selectedDay = isSelected(d);
          const today = isToday(d);
          const past = isPast(d);

          return (
            <button
              key={`day-${d}`}
              type="button"
              disabled={past}
              onClick={() => {
                const picked = new Date(year, month, d);
                onSelect?.(picked);
              }}
              className={cn(
                "h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer",
                selectedDay
                  ? "bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700"
                  : today
                  ? "border border-blue-500 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  : past
                  ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
