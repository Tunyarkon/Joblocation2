import React, { useState } from 'react';
import { 
  X, Plus, FileText, Calendar, Clock, MapPin, 
  Truck, HardHat, ShieldCheck, AlertCircle, Sparkles, Building2
} from 'lucide-react';
import { 
  addCraneJob, 
  UnifiedCraneJob, 
  CraneRequestType, 
  CraneTypeOption 
} from '../data/craneOperationsData';
import { useLanguage } from '../context/LanguageContext';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newJob: UnifiedCraneJob) => void;
  onCreated?: (newJob: UnifiedCraneJob) => void;
  isScaffolding?: boolean;
}

export default function CreateRequestModal({
  isOpen,
  onClose,
  onSuccess,
  onCreated,
  isScaffolding = false
}: CreateRequestModalProps) {
  const { isTh } = useLanguage();
  const [activeStep, setActiveStep] = useState<number>(1); // 1: General, 2: Lifting, 3: Site & Docs

  const nextJobId = Math.floor(260100 + Math.random() * 8900);
  const autoReqNo = `REQ-CR26-${String(nextJobId).slice(-4)}`;
  const autoJobNo = `ICM-26${String(nextJobId).slice(-5)}`;

  // Form State
  const [requestNo, setRequestNo] = useState(autoReqNo);
  const [jobNo, setJobNo] = useState(autoJobNo);
  const [plant, setPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [unit, setUnit] = useState('11-APS1 (Atmospheric Pipestill 1)');
  const [area, setArea] = useState('BCP Refinery Area 1 (CDU-1)');
  const [requestType, setRequestType] = useState<CraneRequestType>('CR01');
  const [requester, setRequester] = useState('Wichai Somkid (Turnaround Rigging Lead)');
  const [department, setDepartment] = useState('Maintenance & Turnaround Operations');
  const [contractor, setContractor] = useState('Contractor Heavy Lift Solutions');

  // Lifting Requirements
  const [equipmentType, setEquipmentType] = useState('Crude Distillation Column Overhead');
  const [loadDescription, setLoadDescription] = useState('Column top exchanger bundle and piping spool replacement');
  const [loadWeightTon, setLoadWeightTon] = useState<number>(45);
  const [riggingWeightTon, setRiggingWeightTon] = useState<number>(4);
  const [workingRadiusM, setWorkingRadiusM] = useState<number>(24);
  const [requiredHookHeightM, setRequiredHookHeightM] = useState<number>(36);
  const [plannedDate, setPlannedDate] = useState('2026-09-28');
  const [plannedTimeFrom, setPlannedTimeFrom] = useState('08:00');
  const [plannedTimeTo, setPlannedTimeTo] = useState('16:00');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Normal' | 'Low' | 'Critical'>('High');

  // Site Information
  const [gridReference, setGridReference] = useState('GRID-A01-C4');
  const [siteConstraints, setSiteConstraints] = useState('Overhead hydrocarbon pipe rack clearance required.');
  const [safetyNotes, setSafetyNotes] = useState('Soil compaction and timber mat verification mandatory.');

  const grossLoadTon = Number(loadWeightTon || 0) + Number(riggingWeightTon || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const created = addCraneJob({
      id: nextJobId,
      jobNo,
      requestNo,
      requestType,
      requestStatus: 'Submitted',
      assignmentStatus: 'Unassigned',
      plant,
      unit: unit.split(' ')[0],
      functionalLocation: unit,
      area,
      description: loadDescription,
      equipmentType,
      capacity: Math.max(50, Math.round(grossLoadTon * 1.5)),
      craneType: grossLoadTon > 80 ? 'Crane Spot' : 'Mobile Crane',
      providerType: contractor.toLowerCase().includes('contractor') ? 'Contractor Crane' : 'Owner Crane',
      contractor,
      requester,
      department,
      dateFrom: `${plannedDate} ${plannedTimeFrom}`,
      date: plannedDate,
      time: `${plannedTimeFrom} - ${plannedTimeTo}`,
      priority,
      status: 'Requested',
      loadDescription,
      loadWeightTon,
      riggingWeightTon,
      grossLoadTon,
      workingRadiusM,
      requiredHookHeightM,
      gridReference,
      siteConstraints,
      safetyNotes,
      x: 35.0,
      y: 40.0
    });

    onSuccess?.(created);
    onCreated?.(created);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {isTh ? 'สร้างคำขอใช้งานเครนใหม่ (Create Crane Request)' : 'Create Crane Request'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTh ? 'บันทึกคำขอ CR01-CR06 และข้อกำหนดการยกสำหรับจัดสรรเครน' : 'Record lifting requirements for central crane registry'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/30 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${
              activeStep === 1 ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'
            }`}
          >
            1. {isTh ? 'ข้อมูลทั่วไป' : 'General Info'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${
              activeStep === 2 ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'
            }`}
          >
            2. {isTh ? 'สเปกและพิกัดยก' : 'Lifting Specs'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`py-3 px-2 text-center transition-all cursor-pointer border-b-2 ${
              activeStep === 3 ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'
            }`}
          >
            3. {isTh ? 'พื้นที่และความปลอดภัย' : 'Site & Safety'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'หมายเลขคำขอ (Request No. - Auto)' : 'Request No. (Auto)'}
                  </label>
                  <input
                    type="text"
                    value={requestNo}
                    onChange={(e) => setRequestNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'รหัสงาน (Job No. / Work Order)' : 'Job No. / Work Order'}
                  </label>
                  <input
                    type="text"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'โรงงาน (Plant)' : 'Plant'}
                  </label>
                  <select
                    value={plant}
                    onChange={(e) => setPlant(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <option value="Phra Khanong">Phra Khanong</option>
                    <option value="Sriracha">Sriracha</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ประเภทคำขอ (Request Type CR01-CR06)' : 'Request Type (CR01-CR06)'}
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-blue-600"
                  >
                    <option value="CR01">CR01 - Heavy Lift Over 300T</option>
                    <option value="CR02">CR02 - Process Unit Critical Lift (100T - 300T)</option>
                    <option value="CR03">CR03 - Standard Maintenance Lift (50T - 100T)</option>
                    <option value="CR04">CR04 - Compact / City Crane Lift (&lt;50T)</option>
                    <option value="CR05">CR05 - Auxiliary / Rigging Pull</option>
                    <option value="CR06">CR06 - Emergency Unscheduled Lift</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'หน่วยผลิต (Unit / Location)' : 'Unit / Location'}
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ผู้รับเหมา / ทีมปฏิบัติการ' : 'Contractor'}
                  </label>
                  <input
                    type="text"
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ผู้ขอใช้งาน (Requester)' : 'Requester'}
                </label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ประเภทอุปกรณ์ที่จะยก (Equipment Type)' : 'Equipment Type'}
                </label>
                <input
                  type="text"
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                  placeholder="Distillation Column / Exchanger Bundle"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'รายละเอียดกิจกรรมการยก (Load Description)' : 'Load Description'}
                </label>
                <textarea
                  rows={2}
                  value={loadDescription}
                  onChange={(e) => setLoadDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'น้ำหนักชิ้นงาน (ตัน)' : 'Net Load (Ton)'}
                  </label>
                  <input
                    type="number"
                    value={loadWeightTon}
                    onChange={(e) => setLoadWeightTon(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'น้ำหนักสลิง/อุปกรณ์ (ตัน)' : 'Rigging (Ton)'}
                  </label>
                  <input
                    type="number"
                    value={riggingWeightTon}
                    onChange={(e) => setRiggingWeightTon(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                    {isTh ? 'น้ำหนักยกรวม (Gross Load)' : 'Gross Load (Ton)'}
                  </label>
                  <div className="w-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs font-mono font-black text-indigo-700 dark:text-indigo-300">
                    {grossLoadTon} T
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'รัศมีการทำงานที่ต้องการ (Radius - m)' : 'Working Radius (m)'}
                  </label>
                  <input
                    type="number"
                    value={workingRadiusM}
                    onChange={(e) => setWorkingRadiusM(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'ความสูงตะขอที่ต้องการ (Hook Height - m)' : 'Hook Height (m)'}
                  </label>
                  <input
                    type="number"
                    value={requiredHookHeightM}
                    onChange={(e) => setRequiredHookHeightM(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'วันที่กำหนด' : 'Planned Date'}
                  </label>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'เวลาเริ่ม' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={plannedTimeFrom}
                    onChange={(e) => setPlannedTimeFrom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTh ? 'เวลาสิ้นสุด' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={plannedTimeTo}
                    onChange={(e) => setPlannedTimeTo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'พิกัดผัง (Plot Plan Grid Reference)' : 'Grid Reference'}
                </label>
                <input
                  type="text"
                  value={gridReference}
                  onChange={(e) => setGridReference(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  placeholder="GRID-A01-C4"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ข้อจำกัดพื้นที่หน้างาน (Site Constraints)' : 'Site Constraints'}
                </label>
                <textarea
                  rows={2}
                  value={siteConstraints}
                  onChange={(e) => setSiteConstraints(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'ข้อกำหนดความปลอดภัยเฉพาะ (Safety Notes)' : 'Safety Notes'}
                </label>
                <textarea
                  rows={2}
                  value={safetyNotes}
                  onChange={(e) => setSafetyNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(p => p - 1)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  {isTh ? 'ย้อนกลับ' : 'Back'}
                </button>
              )}
              {activeStep < 3 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(p => p + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white cursor-pointer"
                >
                  {isTh ? 'ถัดไป' : 'Next'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 cursor-pointer"
              >
                {isTh ? 'ส่งคำขอใช้งาน (Submit Request)' : 'Submit Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
