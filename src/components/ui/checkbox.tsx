import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, label, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          role="checkbox"
          aria-checked={checked}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !disabled) {
              e.preventDefault();
              onCheckedChange?.(!checked);
            }
          }}
          onClick={() => {
            if (!disabled) {
              onCheckedChange?.(!checked);
            }
          }}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded border border-slate-300 dark:border-slate-600 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors",
            checked
              ? "bg-blue-600 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-600"
              : "bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500",
            className
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </div>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          disabled={disabled}
          {...props}
        />
        {label && (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
