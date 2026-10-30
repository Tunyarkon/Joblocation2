import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Search, MapPin, AlertCircle, CheckCircle2, Clock, 
  ChevronLeft, ChevronRight, Eye, X, FileText, User, Plus, Download, 
  Sparkles, ShieldCheck, Tag, AlertTriangle, Filter, Check, ArrowRight, 
  Building2, Flame, Layers, ListChecks, ExternalLink, Zap, AlertOctagon,
  RefreshCw, Briefcase, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Table as TableIcon, LayoutList, PenTool, CheckSquare, Printer, Share2, 
  UploadCloud, Copy, Edit3, Trash2, FolderTree, Network, CornerDownRight,
  GitBranch, Maximize2, Minimize2, Activity, Hash
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  usePlantTurnShared, 
  JobRecord, 
  PunchItem, 
  SignatureRecord 
} from '../context/PlantTurnSharedContext';
import BulkTurnoverJobIngestion from './bulk/BulkTurnoverJobIngestion';
import { getStoredFlocData, FunctionalLocation as FlocItem } from '../data/flocMasterData';

interface TurnoverEventJobListProps {
  setActiveView?: (view: string) => void;
  globalPlantFilter?: 'All' | 'Phra Khanong' | 'Sriracha';
  onNavigateToCreate?: () => void;
  onNavigateToWorkspace?: (jobId: string) => void;
}

