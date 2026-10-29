import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MapPin, ZoomIn, ZoomOut, RotateCcw, Compass, 
  Layers, Building2, AlertTriangle, Clock, CheckCircle2, 
  ExternalLink, CalendarPlus, ChevronRight, Eye, Maximize2, Sun, Moon
} from 'lucide-react';
import { 
  ScaffoldingItem, 
  calculateScaffoldMetrics, 
  SYSTEM_CURRENT_DATE 
} from '../../data/scaffoldingData';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeGate } from '../../utils/themeGate';
import essoPlotPlanBg from '../../assets/esso_sriracha_master_plotplan.jpg';

interface ScaffoldPlotPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  scaffold: ScaffoldingItem | null;
  allScaffolds?: ScaffoldingItem[];
  onOpenExtend?: (scaffold: ScaffoldingItem) => void;
  onOpenOffHire?: (scaffold: ScaffoldingItem) => void;
}

// Plant zone definition presets for high-detail CAD backdrop
const PK_UNITS = [
  { name: 'Area 01 - CDU-1', code: 'CDU-1', x: 26, y: 35, width: 22, height: 26, color: 'blue' },
  { name: 'Crude Distillation Unit', code: 'CDU-MAIN', x: 42, y: 44, width: 18, height: 20, color: 'indigo' },
  { name: 'Pipe Rack Corridor East', code: 'PR-EAST', x: 58, y: 40, width: 14, height: 35, color: 'slate' },
  { name: 'Flare System KOD', code: 'FLARE-KOD', x: 76, y: 15, width: 18, height: 18, color: 'amber' },
  { name: 'Storage & Offsite Yard', code: 'OFFSITE-YARD', x: 72, y: 48, width: 20, height: 24, color: 'emerald' },
  { name: 'Desalter Drum Battery', code: 'V-101', x: 18, y: 65, width: 16, height: 18, color: 'cyan' },
];

const SR_UNITS = [
  { name: 'Area 02 - Furnace', code: 'FURNACE-BATTERY', x: 48, y: 24, width: 20, height: 22, color: 'orange' },
  { name: 'Hydrocracking Complex (HCU)', code: 'HCU-UNIT', x: 58, y: 22, width: 22, height: 24, color: 'indigo' },
  { name: 'Crude Distillation Unit', code: 'SR-CDU', x: 40, y: 35, width: 20, height: 24, color: 'blue' },
  { name: 'Tank Farm B', code: 'TK-FARM-B', x: 68, y: 60, width: 22, height: 26, color: 'emerald' },
  { name: 'Area 03 - Utilities', code: 'BOILER-UTIL', x: 22, y: 64, width: 22, height: 24, color: 'cyan' },
  { name: 'Marine Terminal Jetty', code: 'JETTY-BERTH', x: 12, y: 78, width: 22, height: 18, color: 'teal' },
];

