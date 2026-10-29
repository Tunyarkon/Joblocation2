import React from 'react';
import { EquipmentRecord } from '../../data/s2FunctionalLocationData';

interface SystemTableProps {
  equipment: EquipmentRecord[];
  onSelectRow?: (item: EquipmentRecord) => void;
  className?: string;
}

/**
 * Data Table attached directly to Sub-System
 * - Positioned directly to the right of Sub-System box
 * - Formatted as tight 2-column grid
 * - Thin black borders separating every cell and the outer table
 * - Row/Cell Background Colors:
 *    - White: Default
 *    - Yellow: EWR rows
 *    - Green: Project rows
 *    - Light Blue: Specific highlighted numbers (e.g., "10-60")
 * - Text inside is small, black, centered or left-aligned. Includes asterisks (*).
 */
export const SystemTable: React.FC<SystemTableProps> = ({
  equipment,
  onSelectRow,
  className = ''
}) => {
  if (!equipment || equipment.length === 0) {
    return (
      <div className={`border border-black bg-white px-3 py-1.5 text-[11px] text-gray-500 italic ${className}`}>
        No equipment registered
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto inline-block border-l-0 ${className}`}>
      <table className="border-collapse border border-black text-black select-none text-[11px] sm:text-xs">
        <tbody>
          {equipment.map((item, index) => {
            // Determine row background color
            let rowBgClass = 'bg-white';
            if (item.highlight === 'EWR') {
              rowBgClass = 'bg-[#ffff00]'; // Solid Bright Yellow
            } else if (item.highlight === 'Project') {
              rowBgClass = 'bg-[#7bed9f]'; // Solid Bright Green / Pastel Mint
            }

            // Check if refCode is a specially highlighted number (e.g. "10-60" or specified)
            const isLightBlueRef = 
              item.refCode === '10-60' || 
              item.refCode.includes('10-60') ||
              item.tag.includes('10-60');

            const hasAsteriskTag = item.isCriticalPath && !item.tag.startsWith('*');
            const displayTag = hasAsteriskTag ? `*${item.tag}` : item.tag;

            const hasAsteriskRef = item.isCriticalPath && !item.refCode.startsWith('*');
            const displayRef = hasAsteriskRef ? `*${item.refCode}` : item.refCode;

            return (
              <tr
                key={`${item.tag}-${item.refCode}-${index}`}
                onClick={() => onSelectRow?.(item)}
                className={`${rowBgClass} hover:opacity-90 transition-opacity ${onSelectRow ? 'cursor-pointer' : ''}`}
                title={`${item.description || item.tag} (${item.highlight !== 'none' ? item.highlight : 'Standard'})`}
              >
                {/* Column 1: Equipment Tag / Description */}
                <td className="border border-black px-2 py-0.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-bold text-black text-left whitespace-nowrap leading-tight">
                  {displayTag}
                </td>

                {/* Column 2: Reference Code / Number (Light Blue for specific numbers like 10-60) */}
                <td
                  className={`border border-black px-2 py-0.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-extrabold text-black text-center whitespace-nowrap leading-tight ${
                    isLightBlueRef ? 'bg-[#bfe6ff]' : ''
                  }`}
                >
                  {displayRef}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SystemTable;
