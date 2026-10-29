import React, { useState, useMemo, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
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
  FolderTree,
  Building2,
  Tag,
  Calendar,
  Layers,
  Check,
  X,
  Search,
  ExternalLink,
  RefreshCw,
  MapPin,
  ClipboardPaste,
  HelpCircle,
  FileText,
  AlertTriangle,
  Flame,
  ArrowRight,
  SlidersHorizontal,
  Table,
  Eye,
  CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { JobRecord } from '../data/turnoverJobsData';
import { 
  S2_TURNOVER_HIERARCHY, 
  UnitRecord, 
  SystemRecord, 
  EquipmentRecord 
} from '../data/s2FunctionalLocationData';
import { 
  getAllFlattenedAssets, 
  findAssetByTag, 
  FlatAssetHierarchyItem 
} from '../data/functionalLocationHierarchyHelper';

export interface BulkJobPackageDraft {
  id: string;
  title: string;
  unitId: string;
  unitName: string;
  systemId: string;
  systemName: string;
  assetTag: string;
  workOrder: string;
  discipline: 'Mechanical' | 'Piping' | 'Electrical' | 'Instrumentation' | 'Civil / Structure' | 'Inspection';
  isCriticalPath: boolean;
  estimatedDays: number;
  description: string;
}

export interface BulkJobPackageInsertProps {
  eventName: string;
  plant: 'Phra Khanong' | 'Sriracha';
  eventMilestone: string;
  eventStartDate: string;
  eventTargetDate: string;
  onBatchCreateJobs: (newJobs: JobRecord[]) => void;
  onSwitchToSingle: () => void;
  onNavigateToWorkspace?: (jobId: string) => void;
}

// Enterprise Turnaround Templates
export const SAMPLE_TURNAROUND_PACKAGES: BulkJobPackageDraft[] = [
  {
    id: 'draft-pkg-1',
    title: 'Overhaul & Internal Inspection of S2-DR-001D-180 (Desalter Drum Vessel)',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemId: 'sys-11',
    systemName: 'System-11 (Desalter)',
    assetTag: 'S2-DR-001D-180',
    workOrder: 'WO-884021',
    discipline: 'Mechanical',
    isCriticalPath: true,
    estimatedDays: 8,
    description: 'Clean electrostatic grids, inspect internal isolation spools, survey vessel shell, and complete flange torque test.'
  },
  {
    id: 'draft-pkg-2',
    title: 'Convection & Radiant Tube Decoking of 10-F-101 (Crude Charge Heater)',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemId: 'sys-12',
    systemName: 'System-12 (Furnace & Heaters)',
    assetTag: '10-F-101',
    workOrder: 'WO-884022',
    discipline: 'Piping',
    isCriticalPath: true,
    estimatedDays: 12,
    description: 'Mechanical decoking, refractory survey, burner tip replacement, and ultrasonic thickness gauge inspection on radiant tubes.'
  },
  {
    id: 'draft-pkg-3',
    title: 'Tray Inspection & Demister Mesh Replacement for 10-C-101 (Atmospheric Column)',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemId: 'sys-13',
    systemName: 'System-13 (Atmospheric Column)',
    assetTag: '10-C-101',
    workOrder: 'WO-884023',
    discipline: 'Mechanical',
    isCriticalPath: false,
    estimatedDays: 6,
    description: 'Open manways 1 to 8, survey structured packing and valve trays 12-24, replace fouled demister pad.'
  },
  {
    id: 'draft-pkg-4',
    title: 'Catalyst Screening & Internal Inspection for 11-R-201 (Continuous Catalytic Reformer)',
    unitId: 'unit-ccr',
    unitName: 'CCR',
    systemId: 'sys-21',
    systemName: 'System-21 (Reformer Reactors)',
    assetTag: '11-R-201',
    workOrder: 'WO-884024',
    discipline: 'Mechanical',
    isCriticalPath: true,
    estimatedDays: 14,
    description: 'Nitrogen purge, catalyst vacuum unloading, Johnson screen dye penetrant inspection, internal center pipe re-torquing.'
  },
  {
    id: 'draft-pkg-5',
    title: 'High Pressure Exchanger Hydrotest & Re-tubing for 12-E-105A (Hydrocracker Preheater)',
    unitId: 'unit-hcu',
    unitName: 'HCU',
    systemId: 'sys-31',
    systemName: 'System-31 (High Pressure Exchangers)',
    assetTag: '12-E-105A',
    workOrder: 'WO-884025',
    discipline: 'Piping',
    isCriticalPath: false,
    estimatedDays: 7,
    description: 'Pull channel head, extract tube bundle for high pressure hydro-jetting, re-insert bundle and complete 180 bar shell hydrotest.'
  },
  {
    id: 'draft-pkg-6',
    title: 'Vacuum Column Ejector Train Overhaul for 14-C-301 (VDU Main Column)',
    unitId: 'unit-vdu',
    unitName: 'VDU',
    systemId: 'sys-41',
    systemName: 'System-41 (Vacuum Column & Ejectors)',
    assetTag: '14-C-301',
    workOrder: 'WO-884026',
    discipline: 'Inspection',
    isCriticalPath: false,
    estimatedDays: 5,
    description: 'Steam jet nozzle calibration, inter-condenser cleaning, vacuum seal check, and NDT thickness measurements.'
  }
];

export const ELECTRICAL_INSTRUMENT_PACKAGES: BulkJobPackageDraft[] = [
  {
    id: 'draft-pkg-elec-1',
    title: '6.6kV Substation Transformer PM & Protection Relay Calibration',
    unitId: 'unit-aps1',
    unitName: 'APS-1',
    systemId: 'sys-11',
    systemName: 'System-11 (Substation & Power)',
    assetTag: 'S2-TR-01',
    workOrder: 'WO-885011',
    discipline: 'Electrical',
    isCriticalPath: true,
    estimatedDays: 4,
    description: 'Insulation resistance measurement, oil dielectric breakdown testing, trip test on Schweitzer SEL-751 relays.'
  },
  {
    id: 'draft-pkg-elec-2',
    title: 'Emergency Shutdown (ESD) Solenoid & Actuator Proof-Testing',
    unitId: 'unit-ccr',
    unitName: 'CCR',
    systemId: 'sys-21',
    systemName: 'System-21 (Safety Instrumentation)',
    assetTag: '11-XV-002',
    workOrder: 'WO-885012',
    discipline: 'Instrumentation',
    isCriticalPath: true,
    estimatedDays: 3,
    description: 'Full stroke seat leakage verification, partial stroke testing (PST), SOV coil resistance and smart positioner calibration.'
  },
  {
    id: 'draft-pkg-elec-3',
    title: 'Radar Level & Multivariable Differential Pressure Transmitter Re-Zeroing',
    unitId: 'unit-hcu',
    unitName: 'HCU',
    systemId: 'sys-31',
    systemName: 'System-31 (Instrumentation Loop)',
    assetTag: '12-LT-104',
    workOrder: 'WO-885013',
    discipline: 'Instrumentation',
    isCriticalPath: false,
    estimatedDays: 2,
    description: '5-point Rosemount 3051 calibration check, impulse line steam blowout, diaphragm seal flushing.'
  }
];

const RAW_EXCEL_DEMO_TEXT = `Crude Desalter Vessel Overhaul\tAPS-1\tSystem-11\tS2-DR-001D-180\tWO-884021\tMechanical\tYes\t8\tClean electrostatic grids and flange torque test\nFurnace Tube Decoking & Inspection\tAPS-1\tSystem-12\t10-F-101\tWO-884022\tPiping\tYes\t12\tRefractory survey and ultrasonic thickness gauge\nAtmospheric Column Tray Demister Replacement\tAPS-1\tSystem-13\t10-C-101\tWO-884023\tMechanical\tNo\t6\tOpen manways 1-8 and survey structured packing\nCCR Reactor Catalyst Dump & Screening\tCCR\tSystem-21\t11-R-201\tWO-884024\tMechanical\tYes\t14\tNitrogen purge and catalyst unloading\nHigh Pressure Exchanger Shell Hydrotest\tHCU\tSystem-31\t12-E-105A\tWO-884025\tPiping\tNo\t7\tPull channel head and 180 bar shell hydrotest\nVacuum Ejector Train Inspection\tVDU\tSystem-41\t14-C-301\tWO-884026\tInspection\tNo\t5\tSteam jet nozzle calibration and NDT measurements`;

export default function BulkJobPackageInsert({
  eventName,
  plant,
  eventMilestone,
  eventStartDate,
  eventTargetDate,
  onBatchCreateJobs,
  onSwitchToSingle,
  onNavigateToWorkspace
}: BulkJobPackageInsertProps) {
  const [rows, setRows] = useState<BulkJobPackageDraft[]>(SAMPLE_TURNAROUND_PACKAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('All');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('All');
  const [createdSummary, setCreatedSummary] = useState<{
    count: number;
    jobNumbers: string[];
    criticalCount: number;
  } | null>(null);

  // Excel Hub Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'upload' | 'paste' | 'template'>('upload');
  
  // Excel File State
  const [uploadedWorkbook, setUploadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [parsedRawRows, setParsedRawRows] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    title: number;
    unit: number;
    system: number;
    tag: number;
    workOrder: number;
    discipline: number;
    critical: number;
    days: number;
    description: number;
  }>({
    title: 0,
    unit: 1,
    system: 2,
    tag: 3,
    workOrder: 4,
    discipline: 5,
    critical: 6,
    days: 7,
    description: 8
  });
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isDragOver, setIsDragOver] = useState(false);

  // Paste Text State
  const [pasteRawText, setPasteRawText] = useState(RAW_EXCEL_DEMO_TEXT);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available flattened hierarchy assets for auto-resolution
  const allAssets = useMemo(() => getAllFlattenedAssets(), []);

  // Global Ctrl+V / Cmd+V listener to directly trigger Excel import when copying from spreadsheet
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const text = e.clipboardData?.getData('text/plain');
      if (text && (text.includes('\t') || text.includes('\n'))) {
        e.preventDefault();
        setPasteRawText(text);
        setExcelModalTab('paste');
        setIsExcelModalOpen(true);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = 
        row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.workOrder.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDiscipline = selectedDisciplineFilter === 'All' || row.discipline === selectedDisciplineFilter;
      const matchesUnit = selectedUnitFilter === 'All' || row.unitName.includes(selectedUnitFilter) || row.unitId === selectedUnitFilter;

      return matchesSearch && matchesDiscipline && matchesUnit;
    });
  }, [rows, searchQuery, selectedDisciplineFilter, selectedUnitFilter]);

  // Statistics
  const validRowCount = useMemo(() => {
    return rows.filter(r => r.title.trim().length > 0 && r.assetTag.trim().length > 0).length;
  }, [rows]);

  const criticalPathCount = useMemo(() => {
    return rows.filter(r => r.isCriticalPath).length;
  }, [rows]);

  const totalEstimatedDays = useMemo(() => {
    return rows.reduce((acc, curr) => acc + (curr.estimatedDays || 0), 0);
  }, [rows]);

  // Row update handlers
  const handleUpdateRow = (id: string, field: keyof BulkJobPackageDraft, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };

      if (field === 'unitId') {
        const u = S2_TURNOVER_HIERARCHY.find(item => item.id === value);
        if (u) {
          updated.unitName = u.name;
          if (u.systems.length > 0) {
            updated.systemId = u.systems[0].id;
            updated.systemName = `${u.systems[0].name} (${u.systems[0].description || 'Boundary'})`;
            if (u.systems[0].equipment.length > 0) {
              updated.assetTag = u.systems[0].equipment[0].tag;
              updated.isCriticalPath = !!u.systems[0].equipment[0].isCriticalPath;
            }
          }
        }
      }

      if (field === 'assetTag') {
        const matched = findAssetByTag(value);
        if (matched) {
          updated.isCriticalPath = !!matched.isCriticalPath;
          if (!updated.description || updated.description.includes('Turnaround mechanical package')) {
            updated.description = `${matched.description || 'Process equipment'} inspection and closure for turnaround package.`;
          }
        }
      }

      return updated;
    }));
  };

  // Add 1 Row
  const handleAddRow = () => {
    const randomWO = `WO-${Math.floor(880000 + Math.random() * 9999)}`;
    const newRow: BulkJobPackageDraft = {
      id: `draft-pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      unitId: 'unit-aps1',
      unitName: 'APS-1',
      systemId: 'sys-11',
      systemName: 'System-11 (Desalter)',
      assetTag: 'S2-DR-001D-180',
      workOrder: randomWO,
      discipline: 'Mechanical',
      isCriticalPath: false,
      estimatedDays: 5,
      description: 'Standard turnaround mechanical scope and dual-signature inspection.'
    };
    setRows(prev => [newRow, ...prev]);
  };

  // Add 5 Rows
  const handleAdd5Rows = () => {
    const newItems: BulkJobPackageDraft[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `draft-pkg-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      unitId: 'unit-aps1',
      unitName: 'APS-1',
      systemId: 'sys-11',
      systemName: 'System-11',
      assetTag: 'S2-DR-001D-180',
      workOrder: `WO-${Math.floor(884100 + i * 10 + Math.random() * 9)}`,
      discipline: 'Mechanical',
      isCriticalPath: false,
      estimatedDays: 4,
      description: 'Turnaround package inspection and leak test.'
    }));
    setRows(prev => [...newItems, ...prev]);
  };

  // Duplicate Row
  const handleDuplicateRow = (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const duplicated: BulkJobPackageDraft = {
      ...row,
      id: `draft-pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${row.title} (Copy)`,
      workOrder: `WO-${Math.floor(880000 + Math.random() * 9999)}`
    };
    setRows(prev => [duplicated, ...prev]);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Clear All
  const handleClearAll = () => {
    if (confirm('Clear all draft rows in the bulk table?')) {
      setRows([]);
    }
  };

  // Auto-Generate Sequential Work Orders
  const handleAutoGenerateWOs = () => {
    const startNum = 884050;
    setRows(prev => prev.map((r, idx) => ({
      ...r,
      workOrder: `WO-${startNum + idx}`
    })));
  };

  // Process Excel Workbook data
  const processExcelWorkbook = (wb: XLSX.WorkBook, sheetName?: string) => {
    setUploadedWorkbook(wb);
    const targetSheet = sheetName || wb.SheetNames[0];
    setSelectedSheetName(targetSheet);

    const worksheet = wb.Sheets[targetSheet];
    if (!worksheet) return;

    // Convert sheet to array of arrays (header: 1)
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (!rawData || rawData.length === 0) return;

    // Detect header row (first non-empty row)
    let headerRowIdx = 0;
    while (headerRowIdx < rawData.length && (!rawData[headerRowIdx] || rawData[headerRowIdx].length === 0)) {
      headerRowIdx++;
    }

    const headers = (rawData[headerRowIdx] || []).map((h: any, i: number) => String(h || `Column ${i + 1}`).trim());
    setExcelHeaders(headers);

    // Data rows after header
    const dataRows = rawData.slice(headerRowIdx + 1).filter(r => r && r.length > 0 && r.some((c: any) => c !== undefined && c !== ''));
    setParsedRawRows(dataRows);

    // Smart auto-detect column mapping
    const autoMap = { ...columnMapping };
    headers.forEach((h, colIdx) => {
      const lower = h.toLowerCase();
      if (lower.includes('title') || lower.includes('package') || lower.includes('job name') || lower.includes('task')) {
        autoMap.title = colIdx;
      } else if (lower.includes('unit') || lower.includes('area')) {
        autoMap.unit = colIdx;
      } else if (lower.includes('system') || lower.includes('boundary')) {
        autoMap.system = colIdx;
      } else if (lower.includes('tag') || lower.includes('equipment') || lower.includes('asset')) {
        autoMap.tag = colIdx;
      } else if (lower.includes('wo') || lower.includes('work order') || lower.includes('order')) {
        autoMap.workOrder = colIdx;
      } else if (lower.includes('discipline') || lower.includes('craft') || lower.includes('trade')) {
        autoMap.discipline = colIdx;
      } else if (lower.includes('critical') || lower.includes('path') || lower.includes('cp')) {
        autoMap.critical = colIdx;
      } else if (lower.includes('day') || lower.includes('duration') || lower.includes('time')) {
        autoMap.days = colIdx;
      } else if (lower.includes('desc') || lower.includes('scope') || lower.includes('note') || lower.includes('remark')) {
        autoMap.description = colIdx;
      }
    });

    setColumnMapping(autoMap);
  };

  // Handle Excel File Drop / Upload
  const handleExcelFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        processExcelWorkbook(wb);
        setExcelModalTab('upload');
        setIsExcelModalOpen(true);
      } catch (err) {
        alert('Could not parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv document.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelFileUpload(file);
    }
    e.target.value = '';
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleExcelFileUpload(file);
    }
  };

  // Apply parsed Excel rows to the main bulk editor
  const handleApplyExcelData = () => {
    if (parsedRawRows.length === 0) return;

    const newDrafts: BulkJobPackageDraft[] = parsedRawRows.map((row, idx) => {
      const getVal = (colIndex: number) => {
        if (colIndex < 0 || colIndex >= row.length) return '';
        return String(row[colIndex] ?? '').trim();
      };

      const title = getVal(columnMapping.title) || `Turnaround Package ${idx + 1}`;
      const unitRaw = getVal(columnMapping.unit) || 'APS-1';
      const systemRaw = getVal(columnMapping.system) || 'System-11';
      const tagRaw = getVal(columnMapping.tag) || 'S2-DR-001D-180';
      const woRaw = getVal(columnMapping.workOrder) || `WO-${Math.floor(884100 + idx)}`;
      const discRaw = getVal(columnMapping.discipline) || 'Mechanical';
      const critRaw = getVal(columnMapping.critical).toLowerCase();
      const isCritical = critRaw.includes('yes') || critRaw.includes('true') || critRaw.includes('1') || critRaw.includes('★');
      const days = parseInt(getVal(columnMapping.days)) || 5;
      const desc = getVal(columnMapping.description) || 'Turnaround mechanical inspection and leak test.';

      // Match Unit in Hierarchy
      const matchedUnit = S2_TURNOVER_HIERARCHY.find(u => 
        u.name.toLowerCase() === unitRaw.toLowerCase() || 
        u.id.toLowerCase() === unitRaw.toLowerCase() ||
        unitRaw.toLowerCase().includes(u.name.toLowerCase())
      ) || S2_TURNOVER_HIERARCHY[0];

      // Match System
      const matchedSystem = matchedUnit.systems.find(s => 
        s.name.toLowerCase() === systemRaw.toLowerCase() ||
        s.id.toLowerCase() === systemRaw.toLowerCase() ||
        systemRaw.toLowerCase().includes(s.name.toLowerCase())
      ) || matchedUnit.systems[0];

      // Normalize Discipline
      let validDiscipline: BulkJobPackageDraft['discipline'] = 'Mechanical';
      const discLower = discRaw.toLowerCase();
      if (discLower.includes('pipe')) validDiscipline = 'Piping';
      else if (discLower.includes('elec')) validDiscipline = 'Electrical';
      else if (discLower.includes('inst')) validDiscipline = 'Instrumentation';
      else if (discLower.includes('insp') || discLower.includes('qa')) validDiscipline = 'Inspection';
      else if (discLower.includes('civil')) validDiscipline = 'Civil / Structure';

      return {
        id: `draft-pkg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        unitId: matchedUnit.id,
        unitName: matchedUnit.name,
        systemId: matchedSystem.id,
        systemName: `${matchedSystem.name} (${matchedSystem.description || 'Boundary'})`,
        assetTag: tagRaw,
        workOrder: woRaw,
        discipline: validDiscipline,
        isCriticalPath: isCritical,
        estimatedDays: days,
        description: desc
      };
    });

    if (importMode === 'replace') {
      setRows(newDrafts);
    } else {
      setRows(prev => [...newDrafts, ...prev]);
    }

    setIsExcelModalOpen(false);
    setUploadedWorkbook(null);
    setParsedRawRows([]);
  };

  // Apply Direct Text Paste from Excel
  const handleApplyPasteText = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const parsed: BulkJobPackageDraft[] = [];

    lines.forEach((line, idx) => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length > 0 && parts[0]) {
        const title = parts[0];
        const unit = parts[1] || 'APS-1';
        const system = parts[2] || 'System-11';
        const tag = parts[3] || 'S2-DR-001D-180';
        const wo = parts[4] || `WO-${Math.floor(884100 + idx)}`;
        const disc = (parts[5] as any) || 'Mechanical';
        const isCrit = (parts[6] || '').toLowerCase().includes('yes') || (parts[6] || '').toLowerCase().includes('true') || (parts[6] || '').includes('★');
        const days = parseInt(parts[7]) || 5;
        const desc = parts[8] || 'Turnaround mechanical inspection and leak test.';

        const matchedUnit = S2_TURNOVER_HIERARCHY.find(u => 
          u.name.toLowerCase() === unit.toLowerCase() || 
          u.id.toLowerCase() === unit.toLowerCase()
        ) || S2_TURNOVER_HIERARCHY[0];

        const matchedSystem = matchedUnit.systems.find(s => 
          s.name.toLowerCase() === system.toLowerCase() ||
          s.id.toLowerCase() === system.toLowerCase()
        ) || matchedUnit.systems[0];

        parsed.push({
          id: `draft-pkg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          unitId: matchedUnit.id,
          unitName: matchedUnit.name,
          systemId: matchedSystem.id,
          systemName: `${matchedSystem.name} (${matchedSystem.description || 'Boundary'})`,
          assetTag: tag,
          workOrder: wo,
          discipline: disc,
          isCriticalPath: isCrit,
          estimatedDays: days,
          description: desc
        });
      }
    });

    if (parsed.length > 0) {
      if (importMode === 'replace') {
        setRows(parsed);
      } else {
        setRows(prev => [...parsed, ...prev]);
      }
      setIsExcelModalOpen(false);
    }
  };

  // Download Native .xlsx File
  const handleDownloadXLSXTemplate = () => {
    const templateData = SAMPLE_TURNAROUND_PACKAGES.map((pkg, idx) => ({
      'Job Package Title': pkg.title,
      'Unit No': pkg.unitName,
      'Process System': pkg.systemName,
      'Equipment Tag': pkg.assetTag,
      'Work Order': pkg.workOrder,
      'Discipline': pkg.discipline,
      'Critical Path': pkg.isCriticalPath ? 'YES' : 'NO',
      'Estimated Days': pkg.estimatedDays,
      'Scope Description': pkg.description
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Style column widths
    ws['!cols'] = [
      { wch: 45 }, // Title
      { wch: 12 }, // Unit
      { wch: 25 }, // System
      { wch: 20 }, // Tag
      { wch: 15 }, // WO
      { wch: 18 }, // Discipline
      { wch: 14 }, // Critical
      { wch: 15 }, // Days
      { wch: 50 }, // Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnaround_Job_Packages');
    XLSX.writeFile(wb, `Turnaround_Job_Packages_Template_${plant.replace(/\s+/g, '_')}.xlsx`);
  };

  // Download CSV
  const handleExportCSV = () => {
    const headers = ['Title', 'Unit', 'System', 'Equipment Tag', 'Work Order', 'Discipline', 'Critical Path', 'Estimated Days', 'Description'];
    const csvRows = [headers.join(',')];

    rows.forEach(r => {
      const cleanTitle = `"${r.title.replace(/"/g, '""')}"`;
      const cleanDesc = `"${r.description.replace(/"/g, '""')}"`;
      csvRows.push([
        cleanTitle,
        r.unitName,
        `"${r.systemName.replace(/"/g, '""')}"`,
        r.assetTag,
        r.workOrder,
        r.discipline,
        r.isCriticalPath ? 'YES' : 'NO',
        r.estimatedDays,
        cleanDesc
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Turnaround_Job_Packages_${plant.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // BATCH DISPATCH EXECUTION
  const handleDispatchAll = () => {
    const validRows = rows.filter(r => r.title.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please fill at least 1 valid Job Package with a title');
      return;
    }

    const plantCode = plant === 'Phra Khanong' ? 'PK' : 'SR';
    const newJobs: JobRecord[] = [];
    const generatedJobNos: string[] = [];

    validRows.forEach((r, idx) => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newJobNo = `TO-${plantCode}-2026-${randomNum}`;
      const newId = `job-${Date.now()}-${idx}`;
      generatedJobNos.push(newJobNo);

      const assetItem = findAssetByTag(r.assetTag) || allAssets[0];
      const unitRecord = S2_TURNOVER_HIERARCHY.find(u => u.id === r.unitId) || S2_TURNOVER_HIERARCHY[0];
      const systemRecord = unitRecord.systems.find(s => s.id === r.systemId) || unitRecord.systems[0];

      const job: JobRecord = {
        id: newId,
        jobNo: newJobNo,
        title: r.title.trim(),
        eventName: eventName.trim() || 'General Turnaround',
        plant: plant,
        unit: `${unitRecord.name} (${unitRecord.fullName.split(',')[0]})`,
        unitId: unitRecord.id,
        system: `${systemRecord.name} (${systemRecord.description || 'Process System Boundary'})`,
        systemId: systemRecord.id,
        workOrder: r.workOrder.trim() || `WO-${randomNum}`,
        description: r.description.trim() || 'Standard turnaround mechanical scope and inspection.',
        assetTag: assetItem?.tag || r.assetTag,
        assetDescription: assetItem?.description || 'Process Equipment',
        refCode: assetItem?.refCode,
        hierarchyNodeId: assetItem?.nodeId,
        hierarchyLevel: assetItem ? `Level ${assetItem.level} • ${assetItem.levelType}` : 'Level 3 • Equipment',
        hierarchyPath: assetItem?.breadcrumbPath || `${unitRecord.name} > ${systemRecord.name} > ${r.assetTag}`,
        isCriticalPath: r.isCriticalPath || !!assetItem?.isCriticalPath,
        gridZone: assetItem?.plotPlanMarker?.gridZone || 'B3',
        plotPlanX: assetItem?.plotPlanMarker?.x,
        plotPlanY: assetItem?.plotPlanMarker?.y,
        plotPlanId: assetItem?.plotPlanMarker?.plotPlanId || 'plan-overall',
        attachments: [],
        signatures: [],
        punchList: [],
        createdAt: new Date().toISOString().split('T')[0]
      };

      newJobs.push(job);
    });

    onBatchCreateJobs(newJobs);

    setCreatedSummary({
      count: newJobs.length,
      jobNumbers: generatedJobNos,
      criticalCount: newJobs.filter(j => j.isCriticalPath).length
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Event Context Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-600/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Layers size={12} className="text-emerald-400" />
              <span>EXCEL BULK JOB PACKAGE INGESTION</span>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 font-mono">Turnaround Event: {eventName}</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-mono font-bold">Plant: {plant}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-400" size={22} />
            <span>นำเข้าแพ็กเกจงานส่งมอบจาก Excel (Excel Bulk Insert Job Packages)</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Import native <strong className="text-emerald-400 font-mono">.xlsx</strong> / <strong className="text-emerald-400 font-mono">.xls</strong> workbooks, paste directly from spreadsheet cells (<kbd className="px-1 py-0.5 rounded bg-slate-800 border text-[10px] font-mono">Ctrl+V</kbd>), and auto-bind to the refinery Functional Location hierarchy tree.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setExcelModalTab('upload');
              setIsExcelModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={15} />
            <span>เปิดหน้าต่างนำเข้า Excel (Excel Wizard)</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToSingle}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} />
            <span>สลับไปหน้าเดี่ยว (Single Form)</span>
          </button>
        </div>
      </div>

      {/* Dispatched Confirmation Modal / Banner */}
      {createdSummary && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-lg space-y-3 animate-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-200">
                  ส่งมอบสำเร็จ {createdSummary.count} รายการแพ็กเกจงาน (Successfully Dispatched {createdSummary.count} Job Packages)
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  สร้างรหัสงานส่งมอบอัตโนมัติ พร้อมผูกโยง Functional Location & Asset Hierarchy ครบถ้วน ({createdSummary.criticalCount} รายการอยู่ในเส้นทางวิกฤต Critical Path ★)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCreatedSummary(null)}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer"
              >
                Dismiss
              </button>
              {onNavigateToWorkspace && (
                <button
                  type="button"
                  onClick={() => onNavigateToWorkspace('first')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open in Job Workspace</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generated Job References:</span>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {createdSummary.jobNumbers.map(no => (
                <span key={no} className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {no}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Tools: Add Rows & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>เพิ่มแถวใหม่ (+1 Row)</span>
          </button>

          <button
            type="button"
            onClick={handleAdd5Rows}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>+5 แถว</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* Preset Template Loaders */}
          <button
            type="button"
            onClick={() => setRows(SAMPLE_TURNAROUND_PACKAGES)}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800 shadow-2xs"
            title="Load 6 Core Refinery Turnaround Mechanical Packages"
          >
            <Sparkles size={14} className="text-blue-500" />
            <span>ชุดเทมเพลต TA (6 งาน)</span>
          </button>

          <button
            type="button"
            onClick={() => setRows(ELECTRICAL_INSTRUMENT_PACKAGES)}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800 shadow-2xs"
            title="Load Electrical & Instrumentation Package Template"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>ชุดไฟฟ้า/เครื่องมือวัด</span>
          </button>
        </div>

        {/* Right Tools: Excel Import Hub, Direct Paste, XLSX & CSV Download */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Main Excel Hub Trigger */}
          <button
            type="button"
            onClick={() => {
              setExcelModalTab('upload');
              setIsExcelModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-2xs"
            title="Open Excel .xlsx / .xls Ingestion Hub"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>นำเข้าไฟล์ Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExcelModalTab('paste');
              setIsExcelModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800 shadow-2xs"
            title="Paste directly from Excel cells"
          >
            <ClipboardPaste size={14} />
            <span>วางจาก Excel (Ctrl+V)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadXLSXTemplate}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Download formatted .xlsx template"
          >
            <Download size={14} />
            <span>โหลดแม่แบบ (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleAutoGenerateWOs}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Generate Consecutive Work Orders"
          >
            <RefreshCw size={14} />
            <span>รัน WO</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Clear All Rows"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Filter and Live Quality Counters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อแพ็กเกจ, แท็ก, WO..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedDisciplineFilter}
            onChange={e => setSelectedDisciplineFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="All">ทุกสายงาน (All Disciplines)</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Piping">Piping</option>
            <option value="Electrical">Electrical</option>
            <option value="Instrumentation">Instrumentation</option>
            <option value="Inspection">Inspection</option>
          </select>

          <select
            value={selectedUnitFilter}
            onChange={e => setSelectedUnitFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="All">ทุกหน่วยผลิต (All Units)</option>
            {S2_TURNOVER_HIERARCHY.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <strong className="text-slate-900 dark:text-slate-100">{validRowCount}</strong> / {rows.length} พร้อมส่งมอบ
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
            <Flame size={13} className="text-amber-500" />
            <span>{criticalPathCount} Critical Path</span>
          </span>
          <span>·</span>
          <span>รวม {totalEstimatedDays} วันทำงาน</span>
        </div>
      </div>

      {/* Spreadsheet Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[280px]">
                  Job Title / Package Name <span className="text-rose-500">*</span>
                </th>
                <th className="py-3 px-3 min-w-[120px]">Unit No.</th>
                <th className="py-3 px-3 min-w-[180px]">System Boundary</th>
                <th className="py-3 px-3 min-w-[160px]">Equipment Tag <span className="text-rose-500">*</span></th>
                <th className="py-3 px-3 min-w-[120px]">Work Order (WO)</th>
                <th className="py-3 px-3 min-w-[130px]">Discipline</th>
                <th className="py-3 px-3 w-16 text-center">Critical</th>
                <th className="py-3 px-3 min-w-[200px]">Scope & Turnover Description</th>
                <th className="py-3 px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">ไม่มีรายการแพ็กเกจงานในตาราง</p>
                    <p className="text-xs text-slate-500 mt-1">คลิก "เพิ่มแถวใหม่", "นำเข้าไฟล์ Excel (.xlsx)", หรือกด <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px]">Ctrl+V</kbd> เพื่อวางข้อมูล</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const currentUnit = S2_TURNOVER_HIERARCHY.find(u => u.id === row.unitId) || S2_TURNOVER_HIERARCHY[0];
                  const currentSystems = currentUnit.systems;
                  const currentSystem = currentSystems.find(s => s.id === row.systemId) || currentSystems[0];
                  const currentEquipment = currentSystem ? currentSystem.equipment : [];

                  const isValid = row.title.trim().length > 0 && row.assetTag.trim().length > 0;

                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        row.isCriticalPath ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      } ${!isValid ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}
                    >
                      {/* # Number */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Job Title / Package Name */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.title}
                          onChange={e => handleUpdateRow(row.id, 'title', e.target.value)}
                          placeholder="e.g. Overhaul & Inspection of Desalter Drum..."
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 ${
                            row.title.trim().length === 0
                              ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500'
                              : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
                          }`}
                        />
                      </td>

                      {/* Unit No. */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.unitId}
                          onChange={e => handleUpdateRow(row.id, 'unitId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          {S2_TURNOVER_HIERARCHY.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* System Boundary */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.systemId}
                          onChange={e => {
                            const sys = currentSystems.find(s => s.id === e.target.value);
                            handleUpdateRow(row.id, 'systemId', e.target.value);
                            if (sys) {
                              handleUpdateRow(row.id, 'systemName', `${sys.name} (${sys.description || 'Boundary'})`);
                              if (sys.equipment.length > 0) {
                                handleUpdateRow(row.id, 'assetTag', sys.equipment[0].tag);
                              }
                            }
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 cursor-pointer truncate"
                        >
                          {currentSystems.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} • {s.description ? s.description.substring(0, 24) : 'Boundary'}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Equipment Tag */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            list={`eq-list-${row.id}`}
                            value={row.assetTag}
                            onChange={e => handleUpdateRow(row.id, 'assetTag', e.target.value)}
                            placeholder="Tag (e.g. S2-DR-001D)"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                          />
                          <datalist id={`eq-list-${row.id}`}>
                            {currentEquipment.map(eq => (
                              <option key={eq.tag} value={eq.tag}>
                                {eq.tag} {eq.refCode ? `(Ref ${eq.refCode})` : ''} — {eq.description}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* Work Order (WO) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.workOrder}
                          onChange={e => handleUpdateRow(row.id, 'workOrder', e.target.value)}
                          placeholder="WO-884021"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200"
                        />
                      </td>

                      {/* Discipline */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.discipline}
                          onChange={e => handleUpdateRow(row.id, 'discipline', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="Mechanical">Mechanical</option>
                          <option value="Piping">Piping</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Instrumentation">Instrumentation</option>
                          <option value="Inspection">Inspection</option>
                          <option value="Civil / Structure">Civil / Structure</option>
                        </select>
                      </td>

                      {/* Critical Path ★ */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.id, 'isCriticalPath', !row.isCriticalPath)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            row.isCriticalPath 
                              ? 'bg-amber-500 text-white shadow-xs font-black' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'
                          }`}
                          title={row.isCriticalPath ? 'Marked on Critical Path' : 'Click to flag as Critical Path'}
                        >
                          ★
                        </button>
                      </td>

                      {/* Scope & Description */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => handleUpdateRow(row.id, 'description', e.target.value)}
                          placeholder="Notes, scope, leak testing..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Duplicate Row"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 size={13} />
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

        {/* Table Bottom Footer & Action Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Total {rows.length} package draft(s) • Ready to dispatch: {validRowCount}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSwitchToSingle}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel / Back to Single Form
            </button>

            <button
              type="button"
              onClick={handleDispatchAll}
              disabled={validRowCount === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                validRowCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>ส่งมอบแพ็กเกจงาน {validRowCount} รายการ เข้าสู่ระบบ Turnover</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EXCEL INGESTION HUB MODAL (Upload .xlsx / Paste Text / Template)
         ========================================================================= */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Excel Bulk Ingestion Wizard (นำเข้าไฟล์หรือวางข้อมูล Excel)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      .xlsx / .xls / .csv
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Import multiple packages directly from Microsoft Excel or copy-paste spreadsheet columns.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExcelModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Tab Navigation inside Excel Wizard */}
            <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExcelModalTab('upload')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    excelModalTab === 'upload'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload size={14} />
                  <span>1. นำเข้าไฟล์ Excel (.xlsx / .xls)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExcelModalTab('paste')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    excelModalTab === 'paste'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ClipboardPaste size={14} />
                  <span>2. วางเซลล์จาก Excel (Paste Cells)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExcelModalTab('template')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    excelModalTab === 'template'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Download size={14} />
                  <span>3. ดาวน์โหลดแม่แบบ Excel</span>
                </button>
              </div>

              {/* Import Mode: Append vs Replace */}
              <div className="flex items-center gap-3 text-xs pb-2 sm:pb-0">
                <span className="text-slate-400 font-semibold">โหมดนำเข้า:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  <span>เพิ่มต่อท้าย (Append)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span>แทนที่ตารางเดิม (Replace)</span>
                </label>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* TAB 1: UPLOAD EXCEL FILE (.XLSX / .XLS) */}
              {excelModalTab === 'upload' && (
                <div className="space-y-4">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                      <FileSpreadsheet size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      ลากไฟล์ Excel (.xlsx / .xls / .csv) มาวางที่นี่
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ ระบบจะอ่านข้อมูลทุกชีตและตรวจจับหัวคอลัมน์อัตโนมัติ
                    </p>
                    <span className="mt-3 px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                      รองรับ Microsoft Excel 2007-365 (.xlsx) และ CSV
                    </span>
                  </div>

                  {/* If file is uploaded, show worksheet and column mapping */}
                  {uploadedWorkbook && (
                    <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            ตรวจพบข้อมูล {parsedRawRows.length} แถวในไฟล์
                          </span>
                        </div>

                        {/* Sheet Selector */}
                        {uploadedWorkbook.SheetNames.length > 1 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">เลือก Sheet:</span>
                            <select
                              value={selectedSheetName}
                              onChange={e => processExcelWorkbook(uploadedWorkbook, e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                            >
                              {uploadedWorkbook.SheetNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Column Mapping Grid */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          จับคู่คอลัมน์จาก Excel (Column Mapping):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {[
                            { key: 'title', label: '1. Package Title *' },
                            { key: 'unit', label: '2. Unit No' },
                            { key: 'system', label: '3. Process System' },
                            { key: 'tag', label: '4. Equipment Tag *' },
                            { key: 'workOrder', label: '5. Work Order' },
                            { key: 'discipline', label: '6. Discipline' },
                            { key: 'critical', label: '7. Critical Path' },
                            { key: 'days', label: '8. Estimated Days' },
                            { key: 'description', label: '9. Scope & Description' },
                          ].map(item => (
                            <div key={item.key} className="space-y-1 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block truncate">
                                {item.label}
                              </label>
                              <select
                                value={(columnMapping as any)[item.key]}
                                onChange={e => setColumnMapping(prev => ({
                                  ...prev,
                                  [item.key]: parseInt(e.target.value)
                                }))}
                                className="w-full text-[11px] font-mono p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                              >
                                {excelHeaders.map((header, idx) => (
                                  <option key={idx} value={idx}>
                                    {header ? `${header} (Col ${idx + 1})` : `Column ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* First 5 Rows Preview */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          ตัวอย่าง 5 แถวแรกที่จะนำเข้า (Preview):
                        </span>
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                              <tr>
                                <th className="p-2">Title</th>
                                <th className="p-2">Unit</th>
                                <th className="p-2">System</th>
                                <th className="p-2">Tag</th>
                                <th className="p-2">WO</th>
                                <th className="p-2">Discipline</th>
                                <th className="p-2">Critical</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {parsedRawRows.slice(0, 5).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                                  <td className="p-2 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">{row[columnMapping.title]}</td>
                                  <td className="p-2">{row[columnMapping.unit]}</td>
                                  <td className="p-2 max-w-[120px] truncate">{row[columnMapping.system]}</td>
                                  <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{row[columnMapping.tag]}</td>
                                  <td className="p-2 font-mono">{row[columnMapping.workOrder]}</td>
                                  <td className="p-2">{row[columnMapping.discipline]}</td>
                                  <td className="p-2">{String(row[columnMapping.critical] || '').toLowerCase().includes('yes') ? '★ YES' : 'NO'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DIRECT EXCEL CELL PASTE */}
              {excelModalTab === 'paste' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      คลุมดำเซลล์ใน Excel แล้วกด <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl+C</kbd> จากนั้นกด <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl+V</kbd> ในกล่องด้านล่างนี้:
                    </p>
                    <button
                      type="button"
                      onClick={() => setPasteRawText(RAW_EXCEL_DEMO_TEXT)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold self-start sm:self-auto cursor-pointer"
                    >
                      วางข้อมูลตัวอย่าง (Demo Data)
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    ลำดับคอลัมน์มาตรฐาน: <br />
                    <code className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Title &nbsp;|&nbsp; Unit &nbsp;|&nbsp; System &nbsp;|&nbsp; Equipment Tag &nbsp;|&nbsp; Work Order &nbsp;|&nbsp; Discipline &nbsp;|&nbsp; Critical (Yes/No) &nbsp;|&nbsp; Days &nbsp;|&nbsp; Scope
                    </code>
                  </div>

                  <textarea
                    rows={8}
                    value={pasteRawText}
                    onChange={e => setPasteRawText(e.target.value)}
                    placeholder="วางข้อมูลเซลล์ Excel ที่นี่..."
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />

                  {/* Real-time Parsed Preview from Text */}
                  {pasteRawText.trim() && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        ตัวอย่างแถวที่ตรวจพบ ({pasteRawText.split(/\r?\n/).filter(l => l.trim().length > 0).length} แถว):
                      </span>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                            <tr>
                              <th className="p-2">#</th>
                              <th className="p-2">Title</th>
                              <th className="p-2">Unit</th>
                              <th className="p-2">System</th>
                              <th className="p-2">Tag</th>
                              <th className="p-2">WO</th>
                              <th className="p-2">Discipline</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {pasteRawText.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5).map((line, idx) => {
                              const delimiter = line.includes('\t') ? '\t' : ',';
                              const parts = line.split(delimiter);
                              return (
                                <tr key={idx}>
                                  <td className="p-2 text-slate-400">{idx + 1}</td>
                                  <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{parts[0]}</td>
                                  <td className="p-2">{parts[1] || 'APS-1'}</td>
                                  <td className="p-2">{parts[2] || 'System-11'}</td>
                                  <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{parts[3] || 'N/A'}</td>
                                  <td className="p-2 font-mono">{parts[4] || 'N/A'}</td>
                                  <td className="p-2">{parts[5] || 'Mechanical'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DOWNLOAD EXCEL TEMPLATE */}
              {excelModalTab === 'template' && (
                <div className="space-y-4 p-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                    <FileSpreadsheet size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      แม่แบบไฟล์ Microsoft Excel สำหรับการเตรียมแพ็กเกจงาน
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      ดาวน์โหลดไฟล์แม่แบบที่มีการตั้งค่าหัวคอลัมน์และข้อมูลตัวอย่างงาน Turnaround ครบถ้วน เพื่อนำไปกรอกข้อมูลใน Excel แล้วนำกลับมาอัปโหลดได้ทันที
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadXLSXTemplate}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลดไฟล์ .xlsx (Excel Workbook)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลดไฟล์ .csv</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {excelModalTab === 'upload' && parsedRawRows.length > 0 && `${parsedRawRows.length} rows ready`}
                {excelModalTab === 'paste' && `${pasteRawText.split(/\r?\n/).filter(l => l.trim().length > 0).length} rows ready`}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก (Cancel)
                </button>

                {excelModalTab === 'upload' && (
                  <button
                    type="button"
                    onClick={handleApplyExcelData}
                    disabled={parsedRawRows.length === 0}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      parsedRawRows.length > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check size={15} />
                    <span>นำเข้าสู่ตารางหลัก ({parsedRawRows.length} รายการ)</span>
                  </button>
                )}

                {excelModalTab === 'paste' && (
                  <button
                    type="button"
                    onClick={handleApplyPasteText}
                    disabled={!pasteRawText.trim()}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      pasteRawText.trim()
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check size={15} />
                    <span>นำเข้าข้อมูลจากเซลล์ (Apply Rows)</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
