import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Search,
  Check,
  Layers,
  ArrowRight,
  FolderTree,
  Building2,
  Tag,
  ClipboardPaste,
  X,
  FileCheck,
  ExternalLink,
  ChevronDown,
  Filter
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  S2_TURNOVER_HIERARCHY, 
  UnitRecord, 
  SystemRecord, 
  EquipmentRecord 
} from '../data/s2FunctionalLocationData';
import { 
  FlatAssetHierarchyItem, 
  getAllFlattenedAssets, 
  getHierarchyUnits, 
  getSystemsForUnit, 
  getEquipmentForSystem, 
  findAssetByTag 
} from '../data/functionalLocationHierarchyHelper';
import AssetHierarchySelectModal from './functional-location/AssetHierarchySelectModal';
import { JobRecord } from './JobLocationTurnoverPrototype';

export interface BulkTurnoverRow {
  id: string;
  title: string;
  plant: 'Phra Khanong' | 'Sriracha';
  unitId: string;
  systemId: string;
  assetTag: string;
  workOrder: string;
  description: string;
  isCriticalPath: boolean;
  targetDate: string;
}

interface BulkTurnoverJobInsertProps {
  onBulkSubmit: (newJobs: JobRecord[]) => void;
  onNavigateToWorkspace?: (jobId: string) => void;
  onNavigateToDashboard?: () => void;
  initialEventName?: string;
  initialPlant?: 'Phra Khanong' | 'Sriracha';
  initialMilestone?: string;
}

// Curated Turnaround Presets
export const SAMPLE_TURNAROUND_CRITICAL_BATCH: BulkTurnoverRow[] = [
  {
    id: 'row-1',
    title: 'Overhaul & Inspection of S2-DR-001D-180 (Desalter Drum Vessel)',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-11',
    assetTag: 'S2-DR-001D-180',
    workOrder: 'WO-APS1-884021',
    description: 'Internal electrostatic grid cleaning, isolation spool blinding, and shell ultrasonic thickness gauging.',
    isCriticalPath: true,
    targetDate: '2026-11-15'
  },
  {
    id: 'row-2',
    title: 'Hydro-jet & Eddy Current of S2-C-101 T-101 (Crude Column Trays & Overhead)',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-13',
    assetTag: 'S2-C-101 T-101',
    workOrder: 'WO-APS1-884022',
    description: 'Fractionation column bubble cap tray inspection, hydro-jet wash, and overhead condenser retubing.',
    isCriticalPath: true,
    targetDate: '2026-11-18'
  },
  {
    id: 'row-3',
    title: 'Catalyst Unloading & NDT of S2-R-201 RX (KHF-1 Hydrotreating Reactor)',
    plant: 'Phra Khanong',
    unitId: 'unit-khf1',
    systemId: 'sys-21',
    assetTag: 'S2-R-201 RX',
    workOrder: 'WO-KHF1-884025',
    description: 'Hydrotreating reactor catalyst skimming, internal Johnson screen NDT, and manway gasket replacement.',
    isCriticalPath: true,
    targetDate: '2026-11-20'
  },
  {
    id: 'row-4',
    title: 'Burner & Radiant Tube Inspection of S2-VF-201 (Vacuum Pipestill Furnace)',
    plant: 'Sriracha',
    unitId: 'unit-vps2',
    systemId: 'sys-v01',
    assetTag: 'S2-VF-201 FURNACE',
    workOrder: 'WO-VPS2-884030',
    description: 'Fired heater decoking, radiant coil ultrasonic scan, low-NOx burner tip renewal, and draft damper alignment.',
    isCriticalPath: true,
    targetDate: '2026-11-22'
  },
  {
    id: 'row-5',
    title: 'Mechanical Seal & Coupling Overhaul for S2-P-101A (Crude Charge Pump)',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-11',
    assetTag: 'S2-P-101A',
    workOrder: 'WO-APS1-884035',
    description: 'Centrifugal charge pump API 682 Plan 53A dual seal replacement, shaft laser alignment, and vibration baseline.',
    isCriticalPath: false,
    targetDate: '2026-11-10'
  }
];

