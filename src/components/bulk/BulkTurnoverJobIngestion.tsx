import React, { useState, useRef, DragEvent } from 'react';
import {
  Building,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ClipboardPaste,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlantTurnShared } from '../../context/PlantTurnSharedContext';
import { JobRecord } from '../../data/turnoverJobsData';
import { exportToExcel, exportToCsv, parseExcelOrCsvFile, parseDelimitedText } from '../../utils/excelImportExport';

export interface BulkTurnoverRow {
  id: string;
  jobId: string;
  jobDescription: string;
  plant: 'Phra Khanong' | 'Sriracha';
  areaUnit: string;
  equipmentTag: string;
  equipmentType: string;
  targetStartDate: string;
  plannedTurnoverDate: string;
  discipline: string;
  turnoverSystem: string;
  jobLead: string;
  status: 'Draft' | 'In Progress' | 'Ready for T/O' | 'Completed';
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

export const TURNOVER_EXPORT_HEADERS = [
  'Job ID (T/O No.) *',
  'Job Description *',
  'Plant *',
  'Location Area / Unit *',
  'Equipment Tag *',
  'Equipment Type (Optional)',
  'Target Start Date *',
  'Planned Turnover Date *',
  'Discipline *',
  'Turnover System *',
  'Job Supervisor / Lead *',
  'Status'
];

export const TURNOVER_DISCIPLINES = [
  'Mechanical',
  'Piping',
  'Electrical',
  'Instrument',
  'Civil',
  'Insulation',
  'Painting',
  'Refractory'
];

export const TURNOVER_AREA_UNITS = [
  '11-APS1 - Atmospheric Pipestill 1',
  '11-CDU1 - Crude Distillation Unit 1',
  '12-HCU - Hydrocracker High Pressure',
  '13-CRU - Catalytic Reforming Unit',
  '21-UTL - Utilities & Steam Generation',
  '22-TNK - Storage Tank Farm Sector A',
  '31-JTY - Marine Jetty Berthing Terminal'
];

export const TURNOVER_EQUIPMENT_TYPES = [
  'Column',
  'Heat Exchanger',
  'Pressure Vessel',
  'Centrifugal Pump',
  'Fired Heater / Furnace',
  'Storage Tank',
  'Piping System',
  'Compressor'
];

export const SAMPLE_TURNOVER_BULK_DATA: Omit<BulkTurnoverRow, 'id' | 'isValid' | 'validationError'>[] = [
  {
    jobId: 'T-2026-001',
    jobDescription: 'Crude distillation main overhead condenser bundle overhaul and hydrotest package',
    plant: 'Phra Khanong',
    areaUnit: '11-CDU1 - Crude Distillation Unit 1',
    equipmentTag: '11-E-101',
    equipmentType: 'Heat Exchanger',
    targetStartDate: '2026-10-15',
    plannedTurnoverDate: '2026-10-25',
    discipline: 'Mechanical',
    turnoverSystem: 'SYS-11-01 Crude Oil Distillation Circuit',
    jobLead: 'สมชาย ประเสริฐ (Lead Mechanical Engineer)',
    status: 'In Progress'
  },
  {
    jobId: 'T-2026-002',
    jobDescription: 'Atmospheric fractionator column 11-C-101 internal sieve tray replacement & blinding',
    plant: 'Phra Khanong',
    areaUnit: '11-CDU1 - Crude Distillation Unit 1',
    equipmentTag: '11-C-101',
    equipmentType: 'Column',
    targetStartDate: '2026-10-16',
    plannedTurnoverDate: '2026-10-28',
    discipline: 'Piping',
    turnoverSystem: 'SYS-11-02 Fractionation Overhead & Vapor Line',
    jobLead: 'วิชัย รัตนพร (Operations Turnover Lead)',
    status: 'In Progress'
  },
  {
    jobId: 'T-2026-003',
    jobDescription: 'High pressure hydrocracker reactor effluent separator loop leak test & valve sign-off',
    plant: 'Sriracha',
    areaUnit: '12-HCU - Hydrocracker High Pressure',
    equipmentTag: '12-R-101',
    equipmentType: 'Pressure Vessel',
    targetStartDate: '2026-10-18',
    plannedTurnoverDate: '2026-11-02',
    discipline: 'Instrument',
    turnoverSystem: 'SYS-12-05 High Pressure Reactor Loop Safety',
    jobLead: 'อนันต์ เพชรดี (Senior Instrumentation Lead)',
    status: 'Draft'
  },
  {
    jobId: 'T-2026-004',
    jobDescription: 'Preheat fired heater 11-H-101 tube skin thermocouples and burner safety interlocks',
    plant: 'Phra Khanong',
    areaUnit: '11-APS1 - Atmospheric Pipestill 1',
    equipmentTag: '11-H-101',
    equipmentType: 'Fired Heater / Furnace',
    targetStartDate: '2026-10-20',
    plannedTurnoverDate: '2026-10-30',
    discipline: 'Electrical',
    turnoverSystem: 'SYS-11-04 Fuel Gas & Burner Management',
    jobLead: 'ณรงค์ ศรีสุข (Lead Electrical Turnaround)',
    status: 'In Progress'
  }
];

export interface ValidationErrorDetail {
  rowNumber: number;
  identifier: string;
  field: string;
  message: string;
}

interface BulkTurnoverJobIngestionProps {
  onBatchCreateTurnoverJobs: (newJobs: JobRecord[]) => void;
  onClose?: () => void;
  onSwitchToSingle?: () => void;
  onOpenCreateEvent?: () => void;
  selectedEventName?: string;
  onSelectEventName?: (eventName: string) => void;
  onSuccess?: (count: number) => void;
}

export default function BulkTurnoverJobIngestion({
  onBatchCreateTurnoverJobs,
  onClose,
  onSwitchToSingle,
  onOpenCreateEvent,
  selectedEventName,
  onSelectEventName,
  onSuccess
}: BulkTurnoverJobIngestionProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobs, events, checkJobIdExists } = usePlantTurnShared();
  const [internalEventName, setInternalEventName] = useState<string>(
    selectedEventName || events[0]?.eventName || 'Annual Turnaround 2026'
  );
  const activeEventName = selectedEventName || internalEventName;
  const handleEventChange = (name: string) => {
    setInternalEventName(name);
    if (onSelectEventName) onSelectEventName(name);
  };
  const selectedEventObj = events.find(e => e.eventName === activeEventName);

