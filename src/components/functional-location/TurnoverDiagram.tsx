import React, { useState } from 'react';
import { UnitRecord, SystemRecord, EquipmentRecord } from '../../data/s2FunctionalLocationData';
import CategoryNode from './CategoryNode';
import SystemNode from './SystemNode';
import SystemTable from './SystemTable';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search, Printer, Download, Sparkles, Layers } from 'lucide-react';

interface TurnoverDiagramProps {
  units: UnitRecord[];
  onSelectEquipment?: (equipment: EquipmentRecord, system: SystemRecord, unit: UnitRecord) => void;
  className?: string;
}

export const TurnoverDiagram: React.FC<TurnoverDiagramProps> = ({
  units,
  onSelectEquipment,
  className = ''
}) => {
  // Zoom & view scaling
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all'); // all, ewr, project, critical

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 65));
  const handleZoomReset = () => setZoomLevel(100);

  // Filter units and their systems based on search and highlight filters
  const filteredUnits = units.map(unit => {
    const filteredSystems = unit.systems.map(sys => {
      const filteredEquipment = sys.equipment.filter(item => {
        // Search query filter
        const matchesSearch = 
          !searchQuery ||
          item.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.refCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          sys.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          unit.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Highlight type filter
        let matchesFilter = true;
        if (filterType === 'ewr') {
          matchesFilter = item.highlight === 'EWR';
        } else if (filterType === 'project') {
          matchesFilter = item.highlight === 'Project';
        } else if (filterType === 'critical') {
          matchesFilter = !!item.isCriticalPath;
        }

        return matchesSearch && matchesFilter;
      });

      return {
        ...sys,
        equipment: filteredEquipment
      };
    }).filter(sys => sys.equipment.length > 0 || !searchQuery);

    return {
      ...unit,
      systems: filteredSystems
    };
  }).filter(unit => unit.systems.length > 0 || !searchQuery);

  return (
    <div className={`flex flex-col w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-md ${className}`}>
      {/* 
        ========================================================
        1. STICKY TOP HEADER
        - Full-width sticky header at the top with a bright neon-green background
        - Text: "S2 2025 SD system turn over (Rev-2 Feb 27,25)"
        - Centered, bold, and dark blue
        ========================================================
      */}
      <header className="sticky top-0 z-30 w-full bg-[#39FF14] text-[#001f5c] border-b-2 border-black py-2.5 px-4 text-center font-black tracking-wide text-sm sm:text-base md:text-lg shadow-sm select-none">
        <h1 className="uppercase font-sans font-black">
          S2 2025 SD system turn over (Rev-2 Feb 27,25)
        </h1>
      </header>

      {/* Control Toolstrip: Search, Filter, Zoom */}
      <div className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search */}
          <div className="relative w-48 sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tag, Ref, System..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                filterType === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('ewr')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                filterType === 'ewr' 
                  ? 'bg-yellow-400 text-black font-black' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400 border border-black/40 inline-block" />
              <span>EWR</span>
            </button>
            <button
              onClick={() => setFilterType('project')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                filterType === 'project' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#7bed9f] border border-black/40 inline-block" />
              <span>Project</span>
            </button>
            <button
              onClick={() => setFilterType('critical')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                filterType === 'critical' 
                  ? 'bg-red-600 text-white' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="font-mono text-red-500 font-bold">*</span>
              <span>Critical Path</span>
            </button>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 65}
              title="Zoom Out"
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-bold w-11 text-center text-slate-700 dark:text-slate-300">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 160}
              title="Zoom In"
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={handleZoomReset}
              title="Reset Zoom"
              className="p-1 text-slate-500 hover:text-blue-600 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1.5 cursor-pointer"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            title="Print Diagram"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 
        ========================================================
        2. MAIN LAYOUT & CONNECTING LINES
        - Horizontal tree/diagram displaying system breakdown
        - Solid RED orthogonal lines (vertical and horizontal segments)
          connecting parent categories to child systems
        - Reusable <CategoryNode>, <SystemNode>, and <SystemTable>
        ========================================================
      */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/90 custom-scrollbar">
        <div 
          className="inline-flex items-start gap-12 sm:gap-16 min-w-full pb-10 transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        >
          {filteredUnits.map((unit) => {
            const systemsCount = unit.systems.length;

            return (
              <div 
                key={unit.id} 
                className="flex flex-col items-start shrink-0 relative"
              >
                {/* 
                  TOP-LEVEL CATEGORY NODE
                  Rectangular box, light cyan/blue bg, bold dark blue text, solid border
                */}
                <div className="relative pl-6">
                  <CategoryNode
                    name={unit.name}
                    fullName={unit.fullName}
                    count={systemsCount}
                  />

                  {/* Vertical connector line segment dropping from the Category box */}
                  {systemsCount > 0 && (
                    <div 
                      className="absolute left-[36px] top-full w-[3px] h-6 bg-[#ff0000]"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* 
                  CHILD SYSTEMS TREE
                  Contains the vertical RED trunk line and horizontal RED branches into each Sub-System
                */}
                {systemsCount > 0 && (
                  <div className="relative pt-6 flex flex-col space-y-4">
                    {unit.systems.map((system, sysIndex) => {
                      const isFirst = sysIndex === 0;
                      const isLast = sysIndex === systemsCount - 1;

                      return (
                        <div 
                          key={system.id} 
                          className="relative flex items-center pl-16 group"
                        >
                          {/* 
                            ORTHOGONAL RED CONNECTING LINES:
                            - Vertical red trunk line segment
                            - Horizontal red branch into the SystemNode box
                          */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 pointer-events-none w-16"
                            aria-hidden="true"
                          >
                            {/* Vertical Trunk Line (3px solid red) */}
                            {/* For middle items: full height. For first item: from top to center. For last item: from top to center */}
                            <div 
                              className={`absolute left-[36px] w-[3px] bg-[#ff0000] ${
                                isLast ? 'top-0 h-1/2' : 'top-0 h-full'
                              }`} 
                            />

                            {/* Horizontal Branch Line (from vertical trunk x=36px to x=64px, exactly touching SystemNode) */}
                            <div className="absolute left-[36px] top-1/2 -translate-y-1/2 w-[28px] h-[3px] bg-[#ff0000]" />
                          </div>

                          {/* 
                            SUB-SYSTEM NODE (Orange box, black border, red text)
                            ATTACHED TO DATA TABLE (Tight 2-column table directly to its right)
                          */}
                          <div className="flex items-stretch shadow-xs transition-transform group-hover:scale-[1.008]">
                            <SystemNode 
                              name={system.name}
                              className="border-r-0"
                            />
                            
                            <SystemTable
                              equipment={system.equipment}
                              onSelectRow={(item) => onSelectEquipment?.(item, system, unit)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 
        ========================================================
        3. LEGEND (BOTTOM AREA)
        - Text: "* Critical path"
        - Small yellow rectangular color swatch labeled "EWR"
        - Small green rectangular color swatch labeled "Project"
        ========================================================
      */}
      <footer className="sticky bottom-0 z-20 w-full bg-slate-100 dark:bg-slate-800 border-t-2 border-black p-3 px-6 flex flex-wrap items-center justify-between gap-4 text-xs select-none shadow-md">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Critical Path Notice */}
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
            <span className="text-red-600 font-mono text-base font-black">*</span>
            <span className="font-mono text-xs font-black">Critical path</span>
          </div>

          {/* Yellow Swatch: EWR */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#ffff00] border border-black shadow-xs shrink-0" />
            <span className="font-bold text-slate-900 dark:text-slate-200">
              EWR
            </span>
          </div>

          {/* Green Swatch: Project */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#7bed9f] border border-black shadow-xs shrink-0" />
            <span className="font-bold text-slate-900 dark:text-slate-200">
              Project
            </span>
          </div>

          {/* Light Blue Swatch: Specific Numbers (e.g. 10-60) */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#bfe6ff] border border-black shadow-xs shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Special Ref (e.g. 10-60)
            </span>
          </div>

          {/* Orange Swatch: Sub-System */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-6 h-4 bg-[#ff9900] border border-black shadow-xs shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Sub-System
            </span>
          </div>

          {/* Light Cyan Swatch: Top Category */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-6 h-4 bg-[#d0f0fd] border-2 border-[#002f6c] shadow-xs shrink-0" />
            <span className="font-bold text-[#002f6c] dark:text-cyan-300">
              Top Category
            </span>
          </div>
        </div>

        {/* Orthogonal Red Line Legend */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
          <div className="flex items-center">
            <span className="w-3 h-[3px] bg-[#ff0000] inline-block" />
            <span className="w-[3px] h-3 bg-[#ff0000] inline-block" />
            <span className="w-3 h-[3px] bg-[#ff0000] inline-block" />
          </div>
          <span className="font-bold text-red-600">Orthogonal Red Line Flow</span>
        </div>
      </footer>
    </div>
  );
};

export default TurnoverDiagram;
