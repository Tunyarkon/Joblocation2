import { 
  Bell, Search, Settings, Moon, Sun, ChevronDown,
  Menu, QrCode, LogOut, User, Building2, Check
} from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Header({ 
  activeView, 
  setActiveView, 
  isDarkMode, 
  setIsDarkMode, 
  isMobileSidebarOpen, 
  setIsMobileSidebarOpen,
  deviceMode = 'desktop',
  setDeviceMode,
  onOpenQrHub,
  currentUser,
  onLogout,
  selectedPlantFilter = 'All',
  onPlantFilterChange
}: any) {
  const { language, setLanguage } = useLanguage();
  const isTh = language === 'th';
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);

  const getBreadcrumbModule = () => {
    if (activeView === 'home') {
      return isTh ? 'หน้าหลัก (Home)' : 'Home Portal';
    }
    if (activeView === 'executive-dashboard' || activeView === 'job-location-dashboard' || activeView === 'executive-critical-path' || activeView === 'executive-unit-funnel' || activeView === 'planning-dashboard' || activeView === 'scaffold-planning-dashboard') {
      return isTh ? 'ผู้บริหารระดับสูง (Executive)' : 'Executive Suite';
    }
    if (activeView === 'user-config' || activeView === 'job-location-settings' || activeView === 'functional-location' || activeView === 'master' || activeView === 'turnover-activity-log' || activeView === 'system-activity-log') {
      return isTh ? 'ตั้งค่าระบบ (Settings)' : 'Setting and Config';
    }
    if (activeView.startsWith('turnover-') || activeView.startsWith('job-location')) {
      return isTh ? 'ส่งมอบระบบ (Turnover S/D & T/A)' : 'Turnover S/D & T/A';
    }
    if (activeView.startsWith('scaffold-')) {
      return isTh ? 'ระบบจัดการนั่งร้าน' : 'Scaffolding Management';
    }
    if (['list', 'optimize', 'crane-cost-dashboard', 'crane-master', 'plan', 'create', 'calendar', 'job-list'].includes(activeView)) {
      return isTh ? 'งานเครน (Crane Job)' : 'Crane Job';
    }
    return isTh ? 'ส่งมอบระบบ (Turnover S/D & T/A)' : 'Turnover S/D & T/A';
  };

  const getBreadcrumbPage = () => {
    if (activeView === 'home') return isTh ? 'เลือกเมนูการทำงานหลัก (Please Choose Function)' : 'Please Choose Function';
    if (activeView === 'executive-critical-path') return isTh ? 'เส้นทางวิกฤต & Punch List' : 'Critical Path & Punch List';
    if (activeView === 'executive-unit-funnel') return isTh ? 'ความพร้อมแยกตามหน่วยผลิต' : 'Unit Readiness Funnel';
    if (activeView === 'job-location-dashboard' || activeView === 'to-dashboard' || activeView === 'job-location-dashboard-v2' || activeView === 'to-dashboard-v2') return 'T/O Dashboard';
    if (activeView === 'turnover-cp-closing') return 'CP Closing Dashboard';
    if (activeView === 'executive-dashboard') return isTh ? 'ภาพรวมการส่งมอบระบบ (Turnover Overview)' : 'Turnover Overview';
    if (activeView === 'planning-dashboard') return isTh ? 'วางแผนเครื่องจักร & ผังมาร์คกิ้ง' : 'Equipment Planning & Marking';
    if (activeView === 'scaffold-dashboard') return isTh ? 'แดชบอร์ดภาพรวมนั่งร้าน' : 'Scaffolding Dashboard';
    if (activeView === 'scaffold-tracking') return isTh ? 'จัดการและติดตามนั่งร้าน' : 'Scaffolding Tracking';
    if (activeView === 'scaffold-planning-dashboard') return isTh ? 'วางแผนงานนั่งร้าน' : 'Scaffolding Planning';
    if (activeView === 'job-location-workspace' || activeView === 'job-location-turnover' || activeView === 'job-location') return 'Turnover S/D & T/A';
    if (activeView === 'job-location-create') return isTh ? 'สร้าง Event & Job' : 'Create Event & Job';
    if (activeView === 'turnover-event-list' || activeView === 'job-location-events') return isTh ? 'รายการ Event & Job' : 'Event & Job List';
    if (activeView === 'job-location-settings') return isTh ? 'ตั้งค่าโรงงาน & สิทธิ์บทบาท' : 'Plant & Role Settings';
    if (activeView === 'turnover-activity-log' || activeView === 'system-activity-log') return isTh ? 'บันทึกกิจกรรมระบบ (System Activity Log)' : 'System Activity Log';
    if (activeView === 'functional-location') return isTh ? 'ผังโครงสร้างตำแหน่ง (Functional Location)' : 'Functional Location';
    if (activeView === 'turnover-coordinator') return isTh ? 'ประสานงานส่งมอบระบบ' : 'Turnover Coordinator';
    if (activeView === 'turnover-inspection') return isTh ? 'ตรวจรับรองและอนุมัติงาน' : 'Field Inspection & Sign';
    if (activeView === 'list' || activeView === 'scaffold-list') return isTh ? 'ทะเบียนงานเครน' : 'Job List';
    if (activeView === 'crane-master') return isTh ? 'ทะเบียนเครน (Crane Master)' : 'Crane Master / Fleet';
    if (activeView === 'crane-cost-dashboard') return isTh ? 'แดชบอร์ดวิเคราะห์ลดต้นทุนเครน (Optimize & Cost Saving)' : 'Optimize & Cost Saving Dashboard';
    if (activeView === 'optimize' || activeView === 'scaffold-optimize') return isTh ? 'ตรวจสอบและจัดสรรเครื่องจักร' : 'Review Plan & Optimize';
    if (activeView === 'planning-dashboard' || activeView === 'scaffold-planning-dashboard') return isTh ? 'แดชบอร์ดการวางแผนและมาร์กจุด' : 'Planning Dashboard & Marking';
    if (activeView === 'plan' || activeView === 'scaffold-plan') return isTh ? 'แผนผังพื้นที่ปฏิบัติการ (Plot Plan)' : 'Plot Plan View';
    if (activeView === 'master' || activeView === 'scaffold-master') return isTh ? 'แผนที่รวมโรงงาน (Master Plot Plan)' : 'Master Plot Plan';
    if (activeView === 'create' || activeView === 'scaffold-create') return isTh ? 'สร้างคำขอใช้งานใหม่' : 'Create Job';
    if (activeView === 'calendar' || activeView === 'scaffold-calendar') return isTh ? 'ตารางปฏิทินงาน' : 'Calendar View';
    if (activeView === 'job-list' || activeView === 'scaffold-job-list') return isTh ? 'ทะเบียนงานปฏิบัติการ' : 'Job List';
    if (activeView === 'user-config') return isTh ? 'การจัดการผู้ใช้งานและสิทธิ์' : 'User Configuration';
    return isTh ? 'หน้าหลัก' : 'Home';
  };

  return (
    <header className="h-[56px] sm:h-[64px] bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-3 sm:px-6 shrink-0 z-[20] w-full transition-colors duration-300 shadow-2xs">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className={`${deviceMode === 'desktop' ? 'md:hidden' : 'flex'} p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer shrink-0 transition-colors`}
          title={isTh ? "เปิดเมนู" : "Open Menu"}
        >
          <Menu size={20} />
        </button>
        {deviceMode === 'mobile' && (
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
            {getBreadcrumbPage()}
          </span>
        )}
        <div className={`${deviceMode === 'mobile' ? 'hidden' : 'hidden sm:flex'} items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500 truncate`}>
          <span className="hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors">{isTh ? 'หน้าหลัก' : 'Home'}</span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors">
            {getBreadcrumbModule()}
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-900 dark:text-white font-bold tracking-tight">
            {getBreadcrumbPage()}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Plant Filter Dropdown (Top Bar) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPlantDropdown(!showPlantDropdown)}
            className="h-8.5 flex items-center gap-1.5 sm:gap-2 px-2.5 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
            title={isTh ? "เลือกโรงงานสำหรับดู/กรองข้อมูล" : "Filter data by plant location"}
          >
            <Building2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="hidden xl:inline text-slate-400 font-medium">{isTh ? 'โรงงาน:' : 'Plant:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px] sm:max-w-[140px]">
                {selectedPlantFilter === 'Phra Khanong'
                  ? (isTh ? 'พระโขนง (PK)' : 'Phra Khanong (PK)')
                  : selectedPlantFilter === 'Sriracha'
                  ? (isTh ? 'ศรีราชา (SR)' : 'Si Racha (SR)')
                  : (isTh ? 'ทุกโรงงาน (All)' : 'All Plants')}
              </span>
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showPlantDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showPlantDropdown && (
            <>
              <div 
                className="fixed inset-0 z-[60]" 
                onClick={() => setShowPlantDropdown(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-[240px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>{isTh ? 'เลือกโรงงานเพื่อดูข้อมูล' : 'Select Plant Filter'}</span>
                  <span className="font-mono text-[9px] bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-bold">
                    Refineries
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onPlantFilterChange) onPlantFilterChange('All');
                    setShowPlantDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPlantFilter === 'All'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedPlantFilter === 'All' ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span>{isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants'}</span>
                  </div>
                  {selectedPlantFilter === 'All' && <Check size={14} className="text-teal-600 dark:text-teal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onPlantFilterChange) onPlantFilterChange('Phra Khanong');
                    setShowPlantDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPlantFilter === 'Phra Khanong'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedPlantFilter === 'Phra Khanong' ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span>{isTh ? 'พระโขนง (Phra Khanong - PK)' : 'Phra Khanong (PK)'}</span>
                  </div>
                  {selectedPlantFilter === 'Phra Khanong' && <Check size={14} className="text-teal-600 dark:text-teal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onPlantFilterChange) onPlantFilterChange('Sriracha');
                    setShowPlantDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPlantFilter === 'Sriracha'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedPlantFilter === 'Sriracha' ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span>{isTh ? 'ศรีราชา (Si Racha - SR)' : 'Si Racha (SR)'}</span>
                  </div>
                  {selectedPlantFilter === 'Sriracha' && <Check size={14} className="text-teal-600 dark:text-teal-400" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* QR Field Hub Button */}
        <button
          type="button"
          onClick={onOpenQrHub}
          className="h-8.5 flex items-center gap-1.5 px-2.5 rounded-lg border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 text-xs font-semibold transition-all cursor-pointer active:scale-95"
          title={isTh ? "สแกน & สร้าง QR Pass หน้างาน" : "Field QR Scanner & Pass Generator"}
        >
          <QrCode size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline text-[11px]">QR Hub</span>
        </button>

        {/* Language Switcher TH / EN (Clean Segmented Pill) */}
        <div className="inline-flex items-center h-8.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
          <button
            onClick={() => setLanguage('en')}
            className={`h-7 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="English"
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('th')}
            className={`h-7 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              language === 'th'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="ภาษาไทย (Thai)"
          >
            TH
          </button>
        </div>

        {/* Theme Mode Switcher (Clean Icon Button) */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="h-8.5 w-8.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-700/70 text-slate-600 dark:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
          title={isDarkMode ? (isTh ? "เปลี่ยนเป็นโหมดสว่าง" : "Switch to Light Mode") : (isTh ? "เปลี่ยนเป็นโหมดมืด" : "Switch to Dark Mode")}
          aria-label="Toggle Dark and Light Mode"
        >
          {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification Bell */}
        <div className={`relative ${deviceMode === 'mobile' ? 'hidden' : 'block'}`}>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
          <button 
            type="button"
            className="h-8.5 w-8.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-700/70 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
            title="Notifications"
          >
            <Bell size={15} />
          </button>
        </div>

        <div className={`h-6 w-[1px] bg-slate-200 dark:bg-slate-800 ${deviceMode === 'mobile' ? 'hidden' : 'hidden sm:block'}`}></div>
        <div className={`text-right ${deviceMode === 'mobile' ? 'hidden' : 'hidden sm:block'}`}>
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 font-mono">v2.4.12</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500">{isTh ? 'ซิงค์ 14:02' : 'Sync 14:02'}</p>
        </div>

        {/* User Profile & Sign Out */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white dark:ring-slate-800 shrink-0">
              {currentUser.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">{currentUser.role}</p>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title={isTh ? "ออกจากระบบกลับหน้า Login" : "Sign Out to Login Page"}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
