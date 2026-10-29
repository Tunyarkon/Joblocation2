import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet");
  }
  return context;
}

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({ open: controlledOpen, onOpenChange: controlledOnOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? (controlledOnOpenChange || (() => {})) : setUncontrolledOpen;

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetTrigger = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { onOpenChange } = useSheet();

  if (asChild && React.isValidElement(children)) {
    const childProps = (children as any).props || {};
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      ...props,
      className: cn(childProps.className, className),
      onClick: (e: React.MouseEvent<any>) => {
        childProps.onClick?.(e);
        onClick?.(e as any);
        onOpenChange(true);
      },
    });
  }

  return (
    <button
      ref={ref}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
SheetTrigger.displayName = "SheetTrigger";

const SheetClose = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { onOpenChange } = useSheet();

  if (asChild && React.isValidElement(children)) {
    const childProps = (children as any).props || {};
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      ...props,
      className: cn(childProps.className, className),
      onClick: (e: React.MouseEvent<any>) => {
        childProps.onClick?.(e);
        onClick?.(e as any);
        onOpenChange(false);
      },
    });
  }

  return (
    <button
      ref={ref}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
SheetClose.displayName = "SheetClose";

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  size?: "default" | "sm" | "lg" | "xl" | "full";
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", size = "lg", className, children, ...props }, ref) => {
    const { open, onOpenChange } = useSheet();

    // ESC key handling
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
          onOpenChange(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onOpenChange]);

    if (!open) return null;

    const sizeClasses = {
      default: "sm:max-w-md",
      sm: "sm:max-w-sm",
      lg: "sm:max-w-xl",
      xl: "sm:max-w-2xl",
      full: "sm:max-w-full w-full",
    };

    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />

        {/* Drawer Panel */}
        <div
          ref={ref}
          className={cn(
            "relative z-50 flex h-full w-full flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl transition ease-in-out duration-300 animate-in slide-in-from-right",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-slate-800",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 mt-auto",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-base font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
