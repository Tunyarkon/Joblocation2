import React, { useState, useRef, DragEvent } from 'react';
import {
  Truck,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  ArrowRight,
  RefreshCw,
  Check,
  X,
  Calendar,
  Plus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlantTurnShared } from '../../context/PlantTurnSharedContext';
import { addCraneJob, getAllCraneJobs } from '../../data/craneOperationsData';
import { exportToExcel, exportToCsv, parseExcelOrCsvFile, parseDelimitedText } from '../../utils/excelImportExport';
import {
  CRANE_LOCATION_AREAS,
  FUNCTIONAL_LOCATIONS,
  CRANE_STATUS_OPTIONS
} from '../CreateJob';

export interface BulkCraneRow {
  id: string;
  woNumber: string;
  jobDescription: string;
  plant: 'Phra Khanong' | 'Sriracha';
  locationArea: string;
  equipmentTag: string;
  functionalLocation: string;
  tradeSession: string;
  workStartDate: string;
  workStartTime: string;
  workEndDate: string;
  workEndTime: string;
  shift: 'Day' | 'Night' | 'All day';
  craneType: 'Crane Pull' | 'Crane Spot';
  craneModel: string;
  capacityRequired: number;
  providerType: 'Owner Crane' | 'Contractor Crane';
  boomLength: number;
  workingRadius: number;
  totalWeight: number;
  submittedBy: string;
  status: 'Draft' | 'Submitted' | 'Rejected' | 'Reviewed' | 'Optimized';
  remarks: string;
  isValid: boolean;
  validationError?: string;
}

export const CRANE_EXPORT_HEADERS = [
  'WO Number',
  'Job Description',
  'Plant',
  'Location Area',
  'Equipment Tag',
  'Functional Location',
  'Trade Session',
  'Work Start Date',
  'Work Start Time',
  'Work End Date',
  'Work End Time',
  'Shift',
  'Crane Type',
  'Crane Model',
  'Capacity Required (Ton)',
  'Provider Type',
  'Boom Length (m)',
  'Working Radius (m)',
  'Total Weight (Ton)',
  'Submitted By',
  'Status',
  'Remarks'
];

