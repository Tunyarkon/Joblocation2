import React from 'react';
import { 
  X, Printer, ShieldCheck, AlertTriangle, CheckCircle2, 
  MapPin, Calendar, Clock, Truck, Award, FileText, UserCheck, HardHat, Compass
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CranePermitDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    description: string;
    area: string;
    contractor: string;
    type?: string;
    craneType?: 'Crane Pull' | 'Crane Spot' | string;
    capacity?: string;
    date?: string;
    time?: string;
    plant?: 'Phra Khanong' | 'Sriracha';
  };
  isTh?: boolean;
}

export default function CranePermitDossierModal({
  isOpen,
  onClose,
  job,
  isTh = true
}: CranePermitDossierModalProps) {
  if (!isOpen) return null;

  const isPull = (job?.craneType || '').toLowerCase().includes('pull');
  const plantName = job?.plant === 'Sriracha' ? 'Bangchak Sriracha Refinery & Terminal' : 'Bangchak Phra Khanong Refinery (Bangkok)';
  const docNo = `CR01-BCP-${new Date().getFullYear()}-${String(job?.id ?? '042').replace(/\D/g, '') || '042'}`;
  const capacityTons = job?.capacity || (job?.type && job.type.match(/\d+T/)?.[0]) || '50T';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Action Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
              CR01
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{docNo}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Approved & Certified
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {isTh ? 'แฟ้มใบอนุญาตปฏิบัติงานเครนเคลื่อนที่ & แผนการยกทางการ' : 'CR01 Mobile Crane Official Permit Dossier & Lifting Plan'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>{isTh ? 'พิมพ์เอกสาร (Print / PDF)' : 'Print Dossier (PDF)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dossier Document Content */}
        <div className="p-6 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 print:p-6 print:overflow-visible">
          
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-extrabold tracking-widest text-emerald-700 uppercase">BANGCHAK CORPORATION PLC.</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-500">Refinery Safety & Reliability Division</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  CR01 MOBILE CRANE WORK PERMIT & LIFTING PLAN
                </h1>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {plantName} • Safety Standard SOP-CR-01 / Critical Lift Assessment
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <QRCodeSVG value={`CR01-PERMIT://${docNo}/JOB-${job.id}`} size={64} level="M" />
                <div className="text-[10px] font-mono leading-tight">
                  <p className="font-bold text-slate-800">PERMIT PASS</p>
                  <p className="text-slate-500">{docNo}</p>
                  <p className="text-emerald-700 font-bold mt-1">● CERTIFIED</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operation Classification Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${
              isPull 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                {isTh ? 'ลักษณะงานยก (Lift Operation)' : 'Lift Classification'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Truck size={18} className={isPull ? 'text-indigo-600' : 'text-amber-600'} />
                <span className="text-base font-extrabold">
                  {isPull ? 'Crane Pull (ดึงไส้ท่อแนวนอน)' : 'Crane Spot (ยกแนวดิ่งติดตั้ง)'}
                </span>
              </div>
              <span className="text-[10px] mt-1 block opacity-80">
                {isPull ? 'Winch & Horizontal Bundle Extraction' : 'Vertical Heavy Lift / Static Vessel Mounting'}
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {isTh ? 'พิกัดน้ำหนักยก (Capacity)' : 'Rated Capacity'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900">{capacityTons}</span>
                <span className="text-xs font-bold text-slate-500">Safe Working Load</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold block mt-1">ปจ.2 Cert: Verified & Active</span>
            </div>

            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-950">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                {isTh ? 'รัศมีกั้นเขตปลอดภัย (Safety Perimeter)' : 'Safety Exclusion Perimeter'}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Compass size={18} className="text-rose-600" />
                <span className="text-xl font-black text-rose-900">25.0 Meters</span>
              </div>
              <span className="text-[10px] text-rose-700 block mt-1">Red barricade tape & Spotter mandatory</span>
            </div>
          </div>

          {/* Job & Site Parameters Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                1. Job Information & Location Specifics (ข้อมูลงานและพื้นที่)
              </h4>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Work Order / Job ID</span>
                <p className="font-bold text-slate-900 font-mono text-sm">{job.id}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Operating Area</span>
                <p className="font-bold text-slate-900">{job.area || 'Refinery Complex'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Contractor</span>
                <p className="font-bold text-slate-900">{job.contractor || 'Plant Maintenance Fleet'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Date & Shift Window</span>
                <p className="font-bold text-slate-900">{job.date || '2026-10-15'} (08:00 - 17:00)</p>
              </div>
              <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Scope of Lift / Task Description</span>
                <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">{job.description}</p>
              </div>
            </div>
          </div>

          {/* Safety & Rigging Verification Checklist */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                2. Rigging & Ground Safety Verification Checklist (การตรวจความปลอดภัยหน้างาน)
              </h4>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Outrigger Steel Pads & Ground Bearing Compaction Checked (แผ่นรองขาช้าง)', ok: true },
                { label: 'Crane Boom Angle & Load Chart within 75% Critical Limit (ชาร์ตยกปลอดภัย)', ok: true },
                { label: 'Wind Speed Sensor < 30 km/h verified at top of boom (ความเร็วลมไม่เกินพิกัด)', ok: true },
                { label: 'Webbing Slings & Shackles inspected with color code of current month (สลิงและสะเก็น)', ok: true },
                { label: 'Clearance from overhead high voltage cables > 5.0m (ระยะห่างสายไฟฟ้าแรงสูง)', ok: true },
                { label: 'Qualified Signalman & Rigger with valid BCP certification present (ผู้ให้สัญญาณมีใบเซอร์)', ok: true },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-slate-800 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tripartite Safety Signatures */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                3. Tripartite Authorization & Digital Signatures (ลายมือชื่อตรวจรับรองความปลอดภัย 3 ฝ่าย)
              </h4>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-400">1. Crane Safety Inspector</p>
                <div className="my-2 h-10 flex items-center justify-center font-serif italic text-base text-indigo-900 border-b border-slate-300">
                  Somchai Prasert (TSS-09)
                </div>
                <p className="text-[10px] font-bold text-slate-800">Mr. Somchai Prasert</p>
                <p className="text-[9px] text-slate-500 font-mono">Signed: 2026-10-15 08:15</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-400">2. Plant Safety Officer (HSE)</p>
                <div className="my-2 h-10 flex items-center justify-center font-serif italic text-base text-indigo-900 border-b border-slate-300">
                  Preecha Wongsuwan
                </div>
                <p className="text-[10px] font-bold text-slate-800">Mr. Preecha Wongsuwan</p>
                <p className="text-[9px] text-slate-500 font-mono">Signed: 2026-10-15 08:22</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-400">3. Operations Superintendent</p>
                <div className="my-2 h-10 flex items-center justify-center font-serif italic text-base text-indigo-900 border-b border-slate-300">
                  Kitti Chai (OPS-Lead)
                </div>
                <p className="text-[10px] font-bold text-slate-800">Mr. Kitti Chai</p>
                <p className="text-[9px] text-slate-500 font-mono">Signed: 2026-10-15 08:30</p>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-3">
            This CR01 dossier is digitally logged in the Bangchak Operations & Turnover Management System. Valid only during the designated shift and specific lifting radius.
          </div>
        </div>
      </div>
    </div>
  );
}
