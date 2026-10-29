import React, { useState, useRef, DragEvent } from 'react';
import {
  HardHat,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  ScaffoldingSFJob,
  addScaffoldingJob,
  getStoredScaffoldingJobs,
  LOCATION_AREAS,
  LocationAreaType,
  FunctionalDepartmentType,
  WorkingPeriodType,
  HirePeriodType,
  ContractorCompanyType
} from '../../data/scaffoldingSFData';
import { exportToExcel, exportToCsv, parseExcelOrCsvFile, parseDelimitedText } from '../../utils/excelImportExport';

export interface BulkScaffoldRow {
  id: string;
  jobId: string;
  jobDescription: string;
  plant: 'Sriracha' | 'Phra Khanong';
  locationArea: LocationAreaType;
  equipmentTag: string;
  functionalDepartment: FunctionalDepartmentType;
  scaffoldType: string;
  width: number;
  length: number;
  height: number;
  maxLoadKg: number;
  maxWorkers: number;
  maxLiftingLoadKg: number;
  heavyDuty: 'Y' | 'N';
  specialPurpose: 'Y' | 'N';
  workingPeriod: WorkingPeriodType;
  hirePeriod: HirePeriodType;
  company: ContractorCompanyType;
  requiredDate: string;
  offHireDate: string;
  requestorName: string;
  isValid: boolean;
  validationError?: string;
}

export const SCAFFOLD_EXPORT_HEADERS = [
  'Job ID (SF No.)',
  'Job Description',
  'Plant',
  'Location Area',
  'Equipment Tag',
  'Functional Department',
  'Scaffold Type',
  'Width (m)',
  'Length (m)',
  'Height (m)',
  'Max Load (kg)',
  'Max Workers',
  'Max Lifting Load (kg)',
  'Heavy Duty (Y/N)',
  'Special Purpose (Y/N)',
  'Working Period',
  'Hire Period',
  'Contractor Company',
  'Required Date',
  'Off-Hire Date',
  'Requestor Name'
];

export const SAMPLE_SCAFFOLD_BULK_DATA: Omit<BulkScaffoldRow, 'id' | 'isValid' | 'validationError'>[] = [
  {
    jobId: 'SF-2600101',
    jobDescription: 'Erect standard tower bay scaffolding for 11-C-101 top tray nozzle inspection',
    plant: 'Sriracha',
    locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    equipmentTag: '11-C-101',
    functionalDepartment: 'MAD',
    scaffoldType: 'Tower Bay (4m × 4m × 8m)',
    width: 4,
    length: 4,
    height: 8,
    maxLoadKg: 450,
    maxWorkers: 4,
    maxLiftingLoadKg: 100,
    heavyDuty: 'N',
    specialPurpose: 'N',
    workingPeriod: 'Normal hour',
    hirePeriod: '30 days',
    company: 'Kaefer',
    requiredDate: '2026-10-15',
    offHireDate: '2026-11-14',
    requestorName: 'วิศวกรตรวจสอบหอกลั่น'
  },
  {
    jobId: 'SF-2600102',
    jobDescription: 'Pipe rack access cantilever scaffolding for header line ultrasonic thickness test',
    plant: 'Sriracha',
    locationArea: 'S2 - APS-1, APS-2, FCCU, GOHF-3',
    equipmentTag: '11-E-102B',
    functionalDepartment: 'MAD',
    scaffoldType: 'Cantilever Bay (4m × 6m × 12m)',
    width: 4,
    length: 6,
    height: 12,
    maxLoadKg: 675,
    maxWorkers: 4,
    maxLiftingLoadKg: 150,
    heavyDuty: 'Y',
    specialPurpose: 'N',
    workingPeriod: 'Normal hour',
    hirePeriod: '15 days',
    company: 'Altrad',
    requiredDate: '2026-10-16',
    offHireDate: '2026-10-31',
    requestorName: 'หัวหน้างานท่อแรงดันสูง'
  },
  {
    jobId: 'SF-2600103',
    jobDescription: 'Reformer furnace core internal birdcage scaffold for refractory inspection',
    plant: 'Sriracha',
    locationArea: 'S1 - CCR, SRU, TGCU, Utility',
    equipmentTag: '21-R-101',
    functionalDepartment: 'MSD',
    scaffoldType: 'Birdcage (10m × 12m × 10m)',
    width: 10,
    length: 12,
    height: 10,
    maxLoadKg: 900,
    maxWorkers: 6,
    maxLiftingLoadKg: 250,
    heavyDuty: 'Y',
    specialPurpose: 'Y',
    workingPeriod: 'Overtime',
    hirePeriod: '30 days',
    company: 'Kaefer',
    requiredDate: '2026-10-18',
    offHireDate: '2026-11-17',
    requestorName: 'นายช่างเตาเผาพิเศษ'
  },
  {
    jobId: 'SF-2600104',
    jobDescription: 'Storage tank shell external circular ring scaffold for paint blasting',
    plant: 'Sriracha',
    locationArea: 'S3 - Offsite, Jetty',
    equipmentTag: '31-TK-105',
    functionalDepartment: 'Project',
    scaffoldType: 'Column Ring (7m × 7m × 18m)',
    width: 7,
    length: 7,
    height: 18,
    maxLoadKg: 450,
    maxWorkers: 4,
    maxLiftingLoadKg: 80,
    heavyDuty: 'N',
    specialPurpose: 'N',
    workingPeriod: 'Normal hour',
    hirePeriod: '30 days',
    company: 'Contractor A',
    requiredDate: '2026-10-20',
    offHireDate: '2026-11-19',
    requestorName: 'ฝ่ายบริหารโครงการซ่อมใหญ่'
  }
];

