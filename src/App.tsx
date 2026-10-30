import { useState, useEffect, useMemo } from 'react';
import {
  Monitor, Tablet, Smartphone, RotateCw, Wifi,
  BatteryCharging, Maximize2, Sparkles, Sliders, Check
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RequestList from './components/RequestList';
import PlotPlan from './components/PlotPlan';
import MasterPlotPlan from './components/MasterPlotPlan';
import CreateJob from './components/CreateJob';
import CalendarView from './components/CalendarView';
import UserConfig from './components/UserConfig';
import ReviewPlanOptimize from './components/ReviewPlanOptimize';
import ReviewPlanOptimizeV2 from './components/ReviewPlanOptimizeV2';
import PlanningDashboard from './components/PlanningDashboard';
import InspectionCheckSheet from './components/InspectionCheckSheet';
import TurnoverCoordinator from './components/TurnoverCoordinator';
import FunctionalLocation from './components/FunctionalLocation';
import SystemActivityLog from './components/SystemActivityLog';
import JobLocationTurnoverPrototype from './components/JobLocationTurnoverPrototype';
import TurnoverDashboardV2 from './components/TurnoverDashboardV2';
import TurnoverEventJobList from './components/TurnoverEventJobList';
import { INITIAL_PLANNING_JOBS, INITIAL_EQUIPMENT_FLEET, PlanningJobItem } from './components/optimizerData';
import { getAllCraneJobs, updateCraneJob, subscribeToCraneOperations, extractDateString, UnifiedCraneJob, CraneJobStatus, subscribeToCraneNavigation } from './data/craneOperationsData';
import CraneMasterView from './components/CraneMasterView';
import { getOptimizerEquipmentFleet, subscribeToCraneMaster, updateCraneMaster } from './data/craneMasterData';
import { LanguageProvider } from './context/LanguageContext';
import { PlantTurnSharedProvider } from './context/PlantTurnSharedContext';

import FieldQrHubModal from './components/FieldQrHubModal';
import LoginPage from './components/LoginPage';
import HomePortal from './components/HomePortal';
import ScaffoldingSF01CreateJob from './components/scaffolding/ScaffoldingSF01CreateJob';
import ScaffoldingSF02RequestsList from './components/scaffolding/ScaffoldingSF02RequestsList';
import ScaffoldingReviewPlanOptimize from './components/scaffolding/ScaffoldingReviewPlanOptimize';
import { getAllScaffolding, subscribeToScaffoldingStore, ScaffoldingItem } from './data/scaffoldingData';
import { useThemeGate, setGlobalThemeGate } from './utils/themeGate';

function AppContent() {
  // User Authentication State (defaults to null so user lands on Login Page, persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bcp_enterprise_user');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const handleLogin = (userData: { email: string; name: string; role: string }) => {
    setCurrentUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bcp_enterprise_user', JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bcp_enterprise_user');
    }
  };

  const [activeView, setActiveView] = useState<string>('home');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tabletOrientation, setTabletOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [deviceScale, setDeviceScale] = useState<'fit' | '100%' | '85%'>('fit');
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  });

  const [isQrHubOpen, setIsQrHubOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useThemeGate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [checkSheetTab, setCheckSheetTab] = useState<string>('tab1');
  const [isCreateTurnoverOpen, setIsCreateTurnoverOpen] = useState<boolean>(false);
  const [selectedFunctionalLocationId, setSelectedFunctionalLocationId] = useState<string>('unit-aps1');
  const [selectedMasterMarkerNodeId, setSelectedMasterMarkerNodeId] = useState<string | null>(null);
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<'All' | 'Phra Khanong' | 'Sriracha'>('All');
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<'detail' | 'turnover'>('turnover');
  const [workspaceInitialTurnoverSubTab, setWorkspaceInitialTurnoverSubTab] = useState<'sign' | 'punchlist'>('sign');

  // Scaffolding Module Store Synchronization
  const [scaffoldingItems, setScaffoldingItems] = useState<ScaffoldingItem[]>(() => getAllScaffolding());
  const [scaffoldingSelectedId, setScaffoldingSelectedId] = useState<string | undefined>(undefined);
  const [scaffoldingStatusFilter, setScaffoldingStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsubScaffold = subscribeToScaffoldingStore((updated) => {
      setScaffoldingItems(updated);
    });
    return unsubScaffold;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportDims({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setGlobalThemeGate(isDarkMode);
  }, [isDarkMode]);

  // Helper to map custom crane jobs into PlanningJobItem format
  const mapCraneJobToPlanningJob = (c: UnifiedCraneJob): PlanningJobItem => {
    const rawStart = c.workStartDateTime || c.dateFrom || '2026-09-28 08:00';
    const [datePart, timePart] = rawStart.split(' ');
    const startTime = timePart || '08:00';
    const rawEnd = c.workEndDateTime;
    const endTime = rawEnd && rawEnd.includes(' ') ? rawEnd.split(' ')[1] : (() => {
      const [startH] = startTime.split(':').map(Number);
      const endH = Math.min(23, (startH || 8) + 4);
      return `${String(endH).padStart(2, '0')}:00`;
    })();
    const date = c.date || datePart || extractDateString(c.dateFrom) || '2026-09-28';

    return {
      id: String(c.id),
      jobNo: c.jobNo,
      plant: c.plant,
      area: c.locationArea || c.area || (c.plant === 'Sriracha' ? 'Sriracha Area' : 'Zone 1 - Main Yard'),
      description: c.description || 'Turnaround Crane Lifting Operation',
      type: c.type || `${c.craneType || 'Crane Spot'} (${c.capacityRequired || c.capacity || 50}T)${c.craneModel ? ` - ${c.craneModel}` : ''}`,
      date,
      startTime,
      endTime,
      status: c.status === 'Optimized' ? 'Optimized'
        : c.status === 'Assigned' ? 'Assigned'
          : c.status === 'Rejected' ? 'Rejected'
            : c.status === 'Revision Required' ? 'Revision Required'
              : 'Pending Review',
      contractor: c.contractor || 'BCP Operations (Owner Crane)',
      requester: c.submittedBy || c.requester || 'Turnaround Operations & Rigging Team',
      loadWeightTon: typeof c.totalWeightTon === 'number' ? c.totalWeightTon : Math.round((c.capacity || 50) * 0.7),
      requiredRadiusM: typeof c.workingRadiusM === 'number' ? c.workingRadiusM : Math.round((c.capacity || 50) * 0.2 + 10),
      elevationM: typeof c.boomLengthM === 'number' ? c.boomLengthM : Math.round((c.capacity || 50) * 0.25 + 15),
      assignedCraneId: c.assignedCraneId,
      assignedCraneName: c.assignedCraneName,
      rejectReason: c.rejectReason || c.remarks,
      revisionNote: (c as any).revisionNote,
      reviewedBy: c.reviewBy || c.reviewedBy,
      reviewedAt: (c as any).reviewedAt,
      priority: (c.priority as any) || (Number(c.capacityRequired || c.capacity) >= 100 ? 'Urgent' : 'High'),
      markingLocation: {
        x: typeof c.x === 'number' ? c.x : 45.0,
        y: typeof c.y === 'number' ? c.y : 50.0,
        label: c.equipmentTag || c.equipmentId || c.jobNo,
        zone: c.locationArea || c.area || (c.plant === 'Sriracha' ? 'Area 02 - Furnace' : 'Area 01 - CDU-1')
      },
      safetyClearancePassed: true,
      windLimitPassed: true,
      notes: c.additionalRemarks || c.remarks
    };
  };

  // Shared state for Equipment Optimizer & Planning Phase synchronized with Unified Crane Store
  const [planningJobs, setPlanningJobs] = useState<PlanningJobItem[]>(() => {
    const custom = getAllCraneJobs();
    const converted = custom.map(mapCraneJobToPlanningJob);
    const customIds = new Set(converted.map(j => j.id));
    const filteredInitial = INITIAL_PLANNING_JOBS.filter(j => !customIds.has(j.id));
    return [...converted, ...filteredInitial];
  });
  const [equipmentFleet, setEquipmentFleet] = useState(() => {
    return getOptimizerEquipmentFleet();
  });

  useEffect(() => {
    const unsubCraneMaster = subscribeToCraneMaster(() => {
      setEquipmentFleet(getOptimizerEquipmentFleet());
    });
    return unsubCraneMaster;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCraneOperations((updatedCustom) => {
      const converted = updatedCustom.map(mapCraneJobToPlanningJob);
      const customIds = new Set(converted.map(j => j.id));
      setPlanningJobs(prev => {
        const filteredPrev = prev.filter(p => !customIds.has(p.id));
        return [...converted, ...filteredPrev];
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubCraneNav = subscribeToCraneNavigation((nav) => {
      if (nav.view) {
        setActiveView(nav.view);
      }
    });
    return unsubCraneNav;
  }, []);

  const handleUpdatePlanningJob = (updatedJob: PlanningJobItem) => {
    const statusVal: CraneJobStatus =
      updatedJob.status === 'Optimized' ? 'Optimized' :
        updatedJob.status === 'Assigned' ? 'Assigned' :
          updatedJob.status === 'Rejected' ? 'Rejected' :
            updatedJob.status === 'Revision Required' ? 'Revision Required' :
              'Pending Review';

    updateCraneJob(updatedJob.id, {
      status: statusVal,
      assignedCraneId: updatedJob.assignedCraneId,
      assignedCraneName: updatedJob.assignedCraneName,
      rejectReason: updatedJob.rejectReason,
      revisionNote: updatedJob.revisionNote,
      reviewedBy: updatedJob.reviewedBy,
      reviewedAt: updatedJob.reviewedAt,
      remarks: updatedJob.rejectReason || updatedJob.revisionNote || updatedJob.notes,
      x: updatedJob.markingLocation?.x,
      y: updatedJob.markingLocation?.y
    });

    if (updatedJob.assignedCraneId) {
      updateCraneMaster(updatedJob.assignedCraneId, {
        fleetStatus: 'Assigned',
        assignedJobId: String(updatedJob.id),
        assignedJobNo: updatedJob.jobNo,
        assignedTimeSlot: `${updatedJob.date || '2026-09-28'} ${updatedJob.startTime || '08:00'} - ${updatedJob.endTime || '17:00'}`
      });
    }

    setPlanningJobs(prev => prev.map(j => (j.id === updatedJob.id ? updatedJob : j)));
  };

  const handleBatchUpdatePlanningJobs = (updatedJobs: PlanningJobItem[]) => {
    updatedJobs.forEach(updatedJob => {
      const statusVal: CraneJobStatus =
        updatedJob.status === 'Optimized' ? 'Optimized' :
          updatedJob.status === 'Assigned' ? 'Assigned' :
            updatedJob.status === 'Rejected' ? 'Rejected' :
              updatedJob.status === 'Revision Required' ? 'Revision Required' :
                'Pending Review';

      updateCraneJob(updatedJob.id, {
        status: statusVal,
        assignedCraneId: updatedJob.assignedCraneId,
        assignedCraneName: updatedJob.assignedCraneName,
        rejectReason: updatedJob.rejectReason,
        revisionNote: updatedJob.revisionNote,
        reviewedBy: updatedJob.reviewedBy,
        reviewedAt: updatedJob.reviewedAt,
        remarks: updatedJob.rejectReason || updatedJob.revisionNote || updatedJob.notes,
        x: updatedJob.markingLocation?.x,
        y: updatedJob.markingLocation?.y
      });

      if (updatedJob.assignedCraneId) {
        updateCraneMaster(updatedJob.assignedCraneId, {
          fleetStatus: 'Assigned',
          assignedJobId: String(updatedJob.id),
          assignedJobNo: updatedJob.jobNo,
          assignedTimeSlot: `${updatedJob.date || '2026-09-28'} ${updatedJob.startTime || '08:00'} - ${updatedJob.endTime || '17:00'}`
        });
      }
    });
    const map = new Map(updatedJobs.map(j => [j.id, j]));
    setPlanningJobs(prev => prev.map(j => map.get(j.id) || j));
  };

  // Real Hardware Viewport Dimensions
  const isMobile = deviceMode === 'mobile';
  const isTablet = deviceMode === 'tablet';

  const nativeWidth = isMobile ? 393 : (tabletOrientation === 'portrait' ? 820 : 1180);
  const nativeHeight = isMobile ? 852 : (tabletOrientation === 'portrait' ? 1180 : 820);
  const bezelThickness = isMobile ? 10 : 12;
  const chassisWidth = nativeWidth + (bezelThickness * 2);
  const chassisHeight = nativeHeight + (bezelThickness * 2);

  // Compute scale factor for responsive fit
  const computedScale = useMemo(() => {
    if (deviceScale === '100%') return 1;
    if (deviceScale === '85%') return 0.85;

    // Fit to available viewport
    const availableW = viewportDims.width - 40;
    const availableH = viewportDims.height - 90; // toolbar + padding
    const scaleX = availableW / chassisWidth;
    const scaleY = availableH / chassisHeight;
    return Math.min(1, Math.max(0.42, Math.min(scaleX, scaleY)));
  }, [deviceScale, viewportDims, chassisWidth, chassisHeight]);

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderAppMainContent = () => (
    <div className={`flex flex-1 overflow-hidden relative w-full h-full min-w-0 device-frame-${deviceMode}`}>
      <Sidebar
        activeView={activeView}
        setActiveView={(view: string) => {
          setActiveView(view);
          setIsMobileSidebarOpen(false);
        }}
        isOpen={isMobileSidebarOpen}
        setIsOpen={setIsMobileSidebarOpen}
        deviceMode={deviceMode}
        isDarkMode={isDarkMode}
        onOpenCreateTurnover={() => {
          setActiveView('job-location-turnover');
          setIsCreateTurnoverOpen(true);
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden relative min-w-0 w-full h-full">
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          onOpenQrHub={() => setIsQrHubOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          selectedPlantFilter={selectedPlantFilter}
          onPlantFilterChange={setSelectedPlantFilter}
        />
        <main className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 ${deviceMode === 'mobile' ? 'p-2.5 sm:p-3' : deviceMode === 'tablet' ? 'p-3.5 sm:p-4' : 'p-4 sm:p-6'
          }`}>
          {activeView === 'home' && (
            <HomePortal 
              onNavigate={(view) => setActiveView(view)} 
              globalPlantFilter={selectedPlantFilter}
            />
          )}
          {/* =========================================================================
              SCAFFOLDING MODULE (2 Pages: SF01 Create Job & SF02 Requests Lists)
             ========================================================================= */}
          {(activeView === 'scaffold-create' || activeView === 'scaffold-sf01') && (
            <ScaffoldingSF01CreateJob
              onNavigateToList={() => setActiveView('scaffold-list')}
            />
          )}
          {(activeView === 'scaffold-list' || activeView === 'scaffold-sf02' || activeView === 'scaffold-dashboard' || activeView === 'scaffold-tracking' || activeView === 'scaffold-job-list' || activeView === 'scaffold-calendar' || activeView === 'scaffold-plan' || activeView === 'scaffold-planning-dashboard' || activeView === 'scaffold-master') && (
            <ScaffoldingSF02RequestsList
              onNavigateToCreate={() => setActiveView('scaffold-create')}
              globalPlantFilter={selectedPlantFilter}
              initialViewMode={activeView === 'scaffold-calendar' ? 'calendar' : activeView === 'scaffold-plan' ? 'plot-plan' : 'table'}
            />
          )}
          {activeView === 'scaffold-optimize' && (
            <ScaffoldingReviewPlanOptimize
              globalPlantFilter={selectedPlantFilter}
              onNavigateToList={() => setActiveView('scaffold-list')}
              onNavigateToCreate={() => setActiveView('scaffold-create')}
            />
          )}

          {/* =========================================================================
              CRANE JOB MODULE
             ========================================================================= */}
          {activeView === 'create' && (
            <CreateJob
              setActiveView={setActiveView}
              onNavigateToRequests={() => setActiveView('job-list')}
            />
          )}
          {activeView === 'crane-master' && (
            <CraneMasterView 
              setActiveView={setActiveView} 
              globalPlantFilter={selectedPlantFilter} 
            />
          )}
          {(activeView === 'list' || activeView === 'job-list') && (
            <RequestList
              setActiveView={setActiveView}
              globalPlantFilter={selectedPlantFilter}
            />
          )}
          {activeView === 'calendar' && (
            <CalendarView
              setActiveView={setActiveView}
              globalPlantFilter={selectedPlantFilter}
            />
          )}
          {activeView === 'plan' && (
            <PlotPlan
              setActiveView={setActiveView}
            />
          )}
          {activeView === 'master' && (
            <MasterPlotPlan
              initialSelectedNodeId={selectedMasterMarkerNodeId}
              onNavigateToFunctionalLocation={(nodeId) => {
                if (nodeId) setSelectedFunctionalLocationId(nodeId);
                setActiveView('functional-location');
              }}
            />
          )}
          {(activeView === 'user-config' || activeView === 'job-location-settings') && (
            <UserConfig
              globalPlantFilter={selectedPlantFilter}
              onPlantFilterChange={setSelectedPlantFilter}
              onNavigateToFunctionalLocation={() => setActiveView('functional-location')}
              onNavigateToMasterPlotPlan={() => setActiveView('master')}
              initialTab={activeView === 'job-location-settings' ? 'plant-role-settings' : 'users'}
            />
          )}
          {(activeView === 'job-location-turnover' || activeView === 'job-location' || activeView === 'job-location-workspace' || activeView === 'job-location-create' || activeView === 'job-location-dashboard' || activeView === 'to-dashboard' || activeView === 'executive-dashboard' || activeView === 'executive-critical-path' || activeView === 'executive-unit-funnel') && (
            <JobLocationTurnoverPrototype
              key={activeView === 'job-location-create' ? 'create' : 'turnover-other'}
              initialMainView={
                activeView === 'job-location-create'
                  ? 'create'
                  : activeView === 'job-location-workspace' || activeView === 'job-location-turnover' || activeView === 'job-location'
                    ? 'workspace'
                    : 'dashboard'
              }
              initialDashboardSubTab={
                activeView === 'executive-critical-path'
                  ? 'critical-path'
                  : activeView === 'executive-unit-funnel'
                    ? 'unit-funnel'
                    : 'overview'
              }
              initialWorkspaceTab={workspaceInitialTab}
              initialTurnoverSubTab={workspaceInitialTurnoverSubTab}
              globalPlantFilter={selectedPlantFilter}
              onGlobalPlantFilterChange={setSelectedPlantFilter}
              onNavigateToFunctionalLocation={(nodeId) => {
                if (nodeId) setSelectedFunctionalLocationId(nodeId);
                setActiveView('functional-location');
              }}
              onNavigateToMasterPlotPlan={(nodeId) => {
                if (nodeId) setSelectedMasterMarkerNodeId(nodeId);
                setActiveView('master');
              }}
              onNavigateToWorkspace={() => {
                setWorkspaceInitialTab('turnover');
                setWorkspaceInitialTurnoverSubTab('sign');
                setActiveView('job-location-workspace');
              }}
            />
          )}
          {(activeView === 'job-location-dashboard-v2' || activeView === 'to-dashboard-v2' || activeView === 'turnover-cp-closing') && (
            <TurnoverDashboardV2
              globalPlantFilter={selectedPlantFilter}
              initialDashboardTab={activeView === 'turnover-cp-closing' ? 'cp-closing' : 'handover'}
              onBackToV1={() => setActiveView('job-location-dashboard')}
              onNavigateToWorkspace={(jobId, tab, subTab) => {
                if (tab) setWorkspaceInitialTab(tab);
                if (subTab) setWorkspaceInitialTurnoverSubTab(subTab);
                setActiveView('job-location-workspace');
              }}
            />
          )}
          {(activeView === 'turnover-event-list' || activeView === 'job-location-events') && (
            <TurnoverEventJobList
              setActiveView={setActiveView}
              globalPlantFilter={selectedPlantFilter}
              onNavigateToCreate={() => setActiveView('job-location-create')}
              onNavigateToWorkspace={(jobId) => {
                setWorkspaceInitialTab('turnover');
                setWorkspaceInitialTurnoverSubTab('sign');
                setActiveView('job-location-workspace');
              }}
            />
          )}
          {activeView === 'turnover-coordinator' && (
            <TurnoverCoordinator
              isCreateSheetOpenProp={isCreateTurnoverOpen}
              onOpenCreateSheet={() => setIsCreateTurnoverOpen(true)}
              onCloseCreateSheet={() => setIsCreateTurnoverOpen(false)}
              onOpenCheckSheetTab={(tab) => {
                setCheckSheetTab(tab);
                setActiveView('turnover-inspection');
              }}
              onOpenActivityLog={() => setActiveView('turnover-activity-log')}
            />
          )}
          {activeView === 'turnover-inspection' && (
            <InspectionCheckSheet
              defaultTab={checkSheetTab}
              onNavigateHome={() => setActiveView('calendar')}
            />
          )}
          {activeView === 'functional-location' && (
            <FunctionalLocation
              initialSelectedNodeId={selectedFunctionalLocationId}
              onOpenActivityLog={() => setActiveView('turnover-activity-log')}
              onNavigateToMasterPlotPlan={(nodeId) => {
                if (nodeId) setSelectedMasterMarkerNodeId(nodeId);
                setActiveView('master');
              }}
            />
          )}
          {activeView === 'turnover-activity-log' && (
            <SystemActivityLog
              onNavigateToCoordinator={() => setActiveView('job-location-turnover')}
              onNavigateToFunctionalLocation={() => setActiveView('functional-location')}
            />
          )}
          {(activeView === 'optimize' || activeView === 'crane-cost-dashboard') && (
            <ReviewPlanOptimize
              globalPlantFilter={selectedPlantFilter}
              jobs={planningJobs}
              equipment={equipmentFleet}
              onUpdateJob={handleUpdatePlanningJob}
              onBatchUpdateJobs={handleBatchUpdatePlanningJobs}
              onSelectMarkingLocation={() => setActiveView('planning-dashboard')}
              onNavigateToDashboard={() => setActiveView('planning-dashboard')}
              isScaffolding={false}
              defaultMode={activeView === 'crane-cost-dashboard' ? 'cost-saving' : 'engineering'}
            />
          )}
          {activeView === 'optimize-v2' && (
            <ReviewPlanOptimizeV2
              onBackToV1={() => setActiveView('optimize')}
            />
          )}
          {(activeView === 'planning-dashboard' || activeView === 'scaffold-planning-dashboard') && (
            <PlanningDashboard
              jobs={planningJobs}
              equipment={equipmentFleet}
              onSelectJobForReview={() => setActiveView(activeView.startsWith('scaffold-') ? 'scaffold-optimize' : 'optimize')}
              onNavigateToOptimize={() => setActiveView(activeView.startsWith('scaffold-') ? 'scaffold-optimize' : 'optimize')}
              onNavigateToExecutiveView={(view) => setActiveView(view)}
              isScaffolding={activeView.startsWith('scaffold-')}
              globalPlantFilter={selectedPlantFilter}
            />
          )}
        </main>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col font-sans overflow-hidden h-screen w-full transition-colors duration-300 relative ${deviceMode !== 'desktop'
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-2 sm:p-3'
        : isDarkMode ? 'dark bg-slate-950' : 'bg-slate-100'
      }`}>

      {/* =========================================================================
          DEDICATED TOP TOOLBAR FOR DEVICE MODE PREVIEW
         ========================================================================= */}
      {deviceMode !== 'desktop' && (
        <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 shrink-0 z-[100] max-w-6xl mx-auto gap-2">

          {/* Left: Device Spec Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono hidden md:inline">
              Preview:
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-mono font-bold border border-blue-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>{isMobile ? 'iPhone 15/16 Pro' : 'iPad Pro 11"'}</span>
              <span className="opacity-75">({nativeWidth}×{nativeHeight})</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Scale: {Math.round(computedScale * 100)}%
            </span>
          </div>

          {/* Right: Controls & Orientation Switcher */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">

            {/* Tablet Orientation Rotate Button */}
            {isTablet && (
              <button
                type="button"
                onClick={() => setTabletOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
                className="h-7.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Rotate Orientation (Portrait / Landscape)"
              >
                <RotateCw size={12} className="animate-spin" style={{ animationDuration: '8s' }} />
                <span className="text-[11px]">{tabletOrientation === 'portrait' ? 'แนวนอน' : 'แนวตั้ง'}</span>
              </button>
            )}

            {/* Scale Presets */}
            <div className="hidden sm:inline-flex items-center bg-slate-900/90 text-white p-0.5 rounded-xl border border-slate-700/80 shadow-md text-xs font-mono">
              <button
                type="button"
                onClick={() => setDeviceScale('fit')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${deviceScale === 'fit' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                title="Fit to Screen"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setDeviceScale('85%')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${deviceScale === '85%' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                title="85% Scale"
              >
                85%
              </button>
              <button
                type="button"
                onClick={() => setDeviceScale('100%')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${deviceScale === '100%' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                title="100% Actual Pixel Size"
              >
                100%
              </button>
            </div>

            {/* Device Switcher Pills */}
            <div className="inline-flex items-center bg-slate-900/90 text-white backdrop-blur-md p-0.5 rounded-xl border border-slate-700/80 shadow-lg gap-0.5">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Monitor size={12} />
                <span className="hidden sm:inline text-[11px]">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('tablet')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${deviceMode === 'tablet' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
              >
                <Tablet size={12} />
                <span className="hidden sm:inline text-[11px]">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${deviceMode === 'mobile' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
              >
                <Smartphone size={12} />
                <span className="hidden sm:inline text-[11px]">Mobile</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          DEVICE FRAME / VIEWPORT RENDERING WRAPPER
         ========================================================================= */}
      {deviceMode === 'desktop' ? (
        // Desktop Full Width Standard
        <div className="flex-1 flex overflow-hidden relative w-full h-full min-w-0">
          {renderAppMainContent()}
        </div>
      ) : (
        // Scaled Hardware Mockup Chassis (Mobile & Tablet)
        <div className="flex-1 flex items-center justify-center min-h-0 w-full overflow-hidden select-none">
          <div
            style={{
              width: `${chassisWidth * computedScale}px`,
              height: `${chassisHeight * computedScale}px`,
              transition: 'width 0.25s ease, height 0.25s ease'
            }}
            className="relative flex items-center justify-center"
          >
            {/* The Physical Device Body with Metallic Bezel */}
            <div
              style={{
                width: `${chassisWidth}px`,
                height: `${chassisHeight}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease, width 0.25s ease, height 0.25s ease'
              }}
              className={`relative flex items-center justify-center transition-all ${isMobile
                  ? 'rounded-[54px] bg-[#1a202c] border-[10px] border-slate-900 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/15'
                  : 'rounded-[38px] bg-[#1a202c] border-[12px] border-slate-900 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/15'
                }`}
            >

              {/* Physical External Buttons for Mobile (iPhone) */}
              {isMobile && (
                <>
                  {/* Left Side: Action Button */}
                  <div className="absolute -left-3.5 top-28 w-1 h-7 bg-slate-700 rounded-l-md shadow-xs" />
                  {/* Left Side: Volume Up */}
                  <div className="absolute -left-3.5 top-40 w-1 h-12 bg-slate-700 rounded-l-md shadow-xs" />
                  {/* Left Side: Volume Down */}
                  <div className="absolute -left-3.5 top-56 w-1 h-12 bg-slate-700 rounded-l-md shadow-xs" />
                  {/* Right Side: Power Button */}
                  <div className="absolute -right-3.5 top-44 w-1 h-18 bg-slate-700 rounded-r-md shadow-xs" />
                </>
              )}

              {/* Physical External Buttons for Tablet (iPad) */}
              {isTablet && (
                <>
                  <div className="absolute top-0 right-16 -translate-y-3.5 w-14 h-1 bg-slate-700 rounded-t-md" />
                  <div className="absolute -right-3.5 top-20 w-1 h-10 bg-slate-700 rounded-r-md" />
                  <div className="absolute -right-3.5 top-34 w-1 h-10 bg-slate-700 rounded-r-md" />
                </>
              )}

              {/* Inner Active Display Canvas (Exact Pixel Ratio) */}
              <div
                style={{ width: `${nativeWidth}px`, height: `${nativeHeight}px` }}
                className={`overflow-hidden flex flex-col relative bg-white dark:bg-slate-950 transition-colors duration-300 ${isMobile ? 'rounded-[44px]' : 'rounded-[26px]'
                  }`}
              >

                {/* 1. Mobile iOS Top Notch & Dynamic Island Status Bar */}
                {isMobile && (
                  <div className="h-11 bg-slate-900 text-white px-6 flex items-center justify-between text-xs font-semibold shrink-0 select-none z-40 relative">
                    {/* Time */}
                    <span className="font-bold text-[13px] tracking-tight">09:41</span>

                    {/* True Realistic Dynamic Island */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[124px] h-[34px] bg-black rounded-full flex items-center justify-between px-3 shadow-md ring-1 ring-white/10">
                      {/* TrueDepth Front Camera Lens reflection */}
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-950/60" />
                      </div>
                      {/* Microphone Sensor */}
                      <span className="w-2 h-2 rounded-full bg-slate-900" />
                    </div>

                    {/* Status Icons: 5G, Wi-Fi, Battery */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-200">
                      <span className="text-[10px] font-mono font-bold">5G</span>
                      <Wifi size={13} className="text-white" />
                      <div className="w-5 h-2.5 border border-white/80 rounded-xs flex p-0.5 items-center">
                        <div className="bg-emerald-400 w-full h-full rounded-2xs" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Tablet iPadOS Top Camera & Status Bar */}
                {isTablet && (
                  <div className="h-8 bg-slate-900 text-white px-5 flex items-center justify-between text-[11px] font-semibold shrink-0 select-none z-40 relative border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">14:02 Wed, Oct 16</span>
                    </div>

                    {/* Center Stage Front Camera in Bezel */}
                    <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-700/80 shadow-inner" />

                    <div className="flex items-center gap-2 text-slate-300">
                      <Wifi size={13} />
                      <span className="font-mono text-[10px]">100%</span>
                      <BatteryCharging size={14} className="text-emerald-400" />
                    </div>
                  </div>
                )}

                {/* Actual Application Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 w-full">
                  {renderAppMainContent()}
                </div>

                {/* 3. Bottom iOS / iPadOS Home Indicator Bar */}
                <div className="h-5 bg-white dark:bg-slate-950 flex items-center justify-center shrink-0 z-40 transition-colors">
                  <div className={`${isMobile ? 'w-36 h-1' : 'w-48 h-1.5'} bg-slate-400/60 dark:bg-white/40 rounded-full`} />
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field QR Hub Modal */}
      <FieldQrHubModal
        isOpen={isQrHubOpen}
        onClose={() => setIsQrHubOpen(false)}
        onNavigateToJob={(jobId) => {
          setActiveView('job-location-workspace');
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PlantTurnSharedProvider>
        <AppContent />
      </PlantTurnSharedProvider>
    </LanguageProvider>
  );
}
