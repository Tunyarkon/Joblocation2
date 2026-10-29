import * as React from "react";
import { cn } from "../../lib/utils";

interface PopoverContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PopoverContext = React.createContext<PopoverContextType | null>(null);

export function usePopover() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("usePopover must be used within a Popover");
  }
  return context;
}

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ open: controlledOpen, onOpenChange: controlledOnOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const setOpen = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (valOrUpdater) => {
      const next = typeof valOrUpdater === "function" ? valOrUpdater(open) : valOrUpdater;
      if (isControlled) {
        controlledOnOpenChange?.(next);
      } else {
        setUncontrolledOpen(next);
      }
    },
    [isControlled, controlledOnOpenChange, open]
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef<
  any,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { setOpen } = usePopover();

  if (asChild && React.isValidElement(children)) {
    const childProps = (children as any).props || {};
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      ...props,
      className: cn(childProps.className, className),
      onClick: (e: React.MouseEvent<any>) => {
        childProps.onClick?.(e);
        onClick?.(e as any);
        setOpen((prev) => !prev);
      },
    });
  }

  return (
    <div
      ref={ref}
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        onClick?.(e);
        setOpen((prev) => !prev);
      }}
      {...props}
    >
      {children}
    </div>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "start", children, ...props }, ref) => {
    const { open, setOpen } = usePopover();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open, setOpen]);

    if (!open) return null;

    const alignClass =
      align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

    return (
      <div
        ref={contentRef}
        className={cn(
          "absolute z-50 mt-1.5 min-w-[280px] rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 animate-in fade-in-0 zoom-in-95",
          alignClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
