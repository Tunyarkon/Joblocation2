import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import Tab1EquipmentClosing from './Tab1EquipmentClosing';
import Tab2PunchList from './Tab2PunchList';
import Tab3FlangeChecklist from './Tab3FlangeChecklist';
import Tab4TurnoverCertificate from './Tab4TurnoverCertificate';
import { usePlantTurnShared } from '../context/PlantTurnSharedContext';
import { 
  ClipboardCheck, CheckSquare, ListOrdered, Wrench, 
  Award, ShieldAlert, FileText, ArrowRight, Printer, 
  RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, 
  UserCheck, ShieldCheck, Send, Filter, Search, Eye, 
  ChevronRight, Sparkles, Building2, ThumbsUp, ThumbsDown
} from 'lucide-react';

export type TaskStatus = 'Pending' | 'In Progress' | 'Approved' | 'Rejected';
export type ApprovalRole = 'Turnover Lead' | 'TSS Inspector' | 'PES Engineer' | 'OPS Lead' | 'SD Manager';

export interface InspectionApprovalTask {
  id: string;
  taskCode: string;
  title: string;
  tabKey: 'tab1' | 'tab2' | 'tab3' | 'tab4';
  tabName: string;
  equipmentNo: string;
  systemNo: string;
  unitNo: string;
  initiator: string;
  assignedRole: ApprovalRole;
  approverName: string;
  submissionDate: string;
  approvalDate: string;
  status: TaskStatus;
  priority: 'High' | 'Medium' | 'Critical';
  comments: string;
  rejectionReason?: string;
  criteria: {
    label: string;
    verified: boolean;
  }[];
}

const INITIAL_APPROVAL_TASKS: InspectionApprovalTask[] = [
  {
    id: 'task-101',
    taskCode: 'APP-CL-1101',
    title: 'Heat Exchanger Bundle & Shell Box Up Acceptance (Appendix A & B)',
    tabKey: 'tab1',
    tabName: '1. Equipment Closing',
    equipmentNo: '11-E-101A',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Narong B. (Field Sup)',
    assignedRole: 'PES Engineer',
    approverName: 'Eng. Somchai Prasert',
    submissionDate: '2026-09-24 09:30',
    approvalDate: '2026-09-24 14:15',
    status: 'Approved',
    priority: 'Critical',
    comments: 'Tube bundle cleanliness inspected with video borescope. Pass partition plate seal verified intact.',
    criteria: [
      { label: 'Bundle cleaning acceptance verified', verified: true },
      { label: 'Shell internal cleaning free of debris/FME', verified: true },
      { label: 'Flange Police QA torque verified to 280 Nm', verified: true },
      { label: 'De-blind certificate signed', verified: true }
    ]
  },
  {
    id: 'task-102',
    taskCode: 'APP-CL-1102',
    title: 'Crude Fractionator Tower 11-C-101 Manhole Closure Endorsement',
    tabKey: 'tab1',
    tabName: '1. Equipment Closing',
    equipmentNo: '11-C-101',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'W. Prasert (ME Leader)',
    assignedRole: 'OPS Lead',
    approverName: 'J. Somchai (OPS)',
    submissionDate: '2026-09-24 11:00',
    approvalDate: '',
    status: 'Pending',
    priority: 'Critical',
    comments: 'Awaiting final foreign material exclusion (FME) sweep inside tray #22 before closing TOP manhole.',
    criteria: [
      { label: 'Tray clamps tightness verified 100%', verified: true },
      { label: 'Bottom manhole closure accepted', verified: true },
      { label: 'Middle manhole closure accepted', verified: true },
      { label: 'Final top manhole closure sweep', verified: false }
    ]
  },
  {
    id: 'task-103',
    taskCode: 'APP-PL-1103',
    title: 'Category A Punch List Pre-Turnover Clearance Review',
    tabKey: 'tab2',
    tabName: '2. Punch & Butt List',
    equipmentNo: '11-E-101A / 11-C-101',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Kamonrat P. (Safety)',
    assignedRole: 'TSS Inspector',
    approverName: 'Dr. Anan S. (TSS)',
    submissionDate: '2026-09-24 13:00',
    approvalDate: '2026-09-24 16:30',
    status: 'In Progress',
    priority: 'High',
    comments: 'Item PL-11-001 gasket replaced and pressure tested; remaining Cat A items pending final torque stamp.',
    criteria: [
      { label: 'Zero open Category A punch items', verified: false },
      { label: 'Contractor remedial works signed off (CP Sign)', verified: true },
      { label: 'NDE / RT examination records archived', verified: true }
    ]
  },
  {
    id: 'task-104',
    taskCode: 'APP-FL-1104',
    title: 'Overhead Vapor Line Flange Joint Tightness QA Approval',
    tabKey: 'tab3',
    tabName: '3. Flange Quality',
    equipmentNo: '11-C-101 (16" 150#)',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Somboon S. (Mechanic)',
    assignedRole: 'Turnover Lead',
    approverName: 'Somchai Prasert, PE',
    submissionDate: '2026-09-24 14:00',
    approvalDate: '2026-09-24 15:45',
    status: 'Approved',
    priority: 'High',
    comments: 'Flange faces cleaned, new spiral gasket verified, cross-pattern bolt sequence executed with calibrated torque wrench.',
    criteria: [
      { label: 'หน้าแปลนสะอาด สภาพดี', verified: true },
      { label: 'ประเก็นใหม่และสะอาด', verified: true },
      { label: 'ชนิด ขนาด ของประเก็นถูกต้องตามกำหนด', verified: true },
      { label: 'ประกอบน็อตตามลำดับ (bolt sequence)', verified: true }
    ]
  },
  {
    id: 'task-105',
    taskCode: 'APP-TO-1105',
    title: 'Final System Turnover & Custody Transfer Certificate Authorization',
    tabKey: 'tab4',
    tabName: '4. Turnover Certificate',
    equipmentNo: 'SYS-11-CRUDE-01 Complex',
    systemNo: 'SYS-11-CRUDE-01',
    unitNo: 'Unit 11',
    initiator: 'Somchai Prasert, PE',
    assignedRole: 'SD Manager',
    approverName: 'Dr. Wichai Thongchai',
    submissionDate: '2026-09-24 15:00',
    approvalDate: '',
    status: 'Pending',
    priority: 'Critical',
    comments: 'All Stage 1-3 deliverables satisfied with 2 documented carry-over exceptions in turnover register.',
    criteria: [
      { label: 'Turnover Lead prepared & digitally signed', verified: true },
      { label: 'Authorized exception list documented', verified: true },
      { label: 'De-blind clearance & Flange Police complete', verified: true },
      { label: 'SD Manager executive final sign-off', verified: false }
    ]
  }
];

