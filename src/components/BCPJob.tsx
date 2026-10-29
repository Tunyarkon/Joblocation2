import { useState } from 'react';
import { Calendar, CheckCircle, Search, XCircle, Eye, Filter, MapPin, Pickaxe } from 'lucide-react';

export default function BCPJob() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">BCP Job List <span className="text-gray-400 font-normal text-sm ml-2 italic">CR04</span></h2>
      </div>
      
      {/* Search Filter Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Date From</label>
            <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" defaultValue="2022-09-19" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Date End</label>
            <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" defaultValue="2022-09-30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Section</label>
            <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" defaultValue="All">
              <option>All</option>
              <option>Maintenance</option>
              <option>Operations</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Status</label>
            <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option>All Statuses</option>
              <option className="italic">Pending Review</option>
              <option className="italic">Approved</option>
              <option className="italic">Completed</option>
            </select>
          </div>
          <button className="bg-slate-900 text-white font-bold py-2 rounded-lg text-xs hover:bg-slate-800 transition-colors shadow-md w-full">Search Database</button>
        </div>
      </div>

      {/* Data Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">No.</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job No</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Section</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plant</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Description</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">M/C Type</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4 text-xs font-mono text-gray-400">01</td>
                  <td className="p-4 text-xs font-mono font-bold text-blue-600 underline cursor-pointer">BCP-2200001</td>
                  <td className="p-4 text-xs text-gray-600 font-medium">Maintenance</td>
                  <td className="p-4 text-xs font-bold">BCP</td>
                  <td className="p-4 text-xs text-gray-600">Routine Checkup</td>
                  <td className="p-4 text-xs text-gray-600">Mobile Crane</td>
                  <td className="p-4 text-xs font-mono text-gray-400">2022-09-19 22:00</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-100 text-orange-600 border border-orange-200">
                      Pending Review
                    </span>
                  </td>
                  <td className="p-4 flex space-x-2">
                    <button className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded hover:bg-blue-600 transition-colors">
                      Review
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4 text-xs font-mono text-gray-400">02</td>
                  <td className="p-4 text-xs font-mono font-bold text-blue-600 underline cursor-pointer">BCP-2200002</td>
                  <td className="p-4 text-xs text-gray-600 font-medium">Operations</td>
                  <td className="p-4 text-xs font-bold">BCP</td>
                  <td className="p-4 text-xs text-gray-600">Install New Equipment</td>
                  <td className="p-4 text-xs text-gray-600">Tower Crane</td>
                  <td className="p-4 text-xs font-mono text-gray-400">2022-09-20 08:00</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-600 border border-blue-200">
                      Approved
                    </span>
                  </td>
                  <td className="p-4 flex space-x-2">
                    <button className="px-3 py-1 border border-blue-500 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-50 transition-colors">
                      View Details
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