export const SAMPLE_APS1_BATCH: BulkTurnoverRow[] = [
  {
    id: 'row-aps-1',
    title: 'Desalter Drum S2-DR-001D-180 Flange Blinding & Grid Renewal',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-11',
    assetTag: 'S2-DR-001D-180',
    workOrder: 'WO-APS1-99101',
    description: 'Execute blinding protocol, remove sediment buildup, test transformer bushing, and renew internal collector pipes.',
    isCriticalPath: true,
    targetDate: '2026-11-12'
  },
  {
    id: 'row-aps-2',
    title: 'Atmospheric Column T-101 Manway Access & Tray Inspection',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-13',
    assetTag: 'S2-C-101 T-101',
    workOrder: 'WO-APS1-99102',
    description: 'Open manways #1 through #6, inspect valve trays for fouling, replace damaged valves, and verify downcomer clearances.',
    isCriticalPath: true,
    targetDate: '2026-11-16'
  },
  {
    id: 'row-aps-3',
    title: 'Furnace F-101 Radiant Tubes Coking Verification & Pigging',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-12',
    assetTag: 'S2-F-101',
    workOrder: 'WO-APS1-99103',
    description: 'Mechanical pigging of radiant passes 1 to 4, tube thickness verification via intelligent pigging, and refractory patch repair.',
    isCriticalPath: false,
    targetDate: '2026-11-14'
  },
  {
    id: 'row-aps-4',
    title: 'Crude Booster Pump P-101B Overhaul & Alignment',
    plant: 'Phra Khanong',
    unitId: 'unit-aps1',
    systemId: 'sys-11',
    assetTag: 'S2-P-101B',
    workOrder: 'WO-APS1-99104',
    description: 'Replace pump bearings, install new cartridge mechanical seal, verify coupling runout, and perform static pressure test.',
    isCriticalPath: false,
    targetDate: '2026-11-10'
  }
];

export const SAMPLE_VPS2_BATCH: BulkTurnoverRow[] = [
  {
    id: 'row-vps-1',
    title: 'Vacuum Pipestill Furnace S2-VF-201 Convection Bank Cleaning',
    plant: 'Sriracha',
    unitId: 'unit-vps2',
    systemId: 'sys-v01',
    assetTag: 'S2-VF-201 FURNACE',
    workOrder: 'WO-VPS2-77201',
    description: 'Soot blowing, dry ice blasting of finned tubes, damper drive torque calibration, and skin thermocouple replacements.',
    isCriticalPath: true,
    targetDate: '2026-11-20'
  },
  {
    id: 'row-vps-2',
    title: 'Vacuum Tower S2-VC-201 Packed Bed Inspection & Distributor Leveling',
    plant: 'Sriracha',
    unitId: 'unit-vps2',
    systemId: 'sys-v02',
    assetTag: 'S2-VC-201 TOWER',
    workOrder: 'WO-VPS2-77202',
    description: 'Structured packing inspection in flash zone, wash oil distributor water test, and bottom collector baffle repair.',
    isCriticalPath: true,
    targetDate: '2026-11-24'
  },
  {
    id: 'row-vps-3',
    title: 'Vacuum Bottom Residue Pump P-202A Overhaul',
    plant: 'Sriracha',
    unitId: 'unit-vps2',
    systemId: 'sys-v02',
    assetTag: 'S2-VP-202A',
    workOrder: 'WO-VPS2-77203',
    description: 'High temperature heavy residue pump overhaul, Plan 54 barrier fluid flush, and dynamic balancing of impeller.',
    isCriticalPath: false,
    targetDate: '2026-11-18'
  }
];

