import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface AccordionContextType {
  openItems: string[];
  toggleItem: (value: string) => void;
  type?: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionContextType | null>(null);

export interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: any) => void;
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}

export function Accordion({
  type = "single",
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
}: AccordionProps) {
  const [internalOpenItems, setInternalOpenItems] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const isControlled = value !== undefined;
  const openItems = isControlled
    ? Array.isArray(value)
      ? value
      : value
      ? [value]
      : []
    : internalOpenItems;

  const toggleItem = (itemValue: string) => {
    let next: string[];
    if (type === "single") {
      next = openItems.includes(itemValue) ? [] : [itemValue];
    } else {
      next = openItems.includes(itemValue)
        ? openItems.filter((i) => i !== itemValue)
        : [...openItems, itemValue];
    }

    if (!isControlled) {
      setInternalOpenItems(next);
    }
    if (onValueChange) {
      onValueChange(type === "single" ? next[0] || "" : next);
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("space-y-1", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}

const AccordionItemContext = React.createContext<{ value: string } | null>(null);

export function AccordionItem({ value, children, className = "" }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("border rounded-lg overflow-hidden", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<any>) => void;
  as?: "button" | "div";
}

export function AccordionTrigger({ children, className = "", onClick, as = "button" }: AccordionTriggerProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionTrigger must be used within an Accordion and AccordionItem");
  }

  const isOpen = accordion.openItems.includes(item.value);

  const handleClick = (e: React.MouseEvent<any>) => {
    if (onClick) onClick(e);
    accordion.toggleItem(item.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (as === "div" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick(e as any);
    }
  };

  if (as === "div") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn("flex w-full items-center justify-between p-4 text-left font-medium transition-all select-none cursor-pointer", className)}
      >
        <div className="flex-1 flex items-center">{children}</div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 text-current opacity-90",
            isOpen && "rotate-180"
          )}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("flex w-full items-center justify-between p-4 text-left font-medium transition-all", className)}
    >
      <div className="flex-1 flex items-center">{children}</div>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200 text-current opacity-90",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ children, className = "" }: AccordionContentProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionContent must be used within an Accordion and AccordionItem");
  }

  const isOpen = accordion.openItems.includes(item.value);

  if (!isOpen) return null;

  return (
    <div className={cn("p-4 pt-0 transition-all", className)}>
      {children}
    </div>
  );
}
