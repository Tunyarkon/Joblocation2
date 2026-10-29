import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Building, DollarSign, User, AlertTriangle, 
  CheckCircle2, Clock, CalendarPlus, FileText, ChevronRight,
  TrendingUp, ShieldAlert, AlertCircle, History, Info, MapPin
} from 'lucide-react';
import { 
  ScaffoldingItem, 
  calculateScaffoldMetrics, 
  SYSTEM_CURRENT_DATE,
  getDiffInDays
} from '../../data/scaffoldingData';
import { useLanguage } from '../../context/LanguageContext';
export { ScaffoldPlotPlanModal } from './ScaffoldPlotPlanModal';

// Available Job IDs from system
const SYSTEM_JOB_OPTIONS = [
  { id: 'JOB-PK-2601', title: 'CDU-1 Column C-101 Tray Maintenance & Nozzle Welding', plant: 'Phra Khanong' },
  { id: 'JOB-SR-2604', title: 'Furnace F-201 Burner Overhaul & Refractory Reline', plant: 'Sriracha' },
  { id: 'JOB-PK-2608', title: 'Crude Unit Exchanger E-104 Bundle Replacement', plant: 'Phra Khanong' },
  { id: 'JOB-SR-2612', title: 'Tank Farm B TK-502 Ultrasonic Shell Inspection', plant: 'Sriracha' },
  { id: 'JOB-PK-2615', title: 'Pipe Rack Bay PR-14 to PR-16 Steam Insulation', plant: 'Phra Khanong' },
  { id: 'JOB-PK-2620', title: 'Fin-Fan Cooler Platform Air Bank 3 Servicing', plant: 'Phra Khanong' },
  { id: 'JOB-SR-2625', title: 'Boiler B-301 Stack Flue Gas Damper Actuator', plant: 'Sriracha' },
];

const CONTRACTOR_OPTIONS = [
  'Thai Industrial Scaffolding',
  'Siam Scaffold & Engineering',
  'Advance Access Co., Ltd.',
  'Summit Scaffolding Service'
];

const AREA_OPTIONS_PK = [
  'Area 01 - CDU-1',
  'Crude Distillation Unit',
  'Pipe Rack Corridor East',
  'Flare System KOD',
  'Storage & Offsite Yard'
];

const AREA_OPTIONS_SR = [
  'Area 02 - Furnace',
  'Tank Farm B',
  'Area 03 - Utilities',
  'Hydrocracking Complex (HCU)',
  'Marine Terminal Jetty'
];

// =========================================================================
// 1. ADD / EDIT SCAFFOLDING MODAL
// =========================================================================
interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ScaffoldingItem, 'extensionHistory' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: ScaffoldingItem | null;
  existingIds: string[];
}

