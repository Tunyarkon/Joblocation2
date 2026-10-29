import React, { useRef, useState, useEffect } from 'react';
import { Eraser, RotateCcw, Check, PenTool, User, AlertCircle } from 'lucide-react';

interface DigitalSignaturePadProps {
  signerName: string;
  onSignerNameChange: (name: string) => void;
  onSaveSignature: (signatureDataUrl: string) => void;
  disabled?: boolean;
}

export default function DigitalSignaturePad({
  signerName,
  onSignerNameChange,
  onSaveSignature,
  disabled = false
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [penColor, setPenColor] = useState('#0f172a'); // Slate 900
  const [penSize, setPenSize] = useState(2.5);

  // Setup Canvas with High DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;

    // Save initial blank state
    const blank = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([blank]);
  }, []);

  // Update stroke style when color/size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
  }, [penColor, penSize]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    if ('touches' in e) {
      // Prevent scrolling while drawing on tablet/mobile
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    if ('touches' in e) {
      e.preventDefault(); // Prevent touch scroll
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();

    // Push state to history
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory(prev => [...prev.slice(-10), state]);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    setStrokeHistory([]);
  };

  const handleUndo = () => {
    if (strokeHistory.length <= 1) {
      handleClear();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...strokeHistory];
    newHistory.pop(); // Remove current
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setStrokeHistory(newHistory);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl);
  };

  return (
    <div className="space-y-4">
      {/* Printed Name Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <User size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Printed Full Name (ชื่อ-นามสกุล ตัวบรรจง) <span className="text-rose-500">*</span></span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Official Plant Signer</span>
        </label>
        <input
          type="text"
          value={signerName}
          onChange={e => onSignerNameChange(e.target.value)}
          placeholder="e.g. Somchai Prasert (Operation Shift Sup.)"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 min-h-[44px]"
        />
      </div>

      {/* Touch-Friendly Drawing Canvas Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <PenTool size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Digital Signature Canvas (เซ็นชื่อดิจิทัลด้วยนิ้วหรือปากกา) <span className="text-rose-500">*</span></span>
          </label>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
            Touch / Pen Ready
          </span>
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ touchAction: 'none' }}
            className="w-full h-44 sm:h-52 cursor-crosshair block"
          />

          {/* Guide Line */}
          <div className="absolute left-6 right-6 bottom-10 border-b border-slate-200 dark:border-slate-800 pointer-events-none flex items-end justify-between pb-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Sign on the line</span>
            <span className="text-[10px] text-slate-400 font-mono">×</span>
          </div>

          {!hasDrawn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
              <PenTool size={26} className="text-slate-300 dark:text-slate-600 mb-1 animate-bounce" />
              <span className="text-xs font-semibold">Draw signature here (ใช้นิ้วหรือปากกาวาดลายเซ็นที่นี่)</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Touch & Tablet Optimized Canvas</span>
            </div>
          )}
        </div>

        {/* Canvas Toolbar Controls (Touch-friendly 44px buttons) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Pen Color Presets */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { color: '#0f172a', label: 'Black' },
              { color: '#0284c7', label: 'Blue' },
              { color: '#0d9488', label: 'Teal' }
            ].map(item => (
              <button
                key={item.color}
                type="button"
                onClick={() => setPenColor(item.color)}
                className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center cursor-pointer ${
                  penColor === item.color ? 'scale-110 shadow-xs ring-2 ring-teal-500' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: item.color }}
                title={item.label}
              >
                {penColor === item.color && <Check size={13} className="text-white" />}
              </button>
            ))}
          </div>

          {/* Actions: Undo / Clear / Lock */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokeHistory.length <= 1}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
            >
              <RotateCcw size={14} />
              <span>ย้อนกลับ (Undo)</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Eraser size={14} />
              <span>ล้าง (Clear)</span>
            </button>

            {hasDrawn && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <Check size={14} />
                <span>ยืนยันลายเซ็น (Apply)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
