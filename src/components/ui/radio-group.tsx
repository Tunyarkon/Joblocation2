import * as React from "react";
import { cn } from "../../lib/utils";

export interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (val: string) => void;
} | null>(null);

export function RadioGroup({ value, onValueChange, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex items-center gap-3", className)}>{children}</div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps {
  value: string;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({ value, id, label, disabled, className }: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroupItem must be within RadioGroup");

  const isChecked = ctx.value === value;

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer text-xs font-semibold select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div
        onClick={() => !disabled && ctx.onValueChange(value)}
        className={cn(
          "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
          isChecked
            ? "border-blue-600 bg-blue-600 ring-2 ring-blue-500/20"
            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400"
        )}
      >
        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      {label && <span className="text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  );
}
