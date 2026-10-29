import React, { useState, useRef, ChangeEvent, useMemo } from 'react';
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
  MapPin,
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  X,
  ExternalLink,
  Save,
  Check,
  Layers,
  HardHat,
  Truck,
  Building,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Info,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { addCraneJob, getAllCraneJobs } from '../data/craneOperationsData';
import { addScaffoldingJob, getStoredScaffoldingJobs } from '../data/scaffoldingSFData';

export interface BulkJobRow {
  id: string;
  description: string;
  plant: string;
  machineType: string;
  capacity: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  contractor: string;
  priority: 'Normal' | 'High' | 'Urgent';
  x: number;
  y: number;
  remarks: string;
}

export const BULK_DEFAULT_PLANTS = [
  'BCP Refinery Area 1',
  'Storage Yard Sector B',
  'Zone C Construction & Expansion',
  'Workshop & Pre-assembly Yard',
  'Dock Area & Marine Terminal',
  'Main Gate Logistics Staging',
  'Zone 1 (Process)',
  'Zone 2 (Utilities)',
  'Hydrocracking Unit (HCU-1)'
];

export const BULK_CRANE_TYPES = [
  'Mobile Crane (50T)',
  'Mobile Crane (100T)',
  'Mobile Crane (300T)',
  'Crawler Crane (400T)',
  'Rough Terrain Crane',
  'Tower Crane',
  'Forklift / Telehandler'
];

export const BULK_SCAFFOLD_TYPES = [
  'Modular System Scaffold',
  'Cantilever Scaffolding',
  'Suspended Cradle Scaffolding',
  'Mobile Tower Scaffold',
  'Heavy Duty Shoring',
  'Tube & Fitting Scaffold'
];

export const BULK_CONTRACTORS = [
  'Contractor A (Mechanical)',
  'Contractor B (Piping & Structural)',
  'Operations Dept (BCP Owner)',
  'Maintenance Team',
  'External Heavy Lift Partner'
];

export const SAMPLE_CRANE_BULK_JOBS: BulkJobRow[] = [
  {
    id: 'crane-row-1',
    description: 'Remove Manhole #03 on Crude Distillation Tower 11-C-101',
    plant: 'BCP Refinery Area 1',
    machineType: 'Mobile Crane (100T)',
    capacity: 45,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'Contractor A (Mechanical)',
    priority: 'High',
    x: 42.5,
    y: 38.0,
    remarks: 'Pre-rigging tag inspection required before lifting.'
  },
  {
    id: 'crane-row-2',
    description: 'Lift and position Tube Bundle for Reboiler 11-E-102B',
    plant: 'Hydrocracking Unit (HCU-1)',
    machineType: 'Mobile Crane (300T)',
    capacity: 85,
    startDate: '2026-09-26',
    endDate: '2026-09-27',
    startTime: '07:30',
    endTime: '18:00',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'Urgent',
    x: 58.2,
    y: 62.4,
    remarks: 'Dual-crane tandem lift plan approved by TSS.'
  },
  {
    id: 'crane-row-3',
    description: 'Relocate temporary generator units and power skid to Substation 3',
    plant: 'Zone 2 (Utilities)',
    machineType: 'Rough Terrain Crane',
    capacity: 35,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '10:00',
    endTime: '15:00',
    contractor: 'Maintenance Team',
    priority: 'Normal',
    x: 24.0,
    y: 45.8,
    remarks: 'Ground matting check completed.'
  },
  {
    id: 'crane-row-4',
    description: 'Rig and hoist replacement Heat Exchanger 11-E-101A Shell',
    plant: 'BCP Refinery Area 1',
    machineType: 'Mobile Crane (100T)',
    capacity: 55,
    startDate: '2026-09-27',
    endDate: '2026-09-28',
    startTime: '08:00',
    endTime: '16:00',
    contractor: 'Contractor A (Mechanical)',
    priority: 'High',
    x: 35.0,
    y: 52.0,
    remarks: 'Check overhead piperack clearances.'
  },
  {
    id: 'crane-row-5',
    description: 'Unload new piping spools and valves at Storage Sector B',
    plant: 'Storage Yard Sector B',
    machineType: 'Forklift / Telehandler',
    capacity: 15,
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '13:00',
    endTime: '17:00',
    contractor: 'Operations Dept (BCP Owner)',
    priority: 'Normal',
    x: 75.0,
    y: 30.0,
    remarks: 'Stack in pre-designated bay 4.'
  }
];

