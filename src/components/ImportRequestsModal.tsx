import React, { useState } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, CheckCircle2, 
  AlertTriangle, Truck, Check, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  UnifiedCraneJob, 
  getAllCraneJobs, 
  saveAllCraneJobs, 
  addCraneAuditLog,
  CraneRequestType,
  CraneRequestStatus,
  CraneAssignmentStatus
} from '../data/craneOperationsData';
import { useLanguage } from '../context/LanguageContext';

interface ImportRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (importedCount: number) => void;
  onImportSuccess?: () => void;
}

export default function ImportRequestsModal({
  isOpen,
  onClose,
  onSuccess,
  onImportSuccess
}: ImportRequestsModalProps) {
  const { isTh } = useLanguage();
  const [step, setStep] = useState<number>(1); // 1: Upload, 2: Preview & Confirm
  const [validatedRows, setValidatedRows] = useState<Array<{
    record: Partial<UnifiedCraneJob>;
    isValid: boolean;
    errors: string[];
    isDuplicate: boolean;
  }>>([]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Request No.': 'REQ-CR26-9001',
        'Job No.': 'ICM-2609001',
        'Plant': 'Phra Khanong',
        'Unit': '11-APS1 (Atmospheric Pipestill 1)',
        'Location': 'BCP Refinery Area 1 (CDU-1)',
        'Request Type': 'CR01',
        'Equipment Type': 'Overhead Condenser Exchanger',
        'Load Description': 'Heavy lift exchanger replacement during turnaround',
        'Load Weight (Ton)': 45,
        'Rigging Weight (Ton)': 4,
        'Working Radius (m)': 22,
        'Required Hook Height (m)': 32,
        'Planned Date': '2026-09-28',
        'Planned Time': '08:00 - 16:00',
        'Priority': 'High',
        'Contractor': 'Contractor Heavy Lift Solutions'
      },
      {
        'Request No.': 'REQ-CR26-9002',
        'Job No.': 'ICM-2609002',
        'Plant': 'Sriracha',
        'Unit': 'Sriracha Crude Complex',
        'Location': 'Sriracha Terminal Complex',
        'Request Type': 'CR02',
        'Equipment Type': 'Furnace Burner Spool',
        'Load Description': 'Furnace module lifting & maintenance',
        'Load Weight (Ton)': 28,
        'Rigging Weight (Ton)': 2,
        'Working Radius (m)': 18,
        'Required Hook Height (m)': 25,
        'Planned Date': '2026-09-29',
        'Planned Time': '09:00 - 15:00',
        'Priority': 'Normal',
        'Contractor': 'BCP Operations (Owner Crane)'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requests_Template');
    XLSX.writeFile(wb, 'BCP_Crane_Requests_Template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        validateRequests(data);
        setStep(2);
      } catch (err) {
        alert(isTh ? 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel' : 'Error reading file');
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateRequests = (rows: any[]) => {
    const existing = getAllCraneJobs();
    const existingReqMap = new Set(existing.map(j => (j.requestNo || '').toLowerCase().trim()));
    const existingJobMap = new Set(existing.map(j => (j.jobNo || '').toLowerCase().trim()));
    const seenReqNos = new Set<string>();

    const results = rows.map((r, i) => {
      const errors: string[] = [];
      const reqNo = String(r['Request No.'] || r['Request No'] || `REQ-CR26-${String(9000 + i)}`).trim();
      const jobNo = String(r['Job No.'] || r['Job No'] || `ICM-260${String(9000 + i)}`).trim();

      if (!reqNo) {
        errors.push('Request No. missing');
      } else if (seenReqNos.has(reqNo.toLowerCase())) {
        errors.push('Duplicate Request No. in import file');
      }
      seenReqNos.add(reqNo.toLowerCase());

      const loadWeight = Number(r['Load Weight (Ton)'] || r['Load Weight'] || 0);
      if (isNaN(loadWeight) || loadWeight <= 0) {
        errors.push('Valid Load Weight required');
      }

      const radius = Number(r['Working Radius (m)'] || r['Radius'] || 0);
      if (isNaN(radius) || radius <= 0) {
        errors.push('Valid Working Radius required');
      }

      const isDuplicate = existingReqMap.has(reqNo.toLowerCase()) || existingJobMap.has(jobNo.toLowerCase());

      const load = loadWeight || 25;
      const rigging = Number(r['Rigging Weight (Ton)'] || 2);
      const gross = load + rigging;

      const record: Partial<UnifiedCraneJob> = {
        id: Math.floor(260900 + Math.random() * 8000),
        requestNo: reqNo,
        jobNo: jobNo,
        plant: String(r['Plant'] || 'Phra Khanong') === 'Sriracha' ? 'Sriracha' : 'Phra Khanong',
        unit: String(r['Unit'] || '11-APS1'),
        area: String(r['Location'] || 'BCP Refinery Area 1'),
        requestType: (r['Request Type'] || 'CR01') as CraneRequestType,
        equipmentType: String(r['Equipment Type'] || 'Heavy Equipment'),
        description: String(r['Load Description'] || 'Lifting operation from Excel import'),
        loadWeightTon: load,
        riggingWeightTon: rigging,
        grossLoadTon: gross,
        capacity: Math.max(50, Math.round(gross * 1.5)),
        workingRadiusM: radius || 18,
        requiredHookHeightM: Number(r['Required Hook Height (m)'] || 25),
        date: String(r['Planned Date'] || '2026-09-28'),
        time: String(r['Planned Time'] || '08:00 - 16:00'),
        dateFrom: `${r['Planned Date'] || '2026-09-28'} 08:00`,
        contractor: String(r['Contractor'] || 'BCP Operations (Owner Crane)'),
        providerType: String(r['Contractor'] || '').toLowerCase().includes('contractor') ? 'Contractor Crane' : 'Owner Crane',
        craneType: gross > 80 ? 'Crane Spot' : 'Mobile Crane',
        priority: (r['Priority'] || 'High') as any,
        requestStatus: 'Submitted' as CraneRequestStatus,
        assignmentStatus: 'Unassigned' as CraneAssignmentStatus,
        status: 'Requested',
        progress: 0,
        x: 35.0,
        y: 45.0,
        createdAt: new Date().toISOString()
      };

      return {
        record,
        isValid: errors.length === 0,
        errors,
        isDuplicate
      };
    });

    setValidatedRows(results);
  };

  const handleConfirm = () => {
    const existing = getAllCraneJobs();
    const validImports = validatedRows.filter(r => r.isValid && !r.isDuplicate).map(r => r.record as UnifiedCraneJob);

    if (validImports.length === 0) {
      alert(isTh ? 'ไม่มีรายการที่สามารถนำเข้าได้' : 'No valid records to import');
      return;
    }

    const updated = [...validImports, ...existing];
    saveAllCraneJobs(updated);

    addCraneAuditLog({
      action: 'Import Requests',
      jobNo: 'BULK-IMPORT',
      user: 'Rigging Superintendent',
      role: 'Planner',
      newValue: `Imported ${validImports.length} requests via Excel.`
    });

    onSuccess?.(validImports.length);
    onImportSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {isTh ? 'นำเข้าคำขอใช้งานเครนผ่าน Excel (Import Requests Wizard)' : 'Import Requests via Excel'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTh ? 'ดาวน์โหลด Template, อัปโหลด และตรวจสอบความถูกต้องของคำขอก่อนบันทึก' : 'Download template, upload, validate, and batch import'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-left flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-0.5">
                    {isTh ? 'ดาวน์โหลดไฟล์แม่แบบคำขอ (Request Excel Template)' : 'Download Requests Template'}
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">
                    {isTh ? 'ระบุคอลัมน์มาตรฐาน: Request No, Job No, Plant, Unit, Request Type (CR01-CR06), Load Weight, Radius, ฯลฯ' : 'Standard template for batch crane requests'}
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download .xlsx</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center transition-all bg-slate-50/50 dark:bg-slate-900/50">
                <Upload size={36} className="text-blue-500 mb-3 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {isTh ? 'เลือกไฟล์ Excel สำหรับนำเข้าคำขอ' : 'Select Excel file to upload'}
                </h4>
                <p className="text-xs text-slate-400 mb-4">รองรับไฟล์ .xlsx หรือ .csv</p>
                <label className="px-5 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">
                  <span>{isTh ? 'ค้นหาไฟล์' : 'Browse File'}</span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <div className="flex items-center gap-4">
                  <span>{isTh ? 'รายการทั้งหมด:' : 'Total:'} {validatedRows.length}</span>
                  <span className="text-emerald-600">✓ {validatedRows.filter(r => r.isValid && !r.isDuplicate).length} {isTh ? 'นำเข้าได้' : 'Valid'}</span>
                  <span className="text-red-500">✕ {validatedRows.filter(r => !r.isValid).length} {isTh ? 'ไม่ผ่าน' : 'Invalid'}</span>
                  <span className="text-amber-500">⚠ {validatedRows.filter(r => r.isDuplicate).length} {isTh ? 'ข้อมูลซ้ำ' : 'Duplicates'}</span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-2">Status</th>
                      <th className="p-2">Request No.</th>
                      <th className="p-2">Job No.</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Gross Load</th>
                      <th className="p-2">Radius</th>
                      <th className="p-2">Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validatedRows.map((item, idx) => (
                      <tr key={idx} className={!item.isValid ? 'bg-red-50/50 dark:bg-red-950/20' : item.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                        <td className="p-2 font-bold">
                          {item.isValid && !item.isDuplicate ? (
                            <span className="text-emerald-600">✓ Ready</span>
                          ) : item.isDuplicate ? (
                            <span className="text-amber-600">⚠ Duplicate</span>
                          ) : (
                            <span className="text-red-500">✕ Error</span>
                          )}
                        </td>
                        <td className="p-2 font-mono font-bold text-blue-600">{item.record.requestNo}</td>
                        <td className="p-2 font-mono">{item.record.jobNo}</td>
                        <td className="p-2">{item.record.requestType}</td>
                        <td className="p-2 font-mono font-bold">{item.record.grossLoadTon}T</td>
                        <td className="p-2 font-mono">{item.record.workingRadiusM}m</td>
                        <td className="p-2 text-[11px]">
                          {item.errors.length > 0 ? (
                            <span className="text-red-600 font-medium">{item.errors.join(', ')}</span>
                          ) : item.isDuplicate ? (
                            <span className="text-amber-600 font-medium">Request or Job No already exists</span>
                          ) : (
                            <span className="text-emerald-600">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                {isTh ? 'เลือกไฟล์ใหม่' : 'Re-upload'}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={validatedRows.filter(r => r.isValid && !r.isDuplicate).length === 0}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
              >
                {isTh ? `ยืนยันการนำเข้า (${validatedRows.filter(r => r.isValid && !r.isDuplicate).length} รายการ)` : `Confirm Import (${validatedRows.filter(r => r.isValid && !r.isDuplicate).length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
