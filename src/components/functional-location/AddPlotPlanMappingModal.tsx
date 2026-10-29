import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, X, Crosshair, Compass, Layers, Building2, Check, 
  Search, Sliders, ExternalLink, AlertCircle, Info, Sparkles,
  Cpu, Flame, Box, ShieldCheck, ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  MappedLocationMarker, 
  INITIAL_MASTER_PLANS, 
  MasterPlanConfig, 
  calculateGridZone,
  upsertStoredMarker,
  getStoredMappedMarkers
} from '../../data/plotPlanMappingData';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import { HierarchyTreeNode } from '../FunctionalLocation';
import { useThemeGate, setGlobalThemeGate } from '../../utils/themeGate';

interface AddPlotPlanMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNode: HierarchyTreeNode | null;
  allNodes: HierarchyTreeNode[];
  existingMarker?: MappedLocationMarker | null;
  onSaved: (savedMarker: MappedLocationMarker, openInMaster?: boolean) => void;
  isTh?: boolean;
}

// Quick Preset Coordinates for standard refinery zones
const QUICK_ZONE_PRESETS = [
  { name: 'APS-1 Desalter Area', planId: 'plan-overall', x: 28.5, y: 38.0, zone: 'B3', unit: 'unit-aps1' },
  { name: 'APS-1 Furnace Train', planId: 'plan-overall', x: 39.5, y: 33.0, zone: 'C2', unit: 'unit-aps1' },
  { name: 'APS-1 Fractionator Tower', planId: 'plan-overall', x: 32.5, y: 60.0, zone: 'B4', unit: 'unit-aps1' },
  { name: 'KHF-1 Reactor Train', planId: 'plan-overall', x: 64.0, y: 36.5, zone: 'E3', unit: 'unit-khf1' },
  { name: 'KHF-1 Recycle Compressor', planId: 'plan-overall', x: 76.5, y: 53.0, zone: 'F4', unit: 'unit-khf1' },
  { name: 'Tank Farm & Offsites', planId: 'plan-overall', x: 50.0, y: 80.0, zone: 'C7', unit: 'all' },
];

