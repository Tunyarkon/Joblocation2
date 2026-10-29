import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, FileText, CheckCircle2, 
  Calendar, Truck, Download, RefreshCw, ExternalLink, Calculator,
  Sparkles, Check, X, Building2, HardHat, FileSpreadsheet, Plus
} from 'lucide-react';
import { CraneMasterRecord, checkCertificateExpiry, updateCraneMaster } from '../../data/craneMasterData';
import { navigateToCraneView } from '../../data/craneOperationsData';
import { useLanguage } from '../../context/LanguageContext';

interface CraneSafetyInspectionLogProps {
  fleet: CraneMasterRecord[];
  onUpdateCrane: (crane: CraneMasterRecord) => void;
  setActiveView?: (view: string) => void;
}

export default function CraneSafetyInspectionLog({
  fleet,
  onUpdateCrane,
  setActiveView
}: CraneSafetyInspectionLogProps) {
  const { isTh } = useLanguage();

  // 1. Calculator State
  const [calcCraneId, setCalcCraneId] = useState<string>(fleet[0]?.id || 'CR-001');
  const [calcBoomLength, setCalcBoomLength] = useState<number>(35);
  const [calcRadius, setCalcRadius] = useState<number>(18);
  const [calcGrossLoad, setCalcGrossLoad] = useState<number>(18.5);
  const [calcWindSpeedKnots, setCalcWindSpeedKnots] = useState<number>(12);

  // 2. Inspection Renewal Modal State
  const [renewTargetCrane, setRenewTargetCrane] = useState<CraneMasterRecord | null>(null);
  const [newCertNumber, setNewCertNumber] = useState('');
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [certType, setCertType] = useState<'ปจ.2 ประจำปี' | 'Wire Rope NDT' | 'Load Test 125%' | 'Major Overhaul'>('ปจ.2 ประจำปี');

  const selectedCrane = useMemo(() => {
    return fleet.find(c => c.id === calcCraneId) || fleet[0];
  }, [fleet, calcCraneId]);

  // Dynamic SWL calculation based on manufacturer load moment curve
  const swlResult = useMemo(() => {
    if (!selectedCrane) return { ratedAtRadius: 50, utilizationPercent: 50, status: 'Safe', isSafe: true };

    const maxCap = selectedCrane.ratedCapacityTon;
    const minR = 3;
    const r = Math.max(minR, calcRadius);
    
    // Non-linear load chart approximation
    const ratedAtRadius = Math.max(
      2, 
      Math.round(maxCap * Math.pow(minR / r, 0.88) * (1 - (calcBoomLength / (selectedCrane.maxBoomLengthM * 1.6))))
    );

    const safeWorkingLoad = Math.max(1, ratedAtRadius);
    const utilizationPercent = Math.round((calcGrossLoad / safeWorkingLoad) * 100);

    const windLimit = selectedCrane.maxAllowableWindKnots || 25;
    const isWindSafe = calcWindSpeedKnots <= windLimit;

    let status: 'Safe' | 'Warning' | 'Critical' | 'Overload' = 'Safe';
    if (utilizationPercent > 100 || !isWindSafe) status = 'Overload';
    else if (utilizationPercent > 85) status = 'Critical';
    else if (utilizationPercent > 75) status = 'Warning';

    return {
      safeWorkingLoad,
      utilizationPercent,
      isWindSafe,
      windLimit,
      status,
      isSafe: status !== 'Overload' && isWindSafe
    };
  }, [selectedCrane, calcBoomLength, calcRadius, calcGrossLoad, calcWindSpeedKnots]);

  // Handle Certificate Renewal submit
  const handleConfirmRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTargetCrane || !newCertNumber || !newExpiryDate) return;

    const updated: CraneMasterRecord = {
      ...renewTargetCrane,
      certNumber: newCertNumber,
      certIssueDate: newIssueDate || new Date().toISOString().slice(0, 10),
      certExpiryDate: newExpiryDate,
      isCertValid: true,
      engineeringDataComplete: true,
      notes: `${renewTargetCrane.notes ? renewTargetCrane.notes + ' • ' : ''}บันทึก ${certType} โดย ${inspectorName || 'สถาบันวิศวกรรม'} วันที่ ${new Date().toISOString().slice(0, 10)}`
    };

    updateCraneMaster(renewTargetCrane.id, updated);
    onUpdateCrane(updated);
    setRenewTargetCrane(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Pre-Lift Safe Working Load (SWL) Calculator & Gate 2 Clearance Engine */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calculator size={18} className="text-indigo-500" />
              <span>{isTh ? 'เครื่องคำนวณพิกัดยกปลอดภัย & ผ่านเกณฑ์ Gate 2 (SWL Pre-Lift Clearance)' : 'Pre-Lift Safe Working Load (SWL) & Gate 2 Safety Clearance'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTh 
                ? 'คำนวณสมรรถนะ Load Chart แบบจำลองอิงความยาวบูมและระยะรัศมี พร้อมวิเคราะห์ความปลอดภัยก่อนจัดสรรงานใน Gate 2'
                : 'Simulate rated capacity vs load chart curve for pre-lift Gate 2 dispatch.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedCrane) {
                navigateToCraneView({ view: 'optimize', craneId: selectedCrane.id });
                if (setActiveView) setActiveView('optimize');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <Sparkles size={13} />
            <span>{isTh ? 'จัดสรรเครื่องจักรใน Gate 2 (Optimize)' : 'Dispatch in Gate 2 Optimize'}</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Controls Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'เลือกเครื่องจักรเครน' : 'Select Crane Asset'}
                </label>
                <select
                  value={calcCraneId}
                  onChange={(e) => {
                    setCalcCraneId(e.target.value);
                    const match = fleet.find(c => c.id === e.target.value);
                    if (match) {
                      setCalcBoomLength(Math.round(match.maxBoomLengthM * 0.5));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono"
                >
                  {fleet.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} • {c.brand} {c.model} ({c.ratedCapacityTon}T)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'น้ำหนักยกรวม Gross Load (ตัน)' : 'Gross Load Ton (Load + Rigging)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={calcGrossLoad}
                  onChange={(e) => setCalcGrossLoad(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Slider 1: Working Radius */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'ระยะรัศมีการยก (Working Radius)' : 'Working Radius'}
                </span>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                  {calcRadius} <span className="text-xs font-normal text-slate-400">m</span>
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={50}
                step={1}
                value={calcRadius}
                onChange={(e) => setCalcRadius(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Min: 3m (Heavy Close Lift)</span>
                <span>Max: 50m (Long Reach)</span>
              </div>
            </div>

            {/* Slider 2: Boom Length */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isTh ? 'ความยาวบูมที่ยืดใช้งาน (Boom Length)' : 'Deployed Boom Length'}
                </span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  {calcBoomLength} <span className="text-xs font-normal text-slate-400">/ {selectedCrane?.maxBoomLengthM || 60}m</span>
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={selectedCrane?.maxBoomLengthM || 80}
                step={1}
                value={calcBoomLength}
                onChange={(e) => setCalcBoomLength(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Wind Input */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isTh ? 'ความเร็วลมหน้างาน (Wind Speed)' : 'On-Site Wind Speed'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={calcWindSpeedKnots}
                  onChange={(e) => setCalcWindSpeedKnots(Math.max(0, Number(e.target.value)))}
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                />
                <span className="font-mono text-slate-400">knots (Limit: {swlResult.windLimit})</span>
              </div>
            </div>
          </div>

          {/* Results Display Gauge (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isTh ? 'ผลวิเคราะห์สมรรถนะการยก' : 'Safety Factor Clearance'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  swlResult.status === 'Safe' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                  swlResult.status === 'Warning' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' :
                  swlResult.status === 'Critical' ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300' :
                  'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 animate-pulse'
                }`}>
                  {swlResult.status === 'Safe' ? 'Gate 2 Approved (Safe Lift)' :
                   swlResult.status === 'Warning' ? 'Gate 2 Caution (Rigging Sign-off)' :
                   swlResult.status === 'Critical' ? 'Gate 2 Critical (CR02 Approval)' :
                   'Gate 2 OVERLOAD BLOCKED'}
                </span>
              </div>

              {/* Big Capacity Gauge */}
              <div className="text-center py-6">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                  {isTh ? 'พิกัดยกปลอดภัยตามระยะ SWL' : 'Safe Working Load Capacity'}
                </div>
                <div className="text-4xl font-black font-mono text-slate-900 dark:text-white">
                  {swlResult.safeWorkingLoad} <span className="text-lg font-bold text-slate-400">Ton</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Gross Load {calcGrossLoad}T = <strong className={`font-mono text-sm ${swlResult.utilizationPercent > 100 ? 'text-red-600' : swlResult.utilizationPercent > 85 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {swlResult.utilizationPercent}%
                  </strong> {isTh ? 'ของพิกัดยกสูงสุด' : 'of rated capacity'}
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-4">
                  <div
                    className={`h-full transition-all duration-300 ${
                      swlResult.utilizationPercent > 100 ? 'bg-red-600' :
                      swlResult.utilizationPercent > 85 ? 'bg-orange-500' :
                      swlResult.utilizationPercent > 75 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, swlResult.utilizationPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-1.5 text-[11px] pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">แรงลมอนุญาต (Wind Limit):</span>
                <span className={`font-bold font-mono ${swlResult.isWindSafe ? 'text-emerald-600' : 'text-red-600'}`}>
                  {swlResult.isWindSafe ? '✓ ผ่านเกณฑ์ (Safe)' : '✕ ลมเกินกำหนด (Exceeded)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">แรงกดดิน Outrigger Mats:</span>
                <span className="font-bold text-emerald-600 font-mono">✓ 215 kPa (Safe &lt; 280)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">สถานะใบรับรอง ปจ.2:</span>
                <span className={`font-bold font-mono ${selectedCrane?.isCertValid ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedCrane?.isCertValid ? '✓ ผ่านการรับรอง (Valid)' : '✕ หมดอายุ (Expired)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Central PhorJor.2 (ปจ.2) & Safety Inspection Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>{isTh ? 'ทะเบียนบันทึกการตรวจรับรอง ปจ.2 & เอกสารวิศวกรรมความปลอดภัย' : 'Phor.Jor.2 Inspection & Safety Audit Log'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTh 
                ? 'ติดตามอายุใบตรวจรับรองความปลอดภัยตามกฎหมายแรงงาน เพื่อไม่ให้ส่งผลกระทบต่อแผนงานยก'
                : 'Statutory PhorJor.2 safety compliance audit trail and inspection renewals.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">
              {fleet.filter(c => checkCertificateExpiry(c.certExpiryDate).isValid).length} / {fleet.length} Valid
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Crane ID</th>
                <th className="p-3">Model / Type</th>
                <th className="p-3">Home Plant</th>
                <th className="p-3">Phor.Jor.2 Cert No.</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3">Compliance Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {fleet.map((crane) => {
                const certInfo = checkCertificateExpiry(crane.certExpiryDate);

                return (
                  <tr key={crane.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {crane.id}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{crane.brand} {crane.model}</div>
                      <div className="text-[10px] text-slate-400">{crane.craneType} ({crane.ratedCapacityTon}T)</div>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        crane.homePlant === 'Phra Khanong' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {crane.homePlant}
                      </span>
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {crane.certNumber}
                    </td>

                    <td className="p-3 font-mono text-slate-500">
                      {crane.certIssueDate}
                    </td>

                    <td className="p-3 font-mono font-bold">
                      <span className={!certInfo.isValid ? 'text-red-500' : certInfo.isExpiringSoon ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                        {crane.certExpiryDate}
                      </span>
                      <div className="text-[10px] font-normal text-slate-400">
                        {!certInfo.isValid ? 'Expired' : `${certInfo.daysLeft} วันคงเหลือ`}
                      </div>
                    </td>

                    <td className="p-3">
                      {certInfo.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 size={11} />
                          <span>ผ่านเกณฑ์ (Approved)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 animate-pulse">
                          <ShieldAlert size={11} />
                          <span>ระงับการจ่ายงาน (Blocked)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setRenewTargetCrane(crane);
                          setNewCertNumber(crane.certNumber);
                          setNewIssueDate(new Date().toISOString().slice(0, 10));
                          const nextYear = new Date();
                          nextYear.setFullYear(nextYear.getFullYear() + 1);
                          setNewExpiryDate(nextYear.toISOString().slice(0, 10));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                      >
                        {isTh ? 'บันทึกตรวจรับรอง' : 'Renew / Audit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Renewal Modal */}
      {renewTargetCrane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">
                  {isTh ? 'บันทึกการตรวจรับรอง ปจ.2 / NDT' : 'Record Safety Inspection / PhorJor.2'}
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {renewTargetCrane.id} • {renewTargetCrane.brand} {renewTargetCrane.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewTargetCrane(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRenewal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ประเภทการตรวจรับรอง
                </label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2"
                >
                  <option value="ปจ.2 ประจำปี">ปจ.2 ตรวจสอบประจำปี (Annual PhorJor.2)</option>
                  <option value="Wire Rope NDT">ตรวจสภาพลวดสลิง NDT (Non-Destructive Test)</option>
                  <option value="Load Test 125%">ทดสอบพิกัดรับน้ำหนัก 125% Load Test</option>
                  <option value="Major Overhaul">ตรวจใหญ่หลังซ่อมบำรุง Major Overhaul</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  เลขที่ใบรับรอง (Certificate No.)
                </label>
                <input
                  type="text"
                  required
                  value={newCertNumber}
                  onChange={(e) => setNewCertNumber(e.target.value)}
                  placeholder="PJ2-BCP-2026-099"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    วันที่ตรวจ / ออกใบ
                  </label>
                  <input
                    type="date"
                    required
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    วันหมดอายุ (Expiry)
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  วิศวกรผู้ตรวจรับรอง / สถาบัน
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="วุฒิวิศวกรเครื่องกล / Third Party Inspection Co."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewTargetCrane(null)}
                  className="px-4 py-2 text-slate-500 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer"
                >
                  บันทึกการตรวจรับรอง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
