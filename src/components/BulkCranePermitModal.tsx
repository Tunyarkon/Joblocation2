import React, { useState, useMemo, ChangeEvent, DragEvent } from 'react';
import {
  X,
  Truck,
  FileText,
  FileSpreadsheet,
  Download,
  Sparkles,
  ClipboardPaste,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addCraneJob, UnifiedCraneJob } from '../data/craneOperationsData';
import { JobRecord } from '../data/turnoverJobsData';
import { useLanguage } from '../context/LanguageContext';

export interface BulkCranePermitRow {
  id: string;
  equipmentTag: string;
  plant: 'sr' | 'pk' | 'bc';
  floc: string;
  capacityTon: number;
  craneType: 'pull' | 'spot';
  provider: 'owner' | 'contractor';
  date: string;
  startTime: string;
  durationHours: number;
  locationArea: string;
  requester: string;
  jobDescription: string;
  isValid: boolean;
  validationError?: string;
}

export const SAMPLE_TSV_8_LIFTS = `11-E-104\tsr\t11-CDU1 (Crude Distillation)\t100\tpull\tcontractor\t2026-10-14\t08:30\t8\tZone 02 - HCU High Pressure Reactors\tWichai Ratanaporn\tExtraction of tube bundle and re-installation with new gaskets
11-C-201\tsr\t11-CDU1 (Crude Distillation)\t50\tspot\towner\t2026-10-14\t13:00\t6\tZone 02 - HCU High Pressure Reactors\tPrasert Boonmee\tTop vapor nozzle safety valve replacement and blind removal
21-E-301\tpk\t21-APS1 (Atmospheric Pipestill)\t80\tpull\tcontractor\t2026-10-15\t09:00\t8\tArea 01 - Crude Distillation Platform\tSomchai Prasert\tHeat exchanger channel head unbolting and hydrotest blind staging
21-P-102A\tpk\t21-APS1 (Atmospheric Pipestill)\t25\tspot\towner\t2026-10-15\t14:00\t4\tArea 01 - Crude Distillation Platform\tKittipong Chai\tCrude charge pump motor overhaul and heavy coupling alignment
31-R-01\tbc\t31-SMR (Hydrogen Plant)\t300\tspot\tcontractor\t2026-10-16\t08:00\t12\tQuad B: Reformer Furnace Core\tAnan Petchdee\tReformer catalyst tube bundle heavy rigging and elevation positioning
31-V-202\tbc\t31-SMR (Hydrogen Plant)\t50\tspot\towner\t2026-10-16\t10:30\t6\tQuad B: Reformer Furnace Core\tNarong Srisuk\tHigh pressure steam drum level transmitter nozzle flange lifting
12-E-401\tsr\t12-HCU (Hydrocracker)\t100\tpull\tcontractor\t2026-10-17\t08:30\t8\tZone 03 - Fractionator Column Quad\tWichai Ratanaporn\tHP heat exchanger bundle pull and ultrasonic wall thickness test
22-C-102\tpk\t22-CCR (Platformer)\t50\tspot\towner\t2026-10-17\t13:00\t5\tArea 02 - Catalytic Reforming Unit\tSomchai Prasert\tPlatformer recycle gas compressor suction valve crane rigging`;

export const CSV_HEADER_STRING = `Equipment Tag,Plant ID,FLOC,Capacity (Tons),Crane Type,Provider,Date,Start Time,Duration (Hrs),Location Area / Zone,Requester,Job Description`;

interface BulkCranePermitModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSwitchToSingle?: () => void;
  onSuccess?: (count: number) => void;
  onBatchCreateTurnoverJobs?: (turnoverJobs: JobRecord[]) => void;
  isModal?: boolean; // if false, renders inlined
}