export default function AddPlotPlanMappingModal({
  isOpen,
  onClose,
  targetNode,
  allNodes,
  existingMarker,
  onSaved,
  isTh = false
}: AddPlotPlanMappingModalProps) {
  // State: Target Node Selection
  const isGlobalDark = useThemeGate();
  const [selectedNodeId, setSelectedNodeId] = useState<string>(targetNode?.id || '');
  const [nodeSearch, setNodeSearch] = useState('');
  
  // State: Target Plot Plan
  const [targetPlanId, setTargetPlanId] = useState<string>(
    existingMarker?.plotPlanId || (targetNode?.id.includes('khf1') ? 'plan-khf1' : targetNode?.id.includes('aps1') ? 'plan-aps1' : 'plan-overall')
  );

  // State: Spatial Coordinates & Zone
  const [coordX, setCoordX] = useState<number>(existingMarker?.x ?? 35.0);
  const [coordY, setCoordY] = useState<number>(existingMarker?.y ?? 45.0);
  const [gridZone, setGridZone] = useState<string>(
    existingMarker?.gridZone || calculateGridZone(existingMarker?.x ?? 35.0, existingMarker?.y ?? 45.0)
  );

  // State: Turnover Status & Scope Description
  const [status, setStatus] = useState<MappedLocationMarker['status']>(
    existingMarker?.status || (targetNode?.status as any) || 'Ready for Turnover'
  );
  const [spatialNotes, setSpatialNotes] = useState<string>(
    existingMarker?.description || targetNode?.description || ''
  );

  // Existing Markers on the same plan for spatial context
  const [allExistingMarkers, setAllExistingMarkers] = useState<MappedLocationMarker[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAllExistingMarkers(getStoredMappedMarkers());
      if (targetNode) {
        setSelectedNodeId(targetNode.id);
        const autoPlan = targetNode.id.includes('khf1') ? 'plan-khf1' : targetNode.id.includes('aps1') ? 'plan-aps1' : 'plan-overall';
        if (!existingMarker) {
          setTargetPlanId(autoPlan);
          const initialX = targetNode.id.includes('khf1') ? 68.0 : 32.0;
          const initialY = 42.0;
          setCoordX(initialX);
          setCoordY(initialY);
          setGridZone(calculateGridZone(initialX, initialY));
          setStatus((targetNode.status as any) || 'Ready for Turnover');
          setSpatialNotes(targetNode.description || targetNode.fullName || '');
        }
      }
      if (existingMarker) {
        setSelectedNodeId(existingMarker.nodeId);
        setTargetPlanId(existingMarker.plotPlanId);
        setCoordX(existingMarker.x);
        setCoordY(existingMarker.y);
        setGridZone(existingMarker.gridZone);
        setStatus(existingMarker.status);
        setSpatialNotes(existingMarker.description || '');
      }
    }
  }, [isOpen, targetNode, existingMarker]);

  // Find active node object
  const activeNode = useMemo(() => {
    if (targetNode && targetNode.id === selectedNodeId) return targetNode;
    return allNodes.find(n => n.id === selectedNodeId) || targetNode || allNodes[0];
  }, [selectedNodeId, targetNode, allNodes]);

  // Filterable node options for search
  const filteredNodeOptions = useMemo(() => {
    if (!nodeSearch.trim()) return allNodes.slice(0, 40);
    const q = nodeSearch.toLowerCase();
    return allNodes.filter(n => 
      n.name.toLowerCase().includes(q) || 
      (n.tag && n.tag.toLowerCase().includes(q)) || 
      (n.refCode && n.refCode.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [allNodes, nodeSearch]);

  // Handle click on the interactive CAD blueprint
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const roundedX = parseFloat(Math.max(2, Math.min(98, clickX)).toFixed(1));
    const roundedY = parseFloat(Math.max(2, Math.min(98, clickY)).toFixed(1));

    setCoordX(roundedX);
    setCoordY(roundedY);
    setGridZone(calculateGridZone(roundedX, roundedY));
  };

  const handleApplyPreset = (preset: typeof QUICK_ZONE_PRESETS[0]) => {
    setTargetPlanId(preset.planId);
    setCoordX(preset.x);
    setCoordY(preset.y);
    setGridZone(preset.zone);
  };

  const handleSave = (openInMaster = false) => {
    if (!activeNode) return;

    // Determine unit details
    const isAps = activeNode.id.includes('aps1') || activeNode.parentId?.includes('aps1');
    const isKhf = activeNode.id.includes('khf1') || activeNode.parentId?.includes('khf1');
    const unitId = isKhf ? 'unit-khf1' : isAps ? 'unit-aps1' : 'unit-general';
    const unitName = isKhf ? 'KHF-1' : isAps ? 'APS-1' : 'General Unit';

    // Build system name from ancestors or description
    const systemName = activeNode.parentId?.includes('sys') ? `System-${activeNode.parentId.replace('sys-', '')}` : 'Process Battery';

    const savedMarker: MappedLocationMarker = {
      id: existingMarker?.id || `map-${Date.now()}`,
      nodeId: activeNode.id,
      tag: activeNode.tag || activeNode.name,
      name: activeNode.name,
      level: activeNode.level,
      levelType: activeNode.levelType,
      unitId,
      unitName,
      systemName,
      refCode: activeNode.refCode,
      highlight: activeNode.highlight,
      isCriticalPath: activeNode.isCriticalPath,
      description: spatialNotes.trim() || activeNode.description || activeNode.name,
      status,
      x: coordX,
      y: coordY,
      gridZone,
      plotPlanId: targetPlanId,
      updatedAt: new Date().toISOString()
    };

    upsertStoredMarker(savedMarker);
    onSaved(savedMarker, openInMaster);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{isTh ? 'บันทึกพิกัดแผนผังโรงงาน (Plot Plan Mapping)' : 'Map Asset on Plot Plan Blueprint'}</span>
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono text-[10px]">
                  {existingMarker ? (isTh ? 'แก้ไขตำแหน่ง' : 'Update Location') : (isTh ? 'เพิ่มจุดพิกัดใหม่' : 'New Spatial Pin')}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isTh 
                  ? 'กำหนดพิกัด X/Y และโซนตารางวิศวกรรม (Grid Zone) เพื่อเชื่อมโยงโครงสร้าง Functional Location เข้ากับแผนที่โรงงาน'
                  : 'Link this functional location node directly with engineering CAD coordinates and spatial grid zones.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split 2 Columns on Desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
          {/* Left Column: Interactive Blueprint Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Compass size={14} className="text-cyan-400" />
                  <span>{isTh ? 'ผังแบบวิศวกรรม (CAD Blueprint Preview)' : 'Interactive Blueprint Canvas'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (Click anywhere to position pin)
                </span>
              </div>

              {/* Grid Zone Display Badge & Theme Gate */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGlobalThemeGate(true)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      isGlobalDark
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dark Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalThemeGate(false)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      !isGlobalDark
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Paper CAD
                  </button>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Target Grid:</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-xs">
                  Zone {gridZone}
                </span>
              </div>
            </div>

            {/* Interactive Blueprint Canvas Box */}
            <div 
              onClick={handleCanvasClick}
              className="relative w-full h-[320px] sm:h-[380px] rounded-xl border-2 border-slate-700 hover:border-cyan-500/50 overflow-hidden cursor-crosshair transition-all select-none shadow-inner"
              style={{
                backgroundColor: isGlobalDark ? '#0c192c' : '#f4f7fb',
                backgroundImage: isGlobalDark ? `
                  linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
                  linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)
                ` : `
                  linear-gradient(rgba(100, 116, 139, 0.14) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(100, 116, 139, 0.14) 1px, transparent 1px),
                  linear-gradient(rgba(100, 116, 139, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(100, 116, 139, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px, 40px 40px, 10px 10px, 10px 10px',
                backgroundPosition: '-1px -1px'
              }}
            >
              {/* Authentic Master Plot Plan Background */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
                <img 
                  src={essoPlotPlanBg} 
                  alt="Master Plot Plan" 
                  className={`w-full h-full object-contain pointer-events-none select-none transition-all duration-300 ${
                    isGlobalDark
                      ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60'
                      : 'opacity-85 mix-blend-multiply'
                  }`}
                />
              </div>

              {/* CAD Compass Rose in top-right */}
              <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none flex flex-col items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700/80 text-[9px] font-mono text-slate-400">
                <div className="text-cyan-400 font-bold">▲ N</div>
                <div>GRID S2</div>
              </div>

              {/* Plant Boundaries & Layout Blocks (Structural Context) */}
              <div className="absolute inset-0 pointer-events-none">
                {/* ZONE A: APS-1 Battery */}
                <div className="absolute left-[15%] top-[25%] w-[32%] h-[46%] rounded-lg border border-dashed border-blue-400/40 bg-blue-950/20 p-2 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-300 tracking-wider">
                    [AREA 10] APS-1 BATTERY
                  </span>
                  <div className="flex justify-between text-[8px] font-mono text-blue-400/60">
                    <span>Desalter / Furnace</span>
                    <span>Column T-101</span>
                  </div>
                </div>

                {/* ZONE B: KHF-1 Battery */}
                <div className="absolute left-[54%] top-[25%] w-[36%] h-[46%] rounded-lg border border-dashed border-emerald-400/40 bg-emerald-950/20 p-2 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-300 tracking-wider">
                    [AREA 20/30] KHF-1 BATTERY
                  </span>
                  <div className="flex justify-between text-[8px] font-mono text-emerald-400/60">
                    <span>Reactor Train</span>
                    <span>Recycle Gas F-4</span>
                  </div>
                </div>

                {/* Storage Tank Farm */}
                <div className="absolute left-[20%] top-[76%] w-[60%] h-[18%] rounded-lg border border-dashed border-amber-400/30 bg-amber-950/15 p-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-300 tracking-wider">
                    [AREA 40] TANK FARM & PRODUCT GANTRY
                  </span>
                  <span className="text-[8px] font-mono text-amber-400/60">TK-01..TK-08</span>
                </div>

                {/* Axis Labels (A-F, 1-8) */}
                <div className="absolute top-1 left-2 flex gap-12 text-[9px] font-mono text-cyan-500/50">
                  <span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span>
                </div>
                <div className="absolute left-1 top-6 flex flex-col gap-8 text-[9px] font-mono text-cyan-500/50">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
                </div>
              </div>

              {/* Other Existing Mapped Markers (Context Dots) */}
              {allExistingMarkers
                .filter(m => m.nodeId !== activeNode?.id)
                .map(m => (
                  <div 
                    key={m.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    title={`${m.tag} (${m.gridZone})`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500/60 border border-slate-300/80 shadow-xs" />
                  </div>
                ))}

              {/* Active Marker Placement Crosshair / Pin (Interactive Target) */}
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 transition-all duration-150"
                style={{ left: `${coordX}%`, top: `${coordY}%` }}
              >
                {/* Pulsing Target Rings */}
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping absolute" />
                  <div className="w-7 h-7 rounded-full border-2 border-amber-300 bg-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/50">
                    <Crosshair size={14} className="text-white animate-spin-slow" />
                  </div>

                  {/* Floating Tag Pill */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-300 font-mono font-black text-[10px] px-2 py-0.5 rounded shadow-lg border border-amber-500/60 whitespace-nowrap">
                    📍 {activeNode?.tag || activeNode?.name || 'Selected Asset'} • {gridZone}
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinate Fine-Tuning Sliders & Sliders */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sliders size={13} className="text-amber-400" />
                  <span>{isTh ? 'ปรับแต่งพิกัดละเอียด (Fine-tune Coordinates)' : 'Precision Coordinate Sliders'}</span>
                </span>
                <span className="font-mono text-cyan-300">
                  X: {coordX}% • Y: {coordY}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>X-Axis (Easting):</span>
                    <span className="font-bold text-white">{coordX}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="98"
                    step="0.5"
                    value={coordX}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCoordX(val);
                      setGridZone(calculateGridZone(val, coordY));
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Y-Axis (Northing):</span>
                    <span className="font-bold text-white">{coordY}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="98"
                    step="0.5"
                    value={coordY}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCoordY(val);
                      setGridZone(calculateGridZone(coordX, val));
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Quick Jump Zone Presets */}
              <div className="pt-1.5 border-t border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                  {isTh ? 'จุดพิกัดมาตรฐาน (Quick Refinery Presets):' : 'Quick Jump Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ZONE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2 py-0.5 rounded-md bg-slate-700/60 hover:bg-slate-700 hover:text-white text-slate-300 text-[10px] font-mono transition-colors border border-slate-600/50 cursor-pointer"
                    >
                      {preset.zone} • {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Node Details & Form Attributes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Target Asset Node Card */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-400" />
                  <span>{isTh ? 'ข้อมูลตำแหน่งที่เลือก' : 'Target Asset Node'}</span>
                </span>
                {activeNode?.isCriticalPath && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] font-mono font-bold">
                    ★ CRITICAL PATH
                  </Badge>
                )}
              </div>

              {/* Active Asset Info Pill */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-amber-400 tracking-tight">
                    {activeNode?.tag || activeNode?.name}
                  </span>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    Level {activeNode?.level} ({activeNode?.levelType})
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {activeNode?.description || activeNode?.fullName || 'Asset node from Functional Location Hierarchy.'}
                </p>
                {activeNode?.refCode && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Ref Code: <span className="text-slate-200">{activeNode.refCode}</span>
                  </div>
                )}
              </div>

              {/* Change Node Search Dropdown (if user wants to pick another node) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Search size={11} />
                  <span>{isTh ? 'เปลี่ยนอุปกรณ์ / ค้นหาในผัง' : 'Change Asset (Search Tree):'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by tag, name, or code..."
                    value={nodeSearch}
                    onChange={(e) => setNodeSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  {nodeSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-30 p-1 space-y-0.5">
                      {filteredNodeOptions.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setSelectedNodeId(n.id);
                            setNodeSearch('');
                          }}
                          className={`p-1.5 rounded text-xs cursor-pointer flex items-center justify-between hover:bg-slate-800 ${
                            n.id === activeNode?.id ? 'bg-indigo-950/60 text-indigo-300 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <span className="font-mono">{n.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">L{n.level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Target Master Plot Plan Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isTh ? 'เลือกแผนผังเป้าหมาย (Target Plot Plan):' : 'Target Plot Plan:'}
              </label>
              <select
                value={targetPlanId}
                onChange={(e) => setTargetPlanId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500 font-medium"
              >
                {INITIAL_MASTER_PLANS.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* Turnover Commissioning Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isTh ? 'สถานะการส่งมอบ (Turnover Status):' : 'Turnover Commissioning Status:'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500 font-medium"
              >
                <option value="Ready for Turnover">Ready for Turnover (พร้อมส่งมอบ)</option>
                <option value="In Progress">In Progress (กำลังดำเนินการ)</option>
                <option value="Completed">Completed (ส่งมอบเสร็จสมบูรณ์)</option>
                <option value="Pending Walkdown">Pending Walkdown (รอการเดินตรวจ)</option>
              </select>
            </div>

            {/* Spatial Notes / Field Remarks */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isTh ? 'หมายเหตุตำแหน่งหน้างาน (Spatial Description / Field Location):' : 'Spatial Remarks / Field Location:'}
              </label>
              <textarea
                rows={2}
                value={spatialNotes}
                onChange={(e) => setSpatialNotes(e.target.value)}
                placeholder="e.g. South flange, next to column bypass valve, ground elevation +3.5m..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Summary Information Callout */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
              <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                {isTh
                  ? 'ข้อมูลพิกัดจะถูกบันทึกและซิงค์ทันทีไปยังเมนู Master Plot Plan และสามารถเรียกดูผังแบบโต้ตอบได้ทั้ง 2 เมนู'
                  : 'Coordinates are instantly synchronized with the Master Plot Plan Mapping engine and accessible in real-time across views.'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2 self-start sm:self-auto">
            <span>Coordinates:</span>
            <span className="text-amber-400 font-bold">X: {coordX}%</span>
            <span>|</span>
            <span className="text-amber-400 font-bold">Y: {coordY}%</span>
            <span>|</span>
            <span className="text-cyan-400 font-bold">Zone: {gridZone}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9 cursor-pointer"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Button>

            <Button
              size="sm"
              onClick={() => handleSave(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 h-9 px-4 cursor-pointer shadow-md shadow-emerald-900/40"
            >
              <Check size={14} />
              <span>{isTh ? 'บันทึกพิกัด (Save Mapping)' : 'Save Plot Plan Mapping'}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleSave(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 h-9 px-4 cursor-pointer shadow-md shadow-indigo-900/40"
            >
              <ExternalLink size={14} />
              <span>{isTh ? 'บันทึก & เปิดใน Master Map' : 'Save & Open in Master'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