export const SAMPLE_SCAFFOLD_BULK_JOBS: BulkJobRow[] = [
  {
    id: 'scaff-row-1',
    description: 'Erect perimeter access scaffolding for Tower 11-C-101 (Level 1-4)',
    plant: 'BCP Refinery Area 1',
    machineType: 'Modular System Scaffold',
    capacity: 20,
    startDate: '2026-09-25',
    endDate: '2026-09-28',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'Urgent',
    x: 42.5,
    y: 38.0,
    remarks: 'Green safety tag required prior to entry.'
  },
  {
    id: 'scaff-row-2',
    description: 'Install heavy-duty shoring tower under Main Piperack Corridor',
    plant: 'Zone 1 (Process)',
    machineType: 'Heavy Duty Shoring',
    capacity: 35,
    startDate: '2026-09-26',
    endDate: '2026-09-29',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'Contractor B (Piping & Structural)',
    priority: 'High',
    x: 50.0,
    y: 48.0,
    remarks: 'Load calculation reviewed by civil structural engineer.'
  },
  {
    id: 'scaff-row-3',
    description: 'Erect cantilever platform around Reboiler 11-E-102B flange',
    plant: 'Hydrocracking Unit (HCU-1)',
    machineType: 'Cantilever Scaffolding',
    capacity: 15,
    startDate: '2026-09-25',
    endDate: '2026-09-26',
    startTime: '08:00',
    endTime: '16:30',
    contractor: 'Maintenance Team',
    priority: 'Normal',
    x: 58.2,
    y: 62.4,
    remarks: 'Ensure double handrails and toe boards.'
  },
  {
    id: 'scaff-row-4',
    description: 'Construct mobile tower scaffold for Cable Tray repair at Substation 3',
    plant: 'Zone 2 (Utilities)',
    machineType: 'Mobile Tower Scaffold',
    capacity: 8,
    startDate: '2026-09-27',
    endDate: '2026-09-27',
    startTime: '09:00',
    endTime: '16:00',
    contractor: 'Operations Dept (BCP Owner)',
    priority: 'Normal',
    x: 24.0,
    y: 45.8,
    remarks: 'Lockable caster wheels inspection mandatory.'
  },
  {
    id: 'scaff-row-5',
    description: 'Assemble suspended cradle scaffolding under Jetty Berth 2 walkway',
    plant: 'Dock Area & Marine Terminal',
    machineType: 'Suspended Cradle Scaffolding',
    capacity: 12,
    startDate: '2026-09-28',
    endDate: '2026-09-30',
    startTime: '08:00',
    endTime: '17:00',
    contractor: 'External Heavy Lift Partner',
    priority: 'High',
    x: 82.0,
    y: 25.0,
    remarks: 'Marine life vests mandatory for all erectors.'
  }
];

interface BulkJobInsertProps {
  isScaffolding?: boolean;
  onNavigateToRequests?: () => void;
  onSwitchToSingle?: () => void;
  onJobsCreated?: (jobs: any[]) => void;
}