export const ScaffoldPlotPlanModal: React.FC<ScaffoldPlotPlanModalProps> = ({
  isOpen,
  onClose,
  scaffold,
  allScaffolds = [],
  onOpenExtend,
  onOpenOffHire
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [gateIsDark, setGlobalThemeGate] = useThemeGate();
  const [mapTheme, setMapTheme] = useState<'dark' | 'paper'>(() => gateIsDark ? 'dark' : 'paper');
  useEffect(() => {
    setMapTheme(gateIsDark ? 'dark' : 'paper');
  }, [gateIsDark]);
  const [showOtherScaffolds, setShowOtherScaffolds] = useState<boolean>(true);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!isOpen || !scaffold) return null;

  const metrics = calculateScaffoldMetrics(scaffold);
  const isPK = scaffold.plant === 'Phra Khanong';
  const units = isPK ? PK_UNITS : SR_UNITS;

  // Active pin coordinates (defaults to center if not set)
  const pinX = typeof scaffold.x === 'number' ? scaffold.x : 45;
  const pinY = typeof scaffold.y === 'number' ? scaffold.y : 45;
  const gridZone = scaffold.gridZone || 'B3';
  const bayDimension = scaffold.bayDimension || '4m × 4m Standard Bay';

  // Other scaffolds in the same plant
  const otherScaffolds = allScaffolds.filter(
    s => s.id !== scaffold.id && s.plant === scaffold.plant && typeof s.x === 'number'
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(400, prev + 15));
    } else {
      setZoomLevel(prev => Math.max(25, prev - 15));
    }
  };

  const handleReset = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white w-full max-w-5xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">
        
        {/* =========================================================================
            MODAL HEADER & CONTEXT
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              metrics.status === 'Overdue'
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : metrics.status === 'Due Soon'
                ? 'bg-amber-500 text-white shadow-amber-500/30'
                : 'bg-emerald-600 text-white shadow-emerald-600/30'
            }`}>
              <MapPin size={22} className="stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight font-mono text-white">
                  {scaffold.id}
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  metrics.status === 'Overdue'
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                    : metrics.status === 'Due Soon'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : metrics.status === 'Off-Hired'
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                }`}>
                  {metrics.status}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {isTh ? 'พิกัดผังโรงกลั่น (Plot Plan Pin)' : 'CAD Spatial Location'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-200">{scaffold.plant}</span>
                <span>·</span>
                <span>{scaffold.area}</span>
                <span>·</span>
                <span className="font-mono text-amber-400 font-bold">Grid {gridZone}</span>
                <span>·</span>
                <span className="text-slate-400">({scaffold.locationDetails || bayDimension})</span>
              </p>
            </div>
          </div>

          {/* Controls: Zoom, Theme, Close */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Map Theme Toggle: Dark Blueprint vs Paper CAD */}
            <div className="inline-flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMapTheme('dark');
                  setGlobalThemeGate(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  mapTheme === 'dark'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon size={12} />
                <span>Dark Blueprint</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapTheme('paper');
                  setGlobalThemeGate(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  mapTheme === 'paper'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun size={12} className="text-amber-500" />
                <span>Paper CAD</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="inline-flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(25, prev - 15))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out (ขยายออกนอกพื้นที่)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-1.5 font-mono text-[10px] text-slate-300 font-bold min-w-[36px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(400, prev + 15))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Zoom In (ซูมเข้าดูรายละเอียด)"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border-l border-slate-700"
                title="Reset View (100%)"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setZoomLevel(60); setPanOffset({ x: 0, y: 0 }); }}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer border-l border-slate-700"
                title="Fit Entire Plot Plan on Screen"
              >
                Fit
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE CAD PLOT PLAN CANVAS
            ========================================================================= */}
        <div 
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative flex-1 min-h-[380px] sm:min-h-[460px] overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors duration-300 ${
            mapTheme === 'dark'
              ? 'bg-[#081329]'
              : 'bg-[#f4f7fb]'
          }`}
        >
          {/* Engineering CAD Grid lines */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: mapTheme === 'dark'
                ? 'linear-gradient(to right, #1e3a8a 1px, transparent 1px), linear-gradient(to bottom, #1e3a8a 1px, transparent 1px)'
                : 'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          {/* Compass Rose */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
            <Compass size={14} className="text-amber-400 animate-spin-slow" />
            <span>N · REFINERY ORIENTATION</span>
          </div>

          {/* Scale Legend */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
            <span className="w-12 h-1 bg-amber-400 inline-block rounded-xs" />
            <span>10 METERS · 1:250 CAD SCALE</span>
          </div>

          {/* Layer toggles overlay */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOtherScaffolds(!showOtherScaffolds)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                showOtherScaffolds
                  ? 'bg-slate-900/90 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700'
              }`}
            >
              <Layers size={13} />
              <span>{isTh ? 'แสดงนั่งร้านอื่นในโรงกลั่น' : 'Show All Plant Scaffolds'}</span>
            </button>
          </div>

          {/* Transformable Canvas Layer */}
          <div
            className="absolute inset-0 w-full h-full transition-transform duration-75"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: '50% 50%'
            }}
          >
            {/* Authentic Master Plot Plan Background */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img 
                src={essoPlotPlanBg} 
                alt="Master Plot Plan" 
                className={`w-full h-full object-contain pointer-events-none select-none transition-all duration-300 ${
                  mapTheme === 'dark' 
                    ? 'filter invert hue-rotate-180 brightness-[0.78] contrast-[1.25] opacity-65' 
                    : 'opacity-90 mix-blend-multiply'
                }`}
              />
            </div>

            {/* Grid Coordinates (A1 to D6) */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 pointer-events-none opacity-20 border border-slate-700">
              {['A', 'B', 'C', 'D'].map((col, cIdx) => 
                [1, 2, 3, 4, 5, 6].map((row, rIdx) => (
                  <div key={`${col}${row}`} className="border border-slate-800 p-2 text-[10px] font-mono text-slate-500">
                    {col}{row}
                  </div>
                ))
              )}
            </div>

            {/* Refinery Process Units CAD Blocks */}
            {units.map(u => (
              <div
                key={u.name}
                className="absolute rounded-xl border border-slate-700/60 bg-slate-800/25 p-2 flex flex-col justify-between pointer-events-none backdrop-blur-2xs"
                style={{
                  left: `${u.x}%`,
                  top: `${u.y}%`,
                  width: `${u.width}%`,
                  height: `${u.height}%`
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {u.code}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-300/80 truncate">
                  {u.name}
                </span>
              </div>
            ))}

            {/* Other Scaffolds in Plant (Secondary pins) */}
            {showOtherScaffolds && otherScaffolds.map(other => {
              const otherMetrics = calculateScaffoldMetrics(other);
              return (
                <div
                  key={other.id}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity"
                  style={{ left: `${other.x}%`, top: `${other.y}%` }}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ring-2 ring-slate-900 flex items-center justify-center opacity-65 ${
                    otherMetrics.status === 'Overdue'
                      ? 'bg-rose-500'
                      : otherMetrics.status === 'Due Soon'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`} />
                  <span className="text-[8px] font-mono text-slate-400 block -mt-1 opacity-70 whitespace-nowrap">
                    {other.id.replace('SCF-2026-', '#')}
                  </span>
                </div>
              );
            })}

            {/* Target Scaffolding Pin Marker (Hero Pin with Pulsing Ripple) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
              style={{ left: `${pinX}%`, top: `${pinY}%` }}
            >
              {/* Pulsing Beacon Waves */}
              <div className={`absolute -inset-4 rounded-full animate-ping opacity-35 ${
                metrics.status === 'Overdue'
                  ? 'bg-rose-500'
                  : metrics.status === 'Due Soon'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`} />
              <div className={`absolute -inset-2 rounded-full animate-pulse opacity-40 ${
                metrics.status === 'Overdue'
                  ? 'bg-rose-500'
                  : metrics.status === 'Due Soon'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`} />

              {/* Scaffold Clearance Ring (Dashed border around footprint) */}
              <div className="absolute -inset-8 rounded-full border-2 border-dashed border-amber-400/50 pointer-events-none" />

              {/* Center Beacon Icon Pin */}
              <div className={`relative w-8 h-8 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white dark:ring-slate-900 cursor-pointer ${
                metrics.status === 'Overdue'
                  ? 'bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-rose-600/50'
                  : metrics.status === 'Due Soon'
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-white shadow-amber-600/50'
                  : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-emerald-600/50'
              }`}>
                <MapPin size={18} className="stroke-[3]" />
              </div>

              {/* Floating Detailed Pin Callout Card */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-10 z-40 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/90 shadow-2xl p-3 min-w-[210px] pointer-events-auto text-left space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-amber-400 text-xs">
                    {scaffold.id}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    metrics.status === 'Overdue'
                      ? 'bg-rose-950 text-rose-300'
                      : metrics.status === 'Due Soon'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {metrics.status}
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                  {scaffold.locationDetails || scaffold.area}
                </p>

                <div className="pt-1 border-t border-slate-800 text-[10px] space-y-0.5 font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Footprint:</span>
                    <span className="text-slate-200 font-bold">{bayDimension}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contractor:</span>
                    <span className="text-slate-200 truncate max-w-[110px]">{scaffold.contractor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Off-Hire:</span>
                    <span className="text-amber-300 font-bold">{scaffold.plannedOffHireDate}</span>
                  </div>
                </div>

                {/* Pointing notch arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-slate-900/95" />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MODAL FOOTER (Quick Action Controls)
            ========================================================================= */}
        <div className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 shrink-0 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              {isTh ? 'จุดสีแดง: เกินกำหนด' : 'Red: Overdue'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {isTh ? 'จุดสีเหลือง: ใกล้กำหนด' : 'Amber: Due Soon'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {isTh ? 'จุดสีเขียว: ปกติ' : 'Green: Active'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!metrics.isOffHired && onOpenExtend && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExtend(scaffold);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CalendarPlus size={13} />
                <span>{isTh ? 'ขยายเวลา (Extend)' : 'Extend'}</span>
              </button>
            )}

            {!metrics.isOffHired && onOpenOffHire && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOffHire(scaffold);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <CheckCircle2 size={13} />
                <span>{isTh ? 'ยืนยัน Off-Hire' : 'Off-Hire'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              {isTh ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