export const SAMPLE_CRANE_BULK_DATA: Omit<BulkCraneRow, 'id' | 'isValid' | 'validationError'>[] = [
  {
    woNumber: 'WO-880121',
    jobDescription: 'CDU-1 Atmospheric Column 11-C-101 top tray assembly lift & heavy rigging',
    plant: 'Phra Khanong',
    locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    equipmentTag: '11-C-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    tradeSession: 'MSD',
    workStartDate: '2026-10-15',
    workStartTime: '08:00',
    workEndDate: '2026-10-15',
    workEndTime: '17:00',
    shift: 'Day',
    craneType: 'Crane Pull',
    craneModel: 'LTM 1300 (300T All-Terrain)',
    capacityRequired: 300,
    providerType: 'Contractor Crane',
    boomLength: 48,
    workingRadius: 22,
    totalWeight: 38,
    submittedBy: 'นายสมชาย พัฒนกิจ (Lead Turnaround Planner)',
    status: 'Submitted',
    remarks: 'Critical path lift - require rigging engineer supervision'
  },
  {
    woNumber: 'WO-880122',
    jobDescription: 'Crude Preheat Exchanger Train 11-E-101 tube bundle extraction & blind insertion',
    plant: 'Phra Khanong',
    locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    equipmentTag: '11-E-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    tradeSession: 'MSD',
    workStartDate: '2026-10-15',
    workStartTime: '09:00',
    workEndDate: '2026-10-15',
    workEndTime: '18:00',
    shift: 'Day',
    craneType: 'Crane Pull',
    craneModel: 'GR-500EXL (50T Rough Terrain)',
    capacityRequired: 50,
    providerType: 'Owner Crane',
    boomLength: 32,
    workingRadius: 14,
    totalWeight: 18,
    submittedBy: 'วิศวกรจัดตารางเครน (Crane Scheduler)',
    status: 'Submitted',
    remarks: 'Coordinate with hydrotest staging crew'
  },
  {
    woNumber: 'WO-880123',
    jobDescription: 'Furnace Fired Heater Burner Deck 11-H-101 coil header unbolting and replacement',
    plant: 'Phra Khanong',
    locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    equipmentTag: '11-H-101',
    functionalLocation: '11-APS1 (Atmospheric Pipestill 1)',
    tradeSession: 'MAD',
    workStartDate: '2026-10-16',
    workStartTime: '08:30',
    workEndDate: '2026-10-16',
    workEndTime: '16:30',
    shift: 'Day',
    craneType: 'Crane Spot',
    craneModel: 'AC 100-4L (100T All Terrain)',
    capacityRequired: 100,
    providerType: 'Contractor Crane',
    boomLength: 42,
    workingRadius: 18,
    totalWeight: 22,
    submittedBy: 'นายประสิทธิ์ ช่างเครื่องกลอาวุโส',
    status: 'Submitted',
    remarks: 'Clear scaffold obstruction on east face prior to lift'
  },
  {
    woNumber: 'WO-880124',
    jobDescription: 'Hydrocracker High-Pressure Reactor 12-R-101 top flange spool crane lift',
    plant: 'Sriracha',
    locationArea: 'S1 - CCR, SRU, TGCU, Utility',
    equipmentTag: '12-R-101',
    functionalLocation: '12-HCU (Hydrocracking Unit)',
    tradeSession: 'TMD',
    workStartDate: '2026-10-16',
    workStartTime: '10:00',
    workEndDate: '2026-10-16',
    workEndTime: '20:00',
    shift: 'All day',
    craneType: 'Crane Spot',
    craneModel: 'Kobelco CKE2500 (250T Crawler)',
    capacityRequired: 250,
    providerType: 'Contractor Crane',
    boomLength: 55,
    workingRadius: 26,
    totalWeight: 45,
    submittedBy: 'นายวิชัย สุวรรณโชติ',
    status: 'Submitted',
    remarks: 'High risk lift - wind gauge monitoring active'
  },
  {
    woNumber: 'WO-880125',
    jobDescription: 'High Pressure Steam Boiler Unit 21-B-201 safety relief valve overhaul',
    plant: 'Phra Khanong',
    locationArea: 'S1 - CCR, SRU, TGCU, Utility',
    equipmentTag: '21-B-201',
    functionalLocation: '21-UTL (Utilities & Power Generation)',
    tradeSession: 'IMD',
    workStartDate: '2026-10-17',
    workStartTime: '08:00',
    workEndDate: '2026-10-17',
    workEndTime: '14:00',
    shift: 'Day',
    craneType: 'Crane Spot',
    craneModel: 'Kato KR-25H (25T City Crane)',
    capacityRequired: 25,
    providerType: 'Owner Crane',
    boomLength: 24,
    workingRadius: 10,
    totalWeight: 6,
    submittedBy: 'ทีมงานจัดสรรเครน (Optimizer Team)',
    status: 'Reviewed',
    remarks: 'Standard routine lift'
  }
];

export interface ValidationErrorDetail {
  rowNumber: number;
  identifier: string;
  field: string;
  message: string;
}

interface BulkCraneJobIngestionProps {
  onNavigateToRequests?: () => void;
  onSwitchToSingle?: () => void;
  selectedEventName?: string;
  onSelectEventName?: (eventName: string) => void;
  onOpenCreateEvent?: () => void;
}

