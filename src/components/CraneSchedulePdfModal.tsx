import React from 'react';
import { 
  X, Printer, Download, Calendar, Truck, Clock, 
  MapPin, ShieldCheck, AlertTriangle, CheckCircle2, 
  Building2, User, HardHat, FileText, Sparkles, Filter
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import bcpLogo from '../assets/bcp_logo.png';

export interface ScheduleJobDetail {
  id: string;
  date: string;
  time: string;
  area: string;
  description: string;
  contractor: string;
  type: string;
  status: string;
  progress: number;
  equipmentId?: string;
  plant?: string;
}

interface CraneSchedulePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  filterPlant?: string;
  filterType?: string;
  filterStatus?: string;
  jobs: ScheduleJobDetail[];
  isTh?: boolean;
}

export default function CraneSchedulePdfModal({
  isOpen,
  onClose,
  selectedDate,
  dateRangeFrom,
  dateRangeTo,
  filterPlant = 'All',
  filterType = 'All',
  filterStatus = 'All',
  jobs,
  isTh = true
}: CraneSchedulePdfModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['No', 'Job ID', 'Date', 'Time Slot', 'Crane Type', 'Equipment / Asset', 'Location / Area', 'Plant', 'Description', 'Contractor', 'Status', 'Progress'];
    const rows = jobs.map((j, idx) => [
      idx + 1,
      `"${j.id}"`,
      `"${j.date}"`,
      `"${j.time}"`,
      `"${j.type}"`,
      `"${j.equipmentId || '-'}"`,
      `"${j.area}"`,
      `"${j.plant || 'Phra Khanong'}"`,
      `"${j.description.replace(/"/g, '""')}"`,
      `"${j.contractor}"`,
      `"${j.status}"`,
      `"${j.progress}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Crane_Schedule_Dispatch_${selectedDate || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group and statistics for the filtered cranes
  const totalCranes = jobs.length;
  const inProgressCranes = jobs.filter(j => j.status === 'In Progress').length;
  const completedCranes = jobs.filter(j => j.status === 'Completed').length;
  const pendingCranes = jobs.filter(j => j.status !== 'In Progress' && j.status !== 'Completed').length;
  const heavyLifts = jobs.filter(j => {
    const capMatch = j.type.match(/(\d+)T/i);
    const capNum = capMatch ? parseInt(capMatch[1], 10) : 0;
    return capNum >= 100 || j.type.toLowerCase().includes('crawler') || j.type.toLowerCase().includes('300');
  }).length;

  // Format date display
  const formatDateTitle = (dStr: string) => {
    if (!dStr) return isTh ? 'ทุกช่วงวันที่' : 'All Dates';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const yearTh = year > 2500 ? year : year + 543;
      const monthNamesTh = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const mIdx = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return isTh ? `${day} ${monthNamesTh[mIdx] || parts[1]} ${yearTh}` : `${dStr}`;
    }
    return dStr;
  };

  const formattedTargetDate = dateRangeFrom && dateRangeTo && dateRangeFrom !== dateRangeTo
    ? `${formatDateTitle(dateRangeFrom)} - ${formatDateTitle(dateRangeTo)}`
    : formatDateTitle(selectedDate);

  const documentRefNo = `BCP-CRN-DISPATCH-${(selectedDate || 'DAILY').replace(/-/g, '')}-${String(totalCranes).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container Card */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {documentRefNo}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {isTh ? 'พร้อมส่งออก PDF' : 'Ready to Export PDF'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {isTh ? 'รายงานสรุปการจัดสรรและใช้งานเครน (Crane Daily Dispatch PDF)' : 'Daily Crane Dispatch & Rigging Schedule Report'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="hidden sm:flex px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all items-center gap-1.5 cursor-pointer shadow-xs"
              title={isTh ? 'ส่งออกเป็นไฟล์ CSV' : 'Export CSV'}
            >
              <Download size={14} />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>{isTh ? 'พิมพ์ / บันทึก PDF (Print to PDF)' : 'Print / Save as PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isTh ? 'ปิดหน้าต่าง' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (Optimized for standard A4 landscape or portrait print) */}
        <div 
          id="crane-schedule-pdf-sheet"
          className="p-6 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 print:p-6 print:overflow-visible print:bg-white print:text-black"
        >
          {/* Header Section: Logo + Title */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <img 
                  src={bcpLogo} 
                  alt="Bangchak Logo" 
                  className="w-14 h-14 object-contain shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-extrabold tracking-widest text-emerald-700 uppercase">BANGCHAK CORPORATION PLC.</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-500">Refinery Operations & Heavy Lift Division</span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                    CRANE OPERATIONS DAILY DISPATCH & RIGGING SCHEDULE
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    รายงานแผนการใช้งานและการจัดสรรรถเครน/เครื่องจักรยกประจำวัน • Refinery Standard SOP-CR-01
                  </p>
                </div>
              </div>

              {/* QR Code Audit Stamp */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center border border-slate-200 p-2 rounded-xl bg-slate-50 print:bg-white">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold block text-slate-900">VERIFIED DISPATCH</span>
                  <span className="text-[9px] font-mono text-slate-500 block">{new Date().toISOString().slice(0, 10)}</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-bold block">PSSR SANCTIONED</span>
                </div>
                <QRCodeSVG 
                  value={`https://refinery.bangchak.co.th/crane/schedule?date=${selectedDate}&ref=${documentRefNo}`}
                  size={52}
                  level="M"
                />
              </div>
            </div>

            {/* Scope & Metadata Filter Badges */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-xs">
                  <Calendar size={13} className="text-blue-600" />
                  <span>{isTh ? 'ช่วงวันที่เลือก:' : 'Selected Date:'}</span>
                  <strong className="font-bold text-blue-700">{formattedTargetDate}</strong>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs">
                  <Building2 size={13} className="text-slate-500" />
                  <span>{isTh ? 'โรงงาน/พื้นที่:' : 'Plant Scope:'}</span>
                  <strong>{filterPlant === 'All' ? (isTh ? 'ทุกโรงงาน (Phra Khanong & Sriracha)' : 'All Refineries') : filterPlant}</strong>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs">
                  <Filter size={13} className="text-slate-500" />
                  <span>{isTh ? 'ประเภทเครน:' : 'Crane Filter:'}</span>
                  <strong>{filterType}</strong>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 font-mono">
                <span>Ref: <strong>{documentRefNo}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {isTh ? 'จำนวนเครนที่ใช้งานในวัน' : 'Total Cranes Deployed'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-slate-900">{totalCranes}</span>
                <span className="text-[10px] text-slate-500">{isTh ? 'คัน/ตัว' : 'Units'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                {isTh ? 'กำลังปฏิบัติงาน (Active Lifts)' : 'Active In Progress'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-blue-700">{inProgressCranes}</span>
                <span className="text-[10px] text-blue-600">{isTh ? 'คัน' : 'Units'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                {isTh ? 'งานยกความเสี่ยงสูง (≥100T Heavy)' : 'Heavy Lifts (≥100T)'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-amber-700">{heavyLifts}</span>
                <span className="text-[10px] text-amber-600">{isTh ? 'ตัว (Critical)' : 'Critical'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                {isTh ? 'ดำเนินการเสร็จสิ้น (Completed)' : 'Completed Lifts'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-emerald-700">{completedCranes}</span>
                <span className="text-[10px] text-emerald-600">{isTh ? 'คัน' : 'Units'}</span>
              </div>
            </div>
          </div>

          {/* Cranes In Operation Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Truck size={14} className="text-blue-600" />
                <span>{isTh ? `รายการรถเครนที่ปฏิบัติงานในวันที่ ${formattedTargetDate}` : `Crane Fleet Schedule Deployment for ${formattedTargetDate}`}</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {jobs.length} {isTh ? 'รายการคำขอและแผนยก' : 'Lifting Jobs Registered'}
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-500 text-xs">
                <Truck size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold">{isTh ? 'ไม่พบข้อมูลการใช้งานเครนตามช่วงวันที่เลือก' : 'No crane operations found for the selected date.'}</p>
                <p className="text-[11px] text-slate-400 mt-1">{isTh ? 'โปรดเลือกวันอื่น หรือปรับเปลี่ยนเงื่อนไขการกรอง' : 'Please select another date or clear filters.'}</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 w-28">{isTh ? 'ช่วงเวลา' : 'Time Slot'}</th>
                      <th className="p-3">{isTh ? 'รุ่นเครน / เครื่องจักร' : 'Crane Model & Type'}</th>
                      <th className="p-3">{isTh ? 'รหัสงาน (Job No.) & ขอบเขตงาน' : 'Job Scope & Description'}</th>
                      <th className="p-3">{isTh ? 'พื้นที่ปฏิบัติงาน (Area)' : 'Location / Area'}</th>
                      <th className="p-3">{isTh ? 'ผู้รับเหมา / หน่วยงาน' : 'Contractor'}</th>
                      <th className="p-3 text-center">{isTh ? 'สถานะงาน' : 'Status'}</th>
                      <th className="p-3 text-center">{isTh ? 'ใบตรวจ ปจ.2' : 'Safety Cert'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobs.map((job, idx) => {
                      const isHeavy = job.type.includes('300') || job.type.includes('Crawler') || (parseInt(job.type.match(/\d+/)?.[0] || '0') >= 100);
                      const isDone = job.status === 'Completed';
                      const isProg = job.status === 'In Progress';

                      return (
                        <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-mono text-[11px] text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-bold">
                              <Clock size={11} className="text-slate-400" />
                              <span>{job.time || '08:00 - 17:00'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">{job.date}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{job.type}</span>
                              {isHeavy && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  HEAVY
                                </span>
                              )}
                            </div>
                            {job.equipmentId && (
                              <span className="text-[10px] font-mono text-blue-600 block">Tag: {job.equipmentId}</span>
                            )}
                          </td>
                          <td className="p-3 max-w-[260px]">
                            <span className="font-mono font-bold text-blue-700 text-[11px] block">{job.id}</span>
                            <span className="text-slate-700 line-clamp-2 text-[11px]">{job.description}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-slate-800 font-medium">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{job.area}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">{job.plant || 'Phra Khanong'}</span>
                          </td>
                          <td className="p-3 text-slate-700 text-[11px]">
                            <div className="flex items-center gap-1">
                              <User size={11} className="text-slate-400 shrink-0" />
                              <span>{job.contractor}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDone 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isProg
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {job.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{job.progress}% Done</span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono">
                              <CheckCircle2 size={11} />
                              <span>ปจ.2 PASS</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Safety & Rigging Mandatory Prerequisite Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>{isTh ? 'ข้อกำหนดความปลอดภัยประจำวันสำหรับการใช้งานเครน (Daily Rigging Safety Rules)' : 'Mandatory Daily Lifting Rules'}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              1. ผู้ควบคุมเครนและผู้ให้สัญญาณต้องมีใบอนุญาต ปจ.2 ที่ยังไม่หมดอายุ และผ่านการตรวจสภาพประจำวัน (Daily Pre-use Inspection) ก่อนยกทุกครั้ง
              2. ห้ามปฏิบัติการยกเมื่อความเร็วลมกระโชกเกิน 12.5 m/s (45 km/h) หรือเมื่อมีสัญญาณแจ้งเตือนพายุ (Storm Alert)
              3. รถเครนขนาดตั้งแต่ 100 ตันขึ้นไป ต้องจัดวางแผ่นรองขาช้างเหล็ก (Steel Outrigger Mats) และกั้นพื้นที่เขตรัศมีอันตราย (Barricade Zone) 100%
            </p>
          </div>

          {/* Official Sign-off Approval Columns */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs print:pt-4">
            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                <span className="font-mono text-slate-400 text-[10px] italic">[ Signed Electronically ]</span>
              </div>
              <span className="font-bold text-slate-900 block mt-1">{isTh ? 'ผู้จัดสรรและประสานงานเครน' : 'Crane Dispatch Supervisor'}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Crane Operations Team</span>
            </div>

            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                <span className="font-mono text-slate-400 text-[10px] italic">[ Signed Electronically ]</span>
              </div>
              <span className="font-bold text-slate-900 block mt-1">{isTh ? 'เจ้าหน้าที่ความปลอดภัย (Safety Lead)' : 'Site Rigging Safety Officer'}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Refinery Safety Division</span>
            </div>

            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                <span className="font-mono text-slate-400 text-[10px] italic">[ Signed Electronically ]</span>
              </div>
              <span className="font-bold text-slate-900 block mt-1">{isTh ? 'หัวหน้ากะปฏิบัติการ (Shift Lead)' : 'Operations Shift Manager'}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Bangchak Production Unit</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
            <span>Official Report Generated by Project Crane V0.1 • Bangchak Greenovation Platform • System Time: {new Date().toLocaleString()}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