interface InspectionCheckSheetProps {
  onNavigateHome?: () => void;
  defaultTab?: string;
}

export default function InspectionCheckSheet({ onNavigateHome, defaultTab = 'approval-dashboard' }: InspectionCheckSheetProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const { 
    jobs, 
    selectedJobId, 
    selectedJob, 
    setSelectedJobId,
    approvalTasks, 
    approveTask, 
    rejectTask, 
    updateTaskCriteria,
    isJobTurnoverBlocked,
    canIssueTurnoverCertificate 
  } = usePlantTurnShared();

  const [selectedTaskState, setSelectedTaskState] = useState<InspectionApprovalTask | null>(null);

  // Selected task resolves from selectedTaskState, or matching current job, or first available
  const selectedTask = useMemo(() => {
    if (selectedTaskState) {
      const live = approvalTasks.find(t => t.id === selectedTaskState.id);
      if (live) return live;
    }
    const jobSpecific = approvalTasks.find(t => t.jobId === selectedJobId);
    return jobSpecific || approvalTasks[0];
  }, [approvalTasks, selectedTaskState, selectedJobId]);

  const setSelectedTask = (t: InspectionApprovalTask) => {
    setSelectedTaskState(t);
  };

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Decision Modal / Inline Form State
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return approvalTasks.filter(t => {
      const matchStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchRole = filterRole === 'All' || t.assignedRole === filterRole;
      const matchSearch = t.taskCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.equipmentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.approverName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchRole && matchSearch;
    });
  }, [approvalTasks, filterStatus, filterRole, searchQuery]);

  const pendingCount = approvalTasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = approvalTasks.filter(t => t.status === 'In Progress').length;
  const approvedCount = approvalTasks.filter(t => t.status === 'Approved').length;
  const rejectedCount = approvalTasks.filter(t => t.status === 'Rejected').length;

  const handleApprove = (taskId: string) => {
    approveTask(taskId, selectedTask?.approverName || 'Somchai Prasert, PE', approvalComment);
    setActionSuccessNotice(`Task ${selectedTask?.taskCode} has been officially APPROVED & recorded in job dossier!`);
    setIsRejecting(false);
    setApprovalComment('');
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleReject = (taskId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason or deficiency note.');
      return;
    }
    rejectTask(taskId, selectedTask?.approverName || 'Inspector', rejectionReason);
    setActionSuccessNotice(`Task ${selectedTask?.taskCode} REJECTED and auto-logged as Punch List (Cat A) blocker.`);
    setIsRejecting(false);
    setRejectionReason('');
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleToggleCriterion = (taskId: string, index: number) => {
    const task = approvalTasks.find(t => t.id === taskId);
    if (task && task.criteria[index]) {
      updateTaskCriteria(taskId, index, !task.criteria[index].verified);
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Header Hub Strip with Task Approval Module Branding */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <ClipboardCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>Task Approval & Inspection Module</span>
              </span>
              <span className="text-slate-400 text-xs">• Unit 11 Multi-Gate Clearance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Inspection Check Sheet & Task Approval</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-role authorization workflow linking equipment closing, punch lists, flange QA compliance, and final turnover certification with real-time approvals.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Clock size={14} className="text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">{pendingCount} Pending Approvals</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="gap-1.5 cursor-pointer text-xs"
          >
            <Printer size={14} />
            <span>Print Dossier</span>
          </Button>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          SHARED SINGLE SOURCE OF TRUTH: Job Selector & Turnover Sync Status Bar
         ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 rounded-2xl border border-slate-700/60 text-white shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                  Active Job Selection • Single Source of Truth
                </span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono border border-indigo-400/30">
                  Synced across 3 Modules
                </span>
              </div>
              <div className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                <span>{selectedJob.jobNo}: {selectedJob.title}</span>
              </div>
            </div>
          </div>

          {/* Quick Job Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="shared-job-selector" className="text-xs text-slate-300 font-bold shrink-0">
              เลือก Job สำหรับการตรวจ:
            </label>
            <select
              id="shared-job-selector"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[240px]"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.jobNo} — {j.assetTag || j.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Metadata & Synchronized Health Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/50 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Work Order / Tag</span>
            <span className="font-bold text-slate-200 truncate">{selectedJob.workOrder} • {selectedJob.assetTag || selectedJob.refCode || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Plant / Unit</span>
            <span className="font-bold text-slate-200 truncate">{selectedJob.plant} • {selectedJob.unit.split('(')[0]}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Punch List Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                selectedJob.punchList.some(p => p.category === 'A' && p.status !== 'Resolved')
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                Cat A: {selectedJob.punchList.filter(p => p.category === 'A' && p.status !== 'Resolved').length} open
              </span>
              <span className="text-[10px] text-slate-400">
                (Total {selectedJob.punchList.length})
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Turnover Gate Status</span>
            <div className="mt-0.5">
              {isJobTurnoverBlocked(selectedJob.id).blocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/40">
                  <ShieldAlert size={11} />
                  <span>Turnover Blocked</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                  <CheckCircle2 size={11} />
                  <span>Turnover Ready</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation including Approval Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <TabsList className="w-full flex-wrap sm:flex-nowrap justify-start h-auto gap-1 bg-transparent border-0 p-0">
            {/* Task Approval Hub */}
            <TabsTrigger 
              value="approval-dashboard" 
              className="flex-1 py-3 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white shadow-xs"
            >
              <ShieldCheck size={16} className={activeTab === 'approval-dashboard' ? 'text-white' : 'text-indigo-600'} />
              <div className="text-left">
                <div className="font-black flex items-center gap-1.5">
                  <span>Task Approval Hub</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-80 font-normal">Review, Endorse & Sign</div>
              </div>
            </TabsTrigger>

            {/* Form 1 */}
            <TabsTrigger 
              value="tab1" 
              className="flex-1 py-3 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all"
            >
              <CheckSquare size={16} className={activeTab === 'tab1' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <div className="text-left">
                <div className="font-bold">1. Equipment Closing</div>
                <div className="text-[10px] text-slate-400 font-normal">Appendix A & B (Box Up)</div>
              </div>
            </TabsTrigger>

            {/* Form 2 */}
            <TabsTrigger 
              value="tab2" 
              className="flex-1 py-3 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all"
            >
              <ListOrdered size={16} className={activeTab === 'tab2' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <div className="text-left">
                <div className="font-bold">2. Punch & Butt List</div>
                <div className="text-[10px] text-slate-400 font-normal">Multi-Discipline Log</div>
              </div>
            </TabsTrigger>

            {/* Form 3 */}
            <TabsTrigger 
              value="tab3" 
              className="flex-1 py-3 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all"
            >
              <Wrench size={16} className={activeTab === 'tab3' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <div className="text-left">
                <div className="font-bold">3. Flange Quality</div>
                <div className="text-[10px] text-slate-400 font-normal">Torque & Flange Police</div>
              </div>
            </TabsTrigger>

            {/* Form 4 */}
            <TabsTrigger 
              value="tab4" 
              className="flex-1 py-3 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all"
            >
              <Award size={16} className={activeTab === 'tab4' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <div className="text-left">
                <div className="font-bold">4. Turnover Certificate</div>
                <div className="text-[10px] text-slate-400 font-normal">Executive Acceptance</div>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =========================================================================
            APPROVAL DASHBOARD TAB: Interactive Inspection Task Approval Module
           ========================================================================= */}
        <TabsContent value="approval-dashboard" className="space-y-6">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Pending Approvals</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {pendingCount} Tasks
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Action required immediately</div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Under Technical Review</span>
                <Sparkles size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {inProgressCount} Tasks
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Inspector review in progress</div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Approved & Certified</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {approvedCount} Tasks
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Digitally signed & stamped</div>
            </div>

            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Rejected / Deficient</span>
                <XCircle size={16} className="text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {rejectedCount} Tasks
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Returned for punch remediation</div>
            </div>
          </div>

          {/* Main 2-Column Approval Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Filterable Task Register (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-wider">
                        Approval Task Queue
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select a task to review verification criteria and execute decision
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {filteredTasks.length} queued
                    </Badge>
                  </div>

                  {/* Filter Bar */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      options={[
                        { value: 'All', label: 'All Statuses' },
                        { value: 'Pending', label: 'Pending' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Approved', label: 'Approved' },
                        { value: 'Rejected', label: 'Rejected' },
                      ]}
                      className="h-7 text-xs"
                    />
                    <Select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      options={[
                        { value: 'All', label: 'All Roles' },
                        { value: 'Turnover Lead', label: 'Turnover Lead' },
                        { value: 'TSS Inspector', label: 'TSS Inspector' },
                        { value: 'PES Engineer', label: 'PES Engineer' },
                        { value: 'OPS Lead', label: 'OPS Lead' },
                        { value: 'SD Manager', label: 'SD Manager' },
                      ]}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="mt-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search task code, equipment..."
                      className="h-7 text-xs"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-2 space-y-2 max-h-[620px] overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No approval tasks matching the selected filters.
                    </div>
                  ) : (
                    filteredTasks.map((t) => {
                      const isSelected = selectedTask?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-400'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                {t.taskCode}
                              </span>
                              <Badge
                                variant={
                                  t.status === 'Approved'
                                    ? 'success'
                                    : t.status === 'Pending'
                                    ? 'warning'
                                    : t.status === 'Rejected'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-[9px] px-1.5 py-0"
                              >
                                {t.status}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.submissionDate.split(' ')[0]}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
                            {t.title}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500">
                            <span className="font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {t.tabName}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {t.assignedRole}: {t.approverName}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Detailed Review & Approval Action Station (7 cols) */}
            <div className="lg:col-span-7">
              {selectedTask ? (
                <Card className="border-2 border-indigo-200 dark:border-indigo-900 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600" />
                  
                  <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-indigo-600 border-indigo-300">
                            {selectedTask.taskCode}
                          </Badge>
                          <Badge
                            variant={
                              selectedTask.status === 'Approved'
                                ? 'success'
                                : selectedTask.status === 'Pending'
                                ? 'warning'
                                : selectedTask.status === 'Rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            Status: {selectedTask.status}
                          </Badge>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedTask.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedTask.priority} Priority
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5">
                          {selectedTask.title}
                        </h2>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab(selectedTask.tabKey)}
                        className="gap-1.5 text-xs border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>Jump to Form View</span>
                        <ChevronRight size={14} />
                      </Button>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equipment No:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedTask.equipmentNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System / Unit:</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{selectedTask.systemNo} ({selectedTask.unitNo})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Initiator:</span>
                        <span className="text-slate-700 dark:text-slate-300">{selectedTask.initiator}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Gatekeeper:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTask.assignedRole}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Verification Checklist Items */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between mb-2">
                        <span>Quality Acceptance Criteria (Prerequisite Checklist)</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          {selectedTask.criteria.filter(c => c.verified).length} of {selectedTask.criteria.length} Verified
                        </span>
                      </h3>

                      <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/30">
                        {selectedTask.criteria.map((crit, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleToggleCriterion(selectedTask.id, idx)}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <span className={`font-medium ${crit.verified ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                              {crit.label}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                crit.verified 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {crit.verified ? 'Verified' : 'Pending Check'}
                              </span>
                              <input
                                type="checkbox"
                                checked={crit.verified}
                                onChange={() => handleToggleCriterion(selectedTask.id, idx)}
                                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Notes / Comments */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                        Inspection Log & Review Comments:
                      </label>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                        {selectedTask.comments}
                      </div>
                    </div>

                    {selectedTask.rejectionReason && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                        <strong className="block font-bold">Deficiency / Rejection Reason:</strong>
                        {selectedTask.rejectionReason}
                      </div>
                    )}

                    {/* Decision Action Module */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCheck size={16} className="text-indigo-600" />
                        <span>Gatekeeper Authorization Action</span>
                      </h3>

                      {!isRejecting ? (
                        <div className="space-y-3">
                          <Input
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                            placeholder="Optional sign-off comment or approval reference note..."
                            className="h-8 text-xs"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              onClick={() => handleApprove(selectedTask.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs shadow-md cursor-pointer flex-1"
                            >
                              <ThumbsUp size={15} />
                              <span>Authorize & Sign (Approve)</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsRejecting(true)}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 text-xs cursor-pointer"
                            >
                              <ThumbsDown size={14} />
                              <span>Reject / Request Punch</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20 space-y-3">
                          <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-300 font-bold">
                            <span>Specify Remedial Requirement (Rejection Reason):</span>
                            <button
                              onClick={() => setIsRejecting(false)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-normal"
                            >
                              Cancel
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Detail non-compliance, failed criteria, or punch list items requiring completion prior to re-submission..."
                            className="w-full text-xs p-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsRejecting(false)}
                              className="text-xs cursor-pointer"
                            >
                              Back
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReject(selectedTask.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 cursor-pointer shadow-sm"
                            >
                              <XCircle size={14} />
                              <span>Confirm Rejection</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="bg-slate-50 dark:bg-slate-800/60 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="font-mono text-[11px]">
                      Designated Signer: {selectedTask.approverName} ({selectedTask.assignedRole})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedTask.approvalDate ? `Approved on: ${selectedTask.approvalDate}` : 'Pending digital signature endorsement'}
                    </span>
                  </CardFooter>
                </Card>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  Please select an approval task from the queue to view details and execute decision.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            EXISTING FORM TABS (Preserved with improved UI)
           ========================================================================= */}
        {/* Tab 1: Equipment Closing, Box up and Turnover */}
        <TabsContent value="tab1">
          <Tab1EquipmentClosing />
        </TabsContent>

        {/* Tab 2: Punch & Butt List */}
        <TabsContent value="tab2">
          <Tab2PunchList />
        </TabsContent>

        {/* Tab 3: Flange Make-up / Quality Checklist */}
        <TabsContent value="tab3">
          <Tab3FlangeChecklist />
        </TabsContent>

        {/* Tab 4: Turnover Certificate */}
        <TabsContent value="tab4">
          <Tab4TurnoverCertificate />
        </TabsContent>
      </Tabs>
    </div>
  );
}
