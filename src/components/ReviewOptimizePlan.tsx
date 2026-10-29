import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, SlidersHorizontal, 
  Calendar, Clock, Truck, User, ArrowRight, ShieldCheck, 
  Search, Filter, ChevronRight, Check, X, RefreshCw
} from 'lucide-react';

interface RequestItem {
  id: string;
  jobNo: string;
  contractor: string;
  requiredDate: string;
  timeSlot: string;
  capacityNeeded: string;
  location: string;
  status: 'Wait for Review' | 'Conflict' | 'Assigned' | 'Rejected';
  assignedCrane?: string;
  conflictReason?: string;
}

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'REQ-101',
    jobNo: 'CR-2026-0922-01',
    contractor: 'Apex Engineering Ltd',
    requiredDate: '2026-09-24',
    timeSlot: '08:00 - 12:00',
    capacityNeeded: '50T Mobile Crane',
    location: 'Zone B - Unit 04',
    status: 'Wait for Review'
  },
  {
    id: 'REQ-102',
    jobNo: 'CR-2026-0922-02',
    contractor: 'Thai Industrial Scaffolding',
    requiredDate: '2026-09-24',
    timeSlot: '10:00 - 16:00',
    capacityNeeded: '80T Rough Terrain',
    location: 'BCP Jetty Area A',
    status: 'Conflict',
    conflictReason: 'Overlapping schedule with CR-2026-0899 at Jetty Gate 2'
  },
  {
    id: 'REQ-103',
    jobNo: 'CR-2026-0922-03',
    contractor: 'Eastern Mechanical Corp',
    requiredDate: '2026-09-25',
    timeSlot: '07:00 - 15:00',
    capacityNeeded: '100T All-Terrain',
    location: 'Flare Stack 2',
    status: 'Assigned',
    assignedCrane: 'Liebherr LTM-1100 (Fleet #C-12)'
  },
  {
    id: 'REQ-104',
    jobNo: 'CR-2026-0922-04',
    contractor: 'Global Lift Services',
    requiredDate: '2026-09-25',
    timeSlot: '13:00 - 17:00',
    capacityNeeded: '25T City Crane',
    location: 'Workshop North',
    status: 'Wait for Review'
  },
  {
    id: 'REQ-105',
    jobNo: 'CR-2026-0922-05',
    contractor: 'Mega Structures Co.',
    requiredDate: '2026-09-26',
    timeSlot: '08:00 - 18:00',
    capacityNeeded: '200T Crawler Crane',
    location: 'Tank Farm TF-08',
    status: 'Rejected',
    conflictReason: 'Ground bearing pressure study required before permit'
  }
];

const AVAILABLE_CRANES = [
  { id: 'C-01', name: 'Kato 25T City Crane', type: '25T Mobile', status: 'Available', currentZone: 'Main Yard' },
  { id: 'C-04', name: 'Kato 50T Mobile Crane', type: '50T Mobile', status: 'Available', currentZone: 'Zone B' },
  { id: 'C-08', name: 'Tadano 80T Rough Terrain', type: '80T RT', status: 'Maintenance', currentZone: 'Workshop' },
  { id: 'C-12', name: 'Liebherr LTM-1100 (100T)', type: '100T AT', status: 'Reserved', currentZone: 'Flare Stack 2' },
  { id: 'C-15', name: 'Demag CC2800 (600T)', type: 'Crawler', status: 'Available', currentZone: 'Heavy Lift Yard' },
];

