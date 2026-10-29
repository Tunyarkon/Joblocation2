import React from 'react';

interface CategoryNodeProps {
  name: string;
  fullName?: string;
  count?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * Top-Level Category Node (e.g., "APS-1", "KHF-1", "VPS-2", "GOHF-3")
 * - Rectangular box with light cyan/blue background
 * - Bold and dark blue text
 * - Solid dark blue or black border
 */
export const CategoryNode: React.FC<CategoryNodeProps> = ({
  name,
  fullName,
  count,
  className = '',
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center min-w-[200px] max-w-[280px] px-4 py-2.5 rounded-none bg-[#d0f0fd] border-2 border-[#002f6c] text-[#002f6c] shadow-xs select-none transition-transform hover:scale-[1.01] ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
    >
      <span className="text-base sm:text-lg font-black tracking-wider uppercase">
        {name}
      </span>
      {fullName && (
        <span className="text-[10px] sm:text-[11px] font-semibold text-[#003882] tracking-tight text-center line-clamp-1 mt-0.5 opacity-90">
          {fullName}
        </span>
      )}
      {typeof count === 'number' && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#002f6c]/80 mt-1 bg-white/70 px-1.5 py-0.2 border border-[#002f6c]/30">
          {count} Systems Registered
        </span>
      )}
    </div>
  );
};

export default CategoryNode;