export default function BulkCraneJobIngestion({
  onNavigateToRequests,
  onSwitchToSingle,
  selectedEventName,
  onSelectEventName,
  onOpenCreateEvent
}: BulkCraneJobIngestionProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const { events } = usePlantTurnShared();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localEventName, setLocalEventName] = useState<string>(
    selectedEventName || events[0]?.eventName || 'Annual Turnaround 2026'
  );
  const activeEventName = selectedEventName || localEventName;
  const activeEventRecord = events.find(e => e.eventName === activeEventName);

  // Core Data & Processing States
  const [validatedRows, setValidatedRows] = useState<BulkCraneRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentRowProcessing, setCurrentRowProcessing] = useState(0);
  const [totalRowsToProcess, setTotalRowsToProcess] = useState(0);
  const [liveValidCount, setLiveValidCount] = useState(0);
  const [liveErrorCount, setLiveErrorCount] = useState(0);

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

  // Detailed Row Validator
  const validateCraneRow = (
    row: Partial<BulkCraneRow>, 
    rowIndex: number,
    existingIdsSet?: Set<string>,
    seenInBatchSet?: Set<string>
  ): ValidationErrorDetail[] => {
    const errors: ValidationErrorDetail[] = [];
    const id = row.woNumber || row.equipmentTag || `Row ${rowIndex}`;

    if (!row.woNumber || !row.woNumber.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'WO Number',
        message: isTh ? 'ไม่มีเลขที่ใบสั่งงาน WO Number (ฟิลด์บังคับ)' : 'Missing WO Number (Required field)'
      });
    } else if (existingIdsSet && seenInBatchSet) {
      const cleanWo = row.woNumber.trim().toUpperCase();
      const cleanWoNoPrefix = cleanWo.replace(/^WO-?/i, '');
      if (existingIdsSet.has(cleanWo) || existingIdsSet.has(cleanWoNoPrefix)) {
        errors.push({
          rowNumber: rowIndex,
          identifier: id,
          field: 'WO Number',
          message: isTh 
            ? `เลขที่ WO Number (${row.woNumber}) มีอยู่ในระบบแล้ว ไม่สามารถนำเข้าซ้ำได้ (Duplicate ID)`
            : `WO Number (${row.woNumber}) already exists in the system (Duplicate ID not allowed)`
        });
      } else if (seenInBatchSet.has(cleanWo) || seenInBatchSet.has(cleanWoNoPrefix)) {
        errors.push({
          rowNumber: rowIndex,
          identifier: id,
          field: 'WO Number',
          message: isTh 
            ? `เลขที่ WO Number (${row.woNumber}) ซ้ำกับแถวอื่นในไฟล์นำเข้าเดียวกัน`
            : `WO Number (${row.woNumber}) is duplicated within the import file`
        });
      } else {
        seenInBatchSet.add(cleanWo);
        seenInBatchSet.add(cleanWoNoPrefix);
      }
    }

    if (!row.jobDescription || !row.jobDescription.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Job Description',
        message: isTh ? 'ไม่มีข้อมูลรายละเอียดงานยก (ฟิลด์บังคับ)' : 'Missing Job Description (Required field)'
      });
    }

    if (!row.equipmentTag || !row.equipmentTag.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Equipment Tag',
        message: isTh ? 'ไม่มีรหัสอุปกรณ์เครื่องจักร Equipment Tag (เช่น 11-C-101)' : 'Missing Equipment Tag (e.g. 11-C-101)'
      });
    }

    if (!row.workStartDate || !row.workStartDate.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Work Start Date',
        message: isTh ? 'ไม่มีวันที่เริ่มงาน Work Start Date' : 'Missing Work Start Date'
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.workStartDate.trim()) && isNaN(Date.parse(row.workStartDate))) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Work Start Date',
        message: isTh ? `รูปแบบวันที่ไม่ถูกต้อง: "${row.workStartDate}" (ต้องเป็น YYYY-MM-DD)` : `Invalid date format: "${row.workStartDate}" (Must be YYYY-MM-DD)`
      });
    }

    if (row.capacityRequired === undefined || row.capacityRequired === null || row.capacityRequired <= 0) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Capacity Required (Ton)',
        message: isTh ? 'พิกัดยกเครนที่ต้องการ (Capacity) ต้องเป็นตัวเลขมากกว่า 0 ตัน' : 'Lifting Capacity must be a number greater than 0 Tons'
      });
    }

    return errors;
  };

  const rowToAoa = (row: BulkCraneRow): (string | number)[] => [
    row.woNumber || '',
    row.jobDescription || '',
    row.plant || 'Phra Khanong',
    row.locationArea || '',
    row.equipmentTag || '',
    row.functionalLocation || '',
    row.tradeSession || 'MSD',
    row.workStartDate || '',
    row.workStartTime || '08:00',
    row.workEndDate || '',
    row.workEndTime || '17:00',
    row.shift || 'Day',
    row.craneType || 'Crane Spot',
    row.craneModel || '',
    row.capacityRequired || 50,
    row.providerType || 'Owner Crane',
    row.boomLength || 0,
    row.workingRadius || 0,
    row.totalWeight || 0,
    row.submittedBy || '',
    row.status || 'Submitted',
    row.remarks || ''
  ];

  // Export Template Excel (.xlsx)
  const handleExportTemplateXlsx = () => {
    const templateRows = SAMPLE_CRANE_BULK_DATA.map(sample => {
      const mockRow: BulkCraneRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToExcel(
      `Crane_Job_Import_Template_22Fields_${new Date().toISOString().slice(0, 10)}`,
      'Crane Job Template',
      CRANE_EXPORT_HEADERS,
      templateRows
    );
  };

  // Export Template CSV
  const handleExportTemplateCsv = () => {
    const templateRows = SAMPLE_CRANE_BULK_DATA.map(sample => {
      const mockRow: BulkCraneRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToCsv(
      `Crane_Job_Import_Template_22Fields_${new Date().toISOString().slice(0, 10)}`,
      CRANE_EXPORT_HEADERS,
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
    const startIndex = (firstRowText.includes('wo') || firstRowText.includes('description') || firstRowText.includes('equipment') || firstRowText.includes('plant')) ? 1 : 0;
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

    // Preload all existing IDs, Job Nos, and WOs from Crane Operations Store
    const existingJobs = getAllCraneJobs();
    const existingIdsSet = new Set<string>();
    existingJobs.forEach(j => {
      if (j.id) existingIdsSet.add(String(j.id).trim().toUpperCase());
      if (j.jobNo) existingIdsSet.add(String(j.jobNo).trim().toUpperCase());
      if (j.requestNo) existingIdsSet.add(String(j.requestNo).trim().toUpperCase());
      if (j.woNumber) {
        const woStr = String(j.woNumber).trim().toUpperCase();
        existingIdsSet.add(woStr);
        existingIdsSet.add(woStr.replace(/^WO-?/i, ''));
      }
      if (j.workOrder) {
        const woStr = String(j.workOrder).trim().toUpperCase();
        existingIdsSet.add(woStr);
        existingIdsSet.add(woStr.replace(/^WO-?/i, ''));
      }
      if (j.workOrderNo) {
        const woStr = String(j.workOrderNo).trim().toUpperCase();
        existingIdsSet.add(woStr);
        existingIdsSet.add(woStr.replace(/^WO-?/i, ''));
      }
    });

    const seenInBatchSet = new Set<string>();
    const allErrors: ValidationErrorDetail[] = [];
    const validResults: BulkCraneRow[] = [];

    const total = dataRows.length;

    for (let i = 0; i < total; i++) {
      const row = dataRows[i];
      const excelRowIndex = startIndex + i + 1;

      const woNumber = row[0]?.trim() || `WO-${Math.floor(880000 + Math.random() * 9000)}`;
      const jobDescription = row[1]?.trim() || '';
      const plantRaw = (row[2] || 'Phra Khanong').toLowerCase();
      const plant = plantRaw.includes('sri') ? 'Sriracha' : 'Phra Khanong';
      const locationArea = row[3]?.trim() || CRANE_LOCATION_AREAS[0];
      const equipmentTag = row[4]?.trim() || '';
      const functionalLocation = row[5]?.trim() || FUNCTIONAL_LOCATIONS[0];
      const tradeSession = row[6]?.trim() || 'MSD';
      const workStartDate = row[7]?.trim() || '';
      const workStartTime = row[8]?.trim() || '08:00';
      const workEndDate = row[9]?.trim() || workStartDate;
      const workEndTime = row[10]?.trim() || '17:00';
      const shiftRaw = (row[11] || 'Day').toLowerCase();
      const shift: 'Day' | 'Night' | 'All day' = shiftRaw.includes('night') ? 'Night' : shiftRaw.includes('all') ? 'All day' : 'Day';
      const craneTypeRaw = (row[12] || 'Crane Spot').toLowerCase();
      const craneType: 'Crane Pull' | 'Crane Spot' = craneTypeRaw.includes('pull') ? 'Crane Pull' : 'Crane Spot';
      const craneModel = row[13]?.trim() || 'GR-500EXL (50T)';
      const capacityParsed = parseInt(String(row[14] || '').replace(/[^\d]/g, ''), 10);
      const capacityRequired = isNaN(capacityParsed) || capacityParsed <= 0 ? 0 : capacityParsed;
      const provRaw = (row[15] || 'Owner Crane').toLowerCase();
      const providerType: 'Owner Crane' | 'Contractor Crane' = provRaw.includes('contract') ? 'Contractor Crane' : 'Owner Crane';
      const boomLength = parseFloat(String(row[16] || '').replace(/[^\d.]/g, '')) || 30;
      const workingRadius = parseFloat(String(row[17] || '').replace(/[^\d.]/g, '')) || 15;
      const totalWeight = parseFloat(String(row[18] || '').replace(/[^\d.]/g, '')) || 10;
      const submittedBy = row[19]?.trim() || 'ผู้ขอเปิดงาน (Import)';
      const statusRaw = row[20]?.trim() || 'Submitted';
      const status = (CRANE_STATUS_OPTIONS.includes(statusRaw as any) ? statusRaw : 'Submitted') as any;
      const remarks = row[21]?.trim() || '';

      const draftRow: BulkCraneRow = {
        id: `crane-bulk-imported-${Date.now()}-${i}`,
        woNumber,
        jobDescription,
        plant,
        locationArea,
        equipmentTag,
        functionalLocation,
        tradeSession,
        workStartDate,
        workStartTime,
        workEndDate,
        workEndTime,
        shift,
        craneType,
        craneModel,
        capacityRequired,
        providerType,
        boomLength,
        workingRadius,
        totalWeight,
        submittedBy,
        status,
        remarks,
        isValid: true
      };

      const rowErrors = validateCraneRow(draftRow, excelRowIndex, existingIdsSet, seenInBatchSet);

      if (rowErrors.length > 0) {
        draftRow.isValid = false;
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

  // Load Built-in Realistic Sample Data
  const handleLoadSampleDataset = async () => {
    const matrix = SAMPLE_CRANE_BULK_DATA.map(sample => {
      const mock: BulkCraneRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mock).map(String);
    });
    matrix.unshift(CRANE_EXPORT_HEADERS);
    await startRowByRowValidation(matrix, 'SAMPLE_CRANE_JOBS_8_LIFTS.xlsx');
  };

  // Submit Valid Rows into Store
  const handleSubmitAll = () => {
    if (validatedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      validatedRows.forEach(row => {
        addCraneJob({
          woNumber: row.woNumber,
          workOrder: row.woNumber,
          workOrderNo: row.woNumber,
          title: `${row.woNumber} - ${row.jobDescription.slice(0, 40)}`,
          description: row.jobDescription,
          plant: row.plant,
          eventName: activeEventName || 'Annual Turnaround 2026',
          eventCode: activeEventRecord?.eventCode,
          locationArea: row.locationArea,
          area: row.locationArea,
          equipmentTag: row.equipmentTag,
          equipmentId: row.equipmentTag,
          functionalLocation: row.functionalLocation,
          tradeSession: row.tradeSession,
          date: row.workStartDate,
          dateFrom: `${row.workStartDate} ${row.workStartTime}`,
          dateTo: `${row.workEndDate} ${row.workEndTime}`,
          workStartDateTime: `${row.workStartDate} ${row.workStartTime}`,
          workEndDateTime: `${row.workEndDate} ${row.workEndTime}`,
          shift: row.shift,
          craneType: row.craneType,
          type: row.craneType,
          machineType: row.craneModel,
          craneModel: row.craneModel,
          capacityRequired: row.capacityRequired,
          capacity: row.capacityRequired,
          providerType: row.providerType,
          provider: row.providerType === 'Owner Crane' ? 'owner' : 'contractor',
          boomLength: row.boomLength,
          boomLengthM: row.boomLength,
          workingRadius: row.workingRadius,
          workingRadiusM: row.workingRadius,
          totalWeightTon: row.totalWeight,
          grossLoadTon: row.totalWeight,
          loadWeightTon: row.totalWeight,
          requestor: row.submittedBy,
          requestStatus: (row.status as any) || 'Submitted',
          status: (row.status as any) || 'Submitted',
          remarks: row.remarks
        });
      });

      window.dispatchEvent(new CustomEvent('crane_operations_updated', { detail: { jobs: getAllCraneJobs() } }));
      window.dispatchEvent(new Event('storage'));

      setSuccessCount(validatedRows.length);
      setTimeout(() => {
        if (onNavigateToRequests) {
          onNavigateToRequests();
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Error ingesting crane jobs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Mode Info */}
      <div className="bg-gradient-to-r from-blue-900/95 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-blue-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Truck size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {isTh ? 'นำเข้างานเครน & เครื่องจักรแบบกลุ่ม (Bulk Ingestion)' : 'Crane Job Bulk Ingestion'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  22 Fields Ingestion
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                {isTh
                  ? 'อัปโหลดไฟล์ Excel (.xlsx) หรือ CSV พร้อมระบบตรวจเช็คข้อมูลทีละแถว และรายงานข้อผิดพลาดอัตโนมัติ'
                  : 'Upload Excel (.xlsx) or CSV with row-by-row live validation and instant error diagnostics.'}
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
          <div className="flex items-center gap-1.5 bg-blue-950/70 p-1 rounded-xl border border-blue-500/40">
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

      {/* TARGET EVENT BINDING BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
            <Calendar size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isTh ? 'ผูกชุดข้อมูลเครนที่นำเข้ากับ Event (Target Event Binding)' : 'Target Event Binding for Bulk Crane Jobs'}
              </span>
              {activeEventRecord && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {activeEventRecord.eventCode} • {activeEventRecord.plant}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeEventRecord
                ? `${activeEventRecord.eventType} (${activeEventRecord.startDate} → ${activeEventRecord.targetTurnoverDate})`
                : (isTh ? 'เลือก Event ซ่อมบำรุงหรือแคมเปญงานยกที่ต้องการนำเข้าใบงานเครนทั้งหมด' : 'Select the turnaround or lifting campaign event to attach all imported crane jobs.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={activeEventName}
            onChange={(e) => {
              const val = e.target.value;
              setLocalEventName(val);
              if (onSelectEventName) onSelectEventName(val);
            }}
            className="px-3.5 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer min-w-[240px]"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.eventName}>
                {ev.eventName} ({ev.eventCode} • {ev.plant})
              </option>
            ))}
          </select>

          {onOpenCreateEvent && (
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus size={14} />
              <span>{isTh ? 'สร้าง Event ใหม่' : '+ New Event'}</span>
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
                ? `บันทึกงานเครนสำเร็จทั้งหมด ${successCount} รายการ เข้าสู่ระบบ Central Store เรียบร้อยแล้ว!`
                : `Successfully ingested all ${successCount} crane jobs into Central Store!`}
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToRequests}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            {isTh ? 'ดูรายการคำขอ' : 'View Requests'}
          </button>
        </div>
      )}

      {/* REAL-TIME ROW-BY-ROW PROCESSING PROGRESS CARD */}
      {isProcessing && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/60 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center animate-spin">
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
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {processProgress}%
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-150 shadow-sm"
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
              {isTh ? 'อัปโหลดไฟล์ Excel / CSV สำหรับเปิดงานเครน' : 'Upload Excel / CSV File for Crane Jobs'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTh
                ? 'ระบบจะทำการตรวจสอบข้อมูลทีละแถวตามมาตรฐานความปลอดภัย Crane Lifting Plan หากพบข้อผิดพลาดจะแสดง Popup ชี้แจงทันที'
                : 'The system validates every row against safety lifting criteria. Any errors will be shown in a detailed popup.'}
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
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
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
            <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner mb-4">
              <Upload size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isTh ? 'ลากและวางไฟล์งานเครนที่นี่ หรือคลิกเพื่อเลือกไฟล์' : 'Drag and drop your Crane Job file here, or browse'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              รองรับไฟล์ <strong>.xlsx, .xls</strong> และ <strong>.csv</strong> (ขนาดไม่เกิน 25 MB)
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20">
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center gap-2 cursor-pointer shadow-xs transition"
              >
                <Sparkles size={14} className="text-blue-500" />
                <span>{isTh ? 'ทดลองโหลดชุดข้อมูลตัวอย่าง (8 Lifts)' : 'Load 8 Sample Crane Jobs'}</span>
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
              {isTh ? '• คอลัมน์ตรงกับแบบฟอร์มขอเครน 22 ฟิลด์' : '• 22 fields strictly matching Crane Form'}
            </span>
          </div>

          {/* Expandable Paste Box */}
          {showPasteBox && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ClipboardPaste size={14} className="text-blue-500" />
                  <span>{isTh ? 'วางข้อมูลที่คัดลอกจาก Excel (Tab-delimited Text)' : 'Paste Copied Rows from Excel'}</span>
                </span>
                <span className="text-[11px] text-slate-400">คั่นคอลัมน์ด้วย Tab ตามลำดับ Template</span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="วางแถวข้อมูลจาก Excel ที่นี่ (กด Ctrl+V / Cmd+V)..."
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-blue-500"
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
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer shadow-xs"
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
                    ? `ผ่านการตรวจสอบความถูกต้องเรียบร้อย (${validatedRows.length} รายการพร้อมบันทึก)`
                    : `Data Validated Successfully (${validatedRows.length} Jobs Ready to Ingest)`}
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
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                <span>
                  {isTh
                    ? `ยืนยันนำเข้าข้อมูล (${validatedRows.length} งานเครน)`
                    : `Confirm & Ingest ${validatedRows.length} Jobs`}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Metrics of Ingested Jobs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">{isTh ? 'จำนวนงานทั้งหมด' : 'Total Jobs'}</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">{validatedRows.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
              <span className="text-xs font-semibold">{isTh ? 'ความจุยกสะสม' : 'Total Capacity'}</span>
              <p className="text-xl font-black mt-0.5 font-mono">
                {validatedRows.reduce((sum, r) => sum + (r.capacityRequired || 0), 0)} T
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300">
              <span className="text-xs font-semibold">{isTh ? 'โรงกลั่นเป้าหมาย' : 'Plants'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.plant))).join(', ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">{isTh ? 'ประเภทเครน' : 'Crane Types'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                Pull: {validatedRows.filter(r => r.craneType === 'Crane Pull').length} | Spot: {validatedRows.filter(r => r.craneType === 'Crane Spot').length}
              </p>
            </div>
          </div>

          {/* Compact Verified Preview List (Top 5 preview) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {isTh ? 'ตัวอย่างรายการที่พร้อมบันทึก (Preview):' : 'Validated Records Preview:'}
            </span>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {validatedRows.slice(0, 5).map((row, idx) => (
                <div key={row.id} className="p-3 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 font-bold w-6">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-blue-600 dark:text-blue-400">{row.woNumber}</strong>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.equipmentTag}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">{row.plant}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{row.jobDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <span>{row.workStartDate}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">{row.capacityRequired}T</span>
                  </div>
                </div>
              ))}
              {validatedRows.length > 5 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 text-center text-xs font-semibold text-slate-500">
                  {isTh
                    ? `...และมีอีก ${validatedRows.length - 5} รายการที่ผ่านการตรวจสอบสมบูรณ์`
                    : `...and ${validatedRows.length - 5} more fully validated jobs`}
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
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer"
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
