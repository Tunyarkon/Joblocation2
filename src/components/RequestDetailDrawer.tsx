import React, { useState } from 'react';
import { 
  X, FileText, CheckCircle2, Clock, User, HardHat, 
  MapPin, ShieldCheck, AlertTriangle, Truck, Calendar, 
  Paperclip, Building2, ExternalLink, Download, Layers,
  Check, History, Sliders, ChevronRight, AlertCircle, Sparkles, XCircle
} from 'lucide-react';
import { 
  UnifiedCraneJob, 
  updateCraneJob, 
  updateCraneRequestWorkflow, 
  releaseCraneAssignment,
  checkCraneDoubleBooking,
  navigateToCraneView
} from '../data/craneOperationsData';
import JobAttachmentSection from './common/JobAttachmentSection';
import { JobAttachment, addJobAttachment, removeJobAttachment } from '../data/jobAttachmentData';
import { useLanguage } from '../context/LanguageContext';

interface RequestDetailDrawerProps {
  job: UnifiedCraneJob | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: () => void;
  onStatusChange?: (updatedJob: any) => void;
}

export default function RequestDetailDrawer({
  job,
  isOpen,
  onClose,
  onJobUpdated,
  onStatusChange
}: RequestDetailDrawerProps) {
  const { isTh } = useLanguage();
  const [activeTab, setActiveTab] = useState<'info' | 'lifting' | 'docs' | 'assignment' | 'checklist' | 'history'>('info');

  // Reason modal for actions
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'revise' | 'cancel' | 'release';
    title: string;
    description: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  // ESC key listener to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionModal) {
          setActionModal(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, actionModal]);

  if (!isOpen || !job) return null;

  const handleWorkflowAction = (type: 'approve' | 'reject' | 'revise' | 'cancel' | 'release') => {
    const titles = {
      approve: isTh ? 'อนุมัติคำขอใช้งานเครน' : 'Approve Crane Request',
      reject: isTh ? 'ปฏิเสธคำขอใช้งานเครน' : 'Reject Crane Request',
      revise: isTh ? 'ส่งกลับให้ผู้ขอแก้ไขข้อมูล' : 'Return Request for Revision',
      cancel: isTh ? 'ยกเลิกคำขอใช้งานเครน' : 'Cancel Crane Request',
      release: isTh ? 'ปลดการจัดสรรเครน (Release Crane Booking)' : 'Release Crane Assignment'
    };
    const desc = {
      approve: isTh ? 'ยืนยันการอนุมัติคำขอเพื่อเข้าสู่ขั้นตอนการจัดสรรเครน' : 'Confirm approval to advance to crane scheduling',
      reject: isTh ? 'กรุณาระบุเหตุผลการปฏิเสธคำขออย่างชัดเจน' : 'Please provide specific rejection reason',
      revise: isTh ? 'ระบุสิ่งที่ต้องการให้ผู้ขอปรับปรุงแก้ไข' : 'Provide revision notes for requester',
      cancel: isTh ? 'ระบุเหตุผลในการขอยกเลิกคำขอ' : 'Specify cancellation reason',
      release: isTh ? 'ปลดคิวเครนที่จัดสรรไว้กลับสู่สถานะว่าง (Available)' : 'Release allocated crane back to fleet'
    };
    setActionModal({ type, title: titles[type], description: desc[type] });
    setReasonInput('');
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    const currentUser = 'Rigging Superintendent';
    const role = 'Turnaround Rigging Lead';

    if (actionModal.type === 'approve') {
      updateCraneRequestWorkflow(job.id, 'Approved', currentUser, role, reasonInput || 'Approved by Rigging Superintendent');
    } else if (actionModal.type === 'reject') {
      if (!reasonInput.trim()) {
        alert(isTh ? 'กรุณากรอกเหตุผลในการปฏิเสธ' : 'Reason is required');
        return;
      }
      updateCraneRequestWorkflow(job.id, 'Rejected', currentUser, role, reasonInput);
    } else if (actionModal.type === 'revise') {
      if (!reasonInput.trim()) {
        alert(isTh ? 'กรุณากรอกข้อความส่งกลับแก้ไข' : 'Revision note is required');
        return;
      }
      updateCraneRequestWorkflow(job.id, 'Under Review', currentUser, role, reasonInput);
    } else if (actionModal.type === 'cancel') {
      updateCraneRequestWorkflow(job.id, 'Cancelled', currentUser, role, reasonInput || 'Cancelled by user');
    } else if (actionModal.type === 'release') {
      releaseCraneAssignment(job.id, reasonInput || 'Assignment released by superintendent', currentUser);
    }

    setActionModal(null);
    if (onJobUpdated) onJobUpdated();
  };

  // Execution Checklist toggle
  const handleChecklistToggle = (stepKey: 'riggingTackle' | 'outriggerPads' | 'liftExecution' | 'siteDemobilization') => {
    const current = job.executionChecklist || {
      riggingTackle: { done: false },
      outriggerPads: { done: false },
      liftExecution: { done: false },
      siteDemobilization: { done: false }
    };
    const prevDone = current[stepKey]?.done || false;
    const updatedChecklist = {
      ...current,
      [stepKey]: {
        done: !prevDone,
        inspector: !prevDone ? 'Wichai Thongdee (Rigging Inspector)' : undefined,
        timestamp: !prevDone ? new Date().toISOString() : undefined,
        remarks: !prevDone ? 'Verified compliant with BCP refinery standard' : undefined
      }
    };

    updateCraneJob(job.id, {
      executionChecklist: updatedChecklist
    });
    if (onJobUpdated) onJobUpdated();
  };

  // Attachments
  const handleAddAttachment = (att: JobAttachment) => {
    addJobAttachment(job.jobNo, att);
    if (onJobUpdated) onJobUpdated();
  };

  const handleRemoveAttachment = (attId: string) => {
    removeJobAttachment(job.jobNo, attId);
    if (onJobUpdated) onJobUpdated();
  };

  // Badges
  const reqStatusStyle = 
    job.requestStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300' :
    job.requestStatus === 'Submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300' :
    job.requestStatus === 'Under Review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' :
    job.requestStatus === 'In Progress' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300' :
    job.requestStatus === 'Completed' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300' :
    job.requestStatus === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300' :
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';

  const assignStatusStyle = 
    job.assignmentStatus === 'Assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300' :
    job.assignmentStatus === 'Proposed' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300' :
    job.assignmentStatus === 'Released' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' :
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 flex items-center justify-center p-3 sm:p-5 md:p-6"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 max-h-[90vh] shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {job.requestNo || job.jobNo}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {job.requestType || 'CR01'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${reqStatusStyle}`}>
                  {job.requestStatus || job.status}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${assignStatusStyle}`}>
                  {job.assignmentStatus || 'Unassigned'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Job Ref: <strong className="text-slate-700 dark:text-slate-200 font-mono">{job.jobNo}</strong> • {job.plant} ({job.unit || '11-APS1'})
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isTh ? 'ปิดหน้าต่าง' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cross-function Quick Links Bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
            {isTh ? 'เปิดดูในฟังก์ชันอื่น:' : 'Cross-function Links:'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigateToCraneView({ view: 'plan', jobId: job.id, plant: job.plant as any });
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="เปิดผังยก CAD Blueprint"
            >
              <MapPin size={12} className="text-slate-500 dark:text-slate-400" />
              <span>{isTh ? 'ผังยก Plot Plan' : 'Plot Plan'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToCraneView({ view: 'calendar', jobId: job.id, date: (job.dateFrom || job.date || '2026-09-27').split(' ')[0] });
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="เปิดปฏิทินงานเครน"
            >
              <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
              <span>{isTh ? 'ปฏิทิน Calendar' : 'Calendar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToCraneView({ view: 'optimize', jobId: job.id });
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="ตรวจสอบและจัดสรรเครน"
            >
              <Sparkles size={12} className="text-slate-500 dark:text-slate-400" />
              <span>{isTh ? 'จัดสรร Optimizer' : 'Optimizer'}</span>
            </button>
            {job.assignedCraneId && (
              <button
                type="button"
                onClick={() => {
                  navigateToCraneView({ view: 'crane-master', craneId: job.assignedCraneId });
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title={`ดูสเปก ${job.assignedCraneId} ใน Crane Master`}
              >
                <Truck size={12} className="text-slate-500 dark:text-slate-400" />
                <span>{job.assignedCraneId}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (6 Tabs per Section 7) */}
        <div className="grid grid-cols-6 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 text-[11px] font-bold select-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'info' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '1. ข้อมูลคำขอ' : '1. Request'}
          </button>
          <button
            onClick={() => setActiveTab('lifting')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'lifting' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '2. สเปกการยก' : '2. Lifting'}
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'docs' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '3. เอกสาร/ปจ.2' : '3. Documents'}
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'assignment' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '4. จัดสรรเครน' : '4. Assignment'}
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'checklist' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '5. เช็กลิสต์' : '5. Checklist'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-1 text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'history' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isTh ? '6. ประวัติ' : '6. History'}
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* TAB 1: REQUEST INFORMATION */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'หมายเลขคำขอ (Request No.)' : 'Request No.'}</span>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">{job.requestNo || job.jobNo}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'รหัสงาน (Work Order / Job No.)' : 'Work Order'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{job.jobNo}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'โรงงานและหน่วยผลิต' : 'Plant & Unit'}</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.plant} • {job.unit || '11-APS1'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'พื้นที่หน้างาน (Location)' : 'Location'}</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.area || 'Refinery Complex'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'ผู้ขอใช้งาน (Requester)' : 'Requester'}</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.requester || 'Turnaround Rigging Lead'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'แผนก / ผู้รับเหมา' : 'Department / Contractor'}</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.contractor}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{isTh ? 'รายละเอียดกิจกรรมการยก (Description)' : 'Activity Description'}</span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {job.description}
                </p>
              </div>

              {job.rejectReason && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <AlertTriangle size={14} />
                    <span>{isTh ? 'เหตุผลที่ปฏิเสธ / ปัญหาที่พบ' : 'Rejection Reason'}</span>
                  </div>
                  <p className="text-xs">{job.rejectReason}</p>
                </div>
              )}

              {job.revisionNote && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <AlertCircle size={14} />
                    <span>{isTh ? 'ข้อความให้ส่งกลับแก้ไข' : 'Revision Instructions'}</span>
                  </div>
                  <p className="text-xs">{job.revisionNote}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIFTING REQUIREMENTS */}
          {activeTab === 'lifting' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase block">{isTh ? 'น้ำหนักชิ้นงาน (Load)' : 'Net Load'}</span>
                  <span className="text-xl font-black font-mono text-blue-900 dark:text-blue-100">{job.loadWeightTon || Math.round(job.capacity * 0.65)} T</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{isTh ? 'น้ำหนักอุปกรณ์ช่วยยก' : 'Rigging Weight'}</span>
                  <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">{job.riggingWeightTon || 4} T</span>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase block">{isTh ? 'น้ำหนักยกรวม (Gross Load)' : 'Gross Load'}</span>
                  <span className="text-xl font-black font-mono text-indigo-900 dark:text-indigo-100">{job.grossLoadTon || (job.capacity * 0.7)} T</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'รัศมีการทำงาน (Working Radius)' : 'Working Radius'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{job.workingRadiusM || 20} meters</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'ความสูงยกที่ต้องการ (Hook Height)' : 'Required Hook Height'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{job.requiredHookHeightM || 28} meters</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'กำหนดการเริ่ม - สิ้นสุด' : 'Planned Window'}</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.date} • {job.time}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{isTh ? 'พิกัดผัง (Plot Plan Grid)' : 'Grid Reference'}</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-0.5">{job.gridReference || 'GRID-C4-12'} (X: {job.x}%, Y: {job.y}%)</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{isTh ? 'ข้อจำกัดพื้นที่และความปลอดภัย (Site Constraints)' : 'Site Constraints & Safety Notes'}</span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {job.safetyNotes || 'Clearance from live hydrocarbon pipe rack required. Ground bearing pressure test must be verified before outrigger deployment.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS & CERTIFICATES */}
          {activeTab === 'docs' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{isTh ? 'ใบรับรองความปลอดภัย ปจ.2' : 'Phor.Jor.2 Safety Cert'}</span>
                  </div>
                  <span className="font-mono text-emerald-600 font-bold">{job.phorJor2Cert || 'PJ2-BCP-2026-VERIFIED'}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{isTh ? 'ใบอนุญาตทำงาน (PTW No.)' : 'Permit-to-Work (PTW)'}</span>
                  </div>
                  <span className="font-mono text-blue-600 font-bold">{job.ptwNo || 'PTW-2026-CRN'}</span>
                </div>
              </div>

              {/* Attachments Section */}
              <JobAttachmentSection
                attachments={job.attachments || []}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                isTh={isTh}
                title={isTh ? 'เอกสารประกอบคำขอ (Attachments)' : 'Attached Documents'}
                description={isTh ? 'Lifting Plan, ใบอนุญาต PTW, เอกสาร ปจ.2 หรือแบบวิศวกรรม' : 'Lifting plans, permits, certs, engineering drawings'}
              />
            </div>
          )}

          {/* TAB 4: ASSIGNMENT & SCHEDULE */}
          {activeTab === 'assignment' && (
            <div className="space-y-4 animate-in fade-in">
              {job.assignedCraneId ? (
                <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Truck size={18} className="text-blue-600" />
                      <div>
                        <span className="text-[10px] text-blue-700 uppercase font-bold block">{isTh ? 'เครื่องจักรที่จัดสรรแล้ว' : 'Assigned Crane'}</span>
                        <h4 className="text-sm font-black font-mono text-blue-900 dark:text-blue-200">{job.assignedCraneId} • {job.assignedCraneName}</h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                      ASSIGNED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isTh ? 'ช่วงเวลาปฏิบัติงาน' : 'Schedule Slot'}</span>
                      <span className="font-mono font-bold">{job.date} ({job.time})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isTh ? 'สถานะความขัดแย้ง' : 'Double Booking Check'}</span>
                      <span className="text-emerald-600 font-bold">✓ Clear (No overlap)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleWorkflowAction('release')}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      {isTh ? 'ปลดการจัดสรรเครนคันนี้ (Release Booking)' : 'Release Crane Booking'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <Truck size={32} className="mx-auto text-slate-400 mb-2 opacity-60" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {isTh ? 'ยังไม่มีการจัดสรรเครื่องจักรเครน (Unassigned)' : 'No Crane Assigned Yet'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {isTh 
                      ? 'สามารถเข้าหน้า Review Plan & Optimize เพื่อคำนวณคะแนนความเหมาะสมและตรวจสอบความปลอดภัยก่อน Assign เครน'
                      : 'Use Review Plan & Optimize to evaluate suitability score, safety clearance, and assign crane.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXECUTION CHECKLIST (Section 7) */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold">{isTh ? 'รายการตรวจสอบความปลอดภัยก่อนและระหว่างการยก (Crane Execution Checklist)' : 'Pre-Lift & Execution Safety Checklist'}</p>
                <p className="text-[11px] opacity-80 mt-0.5">{isTh ? 'ต้องตรวจรับรองโดยผู้เชี่ยวชาญที่มีใบอนุญาตก่อนเริ่มกระบวนการยก' : 'Must be inspected and endorsed before commencing lifting operations'}</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'riggingTackle' as const, title: isTh ? '1. การตรวจอุปกรณ์ผูกรัด (Rigging & Tackle Inspection)' : '1. Rigging & Tackle Inspection', desc: isTh ? 'ตรวจสลิง, สเก็น, เบรนด์รับน้ำหนัก และการผูกรัดตาม Lifting Plan' : 'Slings, shackles, spreader beam, and rigging configuration.' },
                  { key: 'outriggerPads' as const, title: isTh ? '2. การติดตั้งแผ่นรองขาหยั่ง (Outrigger Pad Setup)' : '2. Outrigger Pad Setup', desc: isTh ? 'ตรวจแรงกดดิน, ขนาดแผ่นรองรับน้ำหนัก (Timber/Steel mat) และระยะกางขาหยั่ง 100%' : 'Ground bearing pressure, timber/steel mats, 100% outrigger extension.' },
                  { key: 'liftExecution' as const, title: isTh ? '3. การควบคุมขณะยก (Lift Execution Protocol)' : '3. Lift Execution Protocol', desc: isTh ? 'กันเขตอันตราย (Exclusion Zone), ความเร็วลมไม่เกินเกณฑ์, และการสื่อสารผ่านวิทยุ' : 'Barricaded drop zone, wind speed compliance, radio comms.' },
                  { key: 'siteDemobilization' as const, title: isTh ? '4. การเก็บคืนพื้นที่ (Site Demobilization)' : '4. Site Demobilization', desc: isTh ? 'เก็บอุปกรณ์, เคลียร์พื้นที่ และลงนามส่งมอบงานเสร็จสมบูรณ์' : 'Equipment packup, site housekeeping, handover.' }
                ].map((item) => {
                  const checkData = job.executionChecklist?.[item.key];
                  const isDone = checkData?.done;

                  return (
                    <div 
                      key={item.key}
                      onClick={() => handleChecklistToggle(item.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isDone 
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                            isDone ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 dark:border-slate-600'
                          }`}>
                            {isDone && <Check size={14} />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                            {isDone && (
                              <div className="mt-2 flex items-center gap-3 text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                                <span>Inspector: <strong>{checkData?.inspector || 'Site Inspector'}</strong></span>
                                <span>•</span>
                                <span>{checkData?.timestamp ? new Date(checkData.timestamp).toLocaleTimeString() : 'Verified'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isDone ? 'COMPLETED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY HISTORY (Audit Trail) */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {(job.statusHistory && job.statusHistory.length > 0 ? job.statusHistory : [
                  { status: job.requestStatus, changedBy: job.reviewedBy || 'System', timestamp: job.createdAt || '2026-09-24T08:00:00Z', action: 'Initial Request Created' }
                ]).map((log, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{log.action || log.status}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        By: <strong className="text-slate-700 dark:text-slate-300">{log.changedBy}</strong>
                      </p>
                      {log.reason && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg mt-1 border border-amber-200 dark:border-amber-800">
                          Note: {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Action Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex gap-2">
            {job.requestStatus === 'Submitted' && (
              <button
                onClick={() => handleWorkflowAction('approve')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>{isTh ? 'อนุมัติคำขอ (Approve)' : 'Approve'}</span>
              </button>
            )}

            {(job.requestStatus === 'Submitted' || job.requestStatus === 'Under Review') && (
              <button
                onClick={() => handleWorkflowAction('revise')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <AlertCircle size={14} />
                <span>{isTh ? 'ส่งกลับแก้ไข (Revise)' : 'Return for Revision'}</span>
              </button>
            )}

            {job.requestStatus === 'Submitted' && (
              <button
                onClick={() => handleWorkflowAction('reject')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <XCircle size={14} />
                <span>{isTh ? 'ปฏิเสธ (Reject)' : 'Reject'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {isTh ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>

      {/* Action Dialog (Approve / Reject / Revise Reason Modal) */}
      {actionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{actionModal.title}</h4>
            <p className="text-xs text-slate-500">{actionModal.description}</p>
            <textarea
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={isTh ? 'กรอกเหตุผลหรือบันทึกกำกับ...' : 'Enter reason or directives...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                {isTh ? 'ยืนยัน' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
