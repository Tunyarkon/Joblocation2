import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  QrCode, Camera, CheckCircle2, Upload, AlertCircle, 
  FileText, ShieldCheck, X, Sparkles, RefreshCw, Smartphone 
} from 'lucide-react';

interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stageName: string;
  defaultTag?: string;
  requiredDocs?: string[];
  onSuccessScan?: (scannedData: any) => void;
}

export default function QrScanModal({
  isOpen,
  onClose,
  title,
  stageName,
  defaultTag = '11-E-101A',
  requiredDocs = ['Inspection Photo', 'Field Checklist Sign-off'],
  onSuccessScan
}: QrScanModalProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<string>('Refinery Area 11 (Lat: 12.7154, Lng: 101.1428)');
  const [simulatedTag, setSimulatedTag] = useState(defaultTag);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScannedResult(`QR-TAG://${simulatedTag}/SYSTEM-11/STAMP-20260924`);
    }, 1200);
  };

  const handleSimulateUpload = () => {
    const newDoc = `Photo_${simulatedTag}_${Date.now().toString().slice(-4)}.jpg`;
    setUploadedFiles(prev => [...prev, newDoc]);
  };

  const handleConfirm = () => {
    onSuccessScan?.({
      tag: simulatedTag,
      scannedResult,
      filesCount: uploadedFiles.length,
      timestamp: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <QrCode size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[9px] bg-blue-600">On-Site QR</Badge>
                <span className="text-[11px] text-slate-400 font-mono">{stageName}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Target Tag Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Select Field Equipment / Joint QR Tag:
            </label>
            <select
              value={simulatedTag}
              onChange={(e) => setSimulatedTag(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              <option value="11-E-101A">11-E-101A (Crude Preheat Exchanger Shell/Tube)</option>
              <option value="11-C-101">11-C-101 (Atmospheric Distillation Column Tray #1-42)</option>
              <option value="11-V-104">11-V-104 (Reflux Accumulator Drum Nozzle)</option>
              <option value="FL-11-E101-N1">FL-11-E101-N1 (Suction Flange Joint 300#)</option>
              <option value="12-R-101">12-R-101 (Desulfurization Reactor Bed)</option>
            </select>
          </div>

          {/* Scanner Viewport Simulator */}
          <div className="relative rounded-xl border-2 border-dashed border-blue-400/60 dark:border-blue-500/40 bg-slate-950 p-6 flex flex-col items-center justify-center text-center overflow-hidden min-h-48">
            {scanning ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-blue-400 animate-pulse">
                  Acquiring camera optical feed & decoding QR matrix...
                </span>
              </div>
            ) : scannedResult ? (
              <div className="space-y-2 animate-in zoom-in-95">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={22} />
                </div>
                <div className="text-xs font-black text-white">QR Code Verified On-Site</div>
                <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/90 px-3 py-1 rounded-md border border-slate-800">
                  {scannedResult}
                </div>
                <div className="text-[10px] text-slate-400">
                  📍 Verified at {gpsLocation}
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Camera size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Point Camera at Physical QR Tag</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Weatherproof QR tags affixed on vessel nameplates & flange joints</div>
                </div>
                <Button 
                  onClick={handleSimulateScan}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 shadow-md"
                >
                  <Smartphone size={14} />
                  <span>Scan QR Code Now</span>
                </Button>
              </div>
            )}
          </div>

          {/* Upload Attachments / Field Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Upload Field Photos & Inspection Evidence:
              </label>
              <Button 
                onClick={handleSimulateUpload} 
                variant="outline" 
                size="sm" 
                className="h-7 text-[11px] gap-1 cursor-pointer"
              >
                <Upload size={12} />
                <span>Attach Photo</span>
              </Button>
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
                No photos attached yet. Take or attach geo-tagged photos for this stage.
              </div>
            ) : (
              <div className="space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-emerald-600" />
                      <span className="font-mono text-slate-800 dark:text-slate-200">{file}</span>
                    </div>
                    <Badge variant="success" className="text-[9px]">Uploaded</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button 
            disabled={!scannedResult}
            onClick={handleConfirm}
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            <span>Confirm & Record to Dossier</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
