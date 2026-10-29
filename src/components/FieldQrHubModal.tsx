import React, { useState } from 'react';
import { 
  X, QrCode, Camera, Download, Printer, Search, CheckCircle2, 
  MapPin, Building2, ExternalLink, ShieldCheck, RefreshCw, Smartphone
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface FieldQrHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToJob?: (jobId: string) => void;
  isTh?: boolean;
}

const SAMPLE_TAGS = [
  { tag: '11-E-101A', name: 'Crude Preheat Exchanger Shell/Tube', unit: 'Unit 11', plant: 'Phra Khanong', type: 'Equipment' },
  { tag: 'S2-DR-001D-180', name: 'Desalter Drum Vessel (Primary Grid)', unit: 'APS-1', plant: 'Phra Khanong', type: 'Vessel' },
  { tag: 'S2-VF-201', name: 'Vacuum Furnace Overhaul Chamber', unit: 'VPS-2', plant: 'Sriracha', type: 'Furnace' },
  { tag: 'CRN-26001', name: '500T Mobile Heavy Lift Crane (Reactor)', unit: 'Main Yard', plant: 'Phra Khanong', type: 'Crane' },
  { tag: 'CRN-26012', name: 'Kato 25T City Crane (Tube Pull)', unit: 'Zone B', plant: 'Phra Khanong', type: 'Crane' },
  { tag: 'SF-TAG-901', name: 'Tower Modular Scaffolding Green Tag', unit: 'APS-1', plant: 'Phra Khanong', type: 'Scaffold' },
];

export default function FieldQrHubModal({
  isOpen,
  onClose,
  onNavigateToJob,
  isTh = true
}: FieldQrHubModalProps) {
  const [activeTab, setActiveTab] = useState<'scanner' | 'generator'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [selectedTagForPass, setSelectedTagForPass] = useState(SAMPLE_TAGS[0]);
  const [customPassId, setCustomPassId] = useState('JOB-WO-2026-0924');

  if (!isOpen) return null;

  const handleSimulateScan = (tagItem: typeof SAMPLE_TAGS[0]) => {
    setIsScanning(true);
    setScannedResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScannedResult(tagItem);
    }, 800);
  };

  const handlePrintQrBadge = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  Field Support Tool
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isTh ? 'QR Field Scanner & Generator Hub' : 'Field QR Scanner & Pass Generator'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera size={16} />
            <span>{isTh ? '1. สแกน QR หน้างาน (Field Scanner)' : '1. Field QR Scanner'}</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrCode size={16} />
            <span>{isTh ? '2. สร้าง QR Pass ประจำงาน (Generator)' : '2. Generate QR Pass'}</span>
          </button>
        </div>

        {/* Tab 1: Scanner View */}
        {activeTab === 'scanner' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-950 text-white p-6 flex flex-col items-center justify-center min-h-[200px]">
              {/* Camera Scanner Viewfinder */}
              <div className="relative w-44 h-44 rounded-2xl border-2 border-emerald-500/80 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                
                {isScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw size={28} className="text-emerald-400 animate-spin" />
                    <span className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">Scanning...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Camera size={32} />
                    <span className="text-[10px] font-mono tracking-wider">Point Camera at QR</span>
                  </div>
                )}

                {/* Animated scan bar */}
                <div className="absolute inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-bounce"></div>
              </div>

              <p className="text-xs text-slate-400 mt-4 text-center">
                {isTh ? 'สแกนป้าย QR ประจำจุดเครื่องจักร / รถเครน / นั่งร้านเพื่อดึงข้อมูลสดทันที' : 'Scan equipment, crane, or scaffolding QR tags for real-time field status'}
              </p>
            </div>

            {/* Quick Mock Scan Buttons */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                {isTh ? 'หรือทดสอบเลือกสแกนป้ายจำลองหน้างาน (Simulated Tags):' : 'Or simulate field scan from tag registry:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SAMPLE_TAGS.map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => handleSimulateScan(tag)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-emerald-500 text-left text-xs transition-all cursor-pointer"
                  >
                    <span className="font-mono font-bold text-slate-900 dark:text-white block truncate">{tag.tag}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scanned Result Card */}
            {scannedResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                      QR Tag Verified
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    {scannedResult.type}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white font-mono">{scannedResult.tag}</h4>
                  <p className="text-slate-600 dark:text-slate-300">{scannedResult.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Plant: {scannedResult.plant} • {scannedResult.unit}</p>
                </div>

                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex gap-2">
                  <button
                    onClick={() => {
                      onNavigateToJob?.(scannedResult.tag);
                      onClose();
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>{isTh ? 'เปิดดูรายละเอียดงาน (Open Job Details)' : 'Open Job Details'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Generator View */}
        {activeTab === 'generator' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'เลือกรายการหรืออุปกรณ์ประจำจุด:' : 'Select Target Equipment / Job:'}
                </label>
                <select
                  value={selectedTagForPass.tag}
                  onChange={(e) => {
                    const match = SAMPLE_TAGS.find(t => t.tag === e.target.value);
                    if (match) setSelectedTagForPass(match);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  {SAMPLE_TAGS.map(t => (
                    <option key={t.tag} value={t.tag}>{t.tag} - {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTh ? 'รหัสใบสั่งงาน (Work Order Ref):' : 'Work Order Ref:'}
                </label>
                <input
                  type="text"
                  value={customPassId}
                  onChange={(e) => setCustomPassId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Generated QR Pass Preview Card */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center gap-6 print:border-none print:p-0">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-md">
                <QRCodeSVG
                  value={`BCP-QR-PASS://${selectedTagForPass.tag}/${customPassId}/${selectedTagForPass.plant}`}
                  size={140}
                  level="H"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                  <ShieldCheck size={16} />
                  <span>Verified Field Security Badge</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {selectedTagForPass.tag}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {selectedTagForPass.name}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  WO: {customPassId} • Plant: {selectedTagForPass.plant}
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintQrBadge}
                className="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer size={15} />
                <span>{isTh ? 'พิมพ์ป้าย QR Badge ติดหน้างาน (Print)' : 'Print QR Pass Badge'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