export default function BulkJobInsert({
  isScaffolding = false,
  onNavigateToRequests,
  onSwitchToSingle,
  onJobsCreated
}: BulkJobInsertProps) {
  const { isTh } = useLanguage();

  // State: Bulk Rows
  const [rows, setRows] = useState<BulkJobRow[]>(
    isScaffolding ? SAMPLE_SCAFFOLD_BULK_JOBS : SAMPLE_CRANE_BULK_JOBS
  );

  // State: Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State: Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Normal' | 'High' | 'Urgent'>('All');
  const [plantFilter, setPlantFilter] = useState<string>('All');
  const [validityFilter, setValidityFilter] = useState<'All' | 'Valid' | 'Issues'>('All');

  // State: Modals
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  // State: Visual Coordinate Picker Modal
  const [mappingRowId, setMappingRowId] = useState<string | null>(null);

  // State: Submission summary
  const [submittedSummary, setSubmittedSummary] = useState<{
    count: number;
    jobNumbers: string[];
    plantBreakdown: Record<string, number>;
    contractorBreakdown: Record<string, number>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation function per row
  const getRowIssues = (row: BulkJobRow): string[] => {
    const issues: string[] = [];
    if (!row.description.trim()) issues.push('Description is required');
    if (!row.plant.trim()) issues.push('Plant/Area is required');
    if (row.capacity <= 0) issues.push('Capacity must be > 0');
    if (!row.startDate) issues.push('Start Date is required');
    if (!row.endDate) issues.push('End Date is required');
    if (row.startDate && row.endDate && row.endDate < row.startDate) {
      issues.push('End date cannot precede start date');
    }
    return issues;
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          row.description.toLowerCase().includes(q) ||
          row.plant.toLowerCase().includes(q) ||
          row.machineType.toLowerCase().includes(q) ||
          row.contractor.toLowerCase().includes(q) ||
          row.remarks.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Priority
      if (priorityFilter !== 'All' && row.priority !== priorityFilter) {
        return false;
      }
      // Plant
      if (plantFilter !== 'All' && row.plant !== plantFilter) {
        return false;
      }
      // Validity
      if (validityFilter !== 'All') {
        const issues = getRowIssues(row);
        if (validityFilter === 'Valid' && issues.length > 0) return false;
        if (validityFilter === 'Issues' && issues.length === 0) return false;
      }
      return true;
    });
  }, [rows, searchQuery, priorityFilter, plantFilter, validityFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = rows.length;
    let validCount = 0;
    let issuesCount = 0;
    let totalCapacity = 0;
    let urgentCount = 0;
    let highCount = 0;
    const plantSet = new Set<string>();

    rows.forEach((r) => {
      const issues = getRowIssues(r);
      if (issues.length === 0) validCount++;
      else issuesCount++;
      totalCapacity += Number(r.capacity) || 0;
      if (r.priority === 'Urgent') urgentCount++;
      if (r.priority === 'High') highCount++;
      if (r.plant) plantSet.add(r.plant);
    });

    return {
      total,
      validCount,
      issuesCount,
      totalCapacity,
      urgentCount,
      highCount,
      uniquePlants: plantSet.size
    };
  }, [rows]);

  // Checkbox helpers
  const isAllSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.has(r.id));
  const isSomeSelected = filteredRows.some(r => selectedIds.has(r.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(selectedIds);
      filteredRows.forEach(r => newSet.add(r.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Row Manipulation
  const handleAddRow = () => {
    const newId = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRow: BulkJobRow = {
      id: newId,
      description: '',
      plant: BULK_DEFAULT_PLANTS[0],
      machineType: isScaffolding ? BULK_SCAFFOLD_TYPES[0] : BULK_CRANE_TYPES[0],
      capacity: isScaffolding ? 15 : 50,
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      startTime: '08:00',
      endTime: '17:00',
      contractor: BULK_CONTRACTORS[0],
      priority: 'Normal',
      x: parseFloat((20 + Math.random() * 60).toFixed(1)),
      y: parseFloat((20 + Math.random() * 60).toFixed(1)),
      remarks: ''
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleAddFiveRows = () => {
    const added: BulkJobRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `row-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      description: '',
      plant: BULK_DEFAULT_PLANTS[i % BULK_DEFAULT_PLANTS.length],
      machineType: isScaffolding ? BULK_SCAFFOLD_TYPES[0] : BULK_CRANE_TYPES[0],
      capacity: isScaffolding ? 15 : 50,
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      startTime: '08:00',
      endTime: '17:00',
      contractor: BULK_CONTRACTORS[i % BULK_CONTRACTORS.length],
      priority: 'Normal',
      x: parseFloat((20 + Math.random() * 60).toFixed(1)),
      y: parseFloat((20 + Math.random() * 60).toFixed(1)),
      remarks: ''
    }));
    setRows(prev => [...prev, ...added]);
  };

  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    const duplicated: BulkJobRow = {
      ...source,
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: source.description ? `${source.description} (Copy)` : '',
      x: parseFloat(Math.min(95, source.x + 3.5).toFixed(1)),
      y: parseFloat(Math.min(95, source.y + 2.5).toFixed(1))
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, duplicated);
    setRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      alert(isTh ? 'ต้องมีอย่างน้อย 1 แถวในตารางร่าง' : 'At least one draft row must remain.');
      return;
    }
    const target = rows[index];
    setRows(prev => prev.filter((_, i) => i !== index));
    if (selectedIds.has(target.id)) {
      const next = new Set(selectedIds);
      next.delete(target.id);
      setSelectedIds(next);
    }
  };

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const updated = [...rows];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setRows(updated);
  };

  const handleUpdateField = (index: number, field: keyof BulkJobRow, value: any) => {
    setRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  // Batch actions on selected rows
  const handleBatchSetPlant = (plant: string) => {
    if (!plant) return;
    setRows(prev =>
      prev.map(r => (selectedIds.has(r.id) ? { ...r, plant } : r))
    );
  };

  const handleBatchSetContractor = (contractor: string) => {
    if (!contractor) return;
    setRows(prev =>
      prev.map(r => (selectedIds.has(r.id) ? { ...r, contractor } : r))
    );
  };

  const handleBatchSetPriority = (priority: 'Normal' | 'High' | 'Urgent') => {
    setRows(prev =>
      prev.map(r => (selectedIds.has(r.id) ? { ...r, priority } : r))
    );
  };

  const handleBatchShiftDates = (days: number) => {
    setRows(prev =>
      prev.map(r => {
        if (!selectedIds.has(r.id)) return r;
        try {
          const s = new Date(r.startDate);
          s.setDate(s.getDate() + days);
          const e = new Date(r.endDate);
          e.setDate(e.getDate() + days);
          return {
            ...r,
            startDate: s.toISOString().slice(0, 10),
            endDate: e.toISOString().slice(0, 10)
          };
        } catch {
          return r;
        }
      })
    );
  };

  const handleBatchDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        isTh
          ? `คุณต้องการลบ ${selectedIds.size} รายการที่เลือกใช่หรือไม่?`
          : `Delete ${selectedIds.size} selected rows?`
      )
    ) {
      setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    }
  };

  const handleBatchDuplicateSelected = () => {
    if (selectedIds.size === 0) return;
    const duplicated = rows
      .filter(r => selectedIds.has(r.id))
      .map(r => ({
        ...r,
        id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        description: r.description ? `${r.description} (Copy)` : '',
        x: parseFloat(Math.min(95, r.x + 3.0).toFixed(1)),
        y: parseFloat(Math.min(95, r.y + 2.0).toFixed(1))
      }));
    setRows(prev => [...prev, ...duplicated]);
  };

  const handleAutoSpreadCoordinates = () => {
    setRows(prev =>
      prev.map((r, i) => {
        const angle = (i / Math.max(1, prev.length)) * 2 * Math.PI;
        const radius = 22 + (i % 3) * 6;
        const x = parseFloat((50 + radius * Math.cos(angle)).toFixed(1));
        const y = parseFloat((50 + radius * Math.sin(angle)).toFixed(1));
        return { ...r, x, y };
      })
    );
  };

  const handleAutoFixIssues = () => {
    setRows(prev =>
      prev.map((r, i) => {
        let fixed = { ...r };
        if (!fixed.description.trim()) {
          fixed.description = `${isScaffolding ? 'Scaffold Access' : 'Crane Lift Job'} #${i + 1} at ${fixed.plant}`;
        }
        if (fixed.capacity <= 0) {
          fixed.capacity = isScaffolding ? 15 : 50;
        }
        if (fixed.endDate < fixed.startDate) {
          fixed.endDate = fixed.startDate;
        }
        return fixed;
      })
    );
  };

  const handleLoadSample = () => {
    setRows(isScaffolding ? SAMPLE_SCAFFOLD_BULK_JOBS : SAMPLE_CRANE_BULK_JOBS);
    setSelectedIds(new Set());
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        isTh
          ? 'คุณต้องการล้างข้อมูลทั้งหมดในตารางใช่หรือไม่?'
          : 'Clear all rows in the bulk table?'
      )
    ) {
      setRows([]);
      setSelectedIds(new Set());
    }
  };

  // CSV Download & Parsing
  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Job Description',
      'Plant / Area',
      'Machine Type',
      'Capacity (Tons)',
      'Start Date (YYYY-MM-DD)',
      'End Date (YYYY-MM-DD)',
      'Start Time (HH:MM)',
      'End Time (HH:MM)',
      'Contractor',
      'Priority (Normal/High/Urgent)',
      'Coord X (%)',
      'Coord Y (%)',
      'Remarks'
    ];

    const sampleRow = isScaffolding
      ? [
          'Erect perimeter access scaffolding for Tower 11-C-101',
          'BCP Refinery Area 1',
          'Modular System Scaffold',
          '20',
          '2026-09-25',
          '2026-09-28',
          '08:00',
          '17:00',
          'Contractor B (Piping & Structural)',
          'Urgent',
          '45.0',
          '48.5',
          'Safety green tag required'
        ]
      : [
          'Overhaul 11-E-101A Heat Exchanger Channel Head',
          'BCP Refinery Area 1',
          'Mobile Crane (100T)',
          '50',
          '2026-09-25',
          '2026-09-26',
          '08:00',
          '17:00',
          'Contractor A (Mechanical)',
          'High',
          '42.5',
          '50.0',
          'Tandem lift rigging plan verified'
        ];

    const csvContent =
      '\uFEFF' +
      [headers, sampleRow]
        .map(row =>
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bulk_Job_Requests_Template_${isScaffolding ? 'SF01' : 'CR01'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parsePastedTextToRows = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) {
      setCsvParseError(isTh ? 'ไม่พบข้อมูลที่สามารถอ่านได้' : 'No valid lines found');
      return;
    }

    const newRows: BulkJobRow[] = [];
    let skippedHeader = false;

    lines.forEach((line, idx) => {
      // detect tab or comma or semicolon
      const isTab = line.includes('\t');
      const isSemicolon = !isTab && line.includes(';');
      const parts = isTab
        ? line.split('\t').map(p => p.trim().replace(/^["']|["']$/g, ''))
        : isSemicolon
        ? line.split(';').map(p => p.trim().replace(/^["']|["']$/g, ''))
        : line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(p => p.trim().replace(/^["']|["']$/g, ''));

      // Check header row
      const firstCol = (parts[0] || '').toLowerCase();
      if (
        !skippedHeader &&
        (firstCol.includes('description') ||
          firstCol.includes('job') ||
          firstCol.includes('งาน') ||
          firstCol === '#')
      ) {
        skippedHeader = true;
        return;
      }

      if (parts.length >= 1 && parts[0]) {
        const desc = parts[0] || `Bulk Job #${idx + 1}`;
        const plant = parts[1] || BULK_DEFAULT_PLANTS[0];
        const machine =
          parts[2] || (isScaffolding ? BULK_SCAFFOLD_TYPES[0] : BULK_CRANE_TYPES[0]);
        const cap = parseFloat(parts[3]) || (isScaffolding ? 15 : 50);
        const sDate = parts[4] || '2026-09-25';
        const eDate = parts[5] || sDate;
        const sTime = parts[6] || '08:00';
        const eTime = parts[7] || '17:00';
        const contractor = parts[8] || BULK_CONTRACTORS[0];
        const rawPri = (parts[9] || 'Normal').toLowerCase();
        const priority: 'Normal' | 'High' | 'Urgent' = rawPri.includes('urg')
          ? 'Urgent'
          : rawPri.includes('high')
          ? 'High'
          : 'Normal';
        const x =
          parseFloat(parts[10]) || parseFloat((20 + Math.random() * 60).toFixed(1));
        const y =
          parseFloat(parts[11]) || parseFloat((20 + Math.random() * 60).toFixed(1));
        const remarks = parts[12] || '';

        newRows.push({
          id: `parsed-${Date.now()}-${idx}`,
          description: desc,
          plant,
          machineType: machine,
          capacity: cap,
          startDate: sDate,
          endDate: eDate,
          startTime: sTime,
          endTime: eTime,
          contractor,
          priority,
          x,
          y,
          remarks
        });
      }
    });

    if (newRows.length > 0) {
      setRows(prev => [...prev, ...newRows]);
      setShowPasteModal(false);
      setRawPastedText('');
      setCsvParseError(null);
    } else {
      setCsvParseError(
        isTh
          ? 'ไม่สามารถแปลงแถวข้อมูลได้ กรุณาตรวจสอบการคั่นด้วย Tab หรือ Comma'
          : 'Could not parse any rows. Please check delimiters.'
      );
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        parsePastedTextToRows(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Bulk Jobs
  const handleBulkSubmit = () => {
    const validRows = rows.filter(r => r.description.trim().length > 0);
    if (validRows.length === 0) {
      alert(
        isTh
          ? 'กรุณากรอกรายละเอียดงานอย่างน้อย 1 แถวก่อนส่งคำขอ'
          : 'Please provide a valid description for at least 1 job row.'
      );
      return;
    }

    const startIdBase = 260526 + Math.floor(Math.random() * 500);
    const createdJobNumbers: string[] = [];
    const plantBreakdown: Record<string, number> = {};
    const contractorBreakdown: Record<string, number> = {};

    const newJobs = validRows.map((row, idx) => {
      const id = startIdBase + idx;
      const jobNo = isScaffolding
        ? `SF-26${String(id).slice(-5)}`
        : `ICM-26${String(id).slice(-5)}`;
      createdJobNumbers.push(jobNo);

      plantBreakdown[row.plant] = (plantBreakdown[row.plant] || 0) + 1;
      contractorBreakdown[row.contractor] =
        (contractorBreakdown[row.contractor] || 0) + 1;

      return {
        id,
        jobNo,
        plant: row.plant,
        description: row.description.trim(),
        type: row.machineType,
        dateFrom: `${row.startDate} ${row.startTime}`,
        dateEnd: `${row.endDate} ${row.endTime}`,
        status: 'Requested',
        contractor: row.contractor,
        priority: row.priority,
        capacity: row.capacity,
        x: row.x,
        y: row.y,
        isArea: false,
        width: 8,
        height: 6,
        rotation: 0,
        remarks: row.remarks ? row.remarks.trim() : undefined
      };
    });

    // Save to localStorage & module store
    try {
      const existingStr = localStorage.getItem('crane_custom_job_requests');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const combined = [...newJobs, ...existing];
      localStorage.setItem('crane_custom_job_requests', JSON.stringify(combined));

      if (!isScaffolding) {
        newJobs.forEach(job => {
          addCraneJob(job);
        });
        window.dispatchEvent(new CustomEvent('crane_operations_updated', { detail: { jobs: getAllCraneJobs() } }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error('Failed to save to localStorage / crane store:', e);
    }

    if (onJobsCreated) {
      onJobsCreated(newJobs);
    }

    setSubmittedSummary({
      count: newJobs.length,
      jobNumbers: createdJobNumbers,
      plantBreakdown,
      contractorBreakdown
    });
  };

  // Mapping Modal target row
  const activeMappingRow = rows.find(r => r.id === mappingRowId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. METRICS & KPI CARDS BANNER
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Rows */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isTh ? 'จำนวนแถวทั้งหมด' : 'Draft Rows'}
            </span>
            <Layers size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {metrics.total}
            </span>
            <span className="text-[11px] text-slate-400">jobs</span>
          </div>
        </div>

        {/* Valid Rows */}
        <div 
          onClick={() => setValidityFilter(validityFilter === 'Valid' ? 'All' : 'Valid')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            validityFilter === 'Valid'
              ? 'bg-emerald-50/70 border-emerald-500 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isTh ? 'พร้อมส่ง (Valid)' : 'Ready Valid'}
            </span>
            <CheckCircle2 size={15} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.validCount}
            </span>
            <span className="text-[11px] text-emerald-600/70">
              {metrics.total > 0 ? `${Math.round((metrics.validCount / metrics.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Incomplete / Issues */}
        <div 
          onClick={() => setValidityFilter(validityFilter === 'Issues' ? 'All' : 'Issues')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            validityFilter === 'Issues'
              ? 'bg-amber-50/70 border-amber-500 dark:bg-amber-950/40 ring-1 ring-amber-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isTh ? 'ต้องตรวจสอบ' : 'Incomplete'}
            </span>
            <AlertCircle size={15} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {metrics.issuesCount}
            </span>
            {metrics.issuesCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/60 rounded text-amber-700 dark:text-amber-300">
                Fix
              </span>
            )}
          </div>
        </div>

        {/* Total Fleet Capacity */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isScaffolding ? 'รวมความสูง' : 'รวมพิกัดยก'}
            </span>
            <Truck size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {metrics.totalCapacity}
            </span>
            <span className="text-[11px] text-slate-400">{isScaffolding ? 'm' : 'Tons'}</span>
          </div>
        </div>

        {/* Priority: Urgent / High */}
        <div 
          onClick={() => setPriorityFilter(priorityFilter === 'Urgent' ? 'All' : 'Urgent')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-slate-300"
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isTh ? 'ด่วน / สำคัญ' : 'Urgent / High'}
            </span>
            <AlertTriangle size={15} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {metrics.urgentCount}
            </span>
            <span className="text-xs text-amber-500 font-semibold">
              +{metrics.highCount} high
            </span>
          </div>
        </div>

        {/* Plants Involved */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isTh ? 'พื้นที่เป้าหมาย' : 'Plants / Areas'}
            </span>
            <Building size={15} className="text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {metrics.uniquePlants}
            </span>
            <span className="text-[11px] text-slate-400">locations</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MAIN ACTION TOOLBAR
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Adding & Importing */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Row Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>{isTh ? '+ เพิ่ม 1 แถว' : '+ Add Row'}</span>
          </button>

          {/* Add 5 Rows Button */}
          <button
            type="button"
            onClick={handleAddFiveRows}
            className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-900"
          >
            <Plus size={13} />
            <span>{isTh ? '+ เพิ่ม 5 แถว' : '+ Add 5 Rows'}</span>
          </button>

          {/* Load Sample Data */}
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>{isTh ? 'โหลดตัวอย่าง 5 งาน' : 'Load Sample Data'}</span>
          </button>

          {/* Paste from Excel/CSV Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
          >
            <FileSpreadsheet size={14} />
            <span>{isTh ? 'วางข้อมูล Excel / Sheets' : 'Paste from Excel'}</span>
          </button>

          {/* Upload CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Upload size={14} />
            <span>{isTh ? 'นำเข้าไฟล์ CSV' : 'Import CSV'}</span>
          </button>
        </div>

        {/* Right Side: Tools & Quick Fix */}
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.issuesCount > 0 && (
            <button
              type="button"
              onClick={handleAutoFixIssues}
              className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-300 dark:border-amber-800"
              title="Automatically fill fallback values for incomplete fields"
            >
              <Sparkles size={14} />
              <span>{isTh ? 'แก้ไขด่วนอัตโนมัติ' : 'Auto-Fix Incomplete'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-900"
            title="Download CSV format template"
          >
            <Download size={14} />
            <span>{isTh ? 'เทมเพลต CSV' : 'CSV Template'}</span>
          </button>

          <button
            type="button"
            onClick={handleAutoSpreadCoordinates}
            className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Automatically spread X/Y pins across plant coordinates"
          >
            <MapPin size={14} />
            <span>{isTh ? 'กระจายพิกัดผัง' : 'Auto-Spread Coords'}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
            title="Clear all rows"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. SEARCH, FILTER & BATCH OPERATIONS BAR
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTh ? 'ค้นหาคำอธิบาย, พื้นที่, เครื่องจักร หรือผู้รับเหมา...' : 'Search description, plant, machine, contractor...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Plant Filter */}
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">{isTh ? 'ทุกพื้นที่ (All Plants)' : 'All Plants'}</option>
              {BULK_DEFAULT_PLANTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">{isTh ? 'ทุกความเร่งด่วน' : 'All Priority'}</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Showing {filteredRows.length} of {rows.length} rows</span>
          </div>
        </div>

        {/* Batch Operations Bar (Visible when 1+ rows selected) */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
                {selectedIds.size} {isTh ? 'รายการที่เลือก' : 'Selected'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                {isTh ? 'ยกเลิกการเลือก' : 'Deselect All'}
              </button>
            </div>

            {/* Batch Action Dropdowns & Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Batch Set Plant */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchSetPlant(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
              >
                <option value="" disabled>Apply Plant to Selected...</option>
                {BULK_DEFAULT_PLANTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Batch Set Contractor */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchSetContractor(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
              >
                <option value="" disabled>Apply Contractor...</option>
                {BULK_CONTRACTORS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Batch Priority Buttons */}
              <div className="flex items-center gap-1 border border-blue-200 dark:border-blue-800 rounded-lg p-0.5 bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => handleBatchSetPriority('Normal')}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetPriority('High')}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded hover:bg-amber-100 text-amber-700 dark:text-amber-300"
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetPriority('Urgent')}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded hover:bg-rose-100 text-rose-700 dark:text-rose-300"
                >
                  Urgent
                </button>
              </div>

              {/* Date Shifts */}
              <button
                type="button"
                onClick={() => handleBatchShiftDates(1)}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium hover:bg-blue-50 text-slate-700 dark:text-slate-200"
                title="Shift dates +1 day for all selected"
              >
                +1 Day
              </button>

              <button
                type="button"
                onClick={() => handleBatchShiftDates(7)}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium hover:bg-blue-50 text-slate-700 dark:text-slate-200"
                title="Shift dates +7 days for all selected"
              >
                +1 Wk
              </button>

              {/* Duplicate Selected */}
              <button
                type="button"
                onClick={handleBatchDuplicateSelected}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium hover:bg-blue-50 text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <Copy size={12} />
                <span>Clone</span>
              </button>

              {/* Delete Selected */}
              <button
                type="button"
                onClick={handleBatchDeleteSelected}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. INTERACTIVE BULK EDITABLE DATA GRID
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 shadow-xs backdrop-blur-xs">
              <tr>
                {/* Select All Checkbox */}
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-12 text-center">Status</th>
                <th className="p-3 min-w-72">{isTh ? 'รายละเอียดงาน (Description) *' : 'Job Description *'}</th>
                <th className="p-3 w-44">{isTh ? 'พื้นที่/หน่วยงาน (Plant) *' : 'Plant / Area *'}</th>
                <th className="p-3 w-48">{isScaffolding ? 'ประเภทนั่งร้าน' : 'เครื่องจักร/เครน'}</th>
                <th className="p-3 w-28 text-center">{isScaffolding ? 'ความสูง (m)' : 'ขนาดพิกัด (ตัน)'}</th>
                <th className="p-3 w-32">{isTh ? 'วันที่เริ่ม' : 'Start Date'}</th>
                <th className="p-3 w-32">{isTh ? 'วันที่สิ้นสุด' : 'End Date'}</th>
                <th className="p-3 w-40">{isTh ? 'ผู้รับเหมา' : 'Contractor'}</th>
                <th className="p-3 w-28">{isTh ? 'ความเร่งด่วน' : 'Priority'}</th>
                <th className="p-3 w-28 text-center">Map (X, Y)</th>
                <th className="p-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {isTh ? 'ไม่พบข้อมูลแถวในตารางตามตัวกรอง' : 'No rows match current filter'}
                      </p>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        + Add New Row
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const globalIdx = rows.findIndex(r => r.id === row.id);
                  const issues = getRowIssues(row);
                  const isRowValid = issues.length === 0;
                  const isSelected = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/30'
                          : !isRowValid
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Row Index */}
                      <td className="p-2 text-center font-mono text-slate-400 text-[11px]">
                        {globalIdx + 1}
                      </td>

                      {/* Status Indicator */}
                      <td className="p-2 text-center">
                        {isRowValid ? (
                          <span
                            className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
                            title="All required fields valid"
                          >
                            <CheckCircle2 size={16} />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center text-amber-500 dark:text-amber-400 cursor-help"
                            title={issues.join(', ')}
                          >
                            <AlertCircle size={16} />
                          </span>
                        )}
                      </td>

                      {/* Job Description */}
                      <td className="p-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              handleUpdateField(globalIdx, 'description', e.target.value)
                            }
                            placeholder={
                              isTh
                                ? 'ระบุรายละเอียดงาน เช่น ถอด Manhole, ยกหม้อต้ม...'
                                : 'e.g. Lift Heat Exchanger Bundle 11-E-101'
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                              !row.description.trim()
                                ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Plant / Area */}
                      <td className="p-2">
                        <select
                          value={row.plant}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'plant', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          {BULK_DEFAULT_PLANTS.map(p => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Machine Type */}
                      <td className="p-2">
                        <select
                          value={row.machineType}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'machineType', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {(isScaffolding ? BULK_SCAFFOLD_TYPES : BULK_CRANE_TYPES).map(m => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Capacity */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="1"
                            max="1200"
                            value={row.capacity}
                            onChange={(e) =>
                              handleUpdateField(
                                globalIdx,
                                'capacity',
                                Math.max(1, parseFloat(e.target.value) || 1)
                              )
                            }
                            className="w-20 text-center font-bold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </td>

                      {/* Start Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'startDate', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </td>

                      {/* End Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.endDate}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'endDate', e.target.value)
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                            row.endDate < row.startDate
                              ? 'border-rose-400 bg-rose-50/20 text-rose-600'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </td>

                      {/* Contractor */}
                      <td className="p-2">
                        <select
                          value={row.contractor}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'contractor', e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {BULK_CONTRACTORS.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="p-2">
                        <select
                          value={row.priority}
                          onChange={(e) =>
                            handleUpdateField(globalIdx, 'priority', e.target.value as any)
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            row.priority === 'Urgent'
                              ? 'text-rose-600 dark:text-rose-400'
                              : row.priority === 'High'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </td>

                      {/* Coordinates Pin Picker Button */}
                      <td className="p-2 text-center font-mono text-[10px]">
                        <button
                          type="button"
                          onClick={() => setMappingRowId(row.id)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          title="Click to view and adjust coordinate pin on Plot Plan"
                        >
                          <MapPin size={11} className="text-blue-500" />
                          <span>{row.x}%, {row.y}%</span>
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveRow(globalIdx, 'up')}
                            disabled={globalIdx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(globalIdx, 'down')}
                            disabled={globalIdx === rows.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(globalIdx)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Duplicate Row"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(globalIdx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

        {/* Footer & Submit Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
            <span>
              {isTh ? 'พร้อมส่งคำขอ:' : 'Ready to submit:'}{' '}
              <strong className="text-slate-800 dark:text-white">{metrics.validCount}</strong> of{' '}
              <strong>{rows.length}</strong> jobs
            </span>
            <span>•</span>
            <span>{isTh ? 'สถานะเริ่มต้น: Requested' : 'Initial Status: Requested'}</span>
            {metrics.issuesCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                ({metrics.issuesCount} incomplete rows will be skipped)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              {isTh ? '+ เพิ่มแถว' : '+ Add Another Row'}
            </button>

            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={metrics.validCount === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                metrics.validCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              <span>
                {isTh
                  ? `ส่งคำขอแบบกลุ่ม (${metrics.validCount} รายการ)`
                  : `Submit Bulk Job Requests (${metrics.validCount} Jobs)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. VISUAL PLOT PLAN COORDINATE PICKER MODAL
         ========================================================================= */}
      {mappingRowId && activeMappingRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isTh ? 'กำหนดพิกัดตำแหน่งบนผังโรงกลั่น (Plot Plan)' : 'Set Location Coordinates on Plot Plan'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-md">
                    {activeMappingRow.description || 'Job Row Pinning'} • {activeMappingRow.plant}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMappingRowId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plot Plan Interactive Canvas Area */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Click anywhere on the map below to place this job's crane/scaffolding pin</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  Target Coords: X={activeMappingRow.x}% , Y={activeMappingRow.y}%
                </span>
              </div>

              {/* Map Container */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
                  const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
                  const clampedX = Math.max(2, Math.min(98, x));
                  const clampedY = Math.max(2, Math.min(98, y));
                  const gIdx = rows.findIndex(r => r.id === mappingRowId);
                  if (gIdx >= 0) {
                    handleUpdateField(gIdx, 'x', clampedX);
                    handleUpdateField(gIdx, 'y', clampedY);
                  }
                }}
                className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 cursor-crosshair group shadow-inner"
              >
                {/* Background Image / Plant Layout */}
                <img
                  src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80"
                  alt="Refinery Plot Plan"
                  className="w-full h-full object-cover opacity-60 filter contrast-125"
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none border border-blue-500/20">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border border-blue-500/10 flex items-start justify-start p-1">
                      <span className="text-[8px] font-mono text-blue-300/40 font-bold">
                        Z{String.fromCharCode(65 + Math.floor(i / 6))}{ (i % 6) + 1 }
                      </span>
                    </div>
                  ))}
                </div>

                {/* Existing pins from other rows */}
                {rows
                  .filter(r => r.id !== mappingRowId)
                  .map((r, i) => (
                    <div
                      key={r.id}
                      style={{ left: `${r.x}%`, top: `${r.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 hover:opacity-100 transition-opacity"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-400 border border-white flex items-center justify-center text-[8px] text-white font-bold">
                        {i + 1}
                      </div>
                    </div>
                  ))}

                {/* Current Active Pin */}
                <div
                  style={{ left: `${activeMappingRow.x}%`, top: `${activeMappingRow.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center animate-bounce"
                >
                  <div className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-lg border border-white mb-0.5 whitespace-nowrap">
                    {activeMappingRow.description || 'Pinned Job'}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl ring-4 ring-rose-500/30">
                    <MapPin size={14} className="fill-white" />
                  </div>
                </div>
              </div>

              {/* Quick Preset Zone Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-slate-500 font-medium">Quick Zones:</span>
                {[
                  { name: 'Crude Unit (Center)', x: 45.0, y: 48.0 },
                  { name: 'Tank Farm (East)', x: 78.0, y: 35.0 },
                  { name: 'HCU Unit (South)', x: 58.0, y: 65.0 },
                  { name: 'Utilities Yard (West)', x: 25.0, y: 45.0 },
                  { name: 'Marine Jetty (North)', x: 82.0, y: 22.0 }
                ].map(z => (
                  <button
                    key={z.name}
                    type="button"
                    onClick={() => {
                      const gIdx = rows.findIndex(r => r.id === mappingRowId);
                      if (gIdx >= 0) {
                        handleUpdateField(gIdx, 'x', z.x);
                        handleUpdateField(gIdx, 'y', z.y);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMappingRowId(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Apply & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ENHANCED EXCEL / CSV PASTE MODAL
         ========================================================================= */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isTh ? 'วางข้อมูลโดยตรงจาก Excel หรือ Google Sheets' : 'Paste Rows from Excel / Spreadsheet'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isTh
                  ? 'คุณสามารถ Copy เซลล์จาก Excel หรือ Google Sheets แล้ว Paste ลงในช่องด้านล่างได้ทันที ระบบจะตรวจจับแท็บ (Tab) หรือจุลภาค (Comma) ให้โดยอัตโนมัติ'
                  : 'Copy rows directly from Excel or Google Sheets and paste below. Tab-separated and comma-separated rows will be parsed automatically.'}
              </p>

              {csvParseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{csvParseError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">Columns: Description, Plant, Machine, Tons, Start Date, End Date...</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRawPastedText(
                        `Overhaul Column 11-C-101\tBCP Refinery Area 1\tMobile Crane (100T)\t45\t2026-09-25\t2026-09-26\t08:00\t17:00\tContractor A (Mechanical)\tHigh\t45.0\t50.0\r\n` +
                        `Pump P-101A Impeller Lift\tHydrocracking Unit (HCU-1)\tRough Terrain Crane\t30\t2026-09-26\t2026-09-26\t09:00\t15:00\tContractor B (Piping & Structural)\tNormal\t60.0\t40.0\r\n` +
                        `Preheat Exchanger Bundle Extract\tBCP Refinery Area 1\tMobile Crane (300T)\t80\t2026-09-27\t2026-09-28\t07:30\t18:00\tExternal Heavy Lift Partner\tUrgent\t38.0\t55.0`
                      );
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                  >
                    + Insert Example Data
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={rawPastedText}
                  onChange={(e) => setRawPastedText(e.target.value)}
                  placeholder={`Paste cells here directly from Excel or Google Sheets...\nExample:\nLift Exchanger 11-E-101\tBCP Refinery Area 1\tMobile Crane (50T)\t35\t2026-09-25\t2026-09-26`}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {rawPastedText.trim().length > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between font-mono">
                  <span>Detected ~{rawPastedText.split(/\r?\n/).filter(l => l.trim()).length} lines</span>
                  <span>Delimiter: {rawPastedText.includes('\t') ? 'Tab (Excel)' : rawPastedText.includes(';') ? 'Semicolon' : 'Comma (CSV)'}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => parsePastedTextToRows(rawPastedText)}
                disabled={!rawPastedText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isTh ? 'แปลงและเพิ่มลงในตาราง' : 'Parse & Append Rows'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. SUBMISSION SUCCESS SUMMARY MODAL
         ========================================================================= */}
      {submittedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isTh ? 'บันทึกคำขอเปิดงานแบบกลุ่มสำเร็จ!' : 'Bulk Job Requests Successfully Submitted!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isTh
                  ? `ระบบได้สร้าง ${submittedSummary.count} รายการคำขอใหม่เรียบร้อยแล้วในสถานะ Requested`
                  : `Successfully generated ${submittedSummary.count} new job requests in status 'Requested'.`}
              </p>
            </div>

            {/* Generated Job Numbers Badge Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Generated Tracking Numbers:
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                  {submittedSummary.jobNumbers.length} Jobs
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {submittedSummary.jobNumbers.map(no => (
                  <span
                    key={no}
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                  >
                    {no}
                  </span>
                ))}
              </div>
            </div>

            {/* Breakdown summary */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Plant Distribution:
                </span>
                <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                  {Object.entries(submittedSummary.plantBreakdown).slice(0, 3).map(([plant, count]) => (
                    <div key={plant} className="flex justify-between">
                      <span className="truncate pr-2">{plant}</span>
                      <strong className="font-mono">{count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Contractors:
                </span>
                <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                  {Object.entries(submittedSummary.contractorBreakdown).slice(0, 3).map(([contractor, count]) => (
                    <div key={contractor} className="flex justify-between">
                      <span className="truncate pr-2">{contractor.split(' ')[0]}</span>
                      <strong className="font-mono">{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSubmittedSummary(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isTh ? 'สร้างรายการอื่นต่อ' : 'Create More Jobs'}
              </button>

              {onNavigateToRequests && (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSummary(null);
                    onNavigateToRequests();
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <span>{isTh ? 'ไปที่รายการคำขอ (Request List)' : 'Go to Requests List'}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