export interface ValidationErrorDetail {
  rowNumber: number;
  identifier: string;
  field: string;
  message: string;
}

interface BulkScaffoldingJobIngestionProps {
  onNavigateToList?: () => void;
  onSwitchToSingle?: () => void;
}

export default function BulkScaffoldingJobIngestion({
  onNavigateToList,
  onSwitchToSingle
}: BulkScaffoldingJobIngestionProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Data & Processing States
  const [validatedRows, setValidatedRows] = useState<BulkScaffoldRow[]>([]);
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

  // Detailed Row Validator for Scaffolding SF01
  const validateScaffoldRow = (
    row: Partial<BulkScaffoldRow>, 
    rowIndex: number,
    existingIdsSet?: Set<string>,
    seenInBatchSet?: Set<string>
  ): ValidationErrorDetail[] => {
    const errors: ValidationErrorDetail[] = [];
    const id = row.jobId || row.equipmentTag || `Row ${rowIndex}`;

    if (!row.jobId || !row.jobId.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Job ID (SF No.)',
        message: isTh ? 'ไม่มีรหัสใบงานนั่งร้าน Job ID (ฟิลด์บังคับ เช่น SF-2600101)' : 'Missing Job ID / SF No. (Required field)'
      });
    } else if (existingIdsSet && seenInBatchSet) {
      const cleanId = row.jobId.trim().toLowerCase();
      if (existingIdsSet.has(cleanId)) {
        errors.push({
          rowNumber: rowIndex,
          identifier: id,
          field: 'Job ID (SF No.)',
          message: isTh 
            ? `รหัส Job ID (${row.jobId}) มีอยู่ในระบบแล้ว ไม่สามารถนำเข้าซ้ำได้ (Duplicate ID)`
            : `Job ID (${row.jobId}) already exists in the system (Duplicate ID not allowed)`
        });
      } else if (seenInBatchSet.has(cleanId)) {
        errors.push({
          rowNumber: rowIndex,
          identifier: id,
          field: 'Job ID (SF No.)',
          message: isTh 
            ? `รหัส Job ID (${row.jobId}) ซ้ำกับแถวอื่นในไฟล์นำเข้าเดียวกัน (Duplicate in batch)`
            : `Job ID (${row.jobId}) is duplicated within the import file`
        });
      } else {
        seenInBatchSet.add(cleanId);
      }
    }

    if (!row.jobDescription || !row.jobDescription.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Job Description',
        message: isTh ? 'ไม่มีรายละเอียดวัตถุประสงค์งานนั่งร้าน (ฟิลด์บังคับ)' : 'Missing Job Description (Required field)'
      });
    }

    if (!row.equipmentTag || !row.equipmentTag.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Equipment Tag',
        message: isTh ? 'ไม่มีรหัสอุปกรณ์เครื่องจักร Equipment Tag' : 'Missing Equipment Tag'
      });
    }

    if (!row.requiredDate || !row.requiredDate.trim()) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Required Date',
        message: isTh ? 'ไม่มีวันที่ต้องการใช้งาน Required Date (ต้องเป็น YYYY-MM-DD)' : 'Missing Required Date (YYYY-MM-DD)'
      });
    }

    if (!row.width || row.width <= 0) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Width (m)',
        message: isTh ? 'ความกว้างฐานนั่งร้าน (Width) ต้องมากกว่า 0 เมตร' : 'Width must be greater than 0 meters'
      });
    }

    if (!row.length || row.length <= 0) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Length (m)',
        message: isTh ? 'ความยาวฐานนั่งร้าน (Length) ต้องมากกว่า 0 เมตร' : 'Length must be greater than 0 meters'
      });
    }

    if (!row.height || row.height <= 0) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Height (m)',
        message: isTh ? 'ความสูงนั่งร้าน (Height) ต้องมากกว่า 0 เมตร' : 'Height must be greater than 0 meters'
      });
    }

    if (!row.maxLoadKg || row.maxLoadKg <= 0) {
      errors.push({
        rowNumber: rowIndex,
        identifier: id,
        field: 'Max Load (kg)',
        message: isTh ? 'น้ำหนักบรรทุกปลอดภัย (Max Load) ต้องเป็นตัวเลขมากกว่า 0 kg' : 'Safe Working Load must be greater than 0 kg'
      });
    }

    return errors;
  };

  const rowToAoa = (row: BulkScaffoldRow): (string | number)[] => [
    row.jobId || '',
    row.jobDescription || '',
    row.plant || 'Sriracha',
    row.locationArea || '',
    row.equipmentTag || '',
    row.functionalDepartment || 'MAD',
    row.scaffoldType || 'Tower Bay',
    row.width || 4,
    row.length || 4,
    row.height || 8,
    row.maxLoadKg || 450,
    row.maxWorkers || 4,
    row.maxLiftingLoadKg || 100,
    row.heavyDuty || 'N',
    row.specialPurpose || 'N',
    row.workingPeriod || 'Normal hour',
    row.hirePeriod || '30 days',
    row.company || 'Kaefer',
    row.requiredDate || '',
    row.offHireDate || '',
    row.requestorName || ''
  ];

  // Export Template Excel (.xlsx)
  const handleExportTemplateXlsx = () => {
    const templateRows = SAMPLE_SCAFFOLD_BULK_DATA.map(sample => {
      const mockRow: BulkScaffoldRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToExcel(
      `Scaffolding_SF01_Import_Template_21Fields_${new Date().toISOString().slice(0, 10)}`,
      'Scaffold Template',
      SCAFFOLD_EXPORT_HEADERS,
      templateRows
    );
  };

  // Export Template CSV
  const handleExportTemplateCsv = () => {
    const templateRows = SAMPLE_SCAFFOLD_BULK_DATA.map(sample => {
      const mockRow: BulkScaffoldRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mockRow);
    });
    exportToCsv(
      `Scaffolding_SF01_Import_Template_21Fields_${new Date().toISOString().slice(0, 10)}`,
      SCAFFOLD_EXPORT_HEADERS,
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
    const startIndex = (firstRowText.includes('job') || firstRowText.includes('sf') || firstRowText.includes('description') || firstRowText.includes('scaffold')) ? 1 : 0;
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

    // Preload all existing Scaffolding Job IDs / SF Nos
    const existingJobs = getStoredScaffoldingJobs();
    const existingIdsSet = new Set<string>();
    existingJobs.forEach(j => {
      if (j.id) existingIdsSet.add(String(j.id).trim().toLowerCase());
      if (j.jobId) existingIdsSet.add(String(j.jobId).trim().toLowerCase());
      if (j.sfNo) existingIdsSet.add(String(j.sfNo).trim().toLowerCase());
    });
    const seenInBatchSet = new Set<string>();

    const allErrors: ValidationErrorDetail[] = [];
    const validResults: BulkScaffoldRow[] = [];

    const total = dataRows.length;

    for (let i = 0; i < total; i++) {
      const row = dataRows[i];
      const excelRowIndex = startIndex + i + 1;

      const jobId = row[0]?.trim() || `SF-${Math.floor(2600100 + Math.random() * 8000)}`;
      const jobDescription = row[1]?.trim() || '';
      const plantRaw = (row[2] || 'Sriracha').toLowerCase();
      const plant: 'Sriracha' | 'Phra Khanong' = plantRaw.includes('phra') ? 'Phra Khanong' : 'Sriracha';
      const locationArea = (row[3]?.trim() || LOCATION_AREAS[0]) as LocationAreaType;
      const equipmentTag = row[4]?.trim() || '';
      const functionalDepartment = (row[5]?.trim() || 'MAD') as FunctionalDepartmentType;
      const scaffoldType = row[6]?.trim() || 'Tower Bay (4m × 4m × 8m)';
      const width = parseFloat(String(row[7] || '').replace(/[^\d.]/g, '')) || 4;
      const length = parseFloat(String(row[8] || '').replace(/[^\d.]/g, '')) || 4;
      const height = parseFloat(String(row[9] || '').replace(/[^\d.]/g, '')) || 8;
      const maxLoadKg = parseInt(String(row[10] || '').replace(/[^\d]/g, ''), 10) || 450;
      const maxWorkers = parseInt(String(row[11] || '').replace(/[^\d]/g, ''), 10) || 4;
      const maxLiftingLoadKg = parseInt(String(row[12] || '').replace(/[^\d]/g, ''), 10) || 100;
      const heavyDuty = (row[13] || 'N').toUpperCase().includes('Y') ? 'Y' : 'N';
      const specialPurpose = (row[14] || 'N').toUpperCase().includes('Y') ? 'Y' : 'N';
      const workingPeriod = (row[15]?.trim() || 'Normal hour') as WorkingPeriodType;
      const hirePeriod = (row[16]?.trim() || '30 days') as HirePeriodType;
      const company = (row[17]?.trim() || 'Kaefer') as ContractorCompanyType;
      const requiredDate = row[18]?.trim() || '';
      const offHireDate = row[19]?.trim() || '';
      const requestorName = row[20]?.trim() || 'ผู้ขอเปิดงาน (Import)';

      const draftRow: BulkScaffoldRow = {
        id: `scaffold-bulk-imported-${Date.now()}-${i}`,
        jobId,
        jobDescription,
        plant,
        locationArea,
        equipmentTag,
        functionalDepartment,
        scaffoldType,
        width,
        length,
        height,
        maxLoadKg,
        maxWorkers,
        maxLiftingLoadKg,
        heavyDuty,
        specialPurpose,
        workingPeriod,
        hirePeriod,
        company,
        requiredDate,
        offHireDate,
        requestorName,
        isValid: true
      };

      const rowErrors = validateScaffoldRow(draftRow, excelRowIndex, existingIdsSet, seenInBatchSet);

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

  // Load Built-in Sample Data
  const handleLoadSampleDataset = async () => {
    const matrix = SAMPLE_SCAFFOLD_BULK_DATA.map(sample => {
      const mock: BulkScaffoldRow = { ...sample, id: '', isValid: true };
      return rowToAoa(mock).map(String);
    });
    matrix.unshift(SCAFFOLD_EXPORT_HEADERS);
    await startRowByRowValidation(matrix, 'SAMPLE_SCAFFOLD_JOBS.xlsx');
  };

  // Submit Valid Rows into Store
  const handleSubmitAll = () => {
    if (validatedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      validatedRows.forEach((row) => {
        const scaffoldJob: ScaffoldingSFJob = {
          id: row.jobId,
          jobId: row.jobId,
          sfNo: row.jobId,
          description: row.jobDescription,
          jobDescription: row.jobDescription,
          plant: row.plant,
          locationArea: row.locationArea,
          area: row.locationArea,
          equipmentTag: row.equipmentTag,
          functionalDepartment: row.functionalDepartment,
          scaffoldType: row.scaffoldType,
          width: row.width,
          length: row.length,
          height: row.height,
          maxLoadKg: row.maxLoadKg,
          maxWorkers: row.maxWorkers,
          maxLiftingLoadKg: row.maxLiftingLoadKg,
          heavyDuty: row.heavyDuty,
          specialPurpose: row.specialPurpose,
          workingPeriod: row.workingPeriod,
          hirePeriod: row.hirePeriod,
          company: row.company,
          contractor: row.company,
          requiredDate: row.requiredDate,
          offHireDate: row.offHireDate,
          status: 'Under Review',
          requestStatus: 'Submitted',
          workflowState: 'Requested',
          requestDate: new Date().toISOString().split('T')[0],
          requestorName: row.requestorName,
          markingLocation: {
            x: 50,
            y: 50,
            gridZone: 'B2',
            dropZoneRadius: 8,
            scaleBlock: {
              width: row.width,
              length: row.length,
              height: row.height,
              tiers: Math.ceil(row.height / 2),
              rotation: 0,
              color: 'amber'
            },
            description: `${row.equipmentTag} Scaffold Footprint`
          },
          attachments: [],
          tags: ['Bulk Ingest', row.functionalDepartment, row.company],
          createdAt: new Date().toISOString()
        };
        addScaffoldingJob(scaffoldJob);
      });

      setSuccessCount(validatedRows.length);
      setTimeout(() => {
        if (onNavigateToList) {
          onNavigateToList();
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Error ingesting scaffolding jobs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Mode Info */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 p-6 rounded-3xl border border-cyan-600/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600/20 rounded-xl border border-cyan-400/30">
              <HardHat size={24} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {isTh ? 'นำเข้างานนั่งร้านแบบกลุ่ม SF01 (Bulk Ingestion)' : 'Scaffolding SF01 Bulk Ingestion'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-600/30 text-cyan-200 border border-cyan-400/30">
                  21 Fields Ingestion
                </span>
              </div>
              <p className="text-xs text-cyan-200/80">
                {isTh
                  ? 'อัปโหลดไฟล์ Excel (.xlsx) หรือ CSV สำหรับเปิดขอนั่งร้าน SF01 พร้อมระบบตรวจเช็คข้อมูลทีละแถว'
                  : 'Upload Excel (.xlsx) or CSV for Scaffolding SF01 jobs with row-by-row live validation.'}
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
          <div className="flex items-center gap-1.5 bg-cyan-950/70 p-1 rounded-xl border border-cyan-600/40">
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

      {/* SUCCESS NOTIFICATION TOAST */}
      {successCount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/60 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm">
              {isTh
                ? `บันทึกคำขอนั่งร้านสำเร็จทั้งหมด ${successCount} รายการ เข้าสู่ระบบเรียบร้อยแล้ว!`
                : `Successfully ingested all ${successCount} scaffolding jobs!`}
            </span>
          </div>
          {onNavigateToList && (
            <button
              type="button"
              onClick={onNavigateToList}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              {isTh ? 'ดูรายการคำขอ' : 'View Requests'}
            </button>
          )}
        </div>
      )}

      {/* REAL-TIME ROW-BY-ROW PROCESSING PROGRESS CARD */}
      {isProcessing && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-cyan-600/60 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-700 text-white flex items-center justify-center animate-spin">
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
              <span className="text-2xl font-black text-cyan-700 dark:text-cyan-400 font-mono">
                {processProgress}%
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 rounded-full transition-all duration-150 shadow-sm"
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
              {isTh ? 'อัปโหลดไฟล์ Excel / CSV สำหรับงานนั่งร้าน SF01' : 'Upload Excel / CSV File for Scaffolding SF01 Jobs'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTh
                ? 'ระบบจะทำการตรวจสอบข้อมูลทีละแถวตามมาตรฐานความปลอดภัยนั่งร้าน หากพบข้อผิดพลาดจะแสดง Popup ชี้แจงทันที'
                : 'The system validates every row against scaffolding safety criteria.'}
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
                ? 'border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/30 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-cyan-400 bg-slate-50/50 dark:bg-slate-800/30'
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
            <div className="w-16 h-16 rounded-3xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 flex items-center justify-center mx-auto shadow-inner mb-4">
              <Upload size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isTh ? 'ลากและวางไฟล์งานนั่งร้านที่นี่ หรือคลิกเพื่อเลือกไฟล์' : 'Drag and drop your Scaffolding file here, or browse'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              รองรับไฟล์ <strong>.xlsx, .xls</strong> และ <strong>.csv</strong> (ขนาดไม่เกิน 25 MB)
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs shadow-md shadow-cyan-600/20">
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800 flex items-center gap-2 cursor-pointer shadow-xs transition"
              >
                <Sparkles size={14} className="text-cyan-600" />
                <span>{isTh ? 'ทดลองโหลดข้อมูลตัวอย่าง (4 SF Jobs)' : 'Load 4 Sample Scaffolding Jobs'}</span>
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
              {isTh ? '• คอลัมน์ตรงกับแบบฟอร์ม SF01 21 ฟิลด์' : '• 21 fields strictly matching SF01 Form'}
            </span>
          </div>

          {/* Expandable Paste Box */}
          {showPasteBox && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ClipboardPaste size={14} className="text-cyan-600" />
                  <span>{isTh ? 'วางข้อมูลที่คัดลอกจาก Excel (Tab-delimited Text)' : 'Paste Copied Rows from Excel'}</span>
                </span>
                <span className="text-[11px] text-slate-400">คั่นคอลัมน์ด้วย Tab ตามลำดับ Template</span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="วางแถวข้อมูลจาก Excel ที่นี่ (กด Ctrl+V / Cmd+V)..."
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-cyan-600"
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
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-50 cursor-pointer shadow-xs"
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
                    ? `ผ่านการตรวจสอบความถูกต้องเรียบร้อย (${validatedRows.length} งานนั่งร้านพร้อมบันทึก)`
                    : `Data Validated Successfully (${validatedRows.length} Scaffolding Jobs Ready to Ingest)`}
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
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-700/30 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                <span>
                  {isTh
                    ? `ยืนยันนำเข้าข้อมูล (${validatedRows.length} งานนั่งร้าน)`
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
            <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 text-cyan-800 dark:text-cyan-300">
              <span className="text-xs font-semibold">{isTh ? 'ผู้รับเหมานั่งร้าน' : 'Contractors'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.company))).join(', ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300">
              <span className="text-xs font-semibold">{isTh ? 'โรงกลั่นเป้าหมาย' : 'Plants'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.plant))).join(', ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">{isTh ? 'ประเภทนั่งร้าน' : 'Scaffold Types'}</span>
              <p className="text-xs font-bold mt-1 text-slate-800 dark:text-slate-200">
                {Array.from(new Set(validatedRows.map(r => r.scaffoldType.split(' ')[0]))).join(', ')}
              </p>
            </div>
          </div>

          {/* Compact Verified Preview List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {isTh ? 'ตัวอย่างรายการที่พร้อมบันทึก (Preview):' : 'Validated Jobs Preview:'}
            </span>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {validatedRows.slice(0, 5).map((row, idx) => (
                <div key={row.id} className="p-3 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 font-bold w-6">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-cyan-700 dark:text-cyan-400">{row.jobId}</strong>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.equipmentTag}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">{row.scaffoldType}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{row.jobDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-bold">{row.company}</span>
                    <span>{row.width}×{row.length}×{row.height}m</span>
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
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white shadow-md cursor-pointer"
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