export default function BulkTurnoverJobInsert({
  onBulkSubmit,
  onNavigateToWorkspace,
  onNavigateToDashboard,
  initialEventName = 'Major Overhaul Q4 2026',
  initialPlant = 'Phra Khanong',
  initialMilestone = 'Major Turnaround Overhaul (TA)'
}: BulkTurnoverJobInsertProps) {
  const { isTh } = useLanguage();

  // Batch Event Information Header
  const [eventName, setEventName] = useState(initialEventName);
  const [eventPlant, setEventPlant] = useState<'Phra Khanong' | 'Sriracha'>(initialPlant);
  const [eventMilestone, setEventMilestone] = useState(initialMilestone);
  const [eventDefaultDate, setEventDefaultDate] = useState('2026-11-20');

  // Spreadsheet Rows State
  const [rows, setRows] = useState<BulkTurnoverRow[]>(SAMPLE_TURNAROUND_CRITICAL_BATCH);
  const [searchFilter, setSearchFilter] = useState('');
  const [plantFilter, setPlantFilter] = useState<'ALL' | 'Phra Khanong' | 'Sriracha'>('ALL');

  // Modal / Paste States
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [activeModalRowIndex, setActiveModalRowIndex] = useState<number | null>(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);

  // Success Submission State
  const [createdJobsResult, setCreatedJobsResult] = useState<JobRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flattened asset data
  const allAssets = useMemo(() => getAllFlattenedAssets(), []);
  const hierarchyUnits = useMemo(() => getHierarchyUnits(), []);

  // Filter units matching a plant
  const getUnitsForPlant = (plant: 'Phra Khanong' | 'Sriracha') => {
    return hierarchyUnits.filter(u => {
      if (plant === 'Sriracha') return u.id === 'unit-vps2';
      return u.id === 'unit-aps1' || u.id === 'unit-khf1';
    });
  };

  // Helper to validate a row
  const getRowIssues = (row: BulkTurnoverRow): string[] => {
    const issues: string[] = [];
    if (!row.title.trim()) issues.push(isTh ? 'กรุณากรอกชื่องาน' : 'Missing job title');
    if (!row.assetTag) issues.push(isTh ? 'กรุณาระบุ Asset Tag' : 'Missing asset tag');
    if (!row.workOrder.trim()) issues.push(isTh ? 'กรุณากรอก Work Order' : 'Missing work order');
    return issues;
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = rows.length;
    const invalidCount = rows.filter(r => getRowIssues(r).length > 0).length;
    const validCount = total - invalidCount;
    const criticalCount = rows.filter(r => r.isCriticalPath).length;
    const pkCount = rows.filter(r => r.plant === 'Phra Khanong').length;
    const srCount = rows.filter(r => r.plant === 'Sriracha').length;

    return { total, validCount, invalidCount, criticalCount, pkCount, srCount };
  }, [rows, isTh]);

  // Filtered rows for table view
  const visibleRows = useMemo(() => {
    return rows.filter(r => {
      if (plantFilter !== 'ALL' && r.plant !== plantFilter) return false;
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase().trim();
      return (
        r.title.toLowerCase().includes(q) ||
        r.assetTag.toLowerCase().includes(q) ||
        r.workOrder.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [rows, searchFilter, plantFilter]);

  // Row Manipulation Handlers
  const handleAddRow = () => {
    const defaultUnit = eventPlant === 'Sriracha' ? 'unit-vps2' : 'unit-aps1';
    const systems = getSystemsForUnit(defaultUnit);
    const defaultSystem = systems[0]?.id || 'sys-11';
    const equipment = getEquipmentForSystem(defaultUnit, defaultSystem);
    const defaultEq = equipment[0]?.tag || 'S2-DR-001D-180';

    const newRow: BulkTurnoverRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: `Overhaul & Inspection of ${defaultEq}`,
      plant: eventPlant,
      unitId: defaultUnit,
      systemId: defaultSystem,
      assetTag: defaultEq,
      workOrder: `WO-${defaultUnit.replace('unit-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      description: 'Standard turnaround mechanical overhaul, blinding isolation, and QA/QC punch list verification.',
      isCriticalPath: false,
      targetDate: eventDefaultDate
    };

    setRows(prev => [...prev, newRow]);
  };

  const handleAdd5Rows = () => {
    const newItems: BulkTurnoverRow[] = Array.from({ length: 5 }, (_, i) => {
      const plant = i % 2 === 0 ? eventPlant : (eventPlant === 'Phra Khanong' ? 'Sriracha' : 'Phra Khanong');
      const unit = plant === 'Sriracha' ? 'unit-vps2' : (i % 3 === 0 ? 'unit-khf1' : 'unit-aps1');
      const systems = getSystemsForUnit(unit);
      const system = systems[0]?.id || 'sys-11';
      const eqList = getEquipmentForSystem(unit, system);
      const eq = eqList[i % Math.max(eqList.length, 1)]?.tag || 'S2-DR-001D-180';

      return {
        id: `row-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        title: `Package #${rows.length + i + 1}: Maintenance of ${eq}`,
        plant,
        unitId: unit,
        systemId: system,
        assetTag: eq,
        workOrder: `WO-${unit.replace('unit-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        description: 'Scheduled turnaround package inspection, non-destructive testing, and boundary sign-off.',
        isCriticalPath: i === 0,
        targetDate: eventDefaultDate
      };
    });

    setRows(prev => [...prev, ...newItems]);
  };

  const handleDuplicateRow = (index: number) => {
    const target = rows[index];
    if (!target) return;
    const duplicated: BulkTurnoverRow = {
      ...target,
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: `${target.title} (Copy)`,
      workOrder: `WO-${target.unitId.replace('unit-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
    };
    const next = [...rows];
    next.splice(index + 1, 0, duplicated);
    setRows(next);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      alert(isTh ? 'ต้องมีรายการอย่างน้อย 1 แถวในตาราง' : 'At least 1 row is required');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateField = <K extends keyof BulkTurnoverRow>(
    id: string, 
    field: K, 
    value: BulkTurnoverRow[K]
  ) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;

      const updated = { ...r, [field]: value };

      // Handle cascading updates
      if (field === 'plant') {
        const plantVal = value as 'Phra Khanong' | 'Sriracha';
        const validUnits = getUnitsForPlant(plantVal);
        if (!validUnits.some(u => u.id === r.unitId)) {
          const newUnitId = validUnits[0]?.id || 'unit-aps1';
          updated.unitId = newUnitId;
          const systems = getSystemsForUnit(newUnitId);
          updated.systemId = systems[0]?.id || 'sys-11';
          const eqList = getEquipmentForSystem(newUnitId, updated.systemId);
          updated.assetTag = eqList[0]?.tag || '';
        }
      } else if (field === 'unitId') {
        const unitVal = value as string;
        const systems = getSystemsForUnit(unitVal);
        updated.systemId = systems[0]?.id || '';
        const eqList = getEquipmentForSystem(unitVal, updated.systemId);
        updated.assetTag = eqList[0]?.tag || '';
      } else if (field === 'systemId') {
        const sysVal = value as string;
        const eqList = getEquipmentForSystem(r.unitId, sysVal);
        updated.assetTag = eqList[0]?.tag || '';
      } else if (field === 'assetTag') {
        const found = findAssetByTag(value as string);
        if (found && !r.title.includes(found.tag)) {
          updated.title = `Overhaul & Inspection of ${found.tag} (${found.description || 'Equipment'})`;
        }
      }

      return updated;
    }));
  };

  // Batch Auto-Operations
  const handleApplyEventScopeToAll = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      plant: eventPlant,
      targetDate: eventDefaultDate
    })));
  };

  const handleAutoGenerateAllWOs = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      workOrder: `WO-${r.unitId.replace('unit-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
    })));
  };

  const handleAutoGenerateAllTitles = () => {
    setRows(prev => prev.map(r => {
      const asset = findAssetByTag(r.assetTag);
      const desc = asset?.description ? ` (${asset.description})` : '';
      return {
        ...r,
        title: `Overhaul & Verification of ${r.assetTag}${desc}`
      };
    }));
  };

  const handleClearAll = () => {
    if (confirm(isTh ? 'คุณต้องการล้างข้อมูลทั้งหมดในตารางใช่หรือไม่?' : 'Clear all rows in the bulk table?')) {
      const defaultUnit = eventPlant === 'Sriracha' ? 'unit-vps2' : 'unit-aps1';
      const systems = getSystemsForUnit(defaultUnit);
      setRows([
        {
          id: `row-${Date.now()}`,
          title: '',
          plant: eventPlant,
          unitId: defaultUnit,
          systemId: systems[0]?.id || 'sys-11',
          assetTag: 'S2-DR-001D-180',
          workOrder: `WO-${defaultUnit.replace('unit-', '').toUpperCase()}-881001`,
          description: '',
          isCriticalPath: false,
          targetDate: eventDefaultDate
        }
      ]);
    }
  };

  // CSV Template Export
  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Job Title',
      'Plant',
      'Unit No',
      'Process System',
      'Asset Tag',
      'Work Order',
      'Scope of Work',
      'Critical Path (YES/NO)',
      'Target Date'
    ].join(',');

    const sampleCsvRows = rows.map(r => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(r.title),
        escape(r.plant),
        escape(r.unitId),
        escape(r.systemId),
        escape(r.assetTag),
        escape(r.workOrder),
        escape(r.description),
        r.isCriticalPath ? 'YES' : 'NO',
        escape(r.targetDate)
      ].join(',');
    });

    const csvContent = [headers, ...sampleCsvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Turnaround_Job_Packages_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (!text) return;
      parseImportedText(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Smart Parser for CSV / TSV / Excel Copy-Paste
  const parseImportedText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    const delimiter = rawText.includes('\t') ? '\t' : ',';
    const startIndex = lines[0].toLowerCase().includes('job title') || lines[0].toLowerCase().includes('title') ? 1 : 0;
    const newRows: BulkTurnoverRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV regex splitter that respects quotes
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const title = parts[0] || `Turnaround Job Package #${newRows.length + 1}`;
      const plantRaw = parts[1] || '';
      const plant: 'Phra Khanong' | 'Sriracha' = 
        plantRaw.toLowerCase().includes('sriracha') ? 'Sriracha' : 'Phra Khanong';

      let unitId = parts[2] || (plant === 'Sriracha' ? 'unit-vps2' : 'unit-aps1');
      if (!unitId.startsWith('unit-')) {
        const foundU = hierarchyUnits.find(u => u.name.toLowerCase().includes(unitId.toLowerCase()));
        if (foundU) unitId = foundU.id;
      }

      let systemId = parts[3] || '';
      const systems = getSystemsForUnit(unitId);
      if (!systems.some(s => s.id === systemId)) {
        const foundS = systems.find(s => s.name.toLowerCase().includes(systemId.toLowerCase()));
        systemId = foundS ? foundS.id : (systems[0]?.id || 'sys-11');
      }

      const assetTag = parts[4] || 'S2-DR-001D-180';
      const wo = parts[5] || `WO-${unitId.replace('unit-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const desc = parts[6] || 'Scheduled turnaround mechanical package inspection.';
      const isCrit = (parts[7] || '').toUpperCase() === 'YES' || (parts[7] || '').toUpperCase() === 'TRUE';
      const targetDate = parts[8] || eventDefaultDate;

      newRows.push({
        id: `imported-${Date.now()}-${i}`,
        title,
        plant,
        unitId,
        systemId,
        assetTag,
        workOrder: wo,
        description: desc,
        isCriticalPath: isCrit,
        targetDate
      });
    }

    if (newRows.length > 0) {
      setRows(newRows);
      alert(isTh ? `นำเข้าข้อมูลสำเร็จ ${newRows.length} รายการ!` : `Successfully imported ${newRows.length} job packages!`);
    } else {
      alert(isTh ? 'ไม่พบข้อมูลที่สามารถนำเข้าได้ ตรวจสอบรูปแบบไฟล์' : 'No valid rows found in imported text');
    }
  };

  // Submit all valid rows into Turnaround System
  const handleBulkSubmit = () => {
    const invalidRows = rows.filter(r => getRowIssues(r).length > 0);
    if (invalidRows.length > 0) {
      const confirmProceed = confirm(
        isTh 
          ? `พบข้อมูลที่ไม่สมบูรณ์ ${invalidRows.length} รายการ ต้องการส่งเฉพาะรายการที่สมบูรณ์ (${metrics.validCount} รายการ) หรือไม่?`
          : `${invalidRows.length} rows have validation issues. Do you want to submit only the ${metrics.validCount} valid rows?`
      );
      if (!confirmProceed) return;
    }

    const validRowsToSubmit = rows.filter(r => getRowIssues(r).length === 0);
    if (validRowsToSubmit.length === 0) {
      alert(isTh ? 'ไม่มีรายการที่สมบูรณ์สำหรับส่งข้อมูล' : 'No valid rows ready to submit');
      return;
    }

    const createdJobRecords: JobRecord[] = validRowsToSubmit.map((row, idx) => {
      const randomNum = Math.floor(1000 + Math.random() * 9000) + idx;
      const plantCode = row.plant === 'Phra Khanong' ? 'PK' : 'SR';
      const newJobNo = `TO-${plantCode}-2026-${randomNum}`;
      const newId = `job-bulk-${Date.now()}-${idx}`;

      const unitRecord = S2_TURNOVER_HIERARCHY.find(u => u.id === row.unitId) || S2_TURNOVER_HIERARCHY[0];
      const systemRecord = unitRecord.systems.find(s => s.id === row.systemId) || unitRecord.systems[0];
      const assetItem = findAssetByTag(row.assetTag);

      return {
        id: newId,
        jobNo: newJobNo,
        title: row.title.trim(),
        eventName: eventName.trim() || 'General Turnaround',
        plant: row.plant,
        unit: `${unitRecord.name} (${unitRecord.fullName.split(',')[0]})`,
        unitId: unitRecord.id,
        system: `${systemRecord.name} (${systemRecord.description || 'Process System Boundary'})`,
        systemId: systemRecord.id,
        workOrder: row.workOrder.trim() || `WO-${randomNum}`,
        description: row.description.trim() || 'Standard turnover inspection and package closure.',
        assetTag: assetItem?.tag || row.assetTag,
        assetDescription: assetItem?.description || 'Process Equipment',
        refCode: assetItem?.refCode,
        hierarchyNodeId: assetItem?.nodeId,
        hierarchyLevel: assetItem ? `Level ${assetItem.level} • ${assetItem.levelType}` : 'Level 3 • Equipment',
        hierarchyPath: assetItem?.breadcrumbPath || `${unitRecord.name} > ${systemRecord.name} > ${row.assetTag}`,
        isCriticalPath: row.isCriticalPath,
        gridZone: assetItem?.plotPlanMarker?.gridZone || 'B3',
        plotPlanX: assetItem?.plotPlanMarker?.x,
        plotPlanY: assetItem?.plotPlanMarker?.y,
        plotPlanId: assetItem?.plotPlanMarker?.plotPlanId || 'plan-overall',
        attachments: [],
        signatures: [],
        punchList: [],
        createdAt: new Date().toISOString().split('T')[0]
      };
    });

    onBulkSubmit(createdJobRecords);
    setCreatedJobsResult(createdJobRecords);
  };

  // Open asset hierarchy modal for a specific row
  const handleOpenRowHierarchyModal = (rowIndex: number) => {
    setActiveModalRowIndex(rowIndex);
    setIsHierarchyModalOpen(true);
  };

  const handleSelectAssetForModal = (asset: FlatAssetHierarchyItem) => {
    if (activeModalRowIndex === null) return;
    const targetRow = rows[activeModalRowIndex];
    if (!targetRow) return;

    setRows(prev => prev.map((r, idx) => {
      if (idx !== activeModalRowIndex) return r;
      return {
        ...r,
        plant: asset.unitId === 'unit-vps2' ? 'Sriracha' : 'Phra Khanong',
        unitId: asset.unitId,
        systemId: asset.systemId,
        assetTag: asset.tag,
        title: `Overhaul & Inspection of ${asset.tag} (${asset.description || 'Process Equipment'})`,
        isCriticalPath: !!asset.isCriticalPath
      };
    }));

    setIsHierarchyModalOpen(false);
    setActiveModalRowIndex(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. COMMON EVENT SCOPE & BATCH HEADER
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Bulk Insert Engine
                </span>
                <span className="text-[10px] text-slate-400 font-mono">• ERP Functional Location Link</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                {isTh ? 'นำเข้าข้อมูลงานแบบกลุ่ม (Bulk Insert Job Packages)' : 'Bulk Insert Turnover Job Packages'}
              </h2>
            </div>
          </div>

          {/* Quick Turnaround Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Sparkles size={13} className="text-amber-500" />
              <span>{isTh ? 'ชุดข้อมูลสำเร็จรูป:' : 'Sample Batches:'}</span>
            </span>
            <button
              type="button"
              onClick={() => setRows(SAMPLE_TURNAROUND_CRITICAL_BATCH)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>★ Major Turnaround (5 Jobs)</span>
            </button>
            <button
              type="button"
              onClick={() => setRows(SAMPLE_APS1_BATCH)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              APS-1 Distillation (4 Jobs)
            </button>
            <button
              type="button"
              onClick={() => setRows(SAMPLE_VPS2_BATCH)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              VPS-2 Vacuum (3 Jobs)
            </button>
          </div>
        </div>

        {/* Event Scope Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Event Name <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Major Overhaul Q4 2026"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Default Plant Site</span>
            </label>
            <select
              value={eventPlant}
              onChange={e => setEventPlant(e.target.value as 'Phra Khanong' | 'Sriracha')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none cursor-pointer"
            >
              <option value="Phra Khanong">Phra Khanong (S2 Complex)</option>
              <option value="Sriracha">Sriracha Refinery & Terminal</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Turnaround Milestone</span>
            </label>
            <input
              type="text"
              value={eventMilestone}
              onChange={e => setEventMilestone(e.target.value)}
              placeholder="e.g. Major Turnaround Overhaul (TA)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-600 dark:text-amber-400" />
              <span>Target Turnover Date</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={eventDefaultDate}
                onChange={e => setEventDefaultDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              />
              <button
                type="button"
                onClick={handleApplyEventScopeToAll}
                title="Apply Plant & Date to all rows"
                className="px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rows</span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">{metrics.total}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Valid & Ready</span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{metrics.validCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Needs Review</span>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300">{metrics.invalidCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Critical Path</span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300">★ {metrics.criticalCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Phra Khanong</span>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300">{metrics.pkCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Sriracha</span>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">{metrics.srCount}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. TOOLBAR & BATCH OPERATIONS
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        
        {/* Left: Row Generation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={15} />
            <span>{isTh ? 'เพิ่มแถว (+1)' : 'Add Row'}</span>
          </button>

          <button
            type="button"
            onClick={handleAdd5Rows}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>{isTh ? 'เพิ่ม 5 แถว' : 'Add 5 Rows'}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleAutoGenerateAllWOs}
            title="Generate standard Work Order numbers for all rows"
            className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isTh ? 'สร้างเลข WO ทั้งหมด' : 'Generate All WOs'}
          </button>

          <button
            type="button"
            onClick={handleAutoGenerateAllTitles}
            title="Generate standard titles based on equipment tags"
            className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isTh ? 'สร้างชื่อแพ็กเกจจากแท็ก' : 'Titles from Tags'}
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isTh ? 'ล้างตาราง' : 'Clear All'}
          </button>
        </div>

        {/* Right: Import / Export & Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Filter */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder={isTh ? 'ค้นหาในตาราง...' : 'Search table...'}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none w-36 sm:w-44"
            />
          </div>

          {/* Plant Filter */}
          <select
            value={plantFilter}
            onChange={e => setPlantFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none cursor-pointer"
          >
            <option value="ALL">All Plants</option>
            <option value="Phra Khanong">PK</option>
            <option value="Sriracha">SR</option>
          </select>

          {/* Paste from Clipboard Modal Button */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Paste CSV/TSV data from Excel or Google Sheets"
          >
            <ClipboardPaste size={14} />
            <span>{isTh ? 'วางข้อมูล (Paste)' : 'Paste Grid'}</span>
          </button>

          {/* CSV Template Download */}
          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Download CSV format template"
          >
            <Download size={14} />
            <span>{isTh ? 'เทมเพลต CSV' : 'CSV Template'}</span>
          </button>

          {/* File Upload Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .txt, .tsv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Upload CSV / TSV file"
          >
            <Upload size={14} />
            <span>{isTh ? 'อัปโหลด CSV' : 'Import File'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. INTERACTIVE SPREADSHEET DATA GRID
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 min-w-[260px]">
                  <span className="flex items-center gap-1.5">
                    <Tag size={13} className="text-emerald-600" />
                    <span>Job Title / Package Name *</span>
                  </span>
                </th>
                <th className="p-3 min-w-[140px]">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-600" />
                    <span>Plant *</span>
                  </span>
                </th>
                <th className="p-3 min-w-[180px]">Unit (Level 1) *</th>
                <th className="p-3 min-w-[200px]">Process System (Level 2) *</th>
                <th className="p-3 min-w-[220px]">
                  <span className="flex items-center gap-1.5">
                    <FolderTree size={13} className="text-indigo-600" />
                    <span>Asset Tag (Level 3) *</span>
                  </span>
                </th>
                <th className="p-3 min-w-[130px]">Work Order (WO) *</th>
                <th className="p-3 min-w-[220px]">Scope of Work & Handover Details</th>
                <th className="p-3 w-24 text-center">Critical</th>
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {visibleRows.map((row, idx) => {
                const issues = getRowIssues(row);
                const isValid = issues.length === 0;
                const unitsForThisPlant = getUnitsForPlant(row.plant);
                const systemsForThisUnit = getSystemsForUnit(row.unitId);
                const equipmentForThisSystem = getEquipmentForSystem(row.unitId, row.systemId);
                const assetMeta = findAssetByTag(row.assetTag);

                return (
                  <tr 
                    key={row.id}
                    className={`transition-colors ${
                      !isValid 
                        ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50' 
                        : row.isCriticalPath 
                          ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40' 
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Index & Status Indicator */}
                    <td className="p-3 text-center align-middle">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-slate-400 font-bold text-[11px]">{idx + 1}</span>
                        {isValid ? (
                          <CheckCircle2 size={14} className="text-emerald-500" title="Valid Row" />
                        ) : (
                          <AlertTriangle 
                            size={14} 
                            className="text-rose-500 cursor-help" 
                            title={issues.join(', ')} 
                          />
                        )}
                      </div>
                    </td>

                    {/* Job Title */}
                    <td className="p-2.5 align-middle">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={row.title}
                          onChange={e => handleUpdateField(row.id, 'title', e.target.value)}
                          placeholder="e.g. Overhaul & Inspection of Equipment..."
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none transition-all ${
                            !row.title.trim()
                              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                          }`}
                        />
                        {assetMeta?.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[240px]">
                            {assetMeta.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Plant Dropdown */}
                    <td className="p-2.5 align-middle">
                      <select
                        value={row.plant}
                        onChange={e => handleUpdateField(row.id, 'plant', e.target.value as any)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none cursor-pointer focus:border-blue-600"
                      >
                        <option value="Phra Khanong">Phra Khanong (PK)</option>
                        <option value="Sriracha">Sriracha (SR)</option>
                      </select>
                    </td>

                    {/* Unit Dropdown */}
                    <td className="p-2.5 align-middle">
                      <select
                        value={row.unitId}
                        onChange={e => handleUpdateField(row.id, 'unitId', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none cursor-pointer focus:border-blue-600"
                      >
                        {unitsForThisPlant.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.fullName.split(',')[0]}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Process System Dropdown */}
                    <td className="p-2.5 align-middle">
                      <select
                        value={row.systemId}
                        onChange={e => handleUpdateField(row.id, 'systemId', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none cursor-pointer focus:border-blue-600"
                      >
                        {systemsForThisUnit.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} • {s.description?.slice(0, 24)}...
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Asset Tag Dropdown & Hierarchy Browser Button */}
                    <td className="p-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={row.assetTag}
                          onChange={e => handleUpdateField(row.id, 'assetTag', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold outline-none cursor-pointer focus:border-emerald-600"
                        >
                          {equipmentForThisSystem.map(eq => (
                            <option key={eq.tag} value={eq.tag}>
                              {eq.tag} {eq.refCode ? `(${eq.refCode})` : ''} {eq.isCriticalPath ? '★' : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleOpenRowHierarchyModal(idx)}
                          title="Browse Asset Hierarchy Tree for this row"
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0 cursor-pointer transition-colors"
                        >
                          <FolderTree size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Work Order */}
                    <td className="p-2.5 align-middle">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.workOrder}
                          onChange={e => handleUpdateField(row.id, 'workOrder', e.target.value)}
                          placeholder="WO-XXXXXX"
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold outline-none ${
                            !row.workOrder.trim()
                              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Scope of Work */}
                    <td className="p-2.5 align-middle">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => handleUpdateField(row.id, 'description', e.target.value)}
                        placeholder="Technical scope & isolation protocol..."
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-emerald-600"
                      />
                    </td>

                    {/* Critical Path Toggle */}
                    <td className="p-2.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleUpdateField(row.id, 'isCriticalPath', !row.isCriticalPath)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          row.isCriticalPath
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>★</span>
                        <span>{row.isCriticalPath ? 'YES' : 'NO'}</span>
                      </button>
                    </td>

                    {/* Row Actions */}
                    <td className="p-2.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(idx)}
                          title="Duplicate this row"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          title="Delete this row"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Submission Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isTh ? (
              <span>
                พร้อมส่งข้อมูล <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{metrics.validCount}</strong> รายการ 
                จากทั้งหมด {metrics.total} รายการ (พบข้อผิดพลาด {metrics.invalidCount} รายการ)
              </span>
            ) : (
              <span>
                Ready to dispatch <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{metrics.validCount}</strong> of {metrics.total} job packages 
                ({metrics.invalidCount} rows require attention).
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={metrics.validCount === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                metrics.validCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileCheck size={16} />
              <span>
                {isTh 
                  ? `บันทึกคำขอเปิดงานแบบกลุ่ม (${metrics.validCount} งาน)`
                  : `Submit Bulk Job Packages (${metrics.validCount} Jobs)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. SUCCESS MODAL / DISPATCH CONFIRMATION
         ========================================================================= */}
      {createdJobsResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {isTh ? 'บันทึกคำขอเปิดงานแบบกลุ่มสำเร็จ!' : 'Bulk Job Packages Successfully Dispatched!'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {createdJobsResult.length} {isTh ? 'งานถูกสร้างในระบบเรียบร้อยแล้ว' : 'packages created and linked with ERP hierarchy.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedJobsResult(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* List of created job packages */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
              {createdJobsResult.map(job => (
                <div 
                  key={job.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {job.jobNo}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {job.workOrder}
                      </span>
                      {job.isCriticalPath && (
                        <span className="text-[10px] font-bold text-amber-500">★ Critical</span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {job.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {job.unit} › {job.assetTag}
                    </div>
                  </div>

                  {onNavigateToWorkspace && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedJobsResult(null);
                        onNavigateToWorkspace(job.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreatedJobsResult(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close & Add More'}
              </button>

              {onNavigateToWorkspace && (
                <button
                  type="button"
                  onClick={() => {
                    const firstId = createdJobsResult[0]?.id;
                    setCreatedJobsResult(null);
                    if (firstId) onNavigateToWorkspace(firstId);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <span>{isTh ? 'ไปที่หน้าจัดการงาน (Workspace)' : 'Go to Job Workspace'}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. QUICK PASTE MODAL (EXCEL / SHEETS)
         ========================================================================= */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ClipboardPaste size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isTh ? 'วางข้อมูลจาก Excel / Google Sheets' : 'Paste from Excel or Google Sheets'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isTh 
                ? 'คัดลอกแถวข้อมูลจาก Excel หรือ Google Sheets แล้ววางลงในกล่องด้านล่าง (คั่นด้วย Tab หรือ Comma)' 
                : 'Copy rows from your spreadsheet and paste them directly below (Tab-separated or Comma-separated).'
              }
            </p>

            <textarea
              rows={8}
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Job Title	Plant	Unit No	Process System	Asset Tag	Work Order	Scope	Critical"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-y"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPastedText('');
                  setIsPasteModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  parseImportedText(pastedText);
                  setPastedText('');
                  setIsPasteModalOpen(false);
                }}
                disabled={!pastedText.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {isTh ? 'ประมวลผลข้อมูล' : 'Process & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row-specific Asset Hierarchy Modal */}
      <AssetHierarchySelectModal
        isOpen={isHierarchyModalOpen}
        onClose={() => {
          setIsHierarchyModalOpen(false);
          setActiveModalRowIndex(null);
        }}
        onSelectAsset={handleSelectAssetForModal}
      />
    </div>
  );
}
