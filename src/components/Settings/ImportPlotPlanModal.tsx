import React, { useState } from 'react';
import { X, Upload, Check, FileCode, Sliders, Sparkles, Building2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PlantId } from '../../data/flocMasterData';

interface ImportPlotPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (presetKey: string, opacity: number, customUrl?: string) => void;
  currentPlantId: PlantId;
}

export const ENGINEERING_PRESETS = [
  {
    id: 'esso-sriracha-master',
    title: 'Master Plotplan Esso Sriracha Refinery',
    drawingNo: 'RD-001-A Rev 28 (2026)',
    plantId: 'sr' as PlantId,
    scale: '1:2000',
    type: 'Architectural Master Plot Plan',
    previewUrl: '/assets/esso_sriracha_master_plotplan.jpg',
    defaultOpacity: 85
  },
  {
    id: 'phra-khanong-master',
    title: 'Master Plotplan Phra Khanong Refinery',
    drawingNo: 'PK-RD-002-B Rev 19 (2026)',
    plantId: 'pk' as PlantId,
    scale: '1:1500',
    type: 'Process Complex Plot Plan',
    previewUrl: '/assets/BG_BCP.jpg',
    defaultOpacity: 80
  },
  {
    id: 'hcu-skid-layout',
    title: 'Unit 4 HCU & Hydroprocessing Skid Layout',
    drawingNo: 'HCU-SKID-04 Rev 6',
    plantId: 'sr' as PlantId,
    scale: '1:500',
    type: 'Unit Mechanical Plot Plan',
    previewUrl: '/assets/esso_sriracha_master_plotplan.jpg',
    defaultOpacity: 90
  },
  {
    id: 'cdu1-skid-layout',
    title: 'CDU-1 Atmospheric Distillation Master Plot Plan',
    drawingNo: 'CDU-DIST-01 Rev 4',
    plantId: 'pk' as PlantId,
    scale: '1:500',
    type: 'Unit Mechanical Plot Plan',
    previewUrl: '/assets/BG_BCP.jpg',
    defaultOpacity: 90
  }
];

export default function ImportPlotPlanModal({
  isOpen,
  onClose,
  onApplyPreset,
  currentPlantId
}: ImportPlotPlanModalProps) {
  const { isTh } = useLanguage();

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const match = ENGINEERING_PRESETS.find(p => p.plantId === currentPlantId);
    return match ? match.id : ENGINEERING_PRESETS[0].id;
  });
  const [opacity, setOpacity] = useState<number>(85);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileUrl, setCustomFileUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      const url = URL.createObjectURL(file);
      setCustomFileUrl(url);
    }
  };

  const handleApply = () => {
    onApplyPreset(selectedPresetId, opacity, customFileUrl || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isTh ? 'นำเข้าและตั้งค่าผัง CAD พิมพ์เขียว' : 'Import CAD Plot Plan Layout'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTh ? 'เลือก Drawing แม่แบบทางวิศวกรรม หรืออัปโหลดไฟล์ผังของคุณ' : 'Select engineering blueprint preset or upload custom file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Engineering Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              {isTh ? 'ผังพิมพ์เขียวมาตรฐานโรงงาน (Engineering Presets)' : 'Engineering Presets'}
            </label>
            <div className="space-y-2">
              {ENGINEERING_PRESETS.map((p) => {
                const isSelected = selectedPresetId === p.id && !customFile;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPresetId(p.id);
                      setCustomFile(null);
                      setCustomFileUrl(null);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{p.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                          {p.plantId}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {p.scale}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Drawing: {p.drawingNo} • {p.type}
                      </p>
                    </div>

                    <div className="shrink-0 ml-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload Custom File */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {isTh ? 'หรืออัปโหลดไฟล์ผัง CAD เอง (Upload Custom File)' : 'Or Upload Custom CAD File'}
            </label>
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Upload size={24} className="text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {customFile ? customFile.name : (isTh ? 'คลิกหรือลากไฟล์ผังมาวางที่นี่' : 'Click or drag CAD layout file here')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                รองรับ SVG, High-Res PNG, JPG, PDF-Vector
              </span>
              <input
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Opacity Calibration Slider */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders size={13} className="text-indigo-500" />
                {isTh ? 'ความเข้มของลายเส้นพิมพ์เขียว (CAD Line Opacity)' : 'CAD Line Opacity'}
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{opacity}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>15% (เบาบาง เน้นพิน)</span>
              <span>85% (สมดุล)</span>
              <span>100% (พิมพ์เขียวชัดเจน)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors flex items-center gap-1.5"
          >
            <Check size={14} />
            {isTh ? 'บันทึกและปรับใช้ผัง' : 'Apply Layout'}
          </button>
        </div>
      </div>
    </div>
  );
}
