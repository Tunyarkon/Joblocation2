import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, X, ZoomIn, ZoomOut, RotateCcw, Truck, 
  ShieldCheck, Crosshair, Building2, 
  Maximize2, Minimize2, Compass, Sun, Moon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useThemeGate } from '../utils/themeGate';
import essoPlotPlanBg from '../assets/esso_sriracha_master_plotplan.jpg';

export interface JobPlotPlanModalProps {
  job: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullPlotPlan?: (jobId: string | number) => void;
}

export default function JobPlotPlanModal({
  job,
  isOpen,
  onClose
}: JobPlotPlanModalProps) {
  const { isTh } = useLanguage();

  // Fullscreen / Expanded in-place state
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Canvas pan & zoom states
  const [zoomLevel, setZoomLevel] = useState<number>(140);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSafetyRadius, setShowSafetyRadius] = useState(true);
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [blueprintTheme, setBlueprintTheme] = useState<'dark' | 'paper'>(() => gateIsDark ? 'dark' : 'paper');
  useEffect(() => {
    setBlueprintTheme(gateIsDark ? 'dark' : 'paper');
  }, [gateIsDark]);
  const isDarkBlueprint = blueprintTheme === 'dark';

  // When job opens, center the view on the job coordinates
  useEffect(() => {
    if (job && isOpen) {
      setZoomLevel(150);
      setIsExpanded(false);
      const posX = job.x ?? 48;
      const posY = job.y ?? 42;
      // Calculate offset so the marker is near center of canvas
      // (50 - pos) * scale factor
      const offsetX = (50 - posX) * 7.5;
      const offsetY = (50 - posY) * 7.5;
      setPanOffset({ x: offsetX, y: offsetY });
    }
  }, [job, isOpen]);

  // ESC key listener to close modal or exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isExpanded]);

  if (!isOpen || !job) return null;

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - panStartRef.current.x,
      y: e.touches[0].clientY - panStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    const posX = job.x ?? 48;
    const posY = job.y ?? 42;
    setZoomLevel(150);
    setPanOffset({
      x: (50 - posX) * 7.5,
      y: (50 - posY) * 7.5
    });
  };

  const posX = typeof job.x === 'number' ? job.x : 48;
  const posY = typeof job.y === 'number' ? job.y : 42;
  const radiusMeter = job.workingRadiusM || (job.isArea ? 28 : (job.type?.includes('Tower') ? 35 : job.type?.includes('Mobile') ? 25 : 18));
  const rPx = radiusMeter * 3.4;
  const grossLoad = job.grossLoadTon || (job.loadWeightTon ? job.loadWeightTon + (job.riggingWeightTon || 0) : 32.5);

  const statusBg = job.status === 'Completed' ? 'bg-emerald-600 text-white border-emerald-400' :
                   job.status === 'Approved' ? 'bg-teal-600 text-white border-teal-300' :
                   job.status === 'In Progress' ? 'bg-blue-600 text-white border-blue-300 shadow-blue-500/50 animate-pulse' :
                   job.status === 'Rejected' ? 'bg-red-600 text-white border-red-300' :
                   'bg-slate-700 text-slate-200 border-slate-500';

  const strokeColor = job.status === 'Completed' ? '#10b981' :
                      job.status === 'Approved' ? '#14b8a6' :
                      job.status === 'In Progress' ? '#3b82f6' :
                      job.status === 'Rejected' ? '#ef4444' : '#64748b';

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 flex items-center justify-center ${
        isExpanded ? 'p-1 sm:p-2 md:p-3' : 'p-3 sm:p-5 md:p-6'
      }`}
      onClick={onClose}
    >
      <div 
        className={`w-full bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
          isExpanded 
            ? 'h-full max-w-none max-h-none rounded-2xl' 
            : 'max-w-5xl max-h-[92vh] rounded-3xl animate-in zoom-in-95 duration-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isTh ? 'ตำแหน่งบนผังโรงกลั่น (Plot Plan)' : 'Refinery Plot Plan & Crane Coordinates'}</span>
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  WO: {job.jobNo}
                </span>
                {job.requestNo && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {job.requestNo}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                  job.status === 'Approved' ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800' :
                  job.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                  'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{job.plant} • {job.unit || '11-APS1'}</span>
                <span>•</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Grid X: {posX.toFixed(1)}%, Y: {posY.toFixed(1)}%
                </span>
                <span>•</span>
                <span className="truncate max-w-xs">{job.description}</span>
              </p>
            </div>
          </div>

          {/* Action buttons (Expand / Close) */}
          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={isExpanded ? (isTh ? 'ย่อขนาดเดิม (Exit Fullscreen)' : 'Exit Fullscreen') : (isTh ? 'ขยายเต็มหน้าจอ (Expand Fullscreen)' : 'Expand Fullscreen')}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={isTh ? 'ปิดหน้าต่าง' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Blueprint Canvas Container */}
        <div className={`relative flex-1 overflow-hidden select-none transition-all duration-300 ${
          isDarkBlueprint ? 'bg-slate-950' : 'bg-[#f4f7fb]'
        } ${
          isExpanded ? 'min-h-[500px]' : 'min-h-[420px] sm:min-h-[480px]'
        }`}>
          
          {/* Floating Canvas Controls */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={() => {
                const nextIsDark = !isDarkBlueprint;
                setBlueprintTheme(nextIsDark ? 'dark' : 'paper');
                setGlobalThemeGate(nextIsDark);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                isDarkBlueprint
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-white text-slate-900'
              }`}
              title="Toggle Dark Blueprint / Paper CAD"
            >
              {isDarkBlueprint ? <Moon size={13} /> : <Sun size={13} className="text-amber-500" />}
              <span className="text-[11px]">{isDarkBlueprint ? 'Dark Blueprint' : 'Paper CAD'}</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 25, 260))}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isTh ? 'ซูมเข้า' : 'Zoom In'}
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-2 font-bold">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 25, 90))}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isTh ? 'ซูมออก' : 'Zoom Out'}
            >
              <ZoomOut size={16} />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={resetView}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title={isTh ? 'จัดกึ่งกลางจุดที่เลือก' : 'Center on Job'}
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline text-[11px]">{isTh ? 'รีเซ็ต' : 'Reset'}</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => setShowSafetyRadius(!showSafetyRadius)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                showSafetyRadius 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isTh ? 'แสดง/ซ่อน รัศมีการทำงาน' : 'Toggle Safety Radius'}
            >
              <ShieldCheck size={14} className="inline mr-1" />
              <span className="text-[11px]">{isTh ? 'รัศมีปลอดภัย' : 'Radius'}</span>
            </button>
          </div>

          {/* Compass & Instructions HUD */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-2xl bg-slate-900/90 text-slate-300 backdrop-blur-md border border-slate-700/80 text-[10px] font-mono flex items-center gap-1.5 shadow-xl">
              <Compass size={14} className="text-sky-400" />
              <span className="font-bold text-white">NORTH ↑</span>
              <span className="text-slate-500">|</span>
              <span>{isDarkBlueprint ? 'Dark Blueprint' : 'Paper CAD'}</span>
            </div>
          </div>

          {/* Scalable & Pannable Vector Canvas */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out'
            }}
          >
            {/* Background Master Plot Plan Blueprint */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img 
                src={essoPlotPlanBg} 
                alt="Master Plot Plan" 
                className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-300 ${
                  isDarkBlueprint
                    ? 'filter invert hue-rotate-180 brightness-[0.80] contrast-[1.25] opacity-65'
                    : 'opacity-90 mix-blend-multiply'
                }`}
              />
            </div>

            {/* CAD Grid Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="modalCadGridSmall" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.8" />
                </pattern>
                <pattern id="modalCadGridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#modalCadGridSmall)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1.2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#modalCadGridLarge)" />
            </svg>

            {/* Refinery Zone Boundaries */}
            <div className="absolute top-[16%] left-[28%] w-[30%] h-[34%] rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 pointer-events-none p-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-emerald-400">AREA 01: CDU-1 &amp; HEAT EXCHANGERS</span>
              <span className="text-[8px] font-mono text-emerald-500/60 self-end">11-C-101 / 11-E-101</span>
            </div>
            <div className="absolute top-[16%] left-[60%] w-[30%] h-[34%] rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 pointer-events-none p-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-orange-400">AREA 02: FURNACES &amp; STACK BAY</span>
              <span className="text-[8px] font-mono text-orange-500/60 self-end">11-F-101 / 11-F-102</span>
            </div>
            <div className="absolute top-[54%] left-[28%] w-[30%] h-[32%] rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 pointer-events-none p-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-blue-400">AREA 03: HYDROTREATER QUAD</span>
              <span className="text-[8px] font-mono text-blue-500/60 self-end">21-R-101 / 21-V-102</span>
            </div>
            <div className="absolute top-[54%] left-[60%] w-[30%] h-[32%] rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5 pointer-events-none p-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-purple-400">AREA 04: STORAGE &amp; JETTY LOGISTICS</span>
              <span className="text-[8px] font-mono text-purple-500/60 self-end">TK-101 ~ 106</span>
            </div>

            {/* Target Job Safety Swing Barricade Circle */}
            {showSafetyRadius && (
              <div
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  width: `${rPx * 2}px`,
                  height: `${rPx * 2}px`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10 flex items-center justify-center animate-in zoom-in-75 duration-300"
              >
                {/* Radial Glow */}
                <div 
                  className="w-full h-full rounded-full"
                  style={{
                    background: job.status === 'In Progress'
                      ? 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.12) 65%, transparent 100%)'
                      : 'radial-gradient(circle, rgba(16,185,129,0.30) 0%, rgba(16,185,129,0.08) 65%, transparent 100%)'
                  }}
                />
                <div 
                  className="absolute inset-0 rounded-full border-2 border-solid ring-4 ring-white/40 animate-pulse"
                  style={{ borderColor: strokeColor }}
                />
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: strokeColor }}
                />
                {/* Radius Tag */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap shadow-lg border bg-white text-slate-950 border-slate-900 z-20">
                  {radiusMeter}m CRANE SWING RADIUS
                </div>
              </div>
            )}

            {/* Target Job Marker */}
            <div
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute select-none z-30 flex flex-col items-center cursor-pointer scale-110"
            >
              {/* 4 Outrigger Steel Pads (ขาช้าง) */}
              <div className="absolute -inset-3.5 pointer-events-none">
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-xs bg-amber-400 border border-amber-200 shadow-md animate-pulse" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-xs bg-amber-400 border border-amber-200 shadow-md animate-pulse" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-xs bg-amber-400 border border-amber-200 shadow-md animate-pulse" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-xs bg-amber-400 border border-amber-200 shadow-md animate-pulse" />
              </div>

              {/* Center Crosshair Target Ring */}
              <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-blue-500/30 flex items-center justify-center shadow-lg">
                <Crosshair size={18} className="text-white animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              {/* Marker Badge */}
              <div className={`mt-1.5 px-2.5 py-1 rounded-xl shadow-2xl font-mono text-[10px] font-black flex items-center gap-1.5 border-2 ${statusBg}`}>
                <Truck size={12} className="shrink-0" />
                <span>{job.jobNo}</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold">
                  {job.assignedCraneId || (job.type || 'Crane').split(' ')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Floating Instructions Bottom Pill */}
          <div className="absolute bottom-3 right-3 z-30 px-3 py-1 rounded-xl bg-slate-900/80 text-slate-300 backdrop-blur-md border border-slate-700/70 text-[9px] font-mono flex items-center gap-2">
            <span>Drag to Pan</span>
            <span className="text-slate-500">•</span>
            <span>Zoom (+ / -)</span>
            <span className="text-slate-500">•</span>
            <span>Refinery Coordinate Focus</span>
          </div>
        </div>

        {/* Technical HUD Footer Details */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs flex-1">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipment / Load</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                {job.equipmentType || job.type || 'Mobile Crane (50T)'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Load / Radius</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">
                {grossLoad.toFixed(1)} T @ {radiusMeter} m
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Crane Allocation</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 truncate block mt-0.5">
                {job.assignedCraneId || 'CR-001 (Mobile 50T)'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Safety Validation</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5 flex items-center gap-1">
                <ShieldCheck size={14} />
                <span>Ground Mat Verified</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {/* In-place Fullscreen Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <Minimize2 size={13} />
                  <span>{isTh ? 'ย่อขนาดเดิม' : 'Normal Size'}</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span>{isTh ? 'ขยายเต็มหน้าจอ (Full Plot Plan)' : 'Expand Fullscreen'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isTh ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