export default function BulkCranePermitModal({
  isOpen = true,
  onClose,
  onSwitchToSingle,
  onSuccess,
  onBatchCreateTurnoverJobs,
  isModal = true
}: BulkCranePermitModalProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [rawText, setRawText] = useState<string>(SAMPLE_TSV_8_LIFTS);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsing function with smart delimiter detection & normalization
  const parsedRows: BulkCranePermitRow[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: BulkCranePermitRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Auto-skip header row if it contains header keywords
      const lower = line.toLowerCase();
      if (
        i === 0 &&
        (lower.includes('equipment') || lower.includes('capacity') || lower.includes('crane type') || lower.includes('plant id'))
      ) {
        continue;
      }

      // Detect delimiter: tab (\t), comma (,), or semicolon (;)
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map(s => s.trim());
      } else if (line.includes(',')) {
        // Simple comma split handling potential quotes
        parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else if (line.includes(';')) {
        parts = line.split(';').map(s => s.trim());
      } else {
        parts = line.split(/\s{2,}/).map(s => s.trim());
      }

      if (parts.length < 4) continue;

      const equipmentTag = parts[0] ? parts[0].toUpperCase() : `TAG-${i + 1}`;
      
      // Smart Plant Normalization
      const plantRaw = (parts[1] || 'sr').toLowerCase();
      let plant: 'sr' | 'pk' | 'bc' = 'sr';
      if (plantRaw.includes('pk') || plantRaw.includes('phra')) plant = 'pk';
      else if (plantRaw.includes('bc') || plantRaw.includes('bang')) plant = 'bc';
      else plant = 'sr';

      const floc = parts[2] || `${plant.toUpperCase()}-PLANT-UNIT`;

      // Capacity parse
      const capParsed = parseInt(parts[3]?.replace(/[^\d]/g, '') || '50', 10);
      const capacityTon = isNaN(capParsed) || capParsed <= 0 ? 50 : capParsed;

      // Crane type normalization
      const typeRaw = (parts[4] || 'spot').toLowerCase();
      const craneType: 'pull' | 'spot' = typeRaw.includes('pull') ? 'pull' : 'spot';

      // Provider normalization
      const provRaw = (parts[5] || 'contractor').toLowerCase();
      const provider: 'owner' | 'contractor' = provRaw.includes('contract') ? 'contractor' : 'owner';

      const date = parts[6] && /^\d{4}-\d{2}-\d{2}$/.test(parts[6]) ? parts[6] : '2026-10-14';
      const startTime = parts[7] && /^\d{1,2}:\d{2}$/.test(parts[7]) ? parts[7] : '08:30';
      const durationParsed = parseInt(parts[8]?.replace(/[^\d]/g, '') || '8', 10);
      const durationHours = isNaN(durationParsed) || durationParsed <= 0 ? 8 : durationParsed;
      const locationArea = parts[9] || `Refinery Area Zone - ${plant.toUpperCase()}`;
      const requester = parts[10] || 'Turnaround Engineer';
      const jobDescription = parts[11] || `Heavy lift execution on ${equipmentTag}`;

      const isValid = Boolean(equipmentTag && capacityTon > 0 && date);

      rows.push({
        id: `row-${i + 1}-${equipmentTag}`,
        equipmentTag,
        plant,
        floc,
        capacityTon,
        craneType,
        provider,
        date,
        startTime,
        durationHours,
        locationArea,
        requester,
        jobDescription,
        isValid
      });
    }

    return rows;
  }, [rawText]);

  const validRows = useMemo(() => parsedRows.filter(r => r.isValid), [parsedRows]);
  const totalTons = useMemo(() => validRows.reduce((sum, r) => sum + r.capacityTon, 0), [validRows]);

  // Actions
  const handleLoadSampleData = () => {
    setRawText(SAMPLE_TSV_8_LIFTS);
  };

  const handleClear = () => {
    setRawText('');
  };

  const handleDownloadTemplate = () => {
    const csvContent = `${CSV_HEADER_STRING}\n${SAMPLE_TSV_8_LIFTS.replace(/\t/g, ',')}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BCP_Crane_Permits_Template_12Col_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteRow = (index: number) => {
    const lines = rawText.split(/\r?\n/).filter(Boolean);
    if (index >= 0 && index < lines.length) {
      lines.splice(index, 1);
      setRawText(lines.join('\n'));
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvText = XLSX.utils.sheet_to_csv(firstSheet);
          setRawText(csvText);
          setActiveTab('paste');
        } catch (err) {
          alert('Could not parse Excel file. Please ensure it is a valid .xlsx file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setRawText(text);
          setActiveTab('paste');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCommitAll = () => {
    if (validRows.length === 0) return;
    setIsSubmitting(true);

    setTimeout(() => {
      validRows.forEach((row, idx) => {
        const isHeavy = row.capacityTon >= 100;
        const radius = isHeavy ? 30 : 20;
        const plantNormalized = row.plant.toLowerCase();
        let plantName: 'Phra Khanong' | 'Sriracha' = 'Phra Khanong';
        if (plantNormalized === 'sr' || plantNormalized.includes('sriracha')) plantName = 'Sriracha';

        const newJob: UnifiedCraneJob = {
          id: Date.now() + idx,
          requestNo: `REQ-CR26-${String(Date.now() + idx).slice(-4)}`,
          jobNo: `WO-${row.plant.toUpperCase()}-${String(Date.now() + idx).slice(-5)}`,
          title: row.jobDescription || `${row.craneType === 'pull' ? 'Bundle Pull' : 'Vertical Spot Lift'} on ${row.equipmentTag}`,
          plant: plantName,
          unit: row.floc || (plantNormalized === 'sr' ? '12-HCU' : '11-APS1'),
          requestType: isHeavy ? 'CR02' : 'CR01',
          requestStatus: 'Submitted',
          assignmentStatus: 'Unassigned',
          equipmentType: `Mobile Crane (${row.capacityTon}T)`,
          loadDescription: row.jobDescription,
          loadWeightTon: Math.round(row.capacityTon * 0.75),
          riggingWeightTon: Math.round(row.capacityTon * 0.1),
          grossLoadTon: Math.round(row.capacityTon * 0.85),
          workingRadiusM: radius,
          requiredHookHeightM: isHeavy ? 35 : 22,
          requester: row.requester || 'Field Operations Engineer',
          department: 'Maintenance & Turnaround',
          contractor: row.provider === 'contractor' ? 'Contractor Heavy Rigging' : 'Operations Dept (BCP Owner)',
          scheduledDate: row.date,
          scheduledStartTime: row.startTime,
          scheduledEndTime: `${String(Math.min(23, Number(row.startTime.split(':')[0] || '8') + row.durationHours)).padStart(2, '0')}:00`,
          status: 'Requested',
          progress: 0,
          executionChecklist: {
            riggingTackle: { done: false },
            outriggerPads: { done: false },
            liftExecution: { done: false },
            siteDemobilization: { done: false }
          },
          statusHistory: [
            {
              timestamp: new Date().toISOString(),
              changedBy: row.requester || 'Bulk Ingestion Engine',
              status: 'Submitted',
              reason: `Bulk Excel/CSV Ingestion: ${row.equipmentTag} (${row.capacityTon}T ${row.craneType})`
            }
          ]
        };

        addCraneJob(newJob);
      });

      if (onBatchCreateTurnoverJobs) {
        const turnoverJobs: JobRecord[] = validRows.map((row, idx) => ({
          id: `job-bulk-${Date.now()}-${idx}`,
          jobNo: `WO-${row.plant.toUpperCase()}-${String(Date.now() + idx).slice(-5)}`,
          title: row.jobDescription || `${row.craneType === 'pull' ? 'Bundle Pull' : 'Vertical Spot Lift'} on ${row.equipmentTag}`,
          eventName: 'BCP Turnaround 2026',
          plant: row.plant === 'sr' ? 'Sriracha' : 'Phra Khanong',
          unit: row.floc || '11-APS1',
          system: 'Major Heavy Rigging',
          workOrder: `WO-${row.plant.toUpperCase()}-${String(Date.now() + idx).slice(-5)}`,
          description: row.jobDescription,
          assetTag: row.equipmentTag,
          assetDescription: `${row.capacityTon}T ${row.craneType === 'pull' ? 'Bundle Pull Crane Rigging' : 'Vertical Spot Lift'}`,
          isCriticalPath: row.capacityTon >= 100,
          gridZone: row.locationArea,
          plotPlanX: 30 + (idx * 8) % 45,
          plotPlanY: 25 + (idx * 11) % 45,
          attachments: [{ name: `Lifting_Plan_${row.equipmentTag}.pdf`, size: '2.4 MB', type: 'application/pdf' }],
          signatures: [],
          punchList: [],
          createdAt: new Date().toISOString()
        }));
        onBatchCreateTurnoverJobs(turnoverJobs);
      }

      setIsSubmitting(false);
      if (onSuccess) onSuccess(validRows.length);
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  const content = (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100 font-sans">
      
      {/* 1. Header & Breadcrumb Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
        <div className="space-y-1 min-w-0">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
            FLEET RIGGING SYSTEM / CRANE PERMITS / NEW REQUEST | FORM • CR-2026
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                ยื่นขออนุญาตใช้งานรถเครน (CR01) / Submit Mobile Crane Permit &amp; Lifting Plan (CR01)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                แบบฟอร์มขออนุญาตใช้เครนเคลื่อนที่ (CR01) สำหรับงานบำรุงรักษาและยกเครื่องจักรหนัก
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-200 dark:bg-slate-800 p-0.5 rounded-sm flex shadow-inner text-xs">
            <button
              type="button"
              onClick={() => {
                if (onSwitchToSingle) onSwitchToSingle();
                else onClose();
              }}
              className="px-3 py-1.5 rounded-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-1.5"
            >
              <FileText size={13} />
              <span>คำขอเดี่ยว (Single)</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-sm font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} />
              <span>นำเข้าจาก Excel (Bulk)</span>
              {validRows.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {validRows.length} Verified
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Modal Body (Scrollable) */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
        
        {/* 2. Banner: SPREADSHEET BATCH IMPORT ENGINE (CR01-BULK) */}
        <div className="p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-wide font-mono">
              SPREADSHEET BATCH IMPORT ENGINE (CR01-BULK)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              นำเข้าตารางคำขอหลายรายการจาก Microsoft Excel หรือ Google Sheets ในครั้งเดียว
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Download size={13} />
              <span>เทมเพลต CSV</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-1.5 rounded-md border border-blue-300 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Sparkles size={13} className="text-blue-500" />
              <span>ข้อมูลตัวอย่าง (8 Lifts)</span>
            </button>
          </div>
        </div>

        {/* 3. Sub-tabs (Input Mode Selector) */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 flex items-center gap-1.5 transition-all border-b-2 -mb-px ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardPaste size={14} />
            <span>วางข้อความตาราง (Paste Text)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2 flex items-center gap-1.5 transition-all border-b-2 -mb-px ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload size={14} />
            <span>อัปโหลดไฟล์ (.csv / .tsv)</span>
          </button>
        </div>

        {/* 4. Input Area: Textarea or Upload Zone */}
        {activeTab === 'paste' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-600 dark:text-slate-400 font-medium">
                วางข้อมูลตารางคอลัมน์จาก Excel (Tab หรือ Comma Separated):
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-rose-500 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>ล้างข้อมูล</span>
                </button>
              )}
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="วางข้อมูลจาก Excel (12 Columns: Equipment Tag, Plant ID, FLOC, Capacity, Crane Type, Provider, Date, Start Time, Duration, Location Area, Requester, Job Description)..."
              rows={6}
              className="w-full font-mono text-xs p-3 rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
            />
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-md text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30'
            }`}
          >
            <Upload size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ลากไฟล์ .csv, .tsv หรือ .xlsx มาวางที่นี่
            </p>
            <p className="text-[11px] text-slate-400 mt-1">หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์</p>
            <label className="inline-block mt-3 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs">
              เลือกไฟล์
              <input
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        )}

        {/* 5. 4 Crisp Metric Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL ROWS
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
              {parsedRows.length} Requests
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              VALID ROWS
            </span>
            <div>
              <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-xs">
                {validRows.length} Verified
              </span>
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              AGGREGATE CAPACITY
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
              {totalTons} Tons
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              SPATIAL STATUS
            </span>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
              100% CAD Mapped
            </div>
          </div>
        </div>

        {/* 6. Staging Verification Queue Grid */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-950">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
              <Layers size={14} className="text-blue-500" />
              <span>รายการตรวจสอบก่อนนำเข้า (Staging Queue)</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {validRows.length}/{parsedRows.length} Valid
            </div>
          </div>

          <div className="overflow-x-auto max-h-64 custom-scrollbar">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50/80 dark:bg-slate-900/40 text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5">Tag</th>
                  <th className="p-2.5">Plant</th>
                  <th className="p-2.5">Capacity</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Provider</th>
                  <th className="p-2.5">Date &amp; Time</th>
                  <th className="p-2.5">Area / Zone</th>
                  <th className="p-2.5">Requester</th>
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {parsedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{row.equipmentTag}</td>
                    <td className="p-2.5 uppercase font-semibold text-slate-700 dark:text-slate-300">{row.plant}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{row.capacityTon}T</td>
                    <td className="p-2.5 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.craneType.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2.5 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.provider.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {row.date} {row.startTime}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 font-sans max-w-[160px] truncate" title={row.locationArea}>
                      {row.locationArea}
                    </td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300 font-sans max-w-[120px] truncate" title={row.requester}>
                      {row.requester}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete this row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {parsedRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs italic font-sans">
                      ยังไม่มีข้อมูลในคิว — กรุณาวางข้อมูลจาก Excel หรือคลิก "ข้อมูลตัวอย่าง (8 Lifts)"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. Footer Action Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950/60">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          disabled={validRows.length === 0 || isSubmitting}
          onClick={handleCommitAll}
          className="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <CheckCircle2 size={15} />
          <span>
            {isSubmitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้าทั้งหมด (${validRows.length} คำขอ)`}
          </span>
        </button>
      </div>

    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      {content}
    </div>
  );
}