export default function ReviewOptimizePlan() {
  const [requests, setRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);
  const [assignModal, setAssignModal] = useState<RequestItem | null>(null);
  const [rejectModal, setRejectModal] = useState<RequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedCrane, setSelectedCrane] = useState(AVAILABLE_CRANES[1].name);

  const handleAssign = () => {
    if (!assignModal) return;
    setRequests(prev => prev.map(r => r.id === assignModal.id ? {
      ...r,
      status: 'Assigned',
      assignedCrane: selectedCrane,
      conflictReason: undefined
    } : r));
    setAssignModal(null);
  };

  const handleReject = () => {
    if (!rejectModal) return;
    setRequests(prev => prev.map(r => r.id === rejectModal.id ? {
      ...r,
      status: 'Rejected',
      conflictReason: rejectReason || 'Scheduling or capacity conflict'
    } : r));
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
              <SlidersHorizontal size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Review Plan & Optimize
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Equipment Optimizer console: Check crane availability, resolve conflicts, assign equipment & handle rejections
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            Optimization Engine Active
          </div>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Wait for Review</span>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {requests.filter(r => r.status === 'Wait for Review').length} Requests
          </div>
          <span className="text-[10px] text-gray-400">Require Optimizer validation</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Schedule Conflicts</span>
          <div className="text-2xl font-black text-red-500 mt-1">
            {requests.filter(r => r.status === 'Conflict').length} Flagged
          </div>
          <span className="text-[10px] text-red-400">Needs alternative slot or crane</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cranes Assigned</span>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {requests.filter(r => r.status === 'Assigned').length} Ready
          </div>
          <span className="text-[10px] text-emerald-500">Wait for Execution lock</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fleet Availability</span>
          <div className="text-2xl font-black text-blue-500 mt-1">
            3 / 5 Ready
          </div>
          <span className="text-[10px] text-gray-400">60% utilization today</span>
        </div>
      </div>

      {/* Main Grid: Request Review List & Crane Fleet Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Request Review List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Truck size={15} className="text-blue-500" />
                Submitted Requests Queue
              </h3>
              <span className="text-[10px] font-mono text-gray-400">Sorted by Priority & Date</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {requests.map(req => (
                <div key={req.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">{req.jobNo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.status === 'Assigned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          req.status === 'Conflict' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          req.status === 'Rejected' ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{req.contractor}</div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {req.requiredDate} ({req.timeSlot})</span>
                        <span className="flex items-center gap-1"><Truck size={12} /> {req.capacityNeeded}</span>
                        <span>Location: {req.location}</span>
                      </div>
                      {req.assignedCrane && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                          <CheckCircle2 size={13} />
                          Assigned: {req.assignedCrane}
                        </div>
                      )}
                      {req.conflictReason && (
                        <div className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 pt-1">
                          <AlertTriangle size={13} />
                          Reason: {req.conflictReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {req.status !== 'Assigned' && (
                        <button 
                          onClick={() => setAssignModal(req)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Check size={14} />
                          <span>Assign Crane</span>
                        </button>
                      )}
                      {req.status !== 'Rejected' && (
                        <button 
                          onClick={() => setRejectModal(req)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <X size={14} />
                          <span>Reject / Reassign</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Fleet Availability & Quick Assign Panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Crane Availability Matrix</span>
              <span className="text-[10px] text-emerald-500 font-normal">Live GPS</span>
            </h3>

            <div className="space-y-2.5">
              {AVAILABLE_CRANES.map(crane => (
                <div key={crane.id} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-gray-800 dark:text-gray-200">{crane.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {crane.type} • Current: <span className="text-gray-600 dark:text-gray-300">{crane.currentZone}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    crane.status === 'Available' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                    crane.status === 'Reserved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                    'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                  }`}>
                    {crane.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-md space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">Optimizer Rule Hints</h4>
            <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Max travel speed inside plant is restricted to 15 km/h.</li>
              <li>Dual-lift operations require level 3 certified rigger approval.</li>
              <li>Any job with wind gusts &gt; 35 knots triggers auto-standby notice.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Assign Crane for {assignModal.jobNo}
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div><strong className="text-gray-500">Contractor:</strong> {assignModal.contractor}</div>
              <div><strong className="text-gray-500">Required:</strong> {assignModal.capacityNeeded} ({assignModal.requiredDate})</div>
              <div><strong className="text-gray-500">Location:</strong> {assignModal.location}</div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Select Available Fleet Unit:</label>
              <select 
                value={selectedCrane} 
                onChange={(e) => setSelectedCrane(e.target.value)}
                className="w-full p-2 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-medium"
              >
                {AVAILABLE_CRANES.filter(c => c.status !== 'Maintenance').map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type} - {c.status})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setAssignModal(null)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-red-600 dark:text-red-400">
              Reject / Flag Conflict: {rejectModal.jobNo}
            </h3>
            <p className="text-xs text-gray-500">Please provide a reason so the Contractor/Planner can revise the schedule or lifting plan.</p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Rejection Reason:</label>
              <textarea 
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g. Boom length insufficient for required clearance, or ground load study required."
                className="w-full p-2.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setRejectModal(null)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
              >
                Submit Reject Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
