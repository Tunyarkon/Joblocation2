import React, { useState, useMemo } from 'react';
import { 
  MapPin, Plus, Search, Filter, ZoomIn, ZoomOut, RotateCcw, 
  Layers, ExternalLink, Crosshair, Sparkles, Building2, 
  CheckCircle2, AlertTriangle, Check, Compass, Trash2, Edit2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  MappedLocationMarker, 
  INITIAL_MASTER_PLANS, 
  MasterPlanConfig,
  calculateGridZone,
  deleteStoredMarker,
  getStoredMappedMarkers
} from '../../data/plotPlanMappingData';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';
import { HierarchyTreeNode } from '../FunctionalLocation';
import { useThemeGate, setGlobalThemeGate } from '../../utils/themeGate';

interface FunctionalLocationPlotPlanViewProps {
  treeData: HierarchyTreeNode[];
  markers: MappedLocationMarker[];
  onSelectNode: (nodeId: string) => void;
  onOpenAddMappingModal: (node?: HierarchyTreeNode | null, marker?: MappedLocationMarker | null) => void;
  onNavigateToMasterPlotPlan?: (nodeId?: string) => void;
  isTh?: boolean;
}

export default function FunctionalLocationPlotPlanView({
  treeData,
  markers,
  onSelectNode,
  onOpenAddMappingModal,
  onNavigateToMasterPlotPlan,
  isTh = false
}: FunctionalLocationPlotPlanViewProps) {
  // State: Target Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-overall');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(markers[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const isGlobalDark = useThemeGate();

  // Mouse wheel zoom - locked to min 100% to prevent black borders
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(400, prev + 15));
    } else {
      setZoomLevel(prev => Math.max(100, prev - 15));
    }
  };

  const [sidebarTab, setSidebarTab] = useState<'mapped' | 'unmapped'>('mapped');

  const selectedPlan = useMemo(() => {
    return INITIAL_MASTER_PLANS.find(p => p.id === selectedPlanId) || INITIAL_MASTER_PLANS[0];
  }, [selectedPlanId]);

  // Flatten all assets from hierarchy
  const allLeafAssets = useMemo(() => {
    const list: HierarchyTreeNode[] = [];
    const traverse = (nodes: HierarchyTreeNode[]) => {
      nodes.forEach(n => {
        if (n.level >= 3 || !n.children || n.children.length === 0) {
          list.push(n);
        }
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    traverse(treeData);
    return list;
  }, [treeData]);

  // Filtered markers on the canvas
  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      if (selectedPlanId !== 'plan-overall' && m.plotPlanId !== selectedPlanId && m.plotPlanId !== 'plan-overall') {
        return false;
      }
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (criticalOnly && !m.isCriticalPath) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.tag.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.unitName.toLowerCase().includes(q) ||
          m.systemName.toLowerCase().includes(q) ||
          m.gridZone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [markers, selectedPlanId, statusFilter, criticalOnly, searchQuery]);

  // Unmapped leaf assets
  const unmappedAssets = useMemo(() => {
    const mappedNodeIds = new Set(markers.map(m => m.nodeId));
    return allLeafAssets.filter(a => !mappedNodeIds.has(a.id));
  }, [allLeafAssets, markers]);

  const activeMarker = useMemo(() => {
    return markers.find(m => m.id === selectedMarkerId) || filteredMarkers[0] || null;
  }, [markers, selectedMarkerId, filteredMarkers]);

  const handleMarkerClick = (marker: MappedLocationMarker) => {
    setSelectedMarkerId(marker.id);
    onSelectNode(marker.nodeId);
  };

  const handleDeleteMarker = (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isTh ? 'ต้องการลบจุดพิกัดนี้ออกจาก Plot Plan หรือไม่?' : 'Remove this marker from the Plot Plan?')) {
      deleteStoredMarker(markerId);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 text-white">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Plan Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-lg p-1 border border-slate-700/80">
            {INITIAL_MASTER_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedPlanId === plan.id 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {plan.name.split('•')[0].trim()}
              </button>
            ))}
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              📍 {markers.length} {isTh ? 'จุดที่บันทึกแล้ว' : 'Mapped Pins'}
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {unmappedAssets.length} {isTh ? 'ยังไม่ได้ระบุพิกัด' : 'Unmapped'}
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToMasterPlotPlan && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateToMasterPlotPlan(activeMarker?.nodeId)}
              className="border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50 text-xs h-8 gap-1.5 cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>{isTh ? 'เปิดใน Master Plot Plan' : 'Open in Master View'}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => onOpenAddMappingModal(null, null)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 h-8 px-3.5 shadow-md shadow-emerald-900/40 cursor-pointer"
          >
            <Plus size={14} />
            <span>{isTh ? 'เพิ่มพิกัดผัง (Add Plot Mapping)' : 'Add Plot Plan Mapping'}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isTh ? 'ค้นหาแท็ก, อุปกรณ์, หรือโซน (เช่น S2-DR, B3)...' : 'Search tag, asset, or zone (e.g. S2-DR, B3)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium"
          >
            <option value="all">{isTh ? 'ทุกสถานะ' : 'All Statuses'}</option>
            <option value="Ready for Turnover">Ready for Turnover</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Pending Walkdown">Pending Walkdown</option>
          </select>

          <button
            type="button"
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              criticalOnly 
                ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>* Critical Path Only</span>
          </button>

          {/* Theme Gate Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setGlobalThemeGate(true)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
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
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                !isGlobalDark
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Paper CAD
            </button>
          </div>

          {/* Zoom Controls (locked to min 100% to eliminate black borders) */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setZoomLevel(prev => Math.max(100, prev - 15))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom Out (ขยายออก - ล็อคขนาดรูปไม่มีขอบดำ)"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-400 min-w-[36px] text-center font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(400, prev + 15))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom In (ซูมเข้าดูรายละเอียด หมุดขยายตามขนาดรูป)"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Reset Zoom (100% Lock to Frame)"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded text-[10px] font-bold"
              title="Lock Plot Plan to Screen (ล็อคขนาดตามรูปไม่มีขอบดำ)"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Interactive Canvas (Left) + Asset Inspector / Mapping List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Blueprint Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div 
            onWheel={handleWheel}
            className="relative w-full h-[460px] sm:h-[520px] rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-2xl select-none transition-colors duration-300"
            style={{
              backgroundColor: isGlobalDark ? '#0a1424' : '#f4f7fb',
              backgroundImage: isGlobalDark ? `
                linear-gradient(rgba(56, 189, 248, 0.09) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.09) 1px, transparent 1px),
                linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)
              ` : `
                linear-gradient(rgba(100, 116, 139, 0.14) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100, 116, 139, 0.14) 1px, transparent 1px),
                linear-gradient(rgba(100, 116, 139, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100, 116, 139, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px, 40px 40px, 10px 10px, 10px 10px',
              backgroundPosition: '-1px -1px',
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out'
            }}
          >
            {/* Authentic Master Plot Plan Background - object-cover with locked borders */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img 
                src={essoPlotPlanBg} 
                alt="Master Plot Plan" 
                className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-300 ${
                  isGlobalDark
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-60'
                    : 'opacity-85 mix-blend-multiply'
                }`}
              />
            </div>

            {/* Compass & CAD Info Overlay */}
            <div className="absolute top-3 right-3 z-10 flex flex-col items-center bg-slate-900/80 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-400">
              <div className="text-cyan-400 font-bold flex items-center gap-1">
                <Compass size={12} />
                <span>▲ NORTH</span>
              </div>
              <div className="text-[9px] text-slate-500">REF S2 GRID</div>
            </div>

            {/* Layout Batteries Context */}
            <div className="absolute inset-0 pointer-events-none">
              {/* APS-1 Battery */}
              <div className="absolute left-[12%] top-[20%] w-[35%] h-[50%] rounded-xl border border-dashed border-blue-400/40 bg-blue-950/20 p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-300 font-mono font-bold text-[10px]">
                  <span>[AREA 10] APS-1 BATTERY</span>
                  <span className="text-[9px] text-blue-400/70">Units 11/12/13</span>
                </div>
                <div className="text-[9px] font-mono text-blue-400/50">
                  Desalter • Furnace F-101 • Crude Column T-101
                </div>
              </div>

              {/* KHF-1 Battery */}
              <div className="absolute left-[52%] top-[20%] w-[38%] h-[50%] rounded-xl border border-dashed border-emerald-400/40 bg-emerald-950/20 p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-300 font-mono font-bold text-[10px]">
                  <span>[AREA 20/30] KHF-1 BATTERY</span>
                  <span className="text-[9px] text-emerald-400/70">Units 23/24</span>
                </div>
                <div className="text-[9px] font-mono text-emerald-400/50">
                  Reactor Train • HP Separator • Hydrogen Comp
                </div>
              </div>

              {/* Tank Farm Area */}
              <div className="absolute left-[16%] top-[76%] w-[68%] h-[18%] rounded-xl border border-dashed border-amber-400/30 bg-amber-950/15 p-2 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  [AREA 40] STORAGE TANK FARM & PRODUCT GANTRY
                </span>
                <span className="text-[9px] font-mono text-amber-400/60">TK-01..TK-08</span>
              </div>

              {/* Grid Column Labels A-F */}
              <div className="absolute top-2 left-4 flex gap-16 text-[10px] font-mono text-cyan-400/50 font-bold">
                <span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span>
              </div>
              {/* Grid Row Labels 1-8 */}
              <div className="absolute left-2 top-8 flex flex-col gap-11 text-[10px] font-mono text-cyan-400/50 font-bold">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
              </div>
            </div>

            {/* Mapped Markers on Blueprint */}
            {filteredMarkers.map(marker => {
              const isSelected = marker.id === activeMarker?.id;
              const isReady = marker.status === 'Ready for Turnover';
              const isInProgress = marker.status === 'In Progress';
              const isCompleted = marker.status === 'Completed';

              const pinColor = isCompleted 
                ? 'bg-blue-500 border-blue-300 shadow-blue-500/50' 
                : isReady 
                ? 'bg-emerald-500 border-emerald-300 shadow-emerald-500/50' 
                : isInProgress 
                ? 'bg-amber-500 border-amber-300 shadow-amber-500/50' 
                : 'bg-purple-500 border-purple-300 shadow-purple-500/50';

              return (
                <div
                  key={marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-20 group ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                  }`}
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                >
                  {/* Pin Circle */}
                  <div className={`relative flex items-center justify-center`}>
                    {isSelected && (
                      <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping absolute" />
                    )}

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-white text-[9px] font-black shadow-lg ${pinColor}`}>
                      <MapPin size={11} />
                    </div>

                    {marker.isCriticalPath && (
                      <span className="absolute -top-1.5 -right-1 text-red-500 font-black text-xs">★</span>
                    )}

                    {/* Tag Badge Tooltip / Pill */}
                    <div className={`absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap transition-all ${
                      isSelected 
                        ? 'bg-amber-400 text-slate-950 border border-amber-300 font-black scale-105' 
                        : 'bg-slate-900/95 text-slate-200 border border-slate-700/80 group-hover:border-slate-500'
                    }`}>
                      {marker.tag} • {marker.gridZone}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span>Click any asset pin to highlight its details in the hierarchy.</span>
            <span>Plan: {selectedPlan.name}</span>
          </div>
        </div>

        {/* Right Sidebar: Active Marker Inspector & Unmapped Queue (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Tab Selector */}
          <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setSidebarTab('mapped')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === 'mapped' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isTh ? 'จุดที่เลือก / ตรวจสอบ' : 'Selected Pin'} ({filteredMarkers.length})
            </button>
            <button
              onClick={() => setSidebarTab('unmapped')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === 'unmapped' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isTh ? 'รอระบุพิกัด' : 'Unmapped Queue'} ({unmappedAssets.length})
            </button>
          </div>

          {sidebarTab === 'mapped' ? (
            activeMarker ? (
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <MapPin size={16} />
                    </span>
                    <div>
                      <h4 className="font-mono font-black text-sm text-white">
                        {activeMarker.tag}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activeMarker.unitName} &gt; {activeMarker.systemName}
                      </span>
                    </div>
                  </div>

                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-mono text-[10px]">
                    Zone {activeMarker.gridZone}
                  </Badge>
                </div>

                {/* Spatial Grid Telemetry */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Coordinates</span>
                    <span className="font-mono font-bold text-amber-400">
                      X: {activeMarker.x}% | Y: {activeMarker.y}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                    <span className={`text-[11px] font-bold ${
                      activeMarker.status === 'Ready for Turnover' ? 'text-emerald-400' :
                      activeMarker.status === 'In Progress' ? 'text-amber-400' :
                      activeMarker.status === 'Completed' ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {activeMarker.status}
                    </span>
                  </div>
                </div>

                {/* Scope Description */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Functional Scope / Description
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200">
                    {activeMarker.description || 'No additional scope notes entered.'}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const matchedNode = allLeafAssets.find(a => a.id === activeMarker.nodeId);
                      onOpenAddMappingModal(matchedNode || null, activeMarker);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>{isTh ? 'แก้ไขตำแหน่ง / ปรับพิกัด' : 'Edit / Move Spatial Pin'}</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectNode(activeMarker.nodeId)}
                      className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
                    >
                      <span>{isTh ? 'ดูในโครงสร้างต้นไม้' : 'Locate in Tree'}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleDeleteMarker(activeMarker.id, e)}
                      className="border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs px-2.5 cursor-pointer"
                      title="Delete Pin"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-800/40 rounded-xl border border-slate-800">
                <MapPin size={28} className="mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Select any mapped pin on the plot plan to inspect details.</p>
              </div>
            )
          ) : (
            /* Unmapped Queue List */
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Assets awaiting Plot Plan placement ({unmappedAssets.length})
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {unmappedAssets.slice(0, 30).map(asset => (
                  <div
                    key={asset.id}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-amber-500/50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-200 truncate">
                        {asset.tag || asset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        L{asset.level} • {asset.description || asset.levelType}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onOpenAddMappingModal(asset, null)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2 py-1 h-7 shrink-0 gap-1 cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>Map</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