export const AddEditScaffoldModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingIds
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [scaffoldId, setScaffoldId] = useState('');
  const [jobId, setJobId] = useState('JOB-PK-2601');
  const [plant, setPlant] = useState<'Phra Khanong' | 'Sriracha'>('Phra Khanong');
  const [area, setArea] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [contractor, setContractor] = useState(CONTRACTOR_OPTIONS[0]);
  const [rentalStartDate, setRentalStartDate] = useState(SYSTEM_CURRENT_DATE);
  const [plannedOffHireDate, setPlannedOffHireDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [dailyRentalRate, setDailyRentalRate] = useState<number>(2500);
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [remark, setRemark] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setScaffoldId(initialData.id);
      setJobId(initialData.jobId);
      setPlant(initialData.plant);
      setArea(initialData.area);
      setLocationDetails(initialData.locationDetails || '');
      setContractor(initialData.contractor);
      setRentalStartDate(initialData.rentalStartDate);
      setPlannedOffHireDate(initialData.plannedOffHireDate);
      setDailyRentalRate(initialData.dailyRentalRate);
      setResponsiblePerson(initialData.responsiblePerson);
      setRemark(initialData.remark || '');
    } else {
      // Auto-generate ID: next ID based on existing items
      const nextNum = existingIds.length + 1;
      setScaffoldId(`SCF-2026-${String(nextNum).padStart(3, '0')}`);
      setJobId(SYSTEM_JOB_OPTIONS[0].id);
      setPlant('Phra Khanong');
      setArea(AREA_OPTIONS_PK[0]);
      setLocationDetails('');
      setContractor(CONTRACTOR_OPTIONS[0]);
      setRentalStartDate(SYSTEM_CURRENT_DATE);
      setPlannedOffHireDate('2026-10-31');
      setDailyRentalRate(2500);
      setResponsiblePerson('Somchai Prasert (Field Inspector)');
      setRemark('');
    }
    setErrors({});
  }, [initialData, isOpen, existingIds]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!scaffoldId.trim()) {
      newErrors.scaffoldId = isTh ? 'กรุณาระบุรหัสนั่งร้าน' : 'Scaffold ID is required';
    } else if (!initialData && existingIds.includes(scaffoldId.trim())) {
      newErrors.scaffoldId = isTh ? 'รหัสนั่งร้านนี้มีอยู่ในระบบแล้ว' : 'Scaffold ID already exists';
    }

    if (!jobId.trim()) newErrors.jobId = isTh ? 'กรุณาเลือก Job' : 'Job ID is required';
    if (!area.trim()) newErrors.area = isTh ? 'กรุณาระบุพื้นที่ติดตั้ง' : 'Area is required';
    if (!contractor.trim()) newErrors.contractor = isTh ? 'กรุณาเลือกผู้รับเหมา' : 'Contractor is required';
    if (!rentalStartDate) newErrors.rentalStartDate = isTh ? 'กรุณาระบุวันเริ่มเช่า' : 'Start date required';
    if (!plannedOffHireDate) newErrors.plannedOffHireDate = isTh ? 'กรุณาระบุวันครบกำหนด' : 'Planned date required';

    if (rentalStartDate && plannedOffHireDate && plannedOffHireDate < rentalStartDate) {
      newErrors.plannedOffHireDate = isTh 
        ? 'วันครบกำหนด Off-Hire ต้องไม่ก่อนวันเริ่มเช่า' 
        : 'Planned Off-Hire date cannot be earlier than start date';
    }

    if (dailyRentalRate === undefined || dailyRentalRate === null || dailyRentalRate < 0) {
      newErrors.dailyRentalRate = isTh ? 'อัตราค่าเช่าต้องไม่ติดลบ' : 'Rate cannot be negative';
    }

    if (!responsiblePerson.trim()) {
      newErrors.responsiblePerson = isTh ? 'กรุณาระบุผู้รับผิดชอบ' : 'Responsible person is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      id: scaffoldId.trim(),
      jobId,
      plant,
      area: area.trim(),
      locationDetails: locationDetails.trim() || undefined,
      contractor,
      rentalStartDate,
      plannedOffHireDate,
      actualOffHireDate: initialData?.actualOffHireDate || null,
      dailyRentalRate: Number(dailyRentalRate),
      responsiblePerson: responsiblePerson.trim(),
      remark: remark.trim() || undefined
    });
    onClose();
  };

  const estimatedDays = plannedOffHireDate && rentalStartDate 
    ? Math.max(1, getDiffInDays(plannedOffHireDate, rentalStartDate) + 1)
    : 0;
  const estimatedCost = estimatedDays * (dailyRentalRate || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {initialData 
                  ? (isTh ? 'แก้ไขข้อมูลการเช่านั่งร้าน' : 'Edit Scaffolding Record')
                  : (isTh ? 'บันทึกการใช้งานนั่งร้านใหม่' : 'Register New Scaffolding Rental')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTh ? 'ระบบติดตามกำหนด Off-Hire และคำนวณค่าเช่าส่วนเกิน' : 'Scaffold tracking, duration and rental rate configuration'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Row 1: ID & Job */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'รหัสนั่งร้าน (Scaffold ID) *' : 'Scaffold ID *'}
              </label>
              <input
                type="text"
                value={scaffoldId}
                onChange={e => setScaffoldId(e.target.value)}
                disabled={Boolean(initialData)}
                placeholder="SCF-2026-XXX"
                className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border ${
                  errors.scaffoldId 
                    ? 'border-rose-500 bg-rose-50/30 text-rose-700' 
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                } focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-75`}
              />
              {errors.scaffoldId && <p className="text-[11px] text-rose-500 mt-1">{errors.scaffoldId}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'Job ID ที่เกี่ยวข้อง *' : 'Associated Job ID *'}
              </label>
              <select
                value={jobId}
                onChange={e => {
                  setJobId(e.target.value);
                  const selectedJob = SYSTEM_JOB_OPTIONS.find(j => j.id === e.target.value);
                  if (selectedJob) setPlant(selectedJob.plant as any);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {SYSTEM_JOB_OPTIONS.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.id} - {j.title.substring(0, 42)}... ({j.plant})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Plant & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'โรงงาน (Plant) *' : 'Plant *'}
              </label>
              <select
                value={plant}
                onChange={e => {
                  const p = e.target.value as 'Phra Khanong' | 'Sriracha';
                  setPlant(p);
                  setArea(p === 'Phra Khanong' ? AREA_OPTIONS_PK[0] : AREA_OPTIONS_SR[0]);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="Phra Khanong">Phra Khanong (PK)</option>
                <option value="Sriracha">Sriracha (SR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'พื้นที่ติดตั้ง (Area / Unit) *' : 'Area / Unit *'}
              </label>
              <input
                type="text"
                list="area-suggestions"
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="e.g. Area 01 - CDU-1"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  errors.area 
                    ? 'border-rose-500 bg-rose-50/30' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                } text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500`}
              />
              <datalist id="area-suggestions">
                {(plant === 'Phra Khanong' ? AREA_OPTIONS_PK : AREA_OPTIONS_SR).map(a => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              {errors.area && <p className="text-[11px] text-rose-500 mt-1">{errors.area}</p>}
            </div>
          </div>

          {/* Location details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'ตำแหน่งระบุเจาะจงหน้างาน (Location Specifics)' : 'Specific Location / Elevation'}
            </label>
            <input
              type="text"
              value={locationDetails}
              onChange={e => setLocationDetails(e.target.value)}
              placeholder="e.g. Column C-101 North Platform, Elev +18.5m"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Row 3: Contractor & Daily Rental Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'ผู้รับเหมานั่งร้าน (Contractor) *' : 'Contractor *'}
              </label>
              <select
                value={contractor}
                onChange={e => setContractor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {CONTRACTOR_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'อัตราค่าเช่าต่อวัน (THB/วัน) *' : 'Daily Rental Rate (THB/Day) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">฿</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={dailyRentalRate}
                  onChange={e => setDailyRentalRate(Number(e.target.value))}
                  placeholder="2500"
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-xl border ${
                    errors.dailyRentalRate 
                      ? 'border-rose-500 bg-rose-50/30' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  } text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500`}
                />
              </div>
              {errors.dailyRentalRate && <p className="text-[11px] text-rose-500 mt-1">{errors.dailyRentalRate}</p>}
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'วันที่เริ่มเช่า (Rental Start Date) *' : 'Rental Start Date *'}
              </label>
              <input
                type="date"
                value={rentalStartDate}
                onChange={e => setRentalStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {errors.rentalStartDate && <p className="text-[11px] text-rose-500 mt-1">{errors.rentalStartDate}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isTh ? 'วันที่กำหนด Off-Hire (Planned Off-Hire) *' : 'Planned Off-Hire Date *'}
              </label>
              <input
                type="date"
                value={plannedOffHireDate}
                onChange={e => setPlannedOffHireDate(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  errors.plannedOffHireDate 
                    ? 'border-rose-500 bg-rose-50/30' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                } text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500`}
              />
              {errors.plannedOffHireDate && <p className="text-[11px] text-rose-500 mt-1">{errors.plannedOffHireDate}</p>}
            </div>
          </div>

          {/* Cost preview banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <TrendingUp size={16} />
              <span>{isTh ? 'ระยะเวลาเช่าตามแผน:' : 'Planned Duration:'} <strong>{estimatedDays} {isTh ? 'วัน' : 'days'}</strong></span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isTh ? 'ค่าเช่าประมาณการตามสัญญา' : 'Est. Contract Rental'}</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm font-mono">฿{estimatedCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Responsible person */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'ผู้รับผิดชอบการใช้งานนั่งร้าน *' : 'Responsible Person *'}
            </label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={e => setResponsiblePerson(e.target.value)}
              placeholder="e.g. Somchai Prasert (Field Inspector)"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                errors.responsiblePerson 
                  ? 'border-rose-500 bg-rose-50/30' 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              } text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500`}
            />
            {errors.responsiblePerson && <p className="text-[11px] text-rose-500 mt-1">{errors.responsiblePerson}</p>}
          </div>

          {/* Remark */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'หมายเหตุเพิ่มเติม (Remark - ไม่บังคับ)' : 'Remark (Optional)'}
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="e.g. Tower scaffold for tray maintenance and nozzle welding"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{initialData ? (isTh ? 'บันทึกการแก้ไข' : 'Save Changes') : (isTh ? 'บันทึกคำขอใหม่' : 'Create Scaffold')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// =========================================================================
// 2. EXTEND OFF-HIRE MODAL
// =========================================================================
interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  scaffold: ScaffoldingItem | null;
  onConfirm: (scaffoldId: string, newOffHireDate: string, reason: string) => void;
}

export const ExtendOffHireModal: React.FC<ExtendModalProps> = ({
  isOpen,
  onClose,
  scaffold,
  onConfirm
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [newOffHireDate, setNewOffHireDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (scaffold) {
      // Default to current planned off-hire date + 7 days
      const currentPlanned = new Date(scaffold.plannedOffHireDate);
      currentPlanned.setDate(currentPlanned.getDate() + 7);
      setNewOffHireDate(currentPlanned.toISOString().split('T')[0]);
      setReason('');
      setError('');
    }
  }, [scaffold, isOpen]);

  if (!isOpen || !scaffold) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffHireDate) {
      setError(isTh ? 'กรุณาระบุวันที่ขยายเวลา' : 'New date required');
      return;
    }
    if (newOffHireDate <= scaffold.plannedOffHireDate) {
      setError(isTh ? 'วันที่ขยายเวลาใหม่ต้องอยู่หลังวันกำหนดเดิม' : 'New date must be after current planned date');
      return;
    }
    if (!reason.trim()) {
      setError(isTh ? 'กรุณาระบุเหตุผลในการขยายเวลา' : 'Reason for extension is required');
      return;
    }

    onConfirm(scaffold.id, newOffHireDate, reason.trim());
    onClose();
  };

  const addedDays = newOffHireDate && scaffold.plannedOffHireDate 
    ? Math.max(0, getDiffInDays(newOffHireDate, scaffold.plannedOffHireDate))
    : 0;
  const addedCost = addedDays * scaffold.dailyRentalRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <CalendarPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isTh ? 'ขยายระยะเวลาการเช่านั่งร้าน' : 'Extend Scaffolding Rental'}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-mono font-semibold">
                {scaffold.id} ({scaffold.contractor})
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">{isTh ? 'รหัสนั่งร้าน (Scaffold ID)' : 'Scaffold ID'}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{scaffold.id}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">{isTh ? 'อัตราค่าเช่าต่อวัน' : 'Daily Rate'}</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">฿{scaffold.dailyRentalRate.toLocaleString()}/วัน</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 flex justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">{isTh ? 'วันครบกำหนดปัจจุบัน' : 'Current Due Date'}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{scaffold.plannedOffHireDate}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">{isTh ? 'พื้นที่ติดตั้ง' : 'Area / Location'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px] inline-block">{scaffold.area}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'วันครบกำหนด Off-Hire ใหม่ (New Off-Hire Date) *' : 'New Planned Off-Hire Date *'}
            </label>
            <input
              type="date"
              min={scaffold.plannedOffHireDate}
              value={newOffHireDate}
              onChange={e => setNewOffHireDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono font-bold"
            />
          </div>

          {/* Extension Cost Preview */}
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-cyan-900 dark:text-cyan-300 font-semibold block">
                {isTh ? `ขยายเวลาเพิ่ม: +${addedDays} วัน` : `Extended by: +${addedDays} Days`}
              </span>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400">
                {isTh ? `คำนวณตามอัตรา ฿${scaffold.dailyRentalRate.toLocaleString()}/วัน` : `@ ฿${scaffold.dailyRentalRate.toLocaleString()}/day`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{isTh ? 'ค่าเช่าที่เพิ่มขึ้น' : 'Estimated Cost Add'}</span>
              <span className="font-mono font-extrabold text-cyan-800 dark:text-cyan-400 text-sm">+฿{addedCost.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'เหตุผลในการขยายเวลา (Reason for Extension) *' : 'Reason for Extension *'}
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isTh ? 'เช่น ตรวจสอบแนวเชื่อม NDT ล่าช้ากว่าแผน หรือมีงานเก็บ Punch List เพิ่มเติม...' : 'e.g., Additional inspection punch items or weather delay...'}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CalendarPlus size={15} />
              <span>{isTh ? 'ยืนยันการขยายเวลา' : 'Confirm Extension'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// =========================================================================
// 3. CONFIRM OFF-HIRE MODAL
// =========================================================================
interface ConfirmOffHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  scaffold: ScaffoldingItem | null;
  onConfirm: (scaffoldId: string, actualOffHireDate: string, remark?: string) => void;
}

export const ConfirmOffHireModal: React.FC<ConfirmOffHireModalProps> = ({
  isOpen,
  onClose,
  scaffold,
  onConfirm
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [actualOffHireDate, setActualOffHireDate] = useState(SYSTEM_CURRENT_DATE);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (scaffold) {
      setActualOffHireDate(SYSTEM_CURRENT_DATE);
      setRemark('');
      setError('');
    }
  }, [scaffold, isOpen]);

  if (!isOpen || !scaffold) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualOffHireDate) {
      setError(isTh ? 'กรุณาระบุวันที่สิ้นสุดการเช่าจริง' : 'Actual date is required');
      return;
    }
    if (actualOffHireDate < scaffold.rentalStartDate) {
      setError(isTh ? 'วันที่ Off-Hire ต้องไม่ก่อนวันเริ่มเช่า' : 'Off-Hire date cannot precede start date');
      return;
    }

    onConfirm(scaffold.id, actualOffHireDate, remark.trim());
    onClose();
  };

  const totalDuration = Math.max(1, getDiffInDays(actualOffHireDate, scaffold.rentalStartDate) + 1);
  const overdueDays = Math.max(0, getDiffInDays(actualOffHireDate, scaffold.plannedOffHireDate));
  const finalTotalCost = totalDuration * scaffold.dailyRentalRate;
  const overdueCost = overdueDays * scaffold.dailyRentalRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isTh ? 'ยืนยันปิดรายการ Off-Hire นั่งร้าน' : 'Confirm Scaffolding Off-Hire'}
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                {scaffold.id} · {scaffold.jobId}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isTh ? 'ผู้รับเหมานั่งร้าน:' : 'Contractor:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{scaffold.contractor}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isTh ? 'วันที่เริ่มเช่า (Start Date):' : 'Rental Start Date:'}</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{scaffold.rentalStartDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isTh ? 'วันครบกำหนดตามแผน (Planned):' : 'Planned Off-Hire Date:'}</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{scaffold.plannedOffHireDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isTh ? 'อัตราค่าเช่าต่อวัน:' : 'Daily Rental Rate:'}</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">฿{scaffold.dailyRentalRate.toLocaleString()}/วัน</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'วันที่ยืนยันหยุดคิดค่าเช่า (Actual Off-Hire Date) *' : 'Actual Off-Hire Date *'}
            </label>
            <input
              type="date"
              value={actualOffHireDate}
              onChange={e => setActualOffHireDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isTh 
                ? 'หมายเหตุ: Actual Off-Hire Date เป็นวันที่มีผลหยุดคิดค่าเช่าตามเงื่อนไขที่ลูกค้ายืนยัน' 
                : 'Note: Actual Off-Hire Date marks the official billing cutoff.'}
            </p>
          </div>

          {/* Final Billing Calculation Card */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-emerald-900 dark:text-emerald-300">{isTh ? 'ระยะเวลาเช่าจริงสุทธิ:' : 'Total Billed Duration:'}</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-200 font-mono">{totalDuration} {isTh ? 'วัน' : 'days'}</span>
            </div>
            {overdueDays > 0 && (
              <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
                <span>{isTh ? `เกินกำหนดตามแผน (+${overdueDays} วัน):` : `Overdue Surcharge (+${overdueDays}d):`}</span>
                <span className="font-mono">+฿{overdueCost.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-100">{isTh ? 'ค่าเช่าเรียกเก็บจริงรวมสุทธิ:' : 'Final Rental Amount:'}</span>
              <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-base">฿{finalTotalCost.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isTh ? 'บันทึกการส่งมอบ / รื้อถอน (Remark - ไม่บังคับ)' : 'Remark (Optional)'}
            </label>
            <input
              type="text"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder={isTh ? 'เช่น รื้อถอนเสร็จสมบูรณ์ Green Tag ส่งคืนพื้นที่แล้ว...' : 'e.g. Scaffolding dismantled, permit closeout signed...'}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{isTh ? 'ยืนยัน Off-Hire ปิดรายการ' : 'Confirm Off-Hire'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// =========================================================================
// 4. SCAFFOLD DETAIL MODAL (FULL BREAKDOWN & TIMELINE)
// =========================================================================
interface ScaffoldDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scaffold: ScaffoldingItem | null;
  onOpenEdit: (scaffold: ScaffoldingItem) => void;
  onOpenExtend: (scaffold: ScaffoldingItem) => void;
  onOpenOffHire: (scaffold: ScaffoldingItem) => void;
  onOpenPlotPlan?: (scaffold: ScaffoldingItem) => void;
}

export const ScaffoldDetailModal: React.FC<ScaffoldDetailModalProps> = ({
  isOpen,
  onClose,
  scaffold,
  onOpenEdit,
  onOpenExtend,
  onOpenOffHire,
  onOpenPlotPlan
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  if (!isOpen || !scaffold) return null;

  const metrics = calculateScaffoldMetrics(scaffold);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              metrics.status === 'Overdue' 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : metrics.status === 'Due Soon'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : metrics.status === 'Active'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
            }`}>
              <Building size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white font-mono">
                  {scaffold.id}
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  metrics.status === 'Overdue' 
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    : metrics.status === 'Due Soon'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : metrics.status === 'Active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {metrics.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {scaffold.jobId} · {scaffold.plant}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Status Alert Banner if Overdue or Due Soon */}
          {metrics.status === 'Overdue' && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
              <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">
                <span className="font-bold block">
                  {isTh ? `เกินกำหนด Off-Hire มาแล้ว ${metrics.overdueDays} วัน!` : `Overdue by ${metrics.overdueDays} Day(s)!`}
                </span>
                <span className="text-[11px] opacity-90">
                  {isTh 
                    ? `เกิดค่าเช่าส่วนเกินโดยประมาณ ฿${metrics.estimatedOverdueCost.toLocaleString()} แนะนำให้กดปุ่ม Extend ขยายสัญญา หรือ Off-Hire ทันที`
                    : `Estimated overdue cost: ฿${metrics.estimatedOverdueCost.toLocaleString()}. Please extend or confirm off-hire.`}
                </span>
              </div>
            </div>
          )}

          {metrics.status === 'Due Soon' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
              <Clock size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <span className="font-bold block">
                  {metrics.daysRemaining === 0 
                    ? (isTh ? 'ครบกำหนด Off-Hire วันนี้!' : 'Due for Off-Hire Today!')
                    : (isTh ? `ใกล้ครบกำหนด Off-Hire (เหลือ ${metrics.daysRemaining} วัน)` : `Due Soon (${metrics.daysRemaining} days remaining)`)}
                </span>
                <span className="text-[11px] opacity-90">
                  {isTh ? 'ประสานงานผู้รับเหมาเตรียมส่งคืน หรือกดขยายเวลาเพื่อไม่ให้เกิดค่าเช่าส่วนเกิน' : 'Coordinate with contractor to return equipment or extend rental.'}
                </span>
              </div>
            </div>
          )}

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400">{isTh ? 'ผู้รับเหมานั่งร้าน:' : 'Contractor:'}</span>
              <p className="font-bold text-slate-800 dark:text-slate-100">{scaffold.contractor}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">{isTh ? 'พื้นที่ติดตั้ง:' : 'Area / Unit:'}</span>
              <p className="font-bold text-slate-800 dark:text-slate-100">{scaffold.area}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <span className="text-slate-400">{isTh ? 'ตำแหน่งเฉพาะเจาะจง:' : 'Specific Location:'}</span>
              <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                {scaffold.locationDetails || (isTh ? 'ไม่ได้ระบุพิกัดย่อย' : 'N/A')}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">{isTh ? 'วันที่เริ่มเช่า (Start Date):' : 'Rental Start Date:'}</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{scaffold.rentalStartDate}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">{isTh ? 'วันครบกำหนดตามแผน (Planned):' : 'Planned Off-Hire Date:'}</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{scaffold.plannedOffHireDate}</p>
            </div>
            {scaffold.actualOffHireDate && (
              <div className="space-y-1">
                <span className="text-slate-400">{isTh ? 'วันที่มีผล Off-Hire จริง:' : 'Actual Off-Hire Date:'}</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{scaffold.actualOffHireDate}</p>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-slate-400">{isTh ? 'ผู้รับผิดชอบงาน:' : 'Responsible Person:'}</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{scaffold.responsiblePerson}</p>
            </div>
          </div>

          {/* Spatial CAD Plot Plan Location Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <MapPin size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {isTh ? 'พิกัดแผนผังโรงกลั่น (Refinery CAD Plot Plan)' : 'Refinery CAD Plot Plan'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {scaffold.plant} · {scaffold.area} · <strong className="text-amber-400 font-mono">Grid {scaffold.gridZone || 'B3'}</strong>
                  </p>
                </div>
              </div>

              {onOpenPlotPlan && (
                <button
                  type="button"
                  onClick={() => onOpenPlotPlan(scaffold)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin size={13} className="stroke-[2.5]" />
                  <span>{isTh ? 'ดูพิกัดบนผัง (View Pin)' : 'View Pin on Plot Plan'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800">
              <div className="bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Grid Zone:</span>
                <span className="text-amber-400 font-bold">{scaffold.gridZone || 'B3'}</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Footprint Bay:</span>
                <span className="text-slate-200 truncate block">{scaffold.bayDimension || '4m × 6m'}</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Coordinates:</span>
                <span className="text-slate-200">X:{scaffold.x ?? 45}% Y:{scaffold.y ?? 45}%</span>
              </div>
            </div>
          </div>

          {/* Rental Cost Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-amber-500" />
              {isTh ? 'การคำนวณค่าเช่านั่งร้าน (Rental Cost Overview)' : 'Rental Cost Breakdown'}
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTh ? 'อัตราต่อวัน' : 'Daily Rate'}</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">฿{scaffold.dailyRentalRate.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTh ? 'ระยะเวลาเช่า' : 'Duration'}</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">{metrics.rentalDuration} {isTh ? 'วัน' : 'days'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTh ? 'ค่าเช่าตามแผน' : 'Est. Base Cost'}</span>
                <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">฿{metrics.estimatedRentalCost.toLocaleString()}</span>
              </div>
              <div className={`p-2.5 rounded-lg border ${
                metrics.overdueDays > 0 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}>
                <span className="text-[10px] uppercase font-bold block">{isTh ? 'ค่าเช่าส่วนเกิน' : 'Overdue Surcharge'}</span>
                <span className="font-mono font-extrabold">
                  {metrics.overdueDays > 0 ? `฿${metrics.estimatedOverdueCost.toLocaleString()}` : '฿0'}
                </span>
              </div>
            </div>
          </div>

          {/* Extension History Timeline */}
          {scaffold.extensionHistory && scaffold.extensionHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-purple-500" />
                {isTh ? 'ประวัติการขยายเวลา (Extension History)' : 'Extension History'}
              </h4>
              <div className="space-y-2">
                {scaffold.extensionHistory.map((ext, idx) => (
                  <div key={ext.id || idx} className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 dark:text-purple-300">
                        {ext.previousOffHireDate} → {ext.newOffHireDate}
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                        {ext.extendedAt}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      <strong>{isTh ? 'เหตุผล:' : 'Reason:'}</strong> {ext.reason}
                    </p>
                    {ext.extendedBy && (
                      <p className="text-slate-400 text-[10px]">
                        {isTh ? 'ผู้ดำเนินการ:' : 'By:'} {ext.extendedBy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remark */}
          {scaffold.remark && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] block font-semibold mb-0.5">{isTh ? 'หมายเหตุ:' : 'Remark:'}</span>
              <p className="text-slate-700 dark:text-slate-300">{scaffold.remark}</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {onOpenPlotPlan && (
              <button
                type="button"
                onClick={() => onOpenPlotPlan(scaffold)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <MapPin size={13} />
                <span>{isTh ? 'ดูพิกัดบนผัง (View Pin)' : 'View Pin'}</span>
              </button>
            )}
            {!metrics.isOffHired && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(scaffold);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isTh ? 'แก้ไขข้อมูล' : 'Edit Record'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExtend(scaffold);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CalendarPlus size={14} />
                  <span>{isTh ? 'ขยายเวลา (Extend)' : 'Extend'}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!metrics.isOffHired && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOffHire(scaffold);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>{isTh ? 'ยืนยัน Off-Hire' : 'Off-Hire'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              {isTh ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
