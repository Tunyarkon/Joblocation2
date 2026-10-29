import React, { useState } from 'react';
import { 
  History, DollarSign, Download, Filter, Search, Clock, 
  CheckCircle2, FileText, Calendar, Fuel, Truck, User, 
  ArrowUpRight, AlertCircle, ChevronDown, CheckCheck
} from 'lucide-react';

interface LoggedJob {
  id: string;
  jobNo: string;
  contractor: string;
  equipment: string;
  operator: string;
  location: string;
  date: string;
  plannedHours: number;
  actualHours: number;
  fuelLiters: number;
  hourlyRate: number;
  totalCost: number;
  status: 'Closed' | 'Audit Pending' | 'Signed-Off';
  signOffBy: string;
}

const MOCK_HISTORY: LoggedJob[] = [
  {
    id: 'CL-8091',
    jobNo: 'CR-2026-0891',
    contractor: 'Apex Engineering Ltd',
    equipment: 'Kato 50T Mobile Crane',
    operator: 'Somchai Prasert',
    location: 'Zone B - Unit 04',
    date: '2026-09-21',
    plannedHours: 8.0,
    actualHours: 7.5,
    fuelLiters: 110,
    hourlyRate: 185,
    totalCost: 1387.50,
    status: 'Signed-Off',
    signOffBy: 'M. Phromthep (Optimizer)'
  },
  {
    id: 'CL-8090',
    jobNo: 'CR-2026-0888',
    contractor: 'Thai Industrial Scaffolding',
    equipment: 'Tadano 80T Rough Terrain',
    operator: 'Narit Wongsawat',
    location: 'BCP Jetty Area A',
    date: '2026-09-20',
    plannedHours: 12.0,
    actualHours: 13.0,
    fuelLiters: 195,
    hourlyRate: 240,
    totalCost: 3120.00,
    status: 'Closed',
    signOffBy: 'K. Somkiat (Site Mgr)'
  },
  {
    id: 'CL-8089',
    jobNo: 'CR-2026-0884',
    contractor: 'Eastern Mechanical Corp',
    equipment: 'Liebherr 100T All-Terrain',
    operator: 'Preecha Rattanawich',
    location: 'Main Yard - Flare Stack 2',
    date: '2026-09-19',
    plannedHours: 6.0,
    actualHours: 6.0,
    fuelLiters: 88,
    hourlyRate: 310,
    totalCost: 1860.00,
    status: 'Audit Pending',
    signOffBy: 'Pending Cost Validation'
  },
  {
    id: 'CL-8088',
    jobNo: 'CR-2026-0879',
    contractor: 'Apex Engineering Ltd',
    equipment: 'Kato 25T City Crane',
    operator: 'Kittisak Boonme',
    location: 'Tank Farm TF-12',
    date: '2026-09-18',
    plannedHours: 4.0,
    actualHours: 4.5,
    fuelLiters: 48,
    hourlyRate: 135,
    totalCost: 607.50,
    status: 'Signed-Off',
    signOffBy: 'M. Phromthep (Optimizer)'
  },
  {
    id: 'CL-8087',
    jobNo: 'CR-2026-0875',
    contractor: 'Global Lift Services',
    equipment: 'Demag CC2800 Crawler',
    operator: 'Vichai Thammarat',
    location: 'Reactor Tower R-101',
    date: '2026-09-16',
    plannedHours: 16.0,
    actualHours: 15.0,
    fuelLiters: 340,
    hourlyRate: 480,
    totalCost: 7200.00,
    status: 'Signed-Off',
    signOffBy: 'A. Johnson (Job Lead)'
  }
];

export default function CloseoutHistory() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<LoggedJob | null>(null);

  const filteredLogs = MOCK_HISTORY.filter(item => {
    const matchesSearch = item.jobNo.toLowerCase().includes(search.toLowerCase()) ||
      item.contractor.toLowerCase().includes(search.toLowerCase()) ||
      item.equipment.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalSpent = filteredLogs.reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalHoursLogged = filteredLogs.reduce((acc, curr) => acc + curr.actualHours, 0);
  const totalFuel = filteredLogs.reduce((acc, curr) => acc + curr.fuelLiters, 0);

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
              <History size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Close-out & History
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Post-operation audit, usage logs (hours & fuel), and recorded cost reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('Exporting close-out audit ledger in CSV/Excel...')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Cost Ledger</span>
          </button>
          <button 
            onClick={() => alert('All pending audit records marked for monthly finance sync!')}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <CheckCheck size={14} />
            <span>Reconcile Month</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Recorded Cost</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">✓ Reconciled against POs</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actual Hours Logged</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {totalHoursLogged.toFixed(1)} hrs
            </h3>
            <p className="text-[10px] text-blue-600 font-medium mt-1">vs 46.0 planned hrs (-2.1%)</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fuel Consumed</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {totalFuel.toLocaleString()} L
            </h3>
            <p className="text-[10px] text-amber-600 font-medium mt-1">Avg 17.2 L/machine hour</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
            <Fuel size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Closed-out Jobs</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {filteredLogs.length} Records
            </h3>
            <p className="text-[10px] text-indigo-600 font-medium mt-1">100% digital sign-off completed</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/40">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search job#, contractor, equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-gray-400">Status:</span>
            {(['ALL', 'Signed-Off', 'Closed', 'Audit Pending'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  filterStatus === st 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                <th className="p-3.5">Log ID / Job</th>
                <th className="p-3.5">Equipment & Location</th>
                <th className="p-3.5">Contractor / Operator</th>
                <th className="p-3.5 text-center">Planned vs Actual</th>
                <th className="p-3.5 text-right">Fuel (L)</th>
                <th className="p-3.5 text-right">Total Recorded Cost</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
              {filteredLogs.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                        {item.id}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white font-mono">{item.jobNo}</div>
                        <div className="text-[10px] text-gray-400">{item.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{item.equipment}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {item.location}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-gray-800 dark:text-gray-200 font-medium">{item.contractor}</div>
                    <div className="text-[10px] text-gray-400">Op: {item.operator}</div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                      <span>{item.plannedHours}h</span>
                      <span className="text-gray-400">→</span>
                      <span className={item.actualHours > item.plannedHours ? 'text-amber-600' : 'text-emerald-600'}>
                        {item.actualHours}h
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-mono text-gray-700 dark:text-gray-300">
                    {item.fuelLiters} L
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                    ${item.totalCost.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'Signed-Off'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : item.status === 'Closed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button 
                      onClick={() => setSelectedLog(item)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                    >
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Close-out Certificate #{selectedLog.id}
                </h3>
                <p className="text-xs text-gray-500">Job Reference: {selectedLog.jobNo}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Equipment</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{selectedLog.equipment}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{selectedLog.location}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Contractor</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{selectedLog.contractor}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Operator</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{selectedLog.operator}</span>
                </div>
              </div>

              <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Planned Hours:</span>
                  <span className="font-mono font-semibold">{selectedLog.plannedHours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actual Machine Hours:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedLog.actualHours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate per Hour:</span>
                  <span className="font-mono">${selectedLog.hourlyRate}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fuel Logged:</span>
                  <span className="font-mono">{selectedLog.fuelLiters} Liters</span>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between text-sm font-bold">
                  <span>Total Reconciled Cost:</span>
                  <span className="text-emerald-600 font-mono">${selectedLog.totalCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Sign-off Authorization:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedLog.signOffBy}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