export default function TurnoverEventJobList({
  setActiveView,
  globalPlantFilter = 'All',
  onNavigateToCreate,
  onNavigateToWorkspace
}: TurnoverEventJobListProps) {
  const { isTh } = useLanguage();
  const { 
    jobs, 
    events,
    setSelectedJobId, 
    isJobCompleted, 
    isJobTurnoverBlocked, 
    createJob, 
    checkJobIdExists, 
    batchCreateJobs 
  } = usePlantTurnShared();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterUnit, setFilterUnit] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDiscipline, setFilterDiscipline] = useState('All');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [activeGateTab, setActiveGateTab] = useState<'All' | 'Gate1' | 'Gate2' | 'Gate3' | 'Gate4' | 'Critical'>('All');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table' | 'cards'>('hierarchy');

  // Functional Location (FLOC) Hierarchy View States
  const [hierarchyGroupMode, setHierarchyGroupMode] = useState<'floc-tree' | 'unit-event' | 'floc-rollup'>('floc-tree');
  const [flocHealthFilter, setFlocHealthFilter] = useState<'All' | 'HandedOver' | 'SignOff' | 'PunchHold' | 'BlockedCatA' | 'Critical'>('All');
  const [includeEmptyMasterFlocs, setIncludeEmptyMasterFlocs] = useState<boolean>(false);
  const [expandedFlocIds, setExpandedFlocIds] = useState<Set<string>>(() => new Set([
    'plant-Phra Khanong',
    'plant-Sriracha'
  ]));
  const [expandedRollupRowIds, setExpandedRollupRowIds] = useState<Set<string>>(() => new Set());
  const [masterFlocList] = useState<FlocItem[]>(() => getStoredFlocData());

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // POPUP MODAL STATES
  // =========================================================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'single' | 'bulk'>('single');

  const [detailsModalJob, setDetailsModalJob] = useState<JobRecord | null>(null);
  const [detailsModalTab, setDetailsModalTab] = useState<'general' | 'signatures' | 'punches' | 'attachments'>('general');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Single Job Creation Form State
  const [newJobId, setNewJobId] = useState('');
  const [newEventName, setNewEventName] = useState('Annual Turnaround 2026');
  const [newPlant, setNewPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [newUnit, setNewUnit] = useState('APS-1 (Atmospheric Distillation Unit 1)');
  const [newSystem, setNewSystem] = useState('System-11 (Crude Feed & Desalter)');
  const [newWorkOrder, setNewWorkOrder] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newEquipmentType, setNewEquipmentType] = useState('Static Equipment');
  const [newDiscipline, setNewDiscipline] = useState('M - Mechanical');
  const [newJobLead, setNewJobLead] = useState('นายสมชาย ใจมั่น (Lead Engineer)');
  const [newTargetStartDate, setNewTargetStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newPlannedTurnoverDate, setNewPlannedTurnoverDate] = useState(() => new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10));
  const [newIsCriticalPath, setNewIsCriticalPath] = useState(false);

  // Real-time check if Job ID already exists
  const isNewJobIdDuplicate = useMemo(() => {
    if (!newJobId.trim()) return false;
    return checkJobIdExists(newJobId.trim());
  }, [newJobId, checkJobIdExists]);

  // Plant Scoped Jobs from Top Bar
  const plantScopedJobs = useMemo(() => {
    if (!globalPlantFilter || globalPlantFilter === 'All') return jobs;
    return jobs.filter(j => j.plant === globalPlantFilter);
  }, [jobs, globalPlantFilter]);

  // Unique Events & Units for dropdown filters (merging jobs + registered events)
  const uniqueEvents = useMemo(() => {
    const scopedRegisteredEvents = events
      .filter(ev => !globalPlantFilter || globalPlantFilter === 'All' || ev.plant === 'All Plants' || ev.plant === globalPlantFilter)
      .map(ev => ev.eventName);
    return Array.from(new Set([...scopedRegisteredEvents, ...plantScopedJobs.map(j => j.eventName)].filter(Boolean))).sort();
  }, [events, plantScopedJobs, globalPlantFilter]);

  const uniqueUnits = useMemo(() => {
    return Array.from(new Set(plantScopedJobs.map(j => j.unit).filter(Boolean))).sort();
  }, [plantScopedJobs]);

  // Safe Progress & Gate Calculator for each job (Guarded against undefined arrays)
  const getJobProgressData = (job: JobRecord) => {
    const sigList = Array.isArray(job.signatures) ? job.signatures : [];
    const punchList = Array.isArray(job.punchList) ? job.punchList : [];

    const totalSigns = 3;
    const acceptSigns = sigList.filter(s => s.decision === 'Accept').length;
    const signProgress = Math.min(100, Math.round((acceptSigns / totalSigns) * 100));

    const totalPunches = punchList.length;
    const resolvedPunches = punchList.filter(p => p.status === 'Resolved' || p.status === 'Closed').length;
    const openPunches = totalPunches - resolvedPunches;
    const openCatA = punchList.filter(p => p.category === 'A' && p.status !== 'Resolved' && p.status !== 'Closed').length;
    const openCatB = punchList.filter(p => p.category === 'B' && p.status !== 'Resolved' && p.status !== 'Closed').length;
    
    const isDone = isJobCompleted(job);
    const blocker = isJobTurnoverBlocked(job.id);

    // Compute Overall Progress
    let overallProgress = 20; // Initiated
    if (acceptSigns > 0) overallProgress += 30;
    if (totalPunches === 0 || openPunches === 0) overallProgress += 30;
    else if (resolvedPunches > 0) overallProgress += Math.round((resolvedPunches / totalPunches) * 20);
    if (isDone) overallProgress = 100;
    else overallProgress = Math.min(95, overallProgress);

    // Lifecycle Gate Category
    let gate: 'Gate1' | 'Gate2' | 'Gate3' | 'Gate4' = 'Gate1';
    if (isDone) {
      gate = 'Gate4'; // Handed over
    } else if (openPunches > 0) {
      gate = 'Gate3'; // Punch clearing
    } else if (acceptSigns > 0) {
      gate = 'Gate2'; // In sign-off / execution
    } else {
      gate = 'Gate1'; // Planning / Initiated
    }

    return {
      signProgress,
      acceptSigns,
      totalSigns,
      totalPunches,
      resolvedPunches,
      openPunches,
      openCatA,
      openCatB,
      isDone,
      isBlocked: blocker.blocked,
      overallProgress,
      gate
    };
  };

  // KPI Statistics
  const stats = useMemo(() => {
    let gate1 = 0;
    let gate2 = 0;
    let gate3 = 0;
    let gate4 = 0;
    let critical = 0;
    let openPunchCount = 0;
    let openCatACount = 0;

    plantScopedJobs.forEach(job => {
      const data = getJobProgressData(job);
      if (data.gate === 'Gate1') gate1++;
      else if (data.gate === 'Gate2') gate2++;
      else if (data.gate === 'Gate3') gate3++;
      else if (data.gate === 'Gate4') gate4++;
      
      if (job.isCriticalPath) critical++;
      openPunchCount += data.openPunches;
      openCatACount += data.openCatA;
    });

    return {
      total: plantScopedJobs.length,
      gate1,
      gate2,
      gate3,
      gate4,
      critical,
      openPunchCount,
      openCatACount
    };
  }, [plantScopedJobs]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEvent, filterUnit, filterStatus, filterDiscipline, filterCriticalOnly, activeGateTab, globalPlantFilter]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return plantScopedJobs.filter(job => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (job.jobNo || '').toLowerCase().includes(q) ||
        (job.workOrder || '').toLowerCase().includes(q) ||
        (job.eventName || '').toLowerCase().includes(q) ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.unit || '').toLowerCase().includes(q) ||
        (job.system || '').toLowerCase().includes(q) ||
        (job.assetTag || '').toLowerCase().includes(q) ||
        (job.description || '').toLowerCase().includes(q);

      const matchEvent = filterEvent === 'All' || job.eventName === filterEvent;
      const matchUnit = filterUnit === 'All' || job.unit === filterUnit;
      const matchDiscipline = filterDiscipline === 'All' || (job.discipline && job.discipline.includes(filterDiscipline));
      const matchCritical = !filterCriticalOnly || job.isCriticalPath;

      const progressData = getJobProgressData(job);

      // Gate tab filter
      let matchGate = true;
      if (activeGateTab === 'Gate1') matchGate = progressData.gate === 'Gate1';
      else if (activeGateTab === 'Gate2') matchGate = progressData.gate === 'Gate2';
      else if (activeGateTab === 'Gate3') matchGate = progressData.gate === 'Gate3';
      else if (activeGateTab === 'Gate4') matchGate = progressData.gate === 'Gate4';
      else if (activeGateTab === 'Critical') matchGate = !!job.isCriticalPath;

      // Status dropdown filter
      let matchStatus = true;
      if (filterStatus === 'Completed') matchStatus = progressData.isDone;
      else if (filterStatus === 'In Progress') matchStatus = !progressData.isDone && progressData.gate !== 'Gate1';
      else if (filterStatus === 'Punch Clearing') matchStatus = progressData.openPunches > 0;
      else if (filterStatus === 'Blocked') matchStatus = progressData.isBlocked;

      return matchSearch && matchEvent && matchUnit && matchDiscipline && matchCritical && matchGate && matchStatus;
    });
  }, [plantScopedJobs, searchTerm, filterEvent, filterUnit, filterDiscipline, filterCriticalOnly, activeGateTab, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / itemsPerPage));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // =========================================================================
  // FUNCTIONAL LOCATION (FLOC) HIERARCHY & STATUS ROLLUP ENGINE
  // =========================================================================
  interface FlocRollupMetrics {
    totalJobs: number;
    gate1: number;
    gate2: number;
    gate3: number;
    gate4: number;
    criticalCount: number;
    openPunches: number;
    openCatA: number;
    openCatB: number;
    acceptedSigns: number;
    totalSigns: number;
    avgProgress: number;
    readinessStatus: 'HandedOver' | 'BlockedCatA' | 'PunchHold' | 'SignOff' | 'Review' | 'Standby';
  }

  const computeFlocMetrics = (jobList: JobRecord[]): FlocRollupMetrics => {
    let gate1 = 0;
    let gate2 = 0;
    let gate3 = 0;
    let gate4 = 0;
    let criticalCount = 0;
    let openPunches = 0;
    let openCatA = 0;
    let openCatB = 0;
    let acceptedSigns = 0;
    let totalSigns = 0;
    let progressSum = 0;

    jobList.forEach(j => {
      const p = getJobProgressData(j);
      if (p.gate === 'Gate1') gate1++;
      else if (p.gate === 'Gate2') gate2++;
      else if (p.gate === 'Gate3') gate3++;
      else if (p.gate === 'Gate4') gate4++;

      if (j.isCriticalPath) criticalCount++;
      openPunches += p.openPunches;
      openCatA += p.openCatA;
      openCatB += p.openCatB;
      acceptedSigns += p.acceptSigns;
      totalSigns += p.totalSigns;
      progressSum += p.overallProgress;
    });

    const totalJobs = jobList.length;
    const avgProgress = totalJobs > 0 ? Math.round(progressSum / totalJobs) : 0;

    let readinessStatus: FlocRollupMetrics['readinessStatus'] = 'Standby';
    if (totalJobs > 0) {
      if (gate4 === totalJobs) readinessStatus = 'HandedOver';
      else if (openCatA > 0) readinessStatus = 'BlockedCatA';
      else if (openPunches > 0) readinessStatus = 'PunchHold';
      else if (gate2 > 0) readinessStatus = 'SignOff';
      else readinessStatus = 'Review';
    }

    return {
      totalJobs,
      gate1,
      gate2,
      gate3,
      gate4,
      criticalCount,
      openPunches,
      openCatA,
      openCatB,
      acceptedSigns,
      totalSigns,
      avgProgress,
      readinessStatus
    };
  };

  const deriveUnitFlocCode = (plant: 'Phra Khanong' | 'Sriracha', unitName: string) => {
    const prefix = plant === 'Sriracha' ? 'SR' : 'PK';
    const matchedMaster = masterFlocList.find(f =>
      f.level === 'Area' &&
      ((f.plantId === 'sr' && plant === 'Sriracha') || (f.plantId === 'pk' && plant === 'Phra Khanong')) &&
      (unitName.toLowerCase().includes((f.unit || '').toLowerCase()) ||
       (f.unit || '').toLowerCase().includes(unitName.split(' ')[0].toLowerCase()) ||
       f.name.toLowerCase().includes(unitName.split(' ')[0].toLowerCase()))
    );
    if (matchedMaster) return matchedMaster.flocCode;
    const shortToken = (unitName.split(' ')[0] || 'UNIT').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    return `${prefix}-AREA-${shortToken}`;
  };

  const deriveSystemFlocCode = (unitFlocCode: string, systemName: string) => {
    const matchedMaster = masterFlocList.find(f =>
      f.level === 'System' &&
      (systemName.toLowerCase().includes(f.flocCode.toLowerCase()) ||
       systemName.toLowerCase().includes(f.name.toLowerCase()))
    );
    if (matchedMaster) return matchedMaster.flocCode;
    const sysToken = (systemName.split(' ')[0] || 'SYS').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const baseUnit = unitFlocCode.replace('-AREA-', '-');
    return `${baseUnit}-${sysToken}`;
  };

  const matchesFlocHealthFilter = (metrics: FlocRollupMetrics) => {
    if (flocHealthFilter === 'All') return true;
    if (flocHealthFilter === 'HandedOver') return metrics.readinessStatus === 'HandedOver';
    if (flocHealthFilter === 'BlockedCatA') return metrics.openCatA > 0;
    if (flocHealthFilter === 'PunchHold') return metrics.openPunches > 0;
    if (flocHealthFilter === 'SignOff') return metrics.gate2 > 0 || metrics.readinessStatus === 'SignOff';
    if (flocHealthFilter === 'Critical') return metrics.criticalCount > 0;
    return true;
  };

  const flocHierarchyTree = useMemo(() => {
    const targetPlants: ('Phra Khanong' | 'Sriracha')[] =
      globalPlantFilter === 'Phra Khanong'
        ? ['Phra Khanong']
        : globalPlantFilter === 'Sriracha'
          ? ['Sriracha']
          : ['Phra Khanong', 'Sriracha'];

    return targetPlants.map(plantName => {
      const plantJobs = filteredJobs.filter(j => j.plant === plantName);
      const plantIdCode: 'pk' | 'sr' = plantName === 'Sriracha' ? 'sr' : 'pk';

      // Collect unique units from filteredJobs + optional master FLOC Areas
      const unitNamesSet = new Set<string>(plantJobs.map(j => j.unit || 'General Process Unit'));
      if (includeEmptyMasterFlocs) {
        masterFlocList
          .filter(f => f.plantId === plantIdCode && f.level === 'Area')
          .forEach(area => {
            const exists = Array.from(unitNamesSet).some(u =>
              u.toLowerCase().includes((area.unit || area.flocCode).toLowerCase().split(' ')[0])
            );
            if (!exists) {
              unitNamesSet.add(`${area.unit || area.flocCode} (${area.name})`);
            }
          });
      }

      const unitNodes = Array.from(unitNamesSet).map(unitName => {
        const unitJobs = plantJobs.filter(j => (j.unit || 'General Process Unit') === unitName);
        const unitFlocCode = deriveUnitFlocCode(plantName, unitName);
        const unitIdKey = `unit-${plantName}-${unitFlocCode}-${unitName}`;

        // Group Systems under this Unit
        const sysNamesSet = new Set<string>(unitJobs.map(j => j.system || 'General Process System'));
        if (includeEmptyMasterFlocs) {
          const masterArea = masterFlocList.find(f => f.plantId === plantIdCode && f.level === 'Area' && f.flocCode === unitFlocCode);
          if (masterArea) {
            masterFlocList
              .filter(s => s.parentId === masterArea.id && s.level === 'System')
              .forEach(sys => {
                const exists = Array.from(sysNamesSet).some(sn => sn.toLowerCase().includes(sys.flocCode.toLowerCase()));
                if (!exists) {
                  sysNamesSet.add(`${sys.flocCode} (${sys.name})`);
                }
              });
          }
        }

        const systemNodes = Array.from(sysNamesSet).map(sysName => {
          const sysJobs = unitJobs.filter(j => (j.system || 'General Process System') === sysName);
          const sysFlocCode = deriveSystemFlocCode(unitFlocCode, sysName);
          const sysIdKey = `sys-${plantName}-${unitFlocCode}-${sysName}`;

          // Group Equipment Tags under this System
          const eqTagMap = new Map<string, JobRecord[]>();
          sysJobs.forEach(j => {
            const tagKey = j.assetTag || j.jobNo || 'UNASSIGNED-TAG';
            const existing = eqTagMap.get(tagKey) || [];
            existing.push(j);
            eqTagMap.set(tagKey, existing);
          });

          const equipmentNodes = Array.from(eqTagMap.entries()).map(([eqTag, eqJobs]) => {
            const firstJob = eqJobs[0];
            return {
              id: `eq-${sysIdKey}-${eqTag}`,
              eqTag,
              flocCode: firstJob?.refCode ? `${sysFlocCode}-${firstJob.refCode}` : `${sysFlocCode}-${eqTag.split(' ')[0]}`,
              description: firstJob?.assetDescription || firstJob?.title || eqTag,
              refCode: firstJob?.refCode || '-',
              gridZone: firstJob?.gridZone || 'B2',
              hierarchyPath: firstJob?.hierarchyPath || `${unitFlocCode} > ${sysFlocCode} > ${eqTag}`,
              jobs: eqJobs,
              metrics: computeFlocMetrics(eqJobs)
            };
          });

          return {
            id: sysIdKey,
            name: sysName,
            flocCode: sysFlocCode,
            unitName,
            unitFlocCode,
            plantName,
            jobs: sysJobs,
            equipmentNodes,
            metrics: computeFlocMetrics(sysJobs)
          };
        }).filter(sys => includeEmptyMasterFlocs || sys.jobs.length > 0)
          .filter(sys => matchesFlocHealthFilter(sys.metrics));

        // Also build Event -> System grouping for 'unit-event' mode
        const eventNamesInUnit = Array.from(new Set(unitJobs.map(j => j.eventName || 'Annual Turnaround 2026')));
        const eventNodes = eventNamesInUnit.map(evName => {
          const evJobs = unitJobs.filter(j => (j.eventName || 'Annual Turnaround 2026') === evName);
          const evRecord = events.find(e => e.eventName === evName);
          return {
            id: `evt-${unitIdKey}-${evName}`,
            eventName: evName,
            eventCode: evRecord?.eventCode || 'EVT-TA-2026',
            targetDate: evRecord?.targetTurnoverDate || '2026-10-15',
            jobs: evJobs,
            metrics: computeFlocMetrics(evJobs)
          };
        }).filter(ev => matchesFlocHealthFilter(ev.metrics));

        const filteredUnitJobs = systemNodes.flatMap(s => s.jobs);

        return {
          id: unitIdKey,
          name: unitName,
          flocCode: unitFlocCode,
          plantName,
          jobs: filteredUnitJobs,
          systemNodes,
          eventNodes,
          metrics: computeFlocMetrics(filteredUnitJobs)
        };
      }).filter(u => (includeEmptyMasterFlocs && u.systemNodes.length > 0) || u.jobs.length > 0);

      const allPlantFilteredJobs = unitNodes.flatMap(u => u.jobs);

      return {
        id: `plant-${plantName}`,
        plantName,
        plantCode: plantName === 'Sriracha' ? 'SR' : 'PK',
        rootFlocCode: plantName === 'Sriracha' ? 'FLOC-ROOT-SR' : 'FLOC-ROOT-PK',
        drawingRef: plantName === 'Sriracha' ? 'RD-001-A Rev 28' : 'PK-RD-002-B Rev 19',
        unitNodes,
        metrics: computeFlocMetrics(allPlantFilteredJobs)
      };
    }).filter(p => includeEmptyMasterFlocs || p.unitNodes.length > 0 || globalPlantFilter === p.plantName);
  }, [filteredJobs, globalPlantFilter, includeEmptyMasterFlocs, masterFlocList, flocHealthFilter, events]);

  // Flatten all System nodes for the FLOC Status Rollup Matrix Table ('floc-rollup')
  const flocRollupRows = useMemo(() => {
    return flocHierarchyTree.flatMap(plant =>
      plant.unitNodes.flatMap(unit =>
        unit.systemNodes.map(sys => ({
          ...sys,
          plantCode: plant.plantCode
        }))
      )
    );
  }, [flocHierarchyTree]);

  // Auto-expand initial FLOC Unit & System nodes when tree changes so hierarchy is immediately visible
  useEffect(() => {
    setExpandedFlocIds(prev => {
      const next = new Set(prev);
      flocHierarchyTree.forEach(p => {
        next.add(p.id);
        p.unitNodes.forEach(u => {
          next.add(u.id);
          u.systemNodes.forEach(s => next.add(s.id));
          u.eventNodes.forEach(e => next.add(e.id));
        });
      });
      return next;
    });
  }, [globalPlantFilter, hierarchyGroupMode]);

  const toggleFlocNode = (nodeId: string) => {
    setExpandedFlocIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAllFlocNodes = () => {
    const all = new Set<string>();
    flocHierarchyTree.forEach(p => {
      all.add(p.id);
      p.unitNodes.forEach(u => {
        all.add(u.id);
        u.systemNodes.forEach(s => all.add(s.id));
        u.eventNodes.forEach(e => all.add(e.id));
      });
    });
    setExpandedFlocIds(all);
  };

  const collapseToUnitsOnly = () => {
    const unitsOnly = new Set<string>();
    flocHierarchyTree.forEach(p => {
      unitsOnly.add(p.id);
    });
    setExpandedFlocIds(unitsOnly);
  };

  const collapseAllFlocNodes = () => {
    setExpandedFlocIds(new Set());
  };

  const handleOpenCreateJobForFloc = (
    plantName: 'Phra Khanong' | 'Sriracha',
    unitName?: string,
    systemName?: string,
    assetTag?: string
  ) => {
    setNewPlant(plantName);
    if (unitName) setNewUnit(unitName);
    if (systemName) setNewSystem(systemName);
    if (assetTag) setNewAssetTag(assetTag);
    const rand = Math.floor(100 + Math.random() * 900);
    const prefix = plantName === 'Sriracha' ? 'SR' : 'PK';
    setNewJobId(`TO-${prefix}-2026-${rand}`);
    setNewWorkOrder(`WO-${Math.floor(100000 + Math.random() * 900000)}`);
    setCreateModalTab('single');
    setIsCreateModalOpen(true);
  };

  const getFlocReadinessBadge = (status: FlocRollupMetrics['readinessStatus']) => {
    switch (status) {
      case 'HandedOver':
        return {
          label: isTh ? 'ส่งมอบครบ 100% (RFSU Ready)' : '100% Handed Over (RFSU)',
          cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
        };
      case 'BlockedCatA':
        return {
          label: isTh ? 'ติด Blocker Cat A (ห้ามส่งมอบ)' : 'Blocked (Cat A Hold)',
          cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
        };
      case 'PunchHold':
        return {
          label: isTh ? 'กำลังเคลียร์ Punch List (Gate 3)' : 'Punch Clearance (Gate 3)',
          cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
        };
      case 'SignOff':
        return {
          label: isTh ? 'กำลังลงนามตรวจรับ (Gate 2)' : 'Sign-Off Active (Gate 2)',
          cls: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800'
        };
      case 'Review':
        return {
          label: isTh ? 'ตรวจประเมินอุปกรณ์ (Gate 1)' : 'Engineer Review (Gate 1)',
          cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800'
        };
      default:
        return {
          label: isTh ? 'ไม่มีงานค้าง (Standby FLOC)' : 'Standby / No Active Job',
          cls: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        };
    }
  };

  // =========================================================================
  // CORE DISPATCH: SEND / JUMP TO TURNOVER WORKSPACE
  // =========================================================================
  const handleJumpToWorkspace = (job: JobRecord) => {
    setSelectedJobId(job.id);
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace(job.id);
    } else if (setActiveView) {
      setActiveView('job-location-workspace');
    }
  };

  // Color tag generator for Event Name
  const getEventTagColor = (name?: string) => {
    if (!name) return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (name.includes('Annual') || name.includes('TAM')) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
    if (name.includes('Major') || name.includes('Overhaul')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    if (name.includes('Vacuum') || name.includes('Decoking')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
  };

  // Fill sample data into single creation form
  const handleFillSampleData = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    const plantPrefix = newPlant === 'Sriracha' ? 'SR' : 'PK';
    setNewJobId(`TO-${plantPrefix}-2026-${rand}`);
    setNewWorkOrder(`WO-${Math.floor(100000 + Math.random() * 900000)}`);
    setNewAssetTag(`E-${rand}`);
    setNewDescription(`Overhaul, clean shell & tube bundle and hydro-test for Heat Exchanger E-${rand}.`);
    setNewEquipmentType('Static Equipment');
    setNewDiscipline('M - Mechanical');
    setNewIsCriticalPath(true);
  };

  // Submit Single Job Creation
  const handleCreateSingleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newJobId.trim();
    if (!cleanId) {
      alert(isTh ? 'กรุณาระบุรหัส Job ID' : 'Job ID is required');
      return;
    }
    if (checkJobIdExists(cleanId)) {
      alert(isTh ? `❌ รหัส Job ID "${cleanId}" มีอยู่ในระบบแล้ว ไม่สามารถสร้างซ้ำได้` : `❌ Job ID "${cleanId}" already exists.`);
      return;
    }
    try {
      const created = createJob({
        id: `job-${Date.now()}`,
        jobNo: cleanId,
        title: `${cleanId} — ${newDescription.slice(0, 45) || newAssetTag || 'Turnover Package'}`,
        eventName: newEventName,
        plant: newPlant,
        unit: newUnit,
        system: newSystem,
        workOrder: newWorkOrder || `WO-${Math.floor(100000 + Math.random() * 900000)}`,
        description: newDescription || `${newAssetTag} Turnover Scope`,
        assetTag: newAssetTag || cleanId,
        assetDescription: newEquipmentType,
        isCriticalPath: newIsCriticalPath,
        equipmentType: newEquipmentType,
        discipline: newDiscipline,
        jobLead: newJobLead,
        targetStartDate: newTargetStartDate,
        plannedTurnoverDate: newPlannedTurnoverDate,
        attachments: [],
        signatures: [],
        punchList: []
      });
      showToast(isTh ? `✓ สร้าง Event & Job "${created.jobNo}" สำเร็จเรียบร้อย!` : `✓ Job "${created.jobNo}" created successfully!`);
      setIsCreateModalOpen(false);
      setNewJobId('');
      setNewDescription('');
      setNewAssetTag('');
    } catch (err: any) {
      alert(err.message || 'Error creating job');
    }
  };

  // Execute Export
  const handleExecuteExport = () => {
    const targetData = exportScope === 'filtered' ? filteredJobs : plantScopedJobs;

    if (exportFormat === 'csv') {
      const headers = [
        'Job No', 'Event Name', 'Plant', 'Unit', 'System', 'Work Order',
        'Title', 'Asset Tag', 'Critical Path', 'Progress (%)', 'Signatures Accepted',
        'Open Punches', 'Cat A Punches', 'Status'
      ];
      const rows = targetData.map(j => {
        const p = getJobProgressData(j);
        return [
          `"${j.jobNo || ''}"`,
          `"${j.eventName || ''}"`,
          `"${j.plant || ''}"`,
          `"${j.unit || ''}"`,
          `"${j.system || ''}"`,
          `"${j.workOrder || ''}"`,
          `"${(j.title || '').replace(/"/g, '""')}"`,
          `"${j.assetTag || ''}"`,
          j.isCriticalPath ? 'YES' : 'NO',
          p.overallProgress,
          `"${p.acceptSigns}/${p.totalSigns}"`,
          p.openPunches,
          p.openCatA,
          p.isDone ? 'Completed' : p.isBlocked ? 'Blocked (Cat A)' : 'In Progress'
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Turnover_Event_Job_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetData, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `Turnover_Jobs_Export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    showToast(isTh ? `✓ ส่งออกข้อมูลจำนวน ${targetData.length} รายการเรียบร้อยแล้ว` : `✓ Exported ${targetData.length} records successfully.`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 border border-emerald-500/50 text-white shadow-2xl text-xs font-semibold">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header with Module Badge & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span>{isTh ? 'ทะเบียน Event & แผนงานส่งมอบระบบ' : 'Turnover Event & Job Operations Registry'}</span>
            </h2>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-mono">
              TO01
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isTh 
              ? 'ระบบติดตามสถานะงานส่งมอบระบบ 4 Gates: ตรวจประเมินอุปกรณ์ (Gate 1) -> ลงนามตรวจสอบ (Gate 2) -> เคลียร์ Punch List (Gate 3) -> ส่งมอบระบบสมบูรณ์ (Gate 4)' 
              : '4-Gate Turnover Lifecycle Tracking: Engineer Review (Gate 1) -> Sign-off (Gate 2) -> Punch Clearance (Gate 3) -> Turnover Handover (Gate 4)'}
          </p>
        </div>

        {/* Action Buttons (Modals) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title={isTh ? 'เปิดหน้าต่างส่งออก Excel/CSV' : 'Export Options Modal'}
          >
            <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isTh ? 'ส่งออก Excel/CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateModalTab('single');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95"
            title={isTh ? 'เปิด Modal สร้าง Event & Job ใหม่' : 'Create Event & Job Modal'}
          >
            <Plus size={16} />
            <span>{isTh ? 'สร้าง Event & Job ใหม่' : 'Create Event & Job'}</span>
          </button>
        </div>
      </div>

      {/* 2. Plant Scope Live Indicator Badge */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isTh ? 'ขอบเขตโรงงานที่เลือก:' : 'Active Plant Scope:'}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
            {globalPlantFilter === 'Phra Khanong' 
              ? (isTh ? 'พระโขนง (Phra Khanong)' : 'Phra Khanong')
              : globalPlantFilter === 'Sriracha' 
                ? (isTh ? 'ศรีราชา (Sriracha)' : 'Sriracha')
                : (isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants')}
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
          {stats.total} {isTh ? 'งานและอีเวนต์ที่ค้นพบ' : 'events & jobs found'}
        </span>
      </div>

      {/* 3. Gate Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveGateTab('All')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'All'
              ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm ring-1 ring-slate-900 dark:ring-emerald-500'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>{isTh ? 'ทุกขั้นตอน (All Gates)' : 'All Gates'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeGateTab === 'All'
              ? 'bg-slate-700 text-slate-100 dark:bg-emerald-700/80 dark:text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate1')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate1'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={13} />
          <span>{isTh ? 'Gate 1: ตรวจประเมินอุปกรณ์' : 'Gate 1: Review'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-mono">{stats.gate1}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate2')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate2'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock size={13} />
          <span>{isTh ? 'Gate 2: กำลังลงนามตรวจรับ' : 'Gate 2: Sign-off'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-mono">{stats.gate2}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate3')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate3'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle size={13} />
          <span>{isTh ? 'Gate 3: เคลียร์ Punch List' : 'Gate 3: Punch Clear'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 font-mono">{stats.gate3}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Gate4')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Gate4'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 size={13} />
          <span>{isTh ? 'Gate 4: ส่งมอบระบบสำเร็จ' : 'Gate 4: Completed'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-mono">{stats.gate4}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGateTab('Critical')}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeGateTab === 'Critical'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap size={13} className="text-orange-500" />
          <span>{isTh ? 'เส้นทางวิกฤต (Critical Path)' : 'Critical Path'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 font-mono">{stats.critical}</span>
        </button>
      </div>

      {/* 4. Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'งานและ Event ทั้งหมด' : 'Total Events & Jobs'}</span>
            <Briefcase size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.total}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {uniqueEvents.length} {isTh ? 'อีเวนต์ที่เปิดในระบบ' : 'active events'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'กำลังตรวจและลงนาม' : 'In Sign-off / Active'}</span>
            <Clock size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{stats.gate2 + stats.gate1}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {stats.total > 0 ? Math.round(((stats.gate2 + stats.gate1) / stats.total) * 100) : 0}% {isTh ? 'ของงานทั้งหมด' : 'of total'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'Punch List คงค้าง' : 'Open Punch List'}</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.openPunchCount}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'รายการ' : 'items'}</span>
          </div>
          <div className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
            <span>{stats.openCatACount} {isTh ? 'รายการ Category A (Blocker)' : 'Cat A Blockers'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'เส้นทางวิกฤต' : 'Critical Path'}</span>
            <Zap size={16} className="text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">{stats.critical}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-semibold mt-1">
            {isTh ? 'ควบคุมใกล้ชิดระดับนาที' : 'Priority Milestones'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-gray-200 dark:border-slate-800 p-4 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTh ? 'ส่งมอบสำเร็จ (Certificate)' : 'Handed Over'}</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.gate4}</span>
            <span className="text-[10px] text-slate-500">{isTh ? 'งาน' : 'jobs'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            {stats.total > 0 ? Math.round((stats.gate4 / stats.total) * 100) : 0}% {isTh ? 'ส่งมอบสมบูรณ์' : 'completed'}
          </div>
        </div>
      </div>

      {/* 5. Search and Multi-Dimensional Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 p-4 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Search size={11} className="text-slate-400" />
              <span>{isTh ? 'ค้นหางาน (Search)' : 'Search Event & Job'}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isTh ? "ค้นหาชื่องาน, Job No, Event, Unit, Tag, WO..." : "Search by Job No, Event, Unit, Tag, WO..."}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Briefcase size={11} className="text-slate-400" />
              <span>{isTh ? 'อีเวนต์ (Event)' : 'Event'}</span>
            </label>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกอีเวนต์ (All Events)' : 'All Events'}</option>
              {uniqueEvents.map(evt => (
                <option key={evt} value={evt}>{evt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" />
              <span>{isTh ? 'หน่วยผลิต (Unit)' : 'Unit'}</span>
            </label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกหน่วยผลิต (All Units)' : 'All Units'}</option>
              {uniqueUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={11} className="text-slate-400" />
              <span>{isTh ? 'สถานะ (Status)' : 'Status'}</span>
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="All">{isTh ? 'ทุกสถานะ (All Status)' : 'All Status'}</option>
              <option value="In Progress">{isTh ? 'กำลังดำเนินการ (In Progress)' : 'In Progress'}</option>
              <option value="Punch Clearing">{isTh ? 'มี Punch List คงค้าง' : 'Punch Clearing'}</option>
              <option value="Blocked">{isTh ? 'ติด Blocker Cat A' : 'Blocked'}</option>
              <option value="Completed">{isTh ? 'ส่งมอบเสร็จสมบูรณ์ (Completed)' : 'Completed'}</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterCriticalOnly
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Zap size={13} className={filterCriticalOnly ? 'text-white' : 'text-orange-500'} />
              <span>{isTh ? 'เฉพาะเส้นทางวิกฤต (Critical Path Only)' : 'Critical Path Only'}</span>
            </button>

            {(searchTerm || filterEvent !== 'All' || filterUnit !== 'All' || filterStatus !== 'All' || filterCriticalOnly || activeGateTab !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterEvent('All');
                  setFilterUnit('All');
                  setFilterStatus('All');
                  setFilterCriticalOnly(false);
                  setActiveGateTab('All');
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium ml-2"
              >
                <X size={12} />
                <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Clear Filters'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switcher: Hierarchy (FLOC) vs Table vs Cards */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('hierarchy')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'hierarchy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isTh ? 'มุมมองสถานะตามโครงสร้าง Functional Location (FLOC Hierarchy)' : 'Hierarchy Status View Grouped by Functional Location'}
              >
                <FolderTree size={13} />
                <span>{isTh ? 'Hierarchy (FLOC)' : 'FLOC Hierarchy'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table View"
              >
                <TableIcon size={13} />
                <span className="hidden sm:inline">{isTh ? 'ตาราง (Table)' : 'Table'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Cards View"
              >
                <LayoutList size={13} />
                <span className="hidden sm:inline">{isTh ? 'การ์ด (Cards)' : 'Cards'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {isTh ? `แสดง ${filteredJobs.length} จาก ${plantScopedJobs.length} รายการ` : `Showing ${filteredJobs.length} of ${plantScopedJobs.length} records`}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Hierarchy Status View Grouped by Functional Location / Table / Cards */}
      {viewMode === 'hierarchy' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* FLOC Hierarchy Control & Telemetry Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                  <Network size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      {isTh
                        ? 'มุมมองสถานะการส่งมอบจัดกลุ่มตามโครงสร้าง Functional Location (FLOC Hierarchy Status View)'
                        : 'Hierarchy Status View Grouped by Functional Location (ISO 55001 / SAP PM FLOC)'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      L0 Plant → L1 Unit → L2 System → L3 Equipment & Job
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isTh
                      ? 'ติดตามความพร้อมส่งมอบระบบ (RFSU Readiness), สถานะ 4 Gates, ลายเซ็นตรวจรับ และ Punch List คงค้าง แยกระดับตามรหัสตำแหน่งอุปกรณ์'
                      : 'Real-time 4-Gate readiness rollup, acceptance sign-offs, and Cat A/B punch blockers aggregated at every Functional Location tier.'}
                  </p>
                </div>
              </div>

              {/* Grouping Structure Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setHierarchyGroupMode('floc-tree')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    hierarchyGroupMode === 'floc-tree'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FolderTree size={13} />
                  <span>{isTh ? 'ผังต้นไม้ FLOC (L1-L3 Tree)' : 'FLOC Tree (L1–L3)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHierarchyGroupMode('unit-event')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    hierarchyGroupMode === 'unit-event'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GitBranch size={13} />
                  <span>{isTh ? 'จัดกลุ่ม Unit × Event' : 'Unit × Event Group'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHierarchyGroupMode('floc-rollup')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    hierarchyGroupMode === 'floc-rollup'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Activity size={13} />
                  <span>{isTh ? 'ตารางสรุปสถานะ FLOC' : 'FLOC Rollup Matrix'}</span>
                </button>
              </div>
            </div>

            {/* Second Row: FLOC Health Filter Pills + Expand/Collapse Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* FLOC Health Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  {isTh ? 'กรองสถานะ FLOC:' : 'FLOC Status:'}
                </span>
                {([
                  { id: 'All', labelTh: 'ทุกโหนด FLOC', labelEn: 'All FLOCs' },
                  { id: 'BlockedCatA', labelTh: 'ติด Cat A Blocker', labelEn: 'Cat A Blocked' },
                  { id: 'PunchHold', labelTh: 'มี Punch คงค้าง (Gate 3)', labelEn: 'Open Punches (G3)' },
                  { id: 'SignOff', labelTh: 'กำลังลงนาม (Gate 2)', labelEn: 'In Sign-Off (G2)' },
                  { id: 'HandedOver', labelTh: 'ส่งมอบครบ 100% (Gate 4)', labelEn: '100% Handed Over (G4)' },
                  { id: 'Critical', labelTh: 'เฉพาะ FLOC เส้นทางวิกฤต', labelEn: 'Critical Path FLOC' }
                ] as const).map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFlocHealthFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      flocHealthFilter === pill.id
                        ? pill.id === 'BlockedCatA'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : pill.id === 'HandedOver'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : pill.id === 'PunchHold'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : pill.id === 'SignOff'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : pill.id === 'Critical'
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                  : 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isTh ? pill.labelTh : pill.labelEn}
                  </button>
                ))}
              </div>

              {/* Tree Controls & Master FLOC Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIncludeEmptyMasterFlocs(!includeEmptyMasterFlocs)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    includeEmptyMasterFlocs
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                  }`}
                  title={isTh ? 'แสดงโครงสร้าง FLOC ทั้งหมดรวมถึงระบบที่ยังไม่มีใบงานเปิด' : 'Include Master FLOC nodes that currently have zero active jobs'}
                >
                  <Layers size={12} />
                  <span>{isTh ? 'รวม Master FLOC ที่ว่าง' : 'Include Standby FLOCs'}</span>
                </button>

                {setActiveView && (
                  <button
                    type="button"
                    onClick={() => setActiveView('functional-location')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    title={isTh ? 'ไปที่หน้าจัดการโครงสร้าง Functional Location Master' : 'Open Functional Location Master Structure'}
                  >
                    <ExternalLink size={11} className="text-teal-600 dark:text-teal-400" />
                    <span>{isTh ? 'ตั้งค่าผัง FLOC' : 'FLOC Master'}</span>
                  </button>
                )}

                {hierarchyGroupMode !== 'floc-rollup' && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={expandAllFlocNodes}
                      className="px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      title={isTh ? 'ขยายทุกโหนด' : 'Expand All Levels'}
                    >
                      <Maximize2 size={11} />
                      <span>{isTh ? 'ขยายทั้งหมด' : 'Expand All'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={collapseToUnitsOnly}
                      className="px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title={isTh ? 'แสดงเฉพาะระดับโรงงานและหน่วยผลิต (L1)' : 'Show Plant & Unit Level Only'}
                    >
                      <span>{isTh ? 'ระดับ Unit (L1)' : 'Units (L1)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllFlocNodes}
                      className="px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      title={isTh ? 'ยุบทั้งหมด' : 'Collapse All'}
                    >
                      <Minimize2 size={11} />
                      <span>{isTh ? 'ยุบทั้งหมด' : 'Collapse'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =====================================================================
              SUB-MODE 3: FLOC STATUS ROLLUP MATRIX TABLE ('floc-rollup')
             ===================================================================== */}
          {hierarchyGroupMode === 'floc-rollup' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isTh
                      ? 'ตารางสรุปสถานะความพร้อมแยกตามรหัส Functional Location (FLOC System Readiness Rollup Matrix)'
                      : 'Functional Location System Readiness Rollup Matrix'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {flocRollupRows.length} {isTh ? 'ระบบ FLOC' : 'FLOC Systems'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="p-3">{isTh ? 'รหัส FLOC (System L2)' : 'FLOC Code (L2)'}</th>
                      <th className="p-3">{isTh ? 'โรงงาน & หน่วยผลิต (Unit L1)' : 'Plant & Unit (L1)'}</th>
                      <th className="p-3">{isTh ? 'ชื่อระบบ & อุปกรณ์ (L3 Tags)' : 'System & Asset Tags (L3)'}</th>
                      <th className="p-3 text-center">{isTh ? 'จำนวนงาน' : 'Jobs'}</th>
                      <th className="p-3">{isTh ? 'สัดส่วน 4 Gates (G1-G4)' : '4-Gate Distribution'}</th>
                      <th className="p-3">{isTh ? 'ลายเซ็นตรวจรับ' : 'Signatures'}</th>
                      <th className="p-3">{isTh ? 'Punch List คงค้าง' : 'Punch Status'}</th>
                      <th className="p-3">{isTh ? 'ความก้าวหน้า (%)' : 'Readiness (%)'}</th>
                      <th className="p-3">{isTh ? 'สถานะความพร้อม FLOC' : 'FLOC Status'}</th>
                      <th className="p-3 text-right">{isTh ? 'การจัดการ' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {flocRollupRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-10 text-center text-slate-400 italic">
                          {isTh ? 'ไม่พบข้อมูล Functional Location ตามตัวกรองที่เลือก' : 'No Functional Location nodes match the active filters.'}
                        </td>
                      </tr>
                    ) : (
                      flocRollupRows.map(row => {
                        const isRowExpanded = expandedRollupRowIds.has(row.id);
                        const badge = getFlocReadinessBadge(row.metrics.readinessStatus);
                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              onClick={() => {
                                setExpandedRollupRowIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(row.id)) next.delete(row.id);
                                  else next.add(row.id);
                                  return next;
                                });
                              }}
                              className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {isRowExpanded ? (
                                    <ChevronDown size={14} className="text-emerald-600 shrink-0" />
                                  ) : (
                                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-300 border border-slate-700">
                                    {row.flocCode}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    row.plantCode === 'SR'
                                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                  }`}>
                                    {row.plantCode}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                    {row.unitName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  L1: {row.unitFlocCode}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {row.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {row.equipmentNodes.map(eq => (
                                    <span
                                      key={eq.id}
                                      className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                      {eq.eqTag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono font-black text-slate-800 dark:text-white">
                                {row.metrics.totalJobs}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300" title="Gate 1: Review">
                                    G1:{row.metrics.gate1}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300" title="Gate 2: Sign-off">
                                    G2:{row.metrics.gate2}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300" title="Gate 3: Punch Clear">
                                    G3:{row.metrics.gate3}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300" title="Gate 4: Handed Over">
                                    G4:{row.metrics.gate4}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {row.metrics.acceptedSigns}/{row.metrics.totalSigns}
                              </td>
                              <td className="p-3">
                                {row.metrics.openCatA > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                    <AlertOctagon size={11} />
                                    <span>{row.metrics.openCatA} Cat A</span>
                                  </span>
                                ) : row.metrics.openPunches > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                    {row.metrics.openPunches} Open
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    <span>Clear</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 w-28">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                                  <span>{row.metrics.avgProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      row.metrics.readinessStatus === 'HandedOver'
                                        ? 'bg-emerald-500'
                                        : row.metrics.openCatA > 0
                                          ? 'bg-rose-500'
                                          : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${row.metrics.avgProgress}%` }}
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateJobForFloc(row.plantName, row.unitName, row.name)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  <span>{isTh ? 'เพิ่มงาน' : 'Add Job'}</span>
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Child Jobs for this FLOC System Row */}
                            {isRowExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-950/50">
                                <td colSpan={10} className="p-3 pl-8">
                                  <div className="space-y-2 border-l-2 border-emerald-500/40 pl-3">
                                    {row.jobs.map(job => {
                                      const prog = getJobProgressData(job);
                                      return (
                                        <div
                                          key={job.id}
                                          onClick={() => handleJumpToWorkspace(job)}
                                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 hover:border-emerald-500/50 transition-colors cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                              {job.jobNo}
                                            </span>
                                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                              {job.assetTag || '-'}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
                                              {job.title}
                                            </span>
                                            {job.isCriticalPath && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                                Critical
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-mono text-slate-500">
                                              Sign: <strong>{prog.acceptSigns}/3</strong> • Punch: <strong>{prog.openPunches}</strong> • <strong>{prog.overallProgress}%</strong>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleJumpToWorkspace(job);
                                              }}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                            >
                                              <span>Workspace</span>
                                              <ArrowRight size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* =====================================================================
               SUB-MODE 1 & 2: MULTI-TIER INTERACTIVE FLOC HIERARCHY TREE
               ('floc-tree': Plant -> Unit (L1) -> System (L2) -> Equipment & Jobs (L3))
               ('unit-event': Plant -> Unit (L1) -> Event -> Jobs)
               ===================================================================== */
            <div className="space-y-4">
              {flocHierarchyTree.length === 0 || flocHierarchyTree.every(p => p.unitNodes.length === 0) ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
                  <FolderTree size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {isTh ? 'ไม่พบโหนด Functional Location ตามตัวกรองที่เลือก' : 'No Functional Location Hierarchy Nodes Found'}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                    {isTh
                      ? 'ลองล้างตัวกรองสถานะ หรือเปิดปุ่ม "รวม Master FLOC ที่ว่าง" เพื่อดูโครงสร้างโรงงานทั้งหมด'
                      : 'Try clearing status filters or enabling "Include Standby FLOCs" to view all plant functional locations.'}
                  </p>
                </div>
              ) : (
                flocHierarchyTree.map(plantNode => {
                  const isPlantExpanded = expandedFlocIds.has(plantNode.id);
                  const plantBadge = getFlocReadinessBadge(plantNode.metrics.readinessStatus);

                  return (
                    <div
                      key={plantNode.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
                    >
                      {/* =========================================================
                          LEVEL 0: REFINERY PLANT ROOT HEADER
                         ========================================================= */}
                      <div
                        onClick={() => toggleFlocNode(plantNode.id)}
                        className="p-4 sm:px-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800/90 dark:to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none border-b border-slate-800"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-emerald-400 transition-colors shrink-0 mt-0.5 sm:mt-0"
                          >
                            {isPlantExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {plantNode.rootFlocCode}
                              </span>
                              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                                <Building2 size={16} className="text-teal-400 shrink-0" />
                                <span>
                                  {plantNode.plantName === 'Phra Khanong'
                                    ? (isTh ? 'โรงกลั่นบางจาก พระโขนง (Phra Khanong Refinery)' : 'Phra Khanong Refinery Complex (PK)')
                                    : (isTh ? 'โรงกลั่นบางจาก ศรีราชา (Sriracha Refinery)' : 'Sriracha Refinery Complex (SR)')}
                                </span>
                              </h3>
                              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                                Drawing: {plantNode.drawingRef}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 mt-1">
                              <span>
                                <strong className="text-white font-mono">{plantNode.unitNodes.length}</strong> {isTh ? 'หน่วยผลิต (FLOC L1)' : 'Units (FLOC L1)'}
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-white font-mono">
                                  {plantNode.unitNodes.reduce((acc, u) => acc + u.systemNodes.length, 0)}
                                </strong> {isTh ? 'ระบบย่อย (FLOC L2)' : 'Systems (FLOC L2)'}
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-emerald-400 font-mono">{plantNode.metrics.totalJobs}</strong> {isTh ? 'แพ็กเกจงานส่งมอบ' : 'Turnover Jobs'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Plant Level Aggregated Gate Telemetry & Progress */}
                        <div className="flex flex-wrap items-center gap-3 lg:gap-4 shrink-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              G1 Review: {plantNode.metrics.gate1}
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              G2 Sign: {plantNode.metrics.gate2}
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              G3 Punch: {plantNode.metrics.gate3}
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              G4 Done: {plantNode.metrics.gate4}
                            </span>
                          </div>

                          <div className="w-36 bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                              <span className="text-slate-400">{isTh ? 'ความพร้อมรวม' : 'Plant Readiness'}</span>
                              <span className="text-emerald-400">{plantNode.metrics.avgProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${plantNode.metrics.avgProgress}%` }}
                              />
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${plantBadge.cls}`}>
                            {plantBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* =========================================================
                          LEVEL 1: PROCESS UNITS / FLOC AREAS (FLOC L1)
                         ========================================================= */}
                      {isPlantExpanded && (
                        <div className="p-3 sm:p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
                          {plantNode.unitNodes.map(unitNode => {
                            const isUnitExpanded = expandedFlocIds.has(unitNode.id);
                            const unitBadge = getFlocReadinessBadge(unitNode.metrics.readinessStatus);

                            return (
                              <div
                                key={unitNode.id}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all"
                              >
                                {/* Unit (FLOC L1) Header Bar */}
                                <div
                                  onClick={() => toggleFlocNode(unitNode.id)}
                                  className="p-3.5 sm:px-4 bg-slate-50/90 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5 sm:mt-0"
                                    >
                                      {isUnitExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                    </button>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-blue-600 text-white shadow-2xs">
                                          L1 • {unitNode.flocCode}
                                        </span>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                          {unitNode.name}
                                        </h4>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${unitBadge.cls}`}>
                                          {unitBadge.label}
                                        </span>
                                        {unitNode.metrics.criticalCount > 0 && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                                            <Zap size={10} className="fill-orange-500" />
                                            <span>{unitNode.metrics.criticalCount} Critical</span>
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        <span>
                                          {isTh ? 'ระบบย่อย (L2):' : 'Systems (L2):'} <strong>{unitNode.systemNodes.length}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {isTh ? 'จำนวนงาน:' : 'Jobs:'} <strong>{unitNode.metrics.totalJobs}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {isTh ? 'ลายเซ็นตรวจรับ:' : 'Signatures:'} <strong className="font-mono text-emerald-600 dark:text-emerald-400">{unitNode.metrics.acceptedSigns}/{unitNode.metrics.totalSigns}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {isTh ? 'Punch คงค้าง:' : 'Open Punches:'}{' '}
                                          <strong className={unitNode.metrics.openCatA > 0 ? 'text-rose-600 dark:text-rose-400 font-mono' : 'font-mono'}>
                                            {unitNode.metrics.openPunches} ({unitNode.metrics.openCatA} Cat A)
                                          </strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Unit Right Metrics & Quick Create Button */}
                                  <div className="flex flex-wrap items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                    {/* Mini Gate Pills */}
                                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                                        G1:{unitNode.metrics.gate1}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                                        G2:{unitNode.metrics.gate2}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                                        G3:{unitNode.metrics.gate3}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                        G4:{unitNode.metrics.gate4}
                                      </span>
                                    </div>

                                    {/* Unit Progress Bar */}
                                    <div className="w-28">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                                        <span>Readiness</span>
                                        <span>{unitNode.metrics.avgProgress}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            unitNode.metrics.readinessStatus === 'HandedOver'
                                              ? 'bg-emerald-500'
                                              : unitNode.metrics.openCatA > 0
                                                ? 'bg-rose-500'
                                                : 'bg-emerald-500'
                                          }`}
                                          style={{ width: `${unitNode.metrics.avgProgress}%` }}
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateJobForFloc(unitNode.plantName, unitNode.name)}
                                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      title={isTh ? 'สร้างงานใหม่ในหน่วยผลิต (FLOC Unit) นี้' : 'Create new Turnover Job in this FLOC Unit'}
                                    >
                                      <Plus size={12} />
                                      <span>{isTh ? 'เพิ่มงานใน Unit' : '+ Job in Unit'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* =========================================================
                                    LEVEL 2: PROCESS SYSTEMS (FLOC L2) OR TURNOVER EVENTS
                                   ========================================================= */}
                                {isUnitExpanded && (
                                  <div className="p-3 sm:p-4 space-y-3 bg-white dark:bg-slate-900">
                                    {hierarchyGroupMode === 'unit-event' ? (
                                      /* MODE B: UNIT -> TURNOVER EVENT -> JOBS */
                                      unitNode.eventNodes.map(evNode => {
                                        const isEvExpanded = expandedFlocIds.has(evNode.id);
                                        const evBadge = getFlocReadinessBadge(evNode.metrics.readinessStatus);
                                        return (
                                          <div
                                            key={evNode.id}
                                            className="ml-2 sm:ml-5 border-l-2 border-teal-500/40 pl-3 sm:pl-4 space-y-2.5"
                                          >
                                            <div
                                              onClick={() => toggleFlocNode(evNode.id)}
                                              className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2.5">
                                                {isEvExpanded ? <ChevronDown size={14} className="text-teal-600" /> : <ChevronRight size={14} className="text-slate-400" />}
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getEventTagColor(evNode.eventName)}`}>
                                                  {evNode.eventName}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-500">
                                                  ({evNode.eventCode} • Target: {evNode.targetDate})
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${evBadge.cls}`}>
                                                  {evBadge.label}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-3 text-xs font-mono">
                                                <span>{evNode.metrics.totalJobs} {isTh ? 'งาน' : 'jobs'}</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{evNode.metrics.avgProgress}%</span>
                                              </div>
                                            </div>

                                            {isEvExpanded && (
                                              <div className="space-y-2 pl-2">
                                                {evNode.jobs.map(job => {
                                                  const prog = getJobProgressData(job);
                                                  return (
                                                    <div
                                                      key={job.id}
                                                      onClick={() => handleJumpToWorkspace(job)}
                                                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all"
                                                    >
                                                      <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                          <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                                                            {job.jobNo}
                                                          </span>
                                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                            L2: {job.system}
                                                          </span>
                                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                                            L3 Tag: {job.assetTag || '-'}
                                                          </span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                          {job.title}
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-3 shrink-0">
                                                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                          {prog.overallProgress}%
                                                        </span>
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleJumpToWorkspace(job);
                                                          }}
                                                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                        >
                                                          <span>Workspace</span>
                                                          <ArrowRight size={12} />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      /* MODE A: STANDARD 4-TIER ISO 55001 FLOC TREE (L1 Unit -> L2 System -> L3 Equipment & Jobs) */
                                      unitNode.systemNodes.map(sysNode => {
                                        const isSysExpanded = expandedFlocIds.has(sysNode.id);
                                        const sysBadge = getFlocReadinessBadge(sysNode.metrics.readinessStatus);

                                        return (
                                          <div
                                            key={sysNode.id}
                                            className="ml-2 sm:ml-5 border-l-2 border-indigo-500/30 dark:border-indigo-500/40 pl-3 sm:pl-4 space-y-2.5"
                                          >
                                            {/* System (FLOC L2) Node Header */}
                                            <div
                                              onClick={() => toggleFlocNode(sysNode.id)}
                                              className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 cursor-pointer transition-colors"
                                            >
                                              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                                                <CornerDownRight size={14} className="text-indigo-500 shrink-0 mt-0.5 sm:mt-0" />
                                                <button
                                                  type="button"
                                                  className="p-0.5 rounded text-slate-600 dark:text-slate-300 shrink-0"
                                                >
                                                  {isSysExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>

                                                <div className="min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-indigo-600 text-white">
                                                      L2 • {sysNode.flocCode}
                                                    </span>
                                                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                                                      {sysNode.name}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sysBadge.cls}`}>
                                                      {sysBadge.label}
                                                    </span>
                                                  </div>
                                                  <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                                    <span>FLOC Path: {unitNode.flocCode} &gt; {sysNode.flocCode}</span>
                                                    <span>•</span>
                                                    <span>{sysNode.equipmentNodes.length} {isTh ? 'อุปกรณ์ (L3)' : 'Equipment Tags (L3)'}</span>
                                                    <span>•</span>
                                                    <span>{sysNode.metrics.totalJobs} {isTh ? 'แพ็กเกจงาน' : 'Jobs'}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* System Level Metrics & Quick Add */}
                                              <div className="flex flex-wrap items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                                    Sign: {sysNode.metrics.acceptedSigns}/{sysNode.metrics.totalSigns}
                                                  </span>
                                                  {sysNode.metrics.openCatA > 0 ? (
                                                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold">
                                                      {sysNode.metrics.openCatA} Cat A
                                                    </span>
                                                  ) : sysNode.metrics.openPunches > 0 ? (
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold">
                                                      {sysNode.metrics.openPunches} Punch
                                                    </span>
                                                  ) : sysNode.metrics.totalJobs > 0 ? (
                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                                                      0 Punch
                                                    </span>
                                                  ) : null}
                                                </div>

                                                <div className="w-24 flex items-center gap-1.5">
                                                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                    <div
                                                      className={`h-full rounded-full ${
                                                        sysNode.metrics.readinessStatus === 'HandedOver'
                                                          ? 'bg-emerald-500'
                                                          : sysNode.metrics.openCatA > 0
                                                            ? 'bg-rose-500'
                                                            : 'bg-indigo-500'
                                                      }`}
                                                      style={{ width: `${sysNode.metrics.avgProgress}%` }}
                                                    />
                                                  </div>
                                                  <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                                                    {sysNode.metrics.avgProgress}%
                                                  </span>
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenCreateJobForFloc(sysNode.plantName, sysNode.unitName, sysNode.name)}
                                                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                  title={isTh ? 'เพิ่มใบงานในระบบย่อย (System L2) นี้' : 'Add Job Package to this System FLOC'}
                                                >
                                                  <Plus size={11} />
                                                  <span>{isTh ? 'เพิ่มงาน' : 'Add Job'}</span>
                                                </button>
                                              </div>
                                            </div>

                                            {/* =========================================================
                                                LEVEL 3: EQUIPMENT ASSET TAGS & LINKED JOB PACKAGES (FLOC L3)
                                               ========================================================= */}
                                            {isSysExpanded && (
                                              <div className="space-y-2.5 pl-3 sm:pl-6">
                                                {sysNode.equipmentNodes.length === 0 ? (
                                                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                                                    <span>{isTh ? 'ยังไม่มีใบงานที่ผูกกับระบบ FLOC นี้' : 'No active turnover jobs assigned to this FLOC system yet.'}</span>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenCreateJobForFloc(sysNode.plantName, sysNode.unitName, sysNode.name)}
                                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                                    >
                                                      + {isTh ? 'สร้างใบงานแรก' : 'Create First Job'}
                                                    </button>
                                                  </div>
                                                ) : (
                                                  sysNode.equipmentNodes.map(eqNode => (
                                                    <div
                                                      key={eqNode.id}
                                                      className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 sm:p-3.5 shadow-2xs hover:border-emerald-500/40 transition-all space-y-2.5"
                                                    >
                                                      {/* Equipment Tag (FLOC L3) Subheader */}
                                                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                                            <Tag size={10} />
                                                            <span>L3 EQUIPMENT • {eqNode.eqTag}</span>
                                                          </span>
                                                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                            {eqNode.description}
                                                          </span>
                                                          {eqNode.refCode && eqNode.refCode !== '-' && (
                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                              Ref: {eqNode.refCode}
                                                            </span>
                                                          )}
                                                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                                                            Grid: {eqNode.gridZone}
                                                          </span>
                                                        </div>

                                                        <span className="text-[10px] font-mono text-slate-400">
                                                          {eqNode.hierarchyPath}
                                                        </span>
                                                      </div>

                                                      {/* Linked Turnover Jobs for this Equipment Tag */}
                                                      <div className="space-y-2">
                                                        {eqNode.jobs.map(job => {
                                                          const progress = getJobProgressData(job);
                                                          const currentStepIdx =
                                                            progress.gate === 'Gate4' ? 4 :
                                                            progress.gate === 'Gate3' ? 3 :
                                                            progress.gate === 'Gate2' ? 2 : 1;

                                                          return (
                                                            <div
                                                              key={job.id}
                                                              onClick={() => handleJumpToWorkspace(job)}
                                                              className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/40 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3 cursor-pointer group transition-all"
                                                            >
                                                              {/* Job Identity & Scope */}
                                                              <div className="space-y-1.5 min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                                                    {job.jobNo}
                                                                  </span>
                                                                  <span className="text-[10px] font-mono text-slate-500">
                                                                    WO: {job.workOrder || '-'}
                                                                  </span>
                                                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getEventTagColor(job.eventName)}`}>
                                                                    {job.eventName}
                                                                  </span>
                                                                  {job.isCriticalPath && (
                                                                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                                                                      <Zap size={10} className="fill-orange-500" />
                                                                      <span>Critical Path</span>
                                                                    </span>
                                                                  )}
                                                                </div>

                                                                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                                  {job.title}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                                                  <span>{isTh ? 'ผู้รับผิดชอบ:' : 'Lead:'} <strong>{job.jobLead || 'Lead Turnaround Engineer'}</strong></span>
                                                                  {job.discipline && (
                                                                    <>
                                                                      <span>•</span>
                                                                      <span>{job.discipline}</span>
                                                                    </>
                                                                  )}
                                                                </div>
                                                              </div>

                                                              {/* 4-Gate Visual Stepper + Telemetry + Actions */}
                                                              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 xl:gap-4 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                                                                {/* 4-Gate Step Pipeline */}
                                                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                  {[
                                                                    { step: 1, label: 'G1 Review' },
                                                                    { step: 2, label: `G2 Sign (${progress.acceptSigns}/3)` },
                                                                    { step: 3, label: progress.openCatA > 0 ? `G3 Cat A (${progress.openCatA})` : `G3 Punch (${progress.openPunches})` },
                                                                    { step: 4, label: 'G4 T/O Cert' }
                                                                  ].map((gItem, idx) => {
                                                                    const isReached = currentStepIdx >= gItem.step;
                                                                    const isCurrent = currentStepIdx === gItem.step;
                                                                    const isBlockedStep = gItem.step === 3 && progress.openCatA > 0;
                                                                    return (
                                                                      <React.Fragment key={gItem.step}>
                                                                        <span
                                                                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                                                                            progress.isDone
                                                                              ? 'bg-emerald-500 text-white'
                                                                              : isBlockedStep
                                                                                ? 'bg-rose-600 text-white animate-pulse'
                                                                                : isCurrent
                                                                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                                                                  : isReached
                                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                                          }`}
                                                                        >
                                                                          {gItem.label}
                                                                        </span>
                                                                        {idx < 3 && <span className="text-slate-300 dark:text-slate-600 text-[10px]">→</span>}
                                                                      </React.Fragment>
                                                                    );
                                                                  })}
                                                                </div>

                                                                {/* Overall Progress */}
                                                                <div className="w-20 text-right font-mono">
                                                                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                                                                    {progress.overallProgress}%
                                                                  </span>
                                                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-0.5">
                                                                    <div
                                                                      className={`h-full rounded-full ${
                                                                        progress.isDone ? 'bg-emerald-500' : progress.openCatA > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                                                                      }`}
                                                                      style={{ width: `${progress.overallProgress}%` }}
                                                                    />
                                                                  </div>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setDetailsModalTab('general');
                                                                      setDetailsModalJob(job);
                                                                    }}
                                                                    className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                                                    title={isTh ? 'ดูข้อมูลสรุปย่อ (Quick Dossier)' : 'View Quick Dossier'}
                                                                  >
                                                                    <Eye size={14} />
                                                                  </button>
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleJumpToWorkspace(job)}
                                                                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                                                                    title={isTh ? 'เปิดใน Turnover Workspace' : 'Open in Turnover Workspace'}
                                                                  >
                                                                    <span>{isTh ? 'Workspace' : 'Workspace'}</span>
                                                                    <ArrowRight size={13} />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <th className="p-3">Job No & WO</th>
                  <th className="p-3">Event & Plant</th>
                  <th className="p-3">Unit & System</th>
                  <th className="p-3">Asset Tag</th>
                  <th className="p-3">Signatures</th>
                  <th className="p-3">Punch List</th>
                  <th className="p-3">Progress (%)</th>
                  <th className="p-3">Gate / Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                      {isTh ? 'ไม่พบรายการ Event & Job ตามเงื่อนไข' : 'No matching jobs found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
                    const progress = getJobProgressData(job);
                    return (
                      <tr 
                        key={job.id} 
                        onClick={() => handleJumpToWorkspace(job)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        {/* Job No & WO */}
                        <td className="p-3">
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleJumpToWorkspace(job); 
                            }}
                            className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer block text-left"
                            title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                          >
                            {job.jobNo}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                            {job.workOrder || '-'}
                          </span>
                        </td>

                        {/* Event & Plant */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                            {job.eventName || 'Turnaround 2026'}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            <span>{job.plant}</span>
                          </div>
                        </td>

                        {/* Unit & System */}
                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {job.unit}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            {job.system || '-'}
                          </div>
                        </td>

                        {/* Asset Tag */}
                        <td className="p-3">
                          {job.assetTag ? (
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                              {job.assetTag}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Signatures */}
                        <td className="p-3" onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToWorkspace(job);
                        }}>
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono font-bold hover:text-emerald-600 transition-colors">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span>{progress.acceptSigns}/{progress.totalSigns}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {progress.acceptSigns === progress.totalSigns ? 'ลงนามครบ' : 'ไปที่ Workspace'}
                          </div>
                        </td>

                        {/* Punch List */}
                        <td className="p-3" onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToWorkspace(job);
                        }}>
                          {progress.openCatA > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-0.5 hover:bg-rose-500/25">
                              <AlertOctagon size={11} />
                              <span>{progress.openCatA} Cat A</span>
                            </span>
                          ) : progress.openPunches > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25">
                              {progress.openPunches} Punch
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>Clear</span>
                            </span>
                          )}
                        </td>

                        {/* Progress (%) */}
                        <td className="p-3 w-28">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                            <span>{progress.overallProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.isDone ? 'bg-emerald-500' : progress.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.overallProgress}%` }}
                            />
                          </div>
                        </td>

                        {/* Gate / Status */}
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border w-fit ${
                            job.status === 'Completed' || progress.isDone
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                              : progress.openCatA > 0
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                                : progress.openPunches > 0
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                            {progress.isDone ? 'Completed' : progress.openCatA > 0 ? 'Blocked (A)' : job.status || 'In Progress'}
                          </span>
                        </td>

                        {/* Actions: View Details or Send to Turnover Workspace */}
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Quick View Dossier */}
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsModalTab('general');
                                setDetailsModalJob(job);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              title={isTh ? 'ดูข้อมูลสรุปย่อ (Quick Dossier)' : 'View Quick Dossier'}
                            >
                              <Eye size={13} />
                            </button>

                            {/* 2. Main Action: Send to Turnover Workspace */}
                            <button
                              type="button"
                              onClick={() => handleJumpToWorkspace(job)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                            >
                              <span>{isTh ? 'ไปยัง Workspace' : 'Workspace'}</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
              <span>{isTh ? `หน้า ${currentPage} จาก ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-6 h-6 rounded-md font-mono text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === idx + 1
                        ? 'bg-emerald-600 text-white'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <Briefcase size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isTh ? 'ไม่พบรายการ Event & Job ตามเงื่อนไขที่เลือก' : 'No Events or Jobs Found'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {isTh 
                  ? 'คลิกปุ่มด้านล่างเพื่อเปิดหน้าต่าง Popup สร้าง Event & Job ใหม่' 
                  : 'Click the button below to open the Create Event & Job Modal.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateModalTab('single');
                  setIsCreateModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{isTh ? 'สร้าง Event & Job ใหม่' : 'Create Event & Job'}</span>
              </button>
            </div>
          ) : (
            paginatedJobs.map((job) => {
              const progress = getJobProgressData(job);
              return (
                <div
                  key={job.id}
                  onClick={() => handleJumpToWorkspace(job)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer"
                >
                  {/* Left Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${getEventTagColor(job.eventName)}`}>
                        <Briefcase size={12} />
                        <span>{job.eventName || 'Annual Turnaround 2026'}</span>
                      </span>

                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-md">
                        {job.jobNo}
                      </span>

                      {job.isCriticalPath && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                          <Zap size={10} className="fill-orange-500" />
                          <span>Critical Path</span>
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        progress.isDone
                          ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                          : progress.openCatA > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                      }`}>
                        {progress.isDone ? 'Completed' : progress.openCatA > 0 ? 'Blocked Cat A' : job.status || 'In Progress'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {job.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Building2 size={12} />
                        <span>{job.plant}</span>
                      </span>
                      <span>·</span>
                      <span>{job.unit}</span>
                      <span>·</span>
                      <span className="font-mono">{job.system || '-'}</span>
                      {job.assetTag && (
                        <>
                          <span>·</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{job.assetTag}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Progress & Gate Status */}
                  <div className="flex sm:items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <div className="space-y-1.5 w-32">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-slate-800 dark:text-white">{progress.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress.isDone ? 'bg-emerald-500' : progress.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progress.overallProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Sign: {progress.acceptSigns}/3</span>
                        <span>Punch: {progress.openPunches}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsModalTab('general');
                          setDetailsModalJob(job);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title={isTh ? 'ดูข้อมูลสรุปย่อ' : 'View Quick Dossier'}
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleJumpToWorkspace(job)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                        title={isTh ? 'ส่งไปยัง Turnover Workspace' : 'Send to Turnover Workspace'}
                      >
                        <span>{isTh ? 'ไปยัง Workspace' : 'Workspace'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EVENT & JOB (POPUP MODAL)                                 */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isTh ? 'สร้าง Event & แผนงานส่งมอบระบบใหม่ (Create Job Package)' : 'Create Event & Job Package'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTh ? 'ลงทะเบียนแพ็กเกจงาน พร้อมระบบตรวจสอบรหัสซ้ำอัตโนมัติ' : 'Register turnover package with automatic duplicate validation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setCreateModalTab('single')}
                className={`py-2 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  createModalTab === 'single'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={14} />
                <span>{isTh ? 'สร้างรายแพ็กเกจ (Single Package)' : 'Single Package'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('bulk')}
                className={`py-2 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  createModalTab === 'bulk'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UploadCloud size={14} />
                <span>{isTh ? 'นำเข้าชุดข้อมูล (Bulk Import Excel/CSV)' : 'Bulk Ingestion'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {createModalTab === 'single' ? (
                <form onSubmit={handleCreateSingleJobSubmit} className="space-y-4">
                  {/* Top Bar inside form: Fill Sample Data Button */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs text-slate-500 font-medium">
                      {isTh ? 'สามารถกดเติมข้อมูลตัวอย่างเพื่อทดสอบระบบได้ทันที' : 'Use sample values for quick testing'}
                    </span>
                    <button
                      type="button"
                      onClick={handleFillSampleData}
                      className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>{isTh ? 'กรอกข้อมูลตัวอย่าง' : 'Fill Sample'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Plant Selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'โรงงาน (Plant) *' : 'Plant *'}
                      </label>
                      <select
                        value={newPlant}
                        onChange={(e) => setNewPlant(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none cursor-pointer"
                      >
                        <option value="Phra Khanong">โรงกลั่นพระโขนง (Phra Khanong Refinery)</option>
                        <option value="Sriracha">โรงกลั่นศรีราชา (Sriracha Refinery)</option>
                      </select>
                    </div>

                    {/* Event Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'ชื่ออีเวนต์ (Event Name) *' : 'Event Name *'}
                      </label>
                      <select
                        value={uniqueEvents.includes(newEventName) ? newEventName : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setNewEventName(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none cursor-pointer mb-1.5"
                      >
                        {uniqueEvents.map(ev => (
                          <option key={ev} value={ev}>{ev}</option>
                        ))}
                        <option value="__custom__">{isTh ? '+ พิมพ์ชื่ออีเวนต์กำหนดเอง...' : '+ Custom Event Name...'}</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        placeholder="e.g. Annual Turnaround 2026"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Job ID with Duplicate Check */}
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isTh ? 'รหัสงาน (Job ID / Job No) *' : 'Job ID / Job No *'}
                        </label>
                        {newJobId.trim() && (
                          <span className={`text-[11px] font-bold flex items-center gap-1 ${
                            isNewJobIdDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isNewJobIdDuplicate ? <AlertOctagon size={12} /> : <CheckCircle2 size={12} />}
                            <span>{isNewJobIdDuplicate ? 'รหัสนี้ซ้ำในระบบ (ห้ามใช้)' : 'รหัสใช้งานได้ (Unique ID)'}</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={newJobId}
                        onChange={(e) => setNewJobId(e.target.value)}
                        placeholder="e.g. TO-PK-2026-088"
                        className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border outline-none transition-colors ${
                          isNewJobIdDuplicate
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-200'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>

                    {/* Unit / Area */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'หน่วยผลิต (Unit / Area) *' : 'Unit / Area *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="e.g. APS-1 (Atmospheric Distillation Unit 1)"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* System */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'ระบบย่อย (System) *' : 'System *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newSystem}
                        onChange={(e) => setNewSystem(e.target.value)}
                        placeholder="e.g. System-11 (Crude Feed & Desalter)"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Asset Tag & Work Order */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'รหัสอุปกรณ์ (Asset Tag)' : 'Asset Tag'}
                      </label>
                      <input
                        type="text"
                        value={newAssetTag}
                        onChange={(e) => setNewAssetTag(e.target.value)}
                        placeholder="e.g. E-204"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'เลขที่ใบสั่งงาน (Work Order)' : 'Work Order No'}
                      </label>
                      <input
                        type="text"
                        value={newWorkOrder}
                        onChange={(e) => setNewWorkOrder(e.target.value)}
                        placeholder="e.g. WO-449102"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    {/* Discipline & Job Lead */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'สาขาวิชาชีพ (Discipline)' : 'Discipline'}
                      </label>
                      <select
                        value={newDiscipline}
                        onChange={(e) => setNewDiscipline(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none cursor-pointer"
                      >
                        <option value="M - Mechanical">M — Mechanical</option>
                        <option value="P - Piping">P — Piping</option>
                        <option value="E - Electrical">E — Electrical</option>
                        <option value="I - Instrumentation">I — Instrumentation</option>
                        <option value="C - Civil & Structure">C — Civil & Structure</option>
                        <option value="Ins - Insulation">Ins — Insulation</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'หัวหน้าวิศวกรผู้รับผิดชอบ (Job Lead)' : 'Job Lead'}
                      </label>
                      <input
                        type="text"
                        value={newJobLead}
                        onChange={(e) => setNewJobLead(e.target.value)}
                        placeholder="e.g. Somchai Prasert"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                      />
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'วันเริ่มแผนงาน (Target Start)' : 'Target Start Date'}
                      </label>
                      <input
                        type="date"
                        value={newTargetStartDate}
                        onChange={(e) => setNewTargetStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isTh ? 'วันส่งมอบตามแผน (Planned Turnover)' : 'Planned Turnover Date'}
                      </label>
                      <input
                        type="date"
                        value={newPlannedTurnoverDate}
                        onChange={(e) => setNewPlannedTurnoverDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isTh ? 'ขอบเขตงานโดยละเอียด (Scope Summary & Description) *' : 'Scope Description *'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="ระบุรายละเอียดงาน เช่น งานล้างทำความสะอาด, เปลี่ยนปะเก็น, ทดสอบแรงดันน้ำ..."
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Critical Path Checkbox */}
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-orange-200 dark:border-orange-950/80 bg-orange-50/50 dark:bg-orange-950/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsCriticalPath}
                      onChange={(e) => setNewIsCriticalPath(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-orange-900 dark:text-orange-300 flex items-center gap-1">
                        <Zap size={14} className="text-orange-500" />
                        <span>{isTh ? 'กำหนดเป็นงานเส้นทางวิกฤต (Critical Path Milestone)' : 'Mark as Critical Path'}</span>
                      </span>
                      <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80">
                        {isTh ? 'งานนี้จะถูกจัดลำดับความสำคัญสูงสุด และติดตามรายชั่วโมงใน Dashboard' : 'Monitored with highest priority in executive control tower'}
                      </p>
                    </div>
                  </label>

                  {/* Submit & Cancel Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {isTh ? 'ยกเลิก' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={isNewJobIdDuplicate || !newJobId.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={16} />
                      <span>{isTh ? 'ยืนยันสร้าง Event & Job' : 'Create & Register Job'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <BulkTurnoverJobIngestion
                    onClose={() => setIsCreateModalOpen(false)}
                    onSwitchToSingle={() => setCreateModalTab('single')}
                    onBatchCreateTurnoverJobs={(newTurnoverJobs) => {
                      const res = batchCreateJobs(newTurnoverJobs);
                      if (!res.success) {
                        alert(res.error || 'Duplicate IDs found in batch.');
                        return;
                      }
                      showToast(isTh ? `✓ นำเข้าชุดข้อมูลสำเร็จ ${res.addedCount} รายการ` : `✓ Ingested ${res.addedCount} jobs successfully!`);
                      setIsCreateModalOpen(false);
                    }}
                    onSuccess={(count) => {
                      showToast(isTh ? `✓ ดำเนินการนำเข้าสำเร็จ ${count} รายการ` : `✓ Ingested ${count} jobs`);
                      setIsCreateModalOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL JOB DOSSIER DETAILS (POPUP MODAL)                           */}
      {/* ========================================================================= */}
      {detailsModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getEventTagColor(detailsModalJob.eventName)}`}>
                    {detailsModalJob.eventName || 'Annual Turnaround 2026'}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                    {detailsModalJob.jobNo}
                  </span>
                  {detailsModalJob.isCriticalPath && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <Zap size={10} className="fill-orange-500" />
                      <span>Critical Path</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {detailsModalJob.plant}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white line-clamp-1">
                  {detailsModalJob.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDetailsModalJob(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto shrink-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setDetailsModalTab('general')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                  detailsModalTab === 'general'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isTh ? '1. ข้อมูลทั่วไป & Asset' : '1. General & Asset'}
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('signatures')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'signatures'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '2. ผลการลงนามตรวจรับ' : '2. Signatures'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.signatures || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('punches')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'punches'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '3. รายการ Punch List' : '3. Punch List'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.punchList || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalTab('attachments')}
                className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailsModalTab === 'attachments'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{isTh ? '4. เอกสารแนบ' : '4. Attachments'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                  {(detailsModalJob.attachments || []).length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsModalTab === 'general' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {isTh ? 'รายละเอียดเนื้องาน (Scope Description)' : 'Scope Description'}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {detailsModalJob.description || detailsModalJob.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'โรงงาน' : 'Plant'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.plant}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'หน่วยผลิต (Unit)' : 'Unit'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.unit}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'ระบบ (System)' : 'System'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.system}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'รหัสอุปกรณ์ (Asset Tag)' : 'Asset Tag'}</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{detailsModalJob.assetTag || 'N/A'}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'เลขที่ใบสั่งงาน (WO)' : 'Work Order'}</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailsModalJob.workOrder || '-'}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{isTh ? 'วิศวกรผู้รับผิดชอบ' : 'Lead Engineer'}</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{detailsModalJob.jobLead || 'Lead Turnover Engineer'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin size={14} className="text-emerald-500" />
                        <span>พิกัดผังโรงงาน (CAD Drawing Relative Coordinates)</span>
                      </span>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                        X: {detailsModalJob.plotPlanX || 50.0}% • Y: {detailsModalJob.plotPlanY || 50.0}% • Grid: {detailsModalJob.gridZone || 'B2'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-mono text-[11px] font-bold">
                      Calibrated
                    </span>
                  </div>
                </div>
              )}

              {detailsModalTab === 'signatures' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      {isTh ? 'บันทึกการลงนามตรวจรับมอบงาน' : 'Acceptance Signatures Log'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {(detailsModalJob.signatures || []).filter(s => s.decision === 'Accept').length} / 3 Complete
                    </span>
                  </div>

                  {(detailsModalJob.signatures || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ยังไม่มีบันทึกการลงนามในระบบ สามารถลงนามได้ใน Turnover Workspace' : 'No signatures recorded yet.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(detailsModalJob.signatures || []).map((sig, i) => (
                        <div
                          key={sig.id || i}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {sig.role}
                              </span>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                sig.decision === 'Accept'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}>
                                {sig.decision}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              {sig.name} · {sig.signedAt}
                            </div>
                            {sig.comment && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">"{sig.comment}"</p>
                            )}
                          </div>

                          <CheckCircle2 size={18} className={sig.decision === 'Accept' ? 'text-emerald-500' : 'text-rose-500'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailsModalTab === 'punches' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      {isTh ? 'รายการ Punch List ประจำงาน' : 'Job Punch Items'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {(detailsModalJob.punchList || []).length} {isTh ? 'รายการ' : 'items'}
                    </span>
                  </div>

                  {(detailsModalJob.punchList || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ไม่มี Punch List ค้าง (Zero Punch Clearance)' : 'No punch items for this job.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(detailsModalJob.punchList || []).map((punch, idx) => (
                        <div
                          key={punch.id || idx}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                punch.category === 'A'
                                  ? 'bg-rose-500 text-white'
                                  : punch.category === 'B'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-blue-500 text-white'
                              }`}>
                                Cat {punch.category}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {punch.item || `PL-${idx + 1}`}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              punch.status === 'Resolved' || punch.status === 'Closed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {punch.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {punch.description}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <span>{punch.contractor || 'BCP Maintenance'}</span>
                            <span>{punch.plannedDate || punch.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailsModalTab === 'attachments' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {isTh ? 'ไฟล์เอกสารและรายงานแนบ' : 'Attached Documents'}
                  </h4>

                  {(detailsModalJob.attachments || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      {isTh ? 'ไม่มีเอกสารแนบในใบงานนี้' : 'No attachments found.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(detailsModalJob.attachments || []).map((att, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={16} className="text-emerald-500 shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{att.size}</span>
                            </div>
                          </div>
                          <span className="text-slate-400 text-xs">PDF Document</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer: DISPATCH TO TURNOVER WORKSPACE */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setDetailsModalJob(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const j = detailsModalJob;
                  setDetailsModalJob(null);
                  if (j) handleJumpToWorkspace(j);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{isTh ? 'ส่งไปยัง Turnover Workspace' : 'Open in Turnover Workspace'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXPORT OPTIONS MODAL                                              */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-600 flex items-center justify-center font-bold">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isTh ? 'ส่งออกข้อมูลงาน (Export Data)' : 'Export Turnover Data'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTh ? 'เลือกขอบเขตและรูปแบบไฟล์ที่ต้องการ' : 'Select scope and export format'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? '1. ขอบเขตข้อมูลที่ต้องการส่งออก (Export Scope)' : '1. Export Scope'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExportScope('filtered')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'filtered'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p>{isTh ? 'เฉพาะผลการกรอง' : 'Filtered Only'}</p>
                    <span className="text-[10px] text-slate-400">{filteredJobs.length} {isTh ? 'รายการ' : 'jobs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p>{isTh ? 'ทุกงานในโรงงาน' : 'All Plant Jobs'}</p>
                    <span className="text-[10px] text-slate-400">{plantScopedJobs.length} {isTh ? 'รายการ' : 'jobs'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? '2. รูปแบบไฟล์ (Export Format)' : '2. Format'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    CSV Spreadsheet (.csv)
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      exportFormat === 'json'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    JSON Full Backup (.json)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  {isTh ? 'ดาวน์โหลดทันที' : 'Download Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
