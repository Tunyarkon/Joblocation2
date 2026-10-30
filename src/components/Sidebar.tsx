import { 
  LayoutDashboard, PlusSquare, FileText, Pickaxe, Map, Calendar, X, 
  ChevronDown, ChevronRight, Settings, Users, Sparkles, BarChart3, 
  ClipboardCheck, Network, Activity, TrendingUp, AlertOctagon, 
  Building2, MapPin, Layers, Home, Sliders, PieChart, PlusCircle, 
  Truck, PanelLeftClose, PanelLeft, ChevronsUpDown, FoldVertical, 
  UnfoldVertical, Check, ChevronUp, Clock
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useThemeGate } from '../utils/themeGate';

export type SidebarModuleKey = 'home' | 'executive' | 'turnover' | 'crane' | 'scaffold' | 'settings';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenCreateTurnover?: () => void;
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
  isDarkMode?: boolean;
}

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  isOpen, 
  setIsOpen, 
  onOpenCreateTurnover, 
  deviceMode = 'desktop',
  isDarkMode: isDarkModeProp
}: SidebarProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const isDesktopMode = deviceMode === 'desktop';
  const [gateDarkMode] = useThemeGate();
  const isDarkMode = typeof isDarkModeProp === 'boolean' ? isDarkModeProp : gateDarkMode;

  // Desktop Slim / Icon Rail Collapse State
  const [isSlimCollapsed, setIsSlimCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_slim_mode') === 'true';
    }
    return false;
  });

  const toggleSlimMode = () => {
    setIsSlimCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_slim_mode', String(next));
      }
      return next;
    });
  };

  // Determine active module based on current activeView
  const currentActiveModule: SidebarModuleKey = useMemo(() => {
    if (activeView === 'home') {
      return 'home';
    }
    if (
      activeView === 'user-config' || 
      activeView === 'master' || 
      activeView === 'functional-location' || 
      activeView === 'turnover-activity-log' || 
      activeView === 'system-activity-log'
    ) {
      return 'settings';
    }
    if (
      activeView.startsWith('turnover-') || 
      activeView.startsWith('job-location') || 
      activeView === 'to-dashboard' || 
      activeView === 'to-dashboard-v2'
    ) {
      return 'turnover';
    }
    if (activeView.startsWith('scaffold-')) {
      return 'scaffold';
    }
    if (
      activeView === 'executive-dashboard' || 
      activeView === 'executive-critical-path' || 
      activeView === 'executive-unit-funnel'
    ) {
      return 'executive';
    }
    return 'crane';
  }, [activeView]);

  // Collapsible state for each of the modules
  // Default: ONLY the active module is expanded; others are neatly collapsed!
  const [expandedModules, setExpandedModules] = useState<Record<SidebarModuleKey, boolean>>({
    home: true,
    executive: currentActiveModule === 'executive',
    turnover: currentActiveModule === 'turnover',
    crane: currentActiveModule === 'crane',
    scaffold: currentActiveModule === 'scaffold',
    settings: currentActiveModule === 'settings'
  });

  // When activeView changes, automatically focus & expand ONLY that module to keep sidebar tidy
  useEffect(() => {
    if (currentActiveModule === 'home') return;
    setExpandedModules(prev => {
      if (prev[currentActiveModule]) return prev;
      return {
        home: true,
        executive: currentActiveModule === 'executive',
        turnover: currentActiveModule === 'turnover',
        crane: currentActiveModule === 'crane',
        scaffold: currentActiveModule === 'scaffold',
        settings: currentActiveModule === 'settings'
      };
    });
  }, [currentActiveModule]);

  // Toggle a single module (Accordion style)
  const toggleModule = (moduleKey: SidebarModuleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  // Quick Action: Collapse All Modules
  const handleCollapseAll = () => {
    setExpandedModules({
      home: false,
      executive: false,
      turnover: false,
      crane: false,
      scaffold: false,
      settings: false
    });
  };

  // Quick Action: Expand All Modules
  const handleExpandAll = () => {
    setExpandedModules({
      home: true,
      executive: true,
      turnover: true,
      crane: true,
      scaffold: true,
      settings: true
    });
  };

  const isAllCollapsed = !expandedModules.crane && !expandedModules.scaffold && !expandedModules.turnover && !expandedModules.settings;

  // Handle item click on mobile/tablet (auto-close drawer)
  const handleItemClick = (viewKey: string) => {
    setActiveView(viewKey);
    if (!isDesktopMode) {
      setIsOpen(false);
    }
  };

  // Shared helper for rendering sub-menu button classes with high-contrast active highlight
  const getSubMenuItemClasses = (isActive: boolean, themeColor: 'blue' | 'cyan' | 'emerald' | 'indigo') => {
    const base = 'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer text-left';
    if (!isActive) {
      return `${base} border-l-4 border-transparent ${
        isDarkMode
          ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
      }`;
    }

    if (themeColor === 'blue') {
      return `${base} border-l-4 ${
        isDarkMode
          ? 'border-blue-400 bg-gradient-to-r from-blue-600/30 via-blue-600/15 to-transparent text-white font-extrabold shadow-sm ring-1 ring-blue-500/30'
          : 'border-blue-600 bg-gradient-to-r from-blue-100 via-blue-50 to-white text-blue-900 font-extrabold shadow-xs ring-1 ring-blue-300/80'
      }`;
    }
    if (themeColor === 'cyan') {
      return `${base} border-l-4 ${
        isDarkMode
          ? 'border-cyan-400 bg-gradient-to-r from-cyan-600/30 via-cyan-600/15 to-transparent text-white font-extrabold shadow-sm ring-1 ring-cyan-500/30'
          : 'border-cyan-600 bg-gradient-to-r from-cyan-100 via-cyan-50 to-white text-cyan-950 font-extrabold shadow-xs ring-1 ring-cyan-300/80'
      }`;
    }
    if (themeColor === 'emerald') {
      return `${base} border-l-4 ${
        isDarkMode
          ? 'border-emerald-400 bg-gradient-to-r from-emerald-600/30 via-emerald-600/15 to-transparent text-white font-extrabold shadow-sm ring-1 ring-emerald-500/30'
          : 'border-emerald-600 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white text-emerald-950 font-extrabold shadow-xs ring-1 ring-emerald-300/80'
      }`;
    }
    return `${base} border-l-4 ${
      isDarkMode
        ? 'border-indigo-400 bg-gradient-to-r from-indigo-600/30 via-indigo-600/15 to-transparent text-white font-extrabold shadow-sm ring-1 ring-indigo-500/30'
        : 'border-indigo-600 bg-gradient-to-r from-indigo-100 via-indigo-50 to-white text-indigo-950 font-extrabold shadow-xs ring-1 ring-indigo-300/80'
    }`;
  };

  return (
    <>
      {/* Mobile / Tablet Drawer Backdrop */}
      {isOpen && (
        <div 
          className={`${isDesktopMode ? 'fixed inset-0 md:hidden' : 'absolute inset-0'} bg-slate-950/70 backdrop-blur-xs z-40 animate-in fade-in`}
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`
        ${isDesktopMode ? 'fixed inset-y-0 left-0 md:relative md:translate-x-0' : 'absolute inset-y-0 left-0'} 
        ${isSlimCollapsed && isDesktopMode ? 'w-[70px]' : 'w-[270px] max-w-[85%]'}
        ${isDarkMode ? 'bg-[#0B1120] border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200 shadow-lg'} border-r flex flex-col shrink-0 h-full z-50 transition-all duration-300 select-none
        ${isOpen ? 'translate-x-0' : isDesktopMode ? '-translate-x-full md:translate-x-0' : '-translate-x-full'}
      `}>
        {/* ================= HEADER & APP IDENTITY ================= */}
        <div className={`border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'} flex items-center justify-between transition-all ${
          isSlimCollapsed && isDesktopMode ? 'p-3 flex-col gap-2' : 'p-4 sm:p-5'
        }`}>
          <div className="flex items-center space-x-3 min-w-0">
            {/* Module Logo / Icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-lg ${
              currentActiveModule === 'home' ? 'bg-gradient-to-br from-blue-500 to-sky-600 shadow-blue-500/25 ring-1 ring-white/10' :
              currentActiveModule === 'executive' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/25 ring-1 ring-white/10' :
              currentActiveModule === 'turnover' ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25 ring-1 ring-white/10' :
              currentActiveModule === 'crane' ? 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-blue-600/25 ring-1 ring-white/10' :
              currentActiveModule === 'scaffold' ? 'bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/25 ring-1 ring-white/10' :
              'bg-gradient-to-br from-indigo-600 to-slate-800 shadow-indigo-700/25 ring-1 ring-white/10'
            }`}>
              {currentActiveModule === 'home' ? 'HM' :
               currentActiveModule === 'executive' ? 'EX' :
               currentActiveModule === 'turnover' ? 'TO' :
               currentActiveModule === 'crane' ? 'CR' :
               currentActiveModule === 'scaffold' ? 'SF' : 'CFG'}
            </div>

            {/* Title & App Tag (Hidden when slim collapsed) */}
            {(!isSlimCollapsed || !isDesktopMode) && (
              <div className="min-w-0">
                <h1 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-extrabold tracking-tight text-xs uppercase truncate`}>
                  {currentActiveModule === 'home' ? (isTh ? 'หน้าหลักระบบ' : 'Home Portal') :
                   currentActiveModule === 'executive' ? (isTh ? 'แดชบอร์ดผู้บริหาร' : 'Executive Dashboard') :
                   currentActiveModule === 'turnover' ? (isTh ? 'ส่งมอบระบบ (Turnover S/D & T/A)' : 'Turnover S/D & T/A') :
                   currentActiveModule === 'crane' ? (isTh ? 'งานเครน' : 'Crane Job') :
                   currentActiveModule === 'scaffold' ? (isTh ? 'ระบบจัดการนั่งร้าน' : 'Scaffolding System') :
                   (isTh ? 'ตั้งค่าระบบ' : 'Settings & Config')}
                </h1>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] uppercase font-mono tracking-wider truncate`}>
                  Project Crane V0.1
                </p>
              </div>
            )}
          </div>

          {/* Desktop Slim Mode Toggle Button */}
          {isDesktopMode && (
            <button
              type="button"
              onClick={toggleSlimMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isSlimCollapsed ? 'ขยายแถบเมนู (Expand Sidebar)' : 'ย่อแถบเมนูให้เป็นไอคอน (Slim Sidebar)'}
            >
              {isSlimCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button 
            type="button"
            className={`md:hidden p-1 cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>


        {/* ================= MODULE ACCORDION CONTROLS (EXPAND/COLLAPSE ALL) ================= */}
        {(!isSlimCollapsed || !isDesktopMode) && (
          <div className={`px-3.5 pt-3 pb-1 flex items-center justify-between text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={`uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isTh ? 'โมดูลงาน' : 'Modules'}
            </span>
            <button
              type="button"
              onClick={isAllCollapsed ? handleExpandAll : handleCollapseAll}
              className={`${isDarkMode ? 'hover:text-cyan-400' : 'hover:text-blue-600'} transition-colors flex items-center gap-1 cursor-pointer font-bold text-[10px]`}
              title={isAllCollapsed ? 'ขยายทุกโมดูล' : 'ย่อทุกโมดูล'}
            >
              {isAllCollapsed ? (
                <>
                  <UnfoldVertical size={12} />
                  <span>{isTh ? 'ขยายทั้งหมด' : 'Expand All'}</span>
                </>
              ) : (
                <>
                  <FoldVertical size={12} />
                  <span>{isTh ? 'ย่อทั้งหมด' : 'Collapse All'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ================= NAVIGATION ACCORDION LIST ================= */}
        <nav className="flex-1 px-2.5 py-2 overflow-y-auto custom-scrollbar space-y-2">
          
          {/* ================= HOME PORTAL BUTTON ================= */}
          <button
            type="button"
            onClick={() => handleItemClick('home')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeView === 'home'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white border-blue-400/60 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/30'
                : isDarkMode
                  ? 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800/70'
                  : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
            title={isTh ? 'หน้าหลัก (Home Portal)' : 'Home Portal'}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Home size={16} className={activeView === 'home' ? 'text-white shrink-0' : (isDarkMode ? 'text-blue-400 shrink-0' : 'text-blue-600 shrink-0')} />
              {(!isSlimCollapsed || !isDesktopMode) && (
                <span className="truncate">{isTh ? 'หน้าหลัก (Home)' : 'Home'}</span>
              )}
            </div>
            {(!isSlimCollapsed || !isDesktopMode) && activeView === 'home' && (
              <span className="w-2 h-2 rounded-full bg-white shadow-xs shadow-white animate-pulse shrink-0" />
            )}
          </button>

          {/* =========================================================================
              MODULE 1: EXECUTIVE DASHBOARD (HIDDEN PER USER REQUEST)
             ========================================================================= */}
          {false && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
            {/* Module Accordion Header Button */}
            <button 
              type="button"
              onClick={() => {
                if (isSlimCollapsed && isDesktopMode) {
                  setIsSlimCollapsed(false);
                  toggleModule('executive');
                } else {
                  toggleModule('executive');
                }
              }}
              className={`flex items-center justify-between w-full p-2.5 text-xs font-bold transition-all cursor-pointer ${
                currentActiveModule === 'executive'
                  ? 'text-white bg-indigo-600/90 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title={isTh ? 'แดชบอร์ดผู้บริหาร' : 'Executive Dashboard'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 size={16} className={currentActiveModule === 'executive' ? 'text-white' : 'text-indigo-400 shrink-0'} />
                {(!isSlimCollapsed || !isDesktopMode) && (
                  <span className="truncate">{isTh ? 'แดชบอร์ดผู้บริหาร' : 'Executive Dashboard'}</span>
                )}
              </div>

              {(!isSlimCollapsed || !isDesktopMode) && (
                expandedModules.executive ? (
                  <ChevronDown size={14} className="text-slate-300 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-slate-500 shrink-0" />
                )
              )}
            </button>
          </div>
          )}

          {/* =========================================================================
              MODULE 1: CRANE JOB
             ========================================================================= */}
          <div className={`rounded-xl border overflow-hidden transition-all ${
            currentActiveModule === 'crane'
              ? (isDarkMode ? 'border-blue-500/60 bg-slate-900/80 shadow-md shadow-blue-950/50 ring-1 ring-blue-500/20' : 'border-blue-400 bg-white shadow-md shadow-blue-100 ring-1 ring-blue-200')
              : (isDarkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80')
          }`}>
            {/* Module Accordion Header Button */}
            <button 
              type="button"
              onClick={() => {
                if (isSlimCollapsed && isDesktopMode) {
                  setIsSlimCollapsed(false);
                  toggleModule('crane');
                } else {
                  toggleModule('crane');
                }
              }}
              className={`flex items-center justify-between w-full p-2.5 text-xs font-bold transition-all cursor-pointer ${
                currentActiveModule === 'crane'
                  ? 'text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-600 shadow-md shadow-blue-600/25'
                  : isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title={isTh ? 'งานเครน (Crane Job)' : 'Crane Job'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Truck size={16} className={currentActiveModule === 'crane' ? 'text-white shrink-0' : (isDarkMode ? 'text-blue-400 shrink-0' : 'text-blue-600 shrink-0')} />
                {(!isSlimCollapsed || !isDesktopMode) && (
                  <span className="truncate">{isTh ? 'งานเครน' : 'Crane Job'}</span>
                )}
              </div>

              {(!isSlimCollapsed || !isDesktopMode) && (
                expandedModules.crane ? (
                  <ChevronDown size={14} className={currentActiveModule === 'crane' ? 'text-white shrink-0' : (isDarkMode ? 'text-slate-300 shrink-0' : 'text-slate-500 shrink-0')} />
                ) : (
                  <ChevronRight size={14} className={currentActiveModule === 'crane' ? 'text-white shrink-0' : 'text-slate-400 shrink-0'} />
                )
              )}
            </button>

            {/* Sub-menu Items */}
            {expandedModules.crane && (!isSlimCollapsed || !isDesktopMode) && (
              <div className={`p-1.5 space-y-1 border-t ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => handleItemClick('create')}
                  className={getSubMenuItemClasses(activeView === 'create', 'blue')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlusSquare size={14} className={`shrink-0 transition-colors ${activeView === 'create' ? (isDarkMode ? 'text-blue-300' : 'text-blue-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'สร้าง Event & คำขอเครน' : 'Create Event & Crane Job'}</span>
                  </div>
                  {activeView === 'create' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-blue-400 shadow-xs shadow-blue-400' : 'bg-blue-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('crane-master')}
                  className={getSubMenuItemClasses(activeView === 'crane-master', 'blue')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck size={14} className={`shrink-0 transition-colors ${activeView === 'crane-master' ? (isDarkMode ? 'text-blue-300' : 'text-blue-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ทะเบียนเครน (Crane Master)' : 'Crane Master / Fleet'}</span>
                  </div>
                  {activeView === 'crane-master' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-blue-400 shadow-xs shadow-blue-400' : 'bg-blue-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('job-list')}
                  className={getSubMenuItemClasses(activeView === 'job-list' || activeView === 'list', 'blue')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={`shrink-0 transition-colors ${activeView === 'job-list' || activeView === 'list' ? (isDarkMode ? 'text-blue-300' : 'text-blue-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ทะเบียนงานเครน' : 'Job List'}</span>
                  </div>
                  {(activeView === 'job-list' || activeView === 'list') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-blue-400 shadow-xs shadow-blue-400' : 'bg-blue-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('optimize')}
                  className={getSubMenuItemClasses(activeView === 'optimize' || activeView === 'optimize-v2', 'blue')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className={`shrink-0 transition-colors ${activeView === 'optimize' || activeView === 'optimize-v2' ? (isDarkMode ? 'text-blue-300' : 'text-blue-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ตรวจสอบและจัดสรรเครน' : 'Review Plan & Optimize'}</span>
                  </div>
                  {(activeView === 'optimize' || activeView === 'optimize-v2') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-blue-400 shadow-xs shadow-blue-400' : 'bg-blue-600'}`} />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* =========================================================================
              MODULE 2: SCAFFOLDING SYSTEM
             ========================================================================= */}
          <div className={`rounded-xl border overflow-hidden transition-all ${
            currentActiveModule === 'scaffold'
              ? (isDarkMode ? 'border-cyan-500/60 bg-slate-900/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/20' : 'border-cyan-400 bg-white shadow-md shadow-cyan-100 ring-1 ring-cyan-200')
              : (isDarkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80')
          }`}>
            {/* Module Accordion Header Button */}
            <button 
              type="button"
              onClick={() => {
                if (isSlimCollapsed && isDesktopMode) {
                  setIsSlimCollapsed(false);
                  toggleModule('scaffold');
                } else {
                  toggleModule('scaffold');
                }
              }}
              className={`flex items-center justify-between w-full p-2.5 text-xs font-bold transition-all cursor-pointer ${
                currentActiveModule === 'scaffold'
                  ? 'text-white bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-600 shadow-md shadow-cyan-600/25'
                  : isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title={isTh ? 'งานนั่งร้าน (Scaffolding)' : 'Scaffolding System'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Pickaxe size={16} className={currentActiveModule === 'scaffold' ? 'text-white shrink-0' : (isDarkMode ? 'text-cyan-400 shrink-0' : 'text-cyan-600 shrink-0')} />
                {(!isSlimCollapsed || !isDesktopMode) && (
                  <span className="truncate">{isTh ? 'งานนั่งร้าน' : 'Scaffolding'}</span>
                )}
              </div>

              {(!isSlimCollapsed || !isDesktopMode) && (
                expandedModules.scaffold ? (
                  <ChevronDown size={14} className={currentActiveModule === 'scaffold' ? 'text-white shrink-0' : (isDarkMode ? 'text-slate-300 shrink-0' : 'text-slate-500 shrink-0')} />
                ) : (
                  <ChevronRight size={14} className={currentActiveModule === 'scaffold' ? 'text-white shrink-0' : 'text-slate-400 shrink-0'} />
                )
              )}
            </button>

            {/* Sub-menu Items */}
            {expandedModules.scaffold && (!isSlimCollapsed || !isDesktopMode) && (
              <div className={`p-1.5 space-y-1 border-t ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-white'
              }`}>
                {/* 1. Create Job */}
                <button
                  type="button"
                  onClick={() => handleItemClick('scaffold-create')}
                  className={getSubMenuItemClasses(activeView === 'scaffold-create' || activeView === 'scaffold-sf01', 'cyan')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlusCircle size={14} className={`shrink-0 transition-colors ${activeView === 'scaffold-create' || activeView === 'scaffold-sf01' ? (isDarkMode ? 'text-cyan-300' : 'text-cyan-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'สร้าง Event & คำขอนั่งร้าน' : 'Create Event & Scaffold Job'}</span>
                  </div>
                  {(activeView === 'scaffold-create' || activeView === 'scaffold-sf01') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-cyan-400 shadow-xs shadow-cyan-400' : 'bg-cyan-600'}`} />
                  )}
                </button>

                {/* 2. Requests Lists */}
                <button
                  type="button"
                  onClick={() => handleItemClick('scaffold-list')}
                  className={getSubMenuItemClasses(activeView === 'scaffold-list' || activeView === 'scaffold-sf02' || activeView === 'scaffold-dashboard' || activeView === 'scaffold-tracking', 'cyan')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={`shrink-0 transition-colors ${activeView === 'scaffold-list' || activeView === 'scaffold-sf02' || activeView === 'scaffold-dashboard' || activeView === 'scaffold-tracking' ? (isDarkMode ? 'text-cyan-300' : 'text-cyan-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'รายการคำขอ (Requests Lists)' : 'Requests Lists'}</span>
                  </div>
                  {(activeView === 'scaffold-list' || activeView === 'scaffold-sf02' || activeView === 'scaffold-dashboard' || activeView === 'scaffold-tracking') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-cyan-400 shadow-xs shadow-cyan-400' : 'bg-cyan-600'}`} />
                  )}
                </button>

                {/* 3. Review Plan & Optimize */}
                <button
                  type="button"
                  onClick={() => handleItemClick('scaffold-optimize')}
                  className={getSubMenuItemClasses(activeView === 'scaffold-optimize', 'cyan')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className={`shrink-0 transition-colors ${activeView === 'scaffold-optimize' ? (isDarkMode ? 'text-cyan-300' : 'text-cyan-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ตรวจสอบและจัดสรรนั่งร้าน' : 'Review Plan & Optimize'}</span>
                  </div>
                  {activeView === 'scaffold-optimize' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-cyan-400 shadow-xs shadow-cyan-400' : 'bg-cyan-600'}`} />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* =========================================================================
              MODULE 3: TURNOVER S/D & T/A
             ========================================================================= */}
          <div className={`rounded-xl border overflow-hidden transition-all ${
            currentActiveModule === 'turnover'
              ? (isDarkMode ? 'border-emerald-500/60 bg-slate-900/80 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/20' : 'border-emerald-400 bg-white shadow-md shadow-emerald-100 ring-1 ring-emerald-200')
              : (isDarkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80')
          }`}>
            {/* Module Accordion Header Button */}
            <button 
              type="button"
              onClick={() => {
                if (isSlimCollapsed && isDesktopMode) {
                  setIsSlimCollapsed(false);
                  toggleModule('turnover');
                } else {
                  toggleModule('turnover');
                }
              }}
              className={`flex items-center justify-between w-full p-2.5 text-xs font-bold transition-all cursor-pointer ${
                currentActiveModule === 'turnover'
                  ? 'text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 shadow-md shadow-teal-600/25'
                  : isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title={isTh ? 'ส่งมอบระบบ (Turnover S/D & T/A)' : 'Turnover S/D & T/A'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardCheck size={16} className={currentActiveModule === 'turnover' ? 'text-white shrink-0' : (isDarkMode ? 'text-emerald-400 shrink-0' : 'text-emerald-600 shrink-0')} />
                {(!isSlimCollapsed || !isDesktopMode) && (
                  <span className="truncate">{isTh ? 'ส่งมอบระบบ (Turnover S/D & T/A)' : 'Turnover S/D & T/A'}</span>
                )}
              </div>

              {(!isSlimCollapsed || !isDesktopMode) && (
                expandedModules.turnover ? (
                  <ChevronDown size={14} className={currentActiveModule === 'turnover' ? 'text-white shrink-0' : (isDarkMode ? 'text-slate-300 shrink-0' : 'text-slate-500 shrink-0')} />
                ) : (
                  <ChevronRight size={14} className={currentActiveModule === 'turnover' ? 'text-white shrink-0' : 'text-slate-400 shrink-0'} />
                )
              )}
            </button>

            {/* Sub-menu Items */}
            {expandedModules.turnover && (!isSlimCollapsed || !isDesktopMode) && (
              <div className={`p-1.5 space-y-1 border-t ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-white'
              }`}>
                {/* Create Event & Job */}
                <button
                  type="button"
                  onClick={() => handleItemClick('job-location-create')}
                  className={getSubMenuItemClasses(activeView === 'job-location-create', 'emerald')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlusCircle size={14} className={`shrink-0 transition-colors ${activeView === 'job-location-create' ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'สร้าง Event & Job' : 'Create Event & Job'}</span>
                  </div>
                  {activeView === 'job-location-create' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-emerald-600'}`} />
                  )}
                </button>

                {/* Event & Job List */}
                <button
                  type="button"
                  onClick={() => handleItemClick('turnover-event-list')}
                  className={getSubMenuItemClasses(activeView === 'turnover-event-list' || activeView === 'job-location-events', 'emerald')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={`shrink-0 transition-colors ${activeView === 'turnover-event-list' || activeView === 'job-location-events' ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'รายการ Event & Job' : 'Event & Job List'}</span>
                  </div>
                  {(activeView === 'turnover-event-list' || activeView === 'job-location-events') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-emerald-600'}`} />
                  )}
                </button>

                {/* Turnover S/D & T/A */}
                <button
                  type="button"
                  onClick={() => handleItemClick('job-location-workspace')}
                  className={getSubMenuItemClasses(activeView === 'job-location-workspace' || activeView === 'job-location-turnover' || activeView === 'job-location', 'emerald')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Home size={14} className={`shrink-0 transition-colors ${activeView === 'job-location-workspace' || activeView === 'job-location-turnover' || activeView === 'job-location' ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : 'text-slate-400'}`} />
                    <span className="truncate">Turnover S/D & T/A</span>
                  </div>
                  {(activeView === 'job-location-workspace' || activeView === 'job-location-turnover' || activeView === 'job-location') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-emerald-600'}`} />
                  )}
                </button>

                {/* T/O Dashboard */}
                <button
                  type="button"
                  onClick={() => handleItemClick('job-location-dashboard-v2')}
                  className={getSubMenuItemClasses(activeView === 'job-location-dashboard-v2' || activeView === 'to-dashboard-v2' || activeView === 'job-location-dashboard' || activeView === 'to-dashboard', 'emerald')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 size={14} className={`shrink-0 transition-colors ${activeView === 'job-location-dashboard-v2' || activeView === 'to-dashboard-v2' || activeView === 'job-location-dashboard' || activeView === 'to-dashboard' ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : 'text-slate-400'}`} />
                    <span className="truncate">T/O Dashboard</span>
                  </div>
                  {(activeView === 'job-location-dashboard-v2' || activeView === 'to-dashboard-v2' || activeView === 'job-location-dashboard' || activeView === 'to-dashboard') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-emerald-600'}`} />
                  )}
                </button>

                {/* Plant & Roles Settings */}
                <button
                  type="button"
                  onClick={() => handleItemClick('job-location-settings')}
                  className={getSubMenuItemClasses(activeView === 'job-location-settings', 'emerald')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sliders size={14} className={`shrink-0 transition-colors ${activeView === 'job-location-settings' ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ตั้งค่าโรงงาน & สิทธิ์บทบาท' : 'Plant & Role Settings'}</span>
                  </div>
                  {activeView === 'job-location-settings' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-emerald-600'}`} />
                  )}
                </button>
              </div>
            )}
          </div>

        </nav>

        {/* ================= PINNED AT THE VERY BOTTOM: SETTING & CONFIG ================= */}
        <div className={`mt-auto border-t shrink-0 transition-colors ${
          isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/90'
        } ${
          isSlimCollapsed && isDesktopMode ? 'p-2' : 'p-2.5'
        }`}>
          <div className={`rounded-xl border overflow-hidden transition-all ${
            currentActiveModule === 'settings'
              ? (isDarkMode ? 'border-indigo-500/60 bg-slate-900/80 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/20' : 'border-indigo-400 bg-white shadow-md shadow-indigo-100 ring-1 ring-indigo-200')
              : (isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-white')
          }`}>
            {/* Module Accordion Header Button */}
            <button 
              type="button"
              onClick={() => {
                if (isSlimCollapsed && isDesktopMode) {
                  setIsSlimCollapsed(false);
                  toggleModule('settings');
                } else {
                  toggleModule('settings');
                }
              }}
              className={`flex items-center justify-between w-full p-2.5 text-xs font-bold transition-all cursor-pointer ${
                currentActiveModule === 'settings'
                  ? 'text-white bg-gradient-to-r from-indigo-600 to-slate-700 shadow-md shadow-indigo-600/25'
                  : isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title={isTh ? 'ตั้งค่าระบบ (Settings)' : 'Setting and Config'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings size={16} className={currentActiveModule === 'settings' ? 'text-white shrink-0' : (isDarkMode ? 'text-indigo-400 shrink-0' : 'text-indigo-600 shrink-0')} />
                {(!isSlimCollapsed || !isDesktopMode) && (
                  <span className="truncate">{isTh ? 'ตั้งค่าระบบ' : 'Settings & Config'}</span>
                )}
              </div>

              {(!isSlimCollapsed || !isDesktopMode) && (
                expandedModules.settings ? (
                  <ChevronDown size={14} className={currentActiveModule === 'settings' ? 'text-white shrink-0' : (isDarkMode ? 'text-slate-300 shrink-0' : 'text-slate-500 shrink-0')} />
                ) : (
                  <ChevronUp size={14} className={currentActiveModule === 'settings' ? 'text-white shrink-0' : 'text-slate-400 shrink-0'} />
                )
              )}
            </button>

            {/* Sub-menu Items */}
            {expandedModules.settings && (!isSlimCollapsed || !isDesktopMode) && (
              <div className={`p-1.5 space-y-1 border-t max-h-48 overflow-y-auto custom-scrollbar ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/70' : 'border-slate-200 bg-slate-50/70'
              }`}>
                <button
                  type="button"
                  onClick={() => handleItemClick('user-config')}
                  className={getSubMenuItemClasses(activeView === 'user-config', 'indigo')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users size={14} className={`shrink-0 transition-colors ${activeView === 'user-config' ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'การจัดการผู้ใช้งาน' : 'User Configuration'}</span>
                  </div>
                  {activeView === 'user-config' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400 shadow-xs shadow-indigo-400' : 'bg-indigo-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('master')}
                  className={getSubMenuItemClasses(activeView === 'master', 'indigo')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Map size={14} className={`shrink-0 transition-colors ${activeView === 'master' ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'แผนที่รวมโรงงาน (Master)' : 'Master Plot Plan'}</span>
                  </div>
                  {activeView === 'master' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400 shadow-xs shadow-indigo-400' : 'bg-indigo-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('functional-location')}
                  className={getSubMenuItemClasses(activeView === 'functional-location', 'indigo')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Network size={14} className={`shrink-0 transition-colors ${activeView === 'functional-location' ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'ผังโครงสร้างตำแหน่ง' : 'Functional Location'}</span>
                  </div>
                  {activeView === 'functional-location' && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400 shadow-xs shadow-indigo-400' : 'bg-indigo-600'}`} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('turnover-activity-log')}
                  className={getSubMenuItemClasses(activeView === 'turnover-activity-log' || activeView === 'system-activity-log', 'indigo')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity size={14} className={`shrink-0 transition-colors ${activeView === 'turnover-activity-log' || activeView === 'system-activity-log' ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-600') : 'text-slate-400'}`} />
                    <span className="truncate">{isTh ? 'บันทึกกิจกรรมระบบ' : 'System Activity Log'}</span>
                  </div>
                  {(activeView === 'turnover-activity-log' || activeView === 'system-activity-log') && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400 shadow-xs shadow-indigo-400' : 'bg-indigo-600'}`} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= FOOTER STATUS BAR ================= */}
        <div className={`border-t shrink-0 transition-colors ${
          isDarkMode ? 'border-slate-800/80 bg-[#0B1120]' : 'border-slate-200 bg-white'
        } ${
          isSlimCollapsed && isDesktopMode ? 'p-2 text-center' : 'px-3.5 py-2 flex items-center justify-between text-[10px]'
        }`}>
          {(!isSlimCollapsed || !isDesktopMode) ? (
            <>
              <span className="text-slate-500 font-mono uppercase">{isTh ? 'สถานะ' : 'Status'}:</span>
              <span className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-bold flex items-center gap-1.5 font-mono`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </span>
            </>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="System Online" />
          )}
        </div>
      </aside>
    </>
  );
}