  // Core Data & Processing States
  const [validatedRows, setValidatedRows] = useState<BulkTurnoverRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentRowProcessing, setCurrentRowProcessing] = useState(0);
  const [totalRowsToProcess, setTotalRowsToProcess] = useState(0);
  const [liveValidCount, setLiveValidCount] = useState(0);
  const [liveErrorCount, setLiveErrorCount] = useState(0);
  const [duplicateRowsCount, setDuplicateRowsCount] = useState(0);

  // Errors & Modal States
  const [validationErrors, setValidationErrors] = useState<ValidationErrorDetail[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // UI States
  const [dragActive, setDragActive] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Detailed Row Validator for Turnover / Event & Job
  const validateTurnoverRow = (
    row: Partial<BulkTurnoverRow>,
    rowIndex: number,
    fileDuplicateCounts?: Map<string, number>
  ): ValidationErrorDetail[] => {
    const errors: ValidationErrorDetail[] = [];
    const id = row.jobId || row.equipmentTag || `Row ${rowIndex}`;

    if (!row.jobId || !row.jobId.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Job ID (T/O No.)',
        message: isTh ? 'ไม่มีรหัสแพ็กเกจงานส่งมอบระบบ Job ID (ฟิลด์บังคับ เช่น T-2026-001)' : 'Missing Job ID / Turnover Number (Required field)'
      });
    } else {
      const cleanId = row.jobId.trim();
      // 1. Check duplicate with existing jobs in the system
      if (checkJobIdExists(cleanId)) {
        errors.push({
          rowNumber: rowIndex,
          identifier: cleanId,
          field: isTh ? 'Job ID (ซ้ำกับในระบบ)' : 'Job ID (System Duplicate)',
          message: isTh
            ? `รหัส Job ID "${cleanId}" มีอยู่ในระบบแล้ว ห้ามนำเข้าข้อมูลที่มีรหัสซ้ำ`
            : `Job ID "${cleanId}" already exists in the system. Duplicate Job ID is not allowed.`
        });
      }
      // 2. Check duplicate within the uploaded batch
      if (fileDuplicateCounts && (fileDuplicateCounts.get(cleanId.toLowerCase()) || 0) > 1) {
        errors.push({
          rowNumber: rowIndex,
          identifier: cleanId,
          field: isTh ? 'Job ID (ซ้ำในไฟล์)' : 'Job ID (File Duplicate)',
          message: isTh
            ? `รหัส Job ID "${cleanId}" ซ้ำกันมากกว่า 1 รายการในไฟล์นำเข้า ห้ามใช้รหัสซ้ำ`
            : `Job ID "${cleanId}" is duplicated multiple times within this import file.`
        });
      }
    }

    if (!row.jobDescription || !row.jobDescription.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Job Description',
        message: isTh ? 'ไม่มีรายละเอียดงานส่งมอบระบบ (ฟิลด์บังคับ)' : 'Missing Job Description (Required field)'
      });
    }

    if (!row.areaUnit || !row.areaUnit.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Location Area / Unit',
        message: isTh ? 'ไม่มีหน่วยพื้นที่โรงกลั่น Location Area / Unit (เช่น 11-CDU1, 12-HCU)' : 'Missing Location Area / Unit'
      });
    }

    if (!row.equipmentTag || !row.equipmentTag.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Equipment Tag',
        message: isTh ? 'ไม่มีรหัสอุปกรณ์เป้าหมาย Equipment Tag (เช่น 11-E-101)' : 'Missing Equipment Tag'
      });
    }

    if (!row.targetStartDate || !row.targetStartDate.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Target Start Date',
        message: isTh ? 'ไม่มีวันเริ่มงาน Target Start Date (ต้องเป็น YYYY-MM-DD)' : 'Missing Target Start Date (YYYY-MM-DD)'
      });
    }

    if (!row.plannedTurnoverDate || !row.plannedTurnoverDate.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Planned Turnover Date',
        message: isTh ? 'ไม่มีกำหนดวันส่งมอบระบบ Planned Turnover Date (ต้องเป็น YYYY-MM-DD)' : 'Missing Planned Turnover Date (YYYY-MM-DD)'
      });
    }

    if (!row.discipline || !row.discipline.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Discipline',
        message: isTh ? 'ไม่มีสาขางาน Discipline (เช่น Mechanical, Piping, Electrical)' : 'Missing Discipline'
      });
    }

    if (!row.turnoverSystem || !row.turnoverSystem.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Turnover System',
        message: isTh ? 'ไม่มีระบบส่งมอบย่อย Turnover System (เช่น SYS-11-01)' : 'Missing Turnover System'
      });
    }

    return errors;
  };

  const rowToAoa = (row: BulkTurnoverRow): (string | number)[] => [
    row.jobId || '',
    row.jobDescription || '',
    row.plant || 'Phra Khanong',
    row.areaUnit || '',
    row.equipmentTag || '',
    row.equipmentType || '',
    row.targetStartDate || '',
    row.plannedTurnoverDate || '',
    row.discipline || 'Mechanical',
    row.turnoverSystem || '',
    row.jobLead || '',
    row.status || 'Draft'
  ];

  // Export Template Excel (.xlsx)
  const handleExportTemplateXlsx = () => {
    const templateRows = SAMPLE_TURNOVER_BULK_DATA.map(sample => {
      const mockRow: BulkTurnoverRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToExcel(
      `Turnover_Job_Import_Template_12Fields_${new Date().toISOString().slice(0, 10)}`,
      'Turnover Template',
      TURNOVER_EXPORT_HEADERS,
      templateRows
    );
  };

  // Export Template CSV
  const handleExportTemplateCsv = () => {
    const templateRows = SAMPLE_TURNOVER_BULK_DATA.map(sample => {
      const mockRow: BulkTurnoverRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToCsv(
      `Turnover_Job_Import_Template_12Fields_${new Date().toISOString().slice(0, 10)}`,
      TURNOVER_EXPORT_HEADERS,
      templateRows
    );
  };

  // Parse Matrix and Start Row-by-Row Animated Processing
  const startRowByRowValidation = async (matrix: string[][], sourceName: string) => {
    if (!matrix || matrix.length === 0) {
      setValidationErrors([{
        rowNumber: 1,
        identifier: 'File',
        field: 'Empty File',
        message: isTh ? 'ไฟล์ว่างเปล่าหรือไม่พบข้อมูล' : 'File is empty or contains no data rows.'
      }]);
      setIsErrorModalOpen(true);
      return;
    }

    const firstRowText = matrix[0].join(' ').toLowerCase();
    const startIndex = (firstRowText.includes('job') || firstRowText.includes('turnover') || firstRowText.includes('description') || firstRowText.includes('tag')) ? 1 : 0;
    const dataRows = matrix.slice(startIndex).filter(r => r && r.some(c => c && c.trim()));

    if (dataRows.length === 0) {
      setValidationErrors([{
        rowNumber: 1,
        identifier: 'Data Rows',
        field: 'No Data Rows',
        message: isTh ? 'ไม่พบแถวข้อมูลสำหรับนำเข้า (มีเฉพาะส่วนหัวตาราง)' : 'No data rows found below headers.'
      }]);
      setIsErrorModalOpen(true);
      return;
    }

    // Initialize Progress Bar
    setUploadedFileName(sourceName);
    setIsProcessing(true);
    setProcessProgress(0);
    setCurrentRowProcessing(0);
    setTotalRowsToProcess(dataRows.length);
    setLiveValidCount(0);
    setLiveErrorCount(0);
    setValidationErrors([]);
    setValidatedRows([]);

    const allErrors: ValidationErrorDetail[] = [];
    const validResults: BulkTurnoverRow[] = [];

    // 1. Build frequency map of Job IDs in the uploaded file
    const fileIdCounts = new Map<string, number>();
    dataRows.forEach(r => {
      const jid = (r[0] || '').trim().toLowerCase();
      if (jid) fileIdCounts.set(jid, (fileIdCounts.get(jid) || 0) + 1);
    });

    let detectedDupes = 0;
    const total = dataRows.length;

    for (let i = 0; i < total; i++) {
      const row = dataRows[i];
      const excelRowIndex = startIndex + i + 1;

      const jobId = row[0]?.trim() || `T-2026-${Math.floor(100 + Math.random() * 899)}`;
      const jobDescription = row[1]?.trim() || '';
      const plantRaw = (row[2] || 'Phra Khanong').toLowerCase();
      const plant: 'Phra Khanong' | 'Sriracha' = plantRaw.includes('sri') ? 'Sriracha' : 'Phra Khanong';
      const areaUnit = row[3]?.trim() || TURNOVER_AREA_UNITS[0];
      const equipmentTag = row[4]?.trim() || '';
      const equipmentType = row[5]?.trim() || 'Process Equipment';
      const targetStartDate = row[6]?.trim() || '';
      const plannedTurnoverDate = row[7]?.trim() || '';
      const discipline = row[8]?.trim() || 'Mechanical';
      const turnoverSystem = row[9]?.trim() || '';
      const jobLead = row[10]?.trim() || 'วิศวกรผู้รับผิดชอบงาน';
      const statusRaw = row[11]?.trim() || 'In Progress';
      const status = (['Draft', 'In Progress', 'Ready for T/O', 'Completed'].includes(statusRaw) ? statusRaw : 'In Progress') as any;

      const draftRow: BulkTurnoverRow = {
        id: `turnover-bulk-imported-${Date.now()}-${i}`,
        jobId,
        jobDescription,
        plant,
        areaUnit,
        equipmentTag,
        equipmentType,
        targetStartDate,
        plannedTurnoverDate,
        discipline,
        turnoverSystem,
        jobLead,
        status,
        isValid: true
      };

      const rowErrors = validateTurnoverRow(draftRow, excelRowIndex, fileIdCounts);
      const isDupe = rowErrors.some(e => e.field.includes('ซ้ำ') || e.field.includes('Duplicate'));
      if (isDupe) detectedDupes++;

      if (rowErrors.length > 0) {
        draftRow.isValid = false;
        draftRow.isDuplicate = isDupe;
        draftRow.validationError = rowErrors[0].message;
        allErrors.push(...rowErrors);
        setLiveErrorCount(prev => prev + rowErrors.length);
      } else {
        validResults.push(draftRow);
        setLiveValidCount(prev => prev + 1);
      }

      setCurrentRowProcessing(i + 1);
      setProcessProgress(Math.round(((i + 1) / total) * 100));

      if (total < 40 || i % Math.ceil(total / 30) === 0 || i === total - 1) {
        await new Promise(r => setTimeout(r, total > 100 ? 5 : 20));
      }
    }

    await new Promise(r => setTimeout(r, 200));
    setIsProcessing(false);
    setValidatedRows(validResults);
    setDuplicateRowsCount(detectedDupes);

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      setIsErrorModalOpen(true);
    }
  };

  // Upload handler
  const handleFileUpload = async (file: File) => {
    try {
      const matrix = await parseExcelOrCsvFile(file);
      await startRowByRowValidation(matrix, file.name);
    } catch (err) {
      console.error(err);
      alert(isTh ? 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel หรือ CSV ที่ถูกต้อง' : 'Failed to parse file. Please verify it is a valid Excel or CSV.');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Process Pasted Text
  const handleProcessPastedText = async () => {
    if (!pastedText.trim()) return;
    const matrix = parseDelimitedText(pastedText);
    await startRowByRowValidation(matrix, isTh ? 'ข้อมูลวางจากคลิปบอร์ด (Clipboard Paste)' : 'Clipboard Paste');
    setPastedText('');
    setShowPasteBox(false);
  };

  // Load Built-in Sample Data
  const handleLoadSampleDataset = async () => {
    const matrix = SAMPLE_TURNOVER_BULK_DATA.map(sample => {
      const mock: BulkTurnoverRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mock).map(String);
    });
    matrix.unshift(TURNOVER_EXPORT_HEADERS);
    await startRowByRowValidation(matrix, 'SAMPLE_TURNOVER_PACKAGES.xlsx');
  };

  // Filter out any duplicate rows so users can proceed cleanly with valid unique items
  const handleFilterOutDuplicates = () => {
    const seen = new Set<string>();
    const cleaned = validatedRows.filter(r => {
      const cleanId = (r.jobId || '').trim().toLowerCase();
      if (!cleanId) return false;
      if (checkJobIdExists(cleanId)) return false;
      if (seen.has(cleanId)) return false;
      seen.add(cleanId);
      return true;
    });
    setValidatedRows(cleaned);
    setDuplicateRowsCount(0);
    setValidationErrors(prev => prev.filter(e => !e.field.includes('ซ้ำ') && !e.field.includes('Duplicate')));
  };

  // Submit Valid Rows into Central Store
  const handleSubmitAll = () => {
    if (validatedRows.length === 0) return;

    // Strict duplicate check before committing import
    const duplicateIds = validatedRows
      .map(r => (r.jobId || '').trim())
      .filter((id, idx, arr) => checkJobIdExists(id) || arr.map(x => x.toLowerCase()).indexOf(id.toLowerCase()) !== idx);

    if (duplicateIds.length > 0) {
      const unique = Array.from(new Set(duplicateIds));
      alert(
        isTh
          ? `❌ ไม่สามารถนำเข้าข้อมูลได้: ตรวจพบรหัส Job ID ซ้ำกัน ${unique.length} รายการ (${unique.slice(0, 3).join(', ')})${unique.length > 3 ? '...' : ''} กรุณาแก้ไขรหัสให้ไม่ซ้ำก่อนนำเข้า`
          : `❌ Cannot import: Found ${unique.length} duplicate Job IDs (${unique.slice(0, 3).join(', ')}). Duplicate Job IDs are strictly prohibited.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const newTurnoverJobs: JobRecord[] = validatedRows.map((row) => {
        const cleanJobId = (row.jobId || '').trim();
        const displayTitle = row.jobDescription
          ? `${cleanJobId} — ${row.jobDescription}`
          : `${cleanJobId} — ${row.equipmentTag || 'Equipment Asset'}`;

        return {
          id: `TO-${cleanJobId}`,
          jobNo: cleanJobId,
          orderNo: cleanJobId,
          title: displayTitle,
          eventName: activeEventName || 'Annual Turnaround 2026',
          workOrder: cleanJobId,
          contractor: 'Turnover Project Team',
          requester: row.jobLead || 'Turnover Engineer',
          approver: 'Operations Superintendent',
          priority: 'High',
          status: row.status as any,
          approvalStatus: 'Approved',
          workStatus: 'in_progress',
          scopeSummary: row.jobDescription || displayTitle,
          jobDescription: row.jobDescription || displayTitle,
          description: row.jobDescription || displayTitle,
          plant: row.plant,
          unit: row.areaUnit,
          area: row.areaUnit,
          system: row.turnoverSystem?.trim() || 'General System',
          assetTag: row.equipmentTag.trim(),
          assetDescription: row.equipmentType || 'Process Equipment',
          hierarchyLevel: 'Level 3 • Equipment',
          hierarchyPath: `${row.areaUnit} > ${row.turnoverSystem.trim()} > ${row.equipmentTag.trim()}`,
          isCriticalPath: false,
          gridZone: row.areaUnit.includes('S1') ? 'Zone S1' : row.areaUnit.includes('S2') ? 'Zone S2' : 'Zone S3',
          plotPlanX: 50,
          plotPlanY: 50,
          plotPlanId: 'plan-scaffolding-cad',
          plotPlanRadius: 15,
          plotPlanWidth: 14,
          plotPlanHeight: 10,
          plotPlanRotation: 0,
          markingType: 'area',
          attachments: [],
          signatures: [],
          punchList: [],
          createdAt: new Date().toISOString().split('T')[0],
          targetStartDate: row.targetStartDate,
          plannedTurnoverDate: row.plannedTurnoverDate,
          equipmentType: row.equipmentType,
          discipline: row.discipline,
          turnoverSystem: row.turnoverSystem.trim(),
          jobLead: row.jobLead
        };
      });

      onBatchCreateTurnoverJobs(newTurnoverJobs);
      setSuccessCount(newTurnoverJobs.length);

      // Broadcast update event so all open views (like TurnoverEventJobList) sync immediately
      window.dispatchEvent(new CustomEvent('plantturn_jobs_updated', { detail: { count: newTurnoverJobs.length } }));

      if (onSuccess) {
        onSuccess(newTurnoverJobs.length);
      }
    } catch (err) {
      console.error(err);
      alert('Error ingesting turnover jobs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Mode Info */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 rounded-3xl border border-emerald-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <Building size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {isTh ? 'นำเข้าแพ็กเกจงานส่งมอบระบบแบบกลุ่ม (Turnover Bulk Ingestion)' : 'Turnover Package Bulk Ingestion'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  12 Fields Ingestion
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {isTh
                  ? 'อัปโหลดไฟล์ Excel (.xlsx) หรือ CSV สำหรับเปิด Job ส่งมอบ Turnover พร้อมระบบตรวจเช็คข้อมูลทีละแถว'
                  : 'Upload Excel (.xlsx) or CSV for Event & Turnover jobs with row-by-row live validation.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onSwitchToSingle && (
            <button
              type="button"
              onClick={onSwitchToSingle}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {isTh ? '← สลับไปแบบฟอร์มเดี่ยว' : '← Single Job Form'}
            </button>
          )}

          {/* Export Template Buttons */}
          <div className="flex items-center gap-1.5 bg-emerald-950/70 p-1 rounded-xl border border-emerald-500/40">
            <button
              type="button"
              onClick={handleExportTemplateXlsx}
              title="Download Excel Template (.xlsx)"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>ดาวน์โหลด Template (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportTemplateCsv}
              title="Download CSV Template"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Event Binding Bar for Bulk Ingestion */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
              {isTh ? 'กำหนด Event เป้าหมาย' : 'Target Event Binding'}
            </span>
            {selectedEventObj && (
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {selectedEventObj.eventCode} • {selectedEventObj.plant} ({selectedEventObj.startDate} → {selectedEventObj.targetTurnoverDate})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isTh
              ? 'เลือกรอบงานซ่อมบำรุง (Turnaround / Overhaul Event) ที่ต้องการผูกกับแพ็กเกจงานทั้งหมดในชุดนำเข้านี้'
              : 'Select the Turnaround / Overhaul Event to bind all imported job packages in this batch.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <select
            value={activeEventName}
            onChange={(e) => handleEventChange(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none cursor-pointer min-w-[240px]"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.eventName}>
                {ev.eventName} ({ev.plant} • {ev.eventCode})
              </option>
            ))}
          </select>

          {onOpenCreateEvent && (
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
            >
              + {isTh ? 'สร้าง Event ใหม่' : 'New Event'}
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {successCount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/60 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm">
              {isTh
                ? `บันทึกแพ็กเกจงานส่งมอบสำเร็จทั้งหมด ${successCount} รายการ เข้าสู่วงรอบงาน Turnover เรียบร้อยแล้ว!`
                : `Successfully ingested all ${successCount} turnover packages!`}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              {isTh ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          )}
        </div>
      )}

      {/* REAL-TIME ROW-BY-ROW PROCESSING PROGRESS CARD */}
      {isProcessing && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/60 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center animate-spin">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {isTh ? 'กำลังประมวลผลและตรวจสอบข้อมูลทีละแถว...' : 'Validating & Processing Data Row-by-Row...'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {uploadedFileName} • {isTh ? `แถวที่ ${currentRowProcessing} จาก ${totalRowsToProcess}` : `Row ${currentRowProcessing} of ${totalRowsToProcess}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {processProgress}%
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-green-400 rounded-full transition-all duration-150 shadow-sm"
              style={{ width: `${processProgress}%` }}
            />
          </div>

          {/* Live Progress Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px]">{isTh ? 'ประมวลผลแล้ว' : 'Processed'}</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{currentRowProcessing} / {totalRowsToProcess}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300">
              <span className="block text-[11px]">{isTh ? 'ผ่านเกณฑ์ (Valid)' : 'Valid Rows'}</span>
              <strong className="font-mono text-sm">{liveValidCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              <span className="block text-[11px]">{isTh ? 'พบข้อผิดพลาด (Errors)' : 'Errors'}</span>
              <strong className="font-mono text-sm">{liveErrorCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* MAIN UPLOAD ZONE (WHEN NOT PROCESSING AND NO VALIDATED ROWS READY) */}
      {!isProcessing && validatedRows.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isTh ? 'อัปโหลดไฟล์ Excel / CSV สำหรับงาน Event & Job (Turnover)' : 'Upload Excel / CSV File for Event & Turnover Jobs'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTh
                ? 'ระบบจะทำการตรวจสอบข้อมูลทีละแถวตามโครงสร้างระบบโรงกลั่นและวันส่งมอบ หากพบข้อผิดพลาดจะแสดง Popup ชี้แจงทันที'
                : 'The system validates every row against system hierarchy and milestone dates.'}
            </p>
          </div>

          {/* Drag & Drop File Box */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner mb-4">
              <Upload size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isTh ? 'ลากและวางไฟล์แพ็กเกจงานที่นี่ หรือคลิกเพื่อเลือกไฟล์' : 'Drag and drop your Turnover package file here, or browse'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              รองรับไฟล์ <strong>.xlsx, .xls</strong> และ <strong>.csv</strong> (ขนาดไม่เกิน 25 MB)
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20">
              <FileSpreadsheet size={15} />
              <span>{isTh ? 'เลือกไฟล์จากคอมพิวเตอร์' : 'Browse Files'}</span>
            </div>
          </div>

          {/* Quick Demo & Paste Options Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadSampleDataset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 cursor-pointer shadow-xs transition"
              >
                <Sparkles size={14} className="text-emerald-500" />
                <span>{isTh ? 'ทดลองโหลดข้อมูลตัวอย่าง (4 Packages)' : 'Load 4 Sample Packages'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition"
              >
                <ClipboardPaste size={14} className="text-slate-500" />
                <span>{isTh ? (showPasteBox ? 'ซ่อนกล่องวางข้อความ' : 'หรือวางข้อมูลตาราง (Paste from Excel)') : (showPasteBox ? 'Hide Paste Box' : 'Paste from Excel')}</span>
              </button>
            </div>

            <span className="text-xs text-slate-400">
              {isTh ? '• คอลัมน์ตรงกับแบบฟอร์ม Event & Job 12 ฟิลด์' : '• 12 fields strictly matching Turnover Form'}
            </span>
          </div>

          {/* Expandable Paste Box */}
          {showPasteBox && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ClipboardPaste size={14} className="text-emerald-500" />
                  <span>{isTh ? 'วางข้อมูลที่คัดลอกจาก Excel (Tab-delimited Text)' : 'Paste Copied Rows from Excel'}</span>
                </span>
                <span className="text-[11px] text-slate-400">คั่นคอลัมน์ด้วย Tab ตามลำดับ Template</span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="วางแถวข้อมูลจาก Excel ที่นี่ (กด Ctrl+V / Cmd+V)..."
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isTh ? 'เริ่มประมวลผลข้อมูล' : 'Process Pasted Data'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VALIDATION PASSED & READY TO INGEST STATE CARD */}
      {!isProcessing && validatedRows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          {/* DUPLICATE WARNING BANNER */}
          {duplicateRowsCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold">
                    {isTh
                      ? `ตรวจพบรหัส Job ID ซ้ำกัน ${duplicateRowsCount} จุด (ตัดรายการที่ไม่ถูกต้องออกแล้ว)`
                      : `Detected ${duplicateRowsCount} duplicate Job ID entries (Invalid entries filtered out)`}
                  </h4>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                    {isTh
                      ? 'ระบบไม่อนุญาตให้นำเข้าข้อมูลที่มี Job ID ซ้ำกับที่มีอยู่แล้วในระบบหรือซ้ำกันเองในไฟล์เด็ดขาด'
                      : 'Duplicate Job IDs are strictly prohibited and cannot be ingested into the system.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsErrorModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              >
                {isTh ? 'ดูรายการที่ซ้ำ' : 'View Duplicate Details'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    VALIDATION PASSED
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{uploadedFileName}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {isTh
                    ? `ผ่านการตรวจสอบความถูกต้องเรียบร้อย (${validatedRows.length} แพ็กเกจพร้อมบันทึก)`
                    : `Data Validated Successfully (${validatedRows.length} Packages Ready to Ingest)`}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setValidatedRows([]);
                  setValidationErrors([]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {isTh ? 'อัปโหลดไฟล์ใหม่' : 'Re-upload File'}
              </button>

              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                <span>
                  {isTh
                    ? `ยืนยันนำเข้าข้อมูล (${validatedRows.length} แพ็กเกจ)`
                    : `Confirm & Ingest ${validatedRows.length} Packages`}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Metrics of Ingested Jobs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">{isTh ? 'จำนวนแพ็กเกจทั้งหมด' : 'Total Packages'}</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">{validatedRows.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300">
              <span className="text-xs font-semibold">{isTh ? 'สาขางาน (Disciplines)' : 'Disciplines'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.discipline))).join(', ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-300">
              <span className="text-xs font-semibold">{isTh ? 'โรงกลั่นเป้าหมาย' : 'Plants'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.plant))).join(', ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">{isTh ? 'สถานะงาน' : 'Status'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                In Progress: {validatedRows.filter(r => r.status === 'In Progress').length} | Draft: {validatedRows.filter(r => r.status === 'Draft').length}
              </p>
            </div>
          </div>

          {/* Compact Verified Preview List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {isTh ? 'ตัวอย่างรายการที่พร้อมบันทึก (Preview):' : 'Validated Packages Preview:'}
            </span>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {validatedRows.slice(0, 5).map((row, idx) => (
                <div key={row.id} className="p-3 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 font-bold w-6">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400">{row.jobId}</strong>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.equipmentTag}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">{row.areaUnit}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{row.jobDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">{row.discipline}</span>
                    <span>T/O: {row.plannedTurnoverDate}</span>
                  </div>
                </div>
              ))}
              {validatedRows.length > 5 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 text-center text-xs font-semibold text-slate-500">
                  {isTh
                    ? `...และมีอีก ${validatedRows.length - 5} รายการที่ผ่านการตรวจสอบสมบูรณ์`
                    : `...and ${validatedRows.length - 5} more fully validated packages`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION ERROR POPUP MODAL (POPUP บอกว่าผิดตรงไหน) */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {isTh ? 'พบข้อผิดพลาดในข้อมูล (Validation Errors Detected)' : 'Validation Errors Detected'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTh
                      ? `พบข้อมูลที่ไม่สมบูรณ์หรือผิดรูปแบบทั้งหมด ${validationErrors.length} จุด กรุณาตรวจสอบตามรายการด้านล่าง`
                      : `Found ${validationErrors.length} invalid or missing field values. Please review below.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsErrorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Report Table */}
            <div className="overflow-y-auto flex-1 custom-scrollbar border border-rose-100 dark:border-rose-950 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-rose-50/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 sticky top-0 font-bold border-b border-rose-200 dark:border-rose-900">
                  <tr>
                    <th className="p-2.5 w-24 text-center">{isTh ? 'แถวที่ (Row)' : 'Row #'}</th>
                    <th className="p-2.5 w-36">{isTh ? 'รหัสอ้างอิง' : 'Identifier'}</th>
                    <th className="p-2.5 w-44">{isTh ? 'ฟิลด์ที่มีปัญหา' : 'Error Field'}</th>
                    <th className="p-2.5">{isTh ? 'สาเหตุข้อผิดพลาด (คำแนะนำ)' : 'Error Reason / Guidance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {validationErrors.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                      <td className="p-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                        {isTh ? `แถว ${err.rowNumber}` : `Row ${err.rowNumber}`}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {err.identifier}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {err.field}
                        </span>
                      </td>
                      <td className="p-2.5 text-rose-700 dark:text-rose-300 font-medium">
                        {err.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {validatedRows.length > 0
                  ? (isTh ? `* มี ${validatedRows.length} รายการที่ข้อมูลถูกต้องและพร้อมนำเข้าได้ทันที` : `* ${validatedRows.length} rows are valid and ready to import`)
                  : (isTh ? '* ทุกรายการในไฟล์มีข้อผิดพลาด กรุณาแก้ไขไฟล์ตามคำแนะนำ' : '* All rows contain errors. Please fix file.')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsErrorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {isTh ? 'ปิดเพื่อแก้ไขไฟล์ Excel' : 'Close to Fix File'}
                </button>

                {validatedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsErrorModalOpen(false);
                      handleSubmitAll();
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer"
                  >
                    {isTh ? `นำเข้าเฉพาะ ${validatedRows.length} รายการที่ถูกต้อง` : `Import ${validatedRows.length} Valid Only`}
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
