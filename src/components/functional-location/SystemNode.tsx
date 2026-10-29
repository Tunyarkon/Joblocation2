import React from 'react';

interface SystemNodeProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Sub-System Node (e.g., "System-11", "System-15", "System-22")
 * - Rectangular box with solid orange background
 * - Bold red text
 * - Solid black border
 */
export const SystemNode: React.FC<SystemNodeProps> = ({
  name,
  className = '',
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[105px] sm:min-w-[120px] px-3 py-2 bg-[#ff9900] border-2 border-black text-[#cc0000] font-black text-xs sm:text-sm tracking-wide select-none shadow-xs text-center shrink-0 rounded-none ${onClick ? 'cursor-pointer hover:brightness-105' : ''} ${className}`}
    >
      <span>{name}</span>
    </div>
  );
};

export default SystemNode;
