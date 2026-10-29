import React, { useState, useRef } from 'react';
import { 
  Paperclip, Upload, FileText, Image as ImageIcon, FileSpreadsheet, 
  Trash2, Eye, Download, Plus, X, CheckCircle2, AlertCircle, 
  ExternalLink, Sparkles, FileCheck, ShieldCheck, Clock
} from 'lucide-react';
import { 
  JobAttachment, 
  AttachmentCategory, 
  ATTACHMENT_CATEGORIES, 
  SAMPLE_ATTACHMENT_TEMPLATES, 
  formatFileSize 
} from '../../data/jobAttachmentData';

interface JobAttachmentSectionProps {
  attachments: JobAttachment[];
  onAddAttachment: (attachment: JobAttachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  readOnly?: boolean;
  isTh?: boolean;
  title?: string;
  description?: string;
}

export default function JobAttachmentSection({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  readOnly = false,
  isTh = false,
  title,
  description
}: JobAttachmentSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('Lifting Plan');
  const [isDragging, setIsDragging] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<JobAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper for file type icons
  const renderFileIcon = (att: JobAttachment) => {
    if (att.type.startsWith('image/')) {
      return <ImageIcon size={18} className="text-blue-500 shrink-0" />;
    }
    if (att.type.includes('pdf')) {
      return <FileText size={18} className="text-rose-500 shrink-0" />;
    }
    if (att.type.includes('spreadsheet') || att.type.includes('excel') || att.type.includes('csv')) {
      return <FileSpreadsheet size={18} className="text-emerald-500 shrink-0" />;
    }
    return <Paperclip size={18} className="text-indigo-500 shrink-0" />;
  };

  // Process uploaded files
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileUrl = (e.target?.result as string) || '';
        const newAttachment: JobAttachment = {
          id: `att-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category: selectedCategory,
          url: fileUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Current User'
        };
        onAddAttachment(newAttachment);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        // For PDFs/docs, create an object URL or data URL
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick-attach a sample template for instant testing
  const handleAttachTemplate = (template: typeof SAMPLE_ATTACHMENT_TEMPLATES[0]) => {
    const newAttachment: JobAttachment = {
      ...template,
      id: `att-sample-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      uploadedAt: new Date().toISOString()
    };
    onAddAttachment(newAttachment);
  };

  const getCategoryBadgeClass = (cat: AttachmentCategory) => {
    const found = ATTACHMENT_CATEGORIES.find(c => c.value === cat);
    return found ? found.color : 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {title || (isTh ? 'เอกสารและไฟล์แนบประกอบงาน (Job Attachments)' : 'Job Attachments & Supporting Documents')}
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
            {attachments.length} {isTh ? 'ไฟล์' : 'files'}
          </span>
        </div>

        {description && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </div>

      {/* Upload & Dropzone Area (if not readOnly) */}
      {!readOnly && (
        <div className="space-y-3">
          {/* Category Selector & Quick Templates */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {isTh ? 'หมวดหมู่เอกสาร:' : 'Doc Category:'}
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AttachmentCategory)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ATTACHMENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {isTh ? cat.labelTh : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Sample Attachments */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                {isTh ? 'แนบตัวอย่างด่วน:' : 'Quick Template:'}
              </span>
              <button
                type="button"
                onClick={() => handleAttachTemplate(SAMPLE_ATTACHMENT_TEMPLATES[0])}
                className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer transition-colors"
                title="Attach Lifting Plan Sample PDF"
              >
                + Lifting Plan
              </button>
              <button
                type="button"
                onClick={() => handleAttachTemplate(SAMPLE_ATTACHMENT_TEMPLATES[1])}
                className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/40 cursor-pointer transition-colors"
                title="Attach PTW Permit Sample PDF"
              >
                + PTW Permit
              </button>
              <button
                type="button"
                onClick={() => handleAttachTemplate(SAMPLE_ATTACHMENT_TEMPLATES[2])}
                className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800/40 cursor-pointer transition-colors"
                title="Attach Phor.Jor.2 Cert Sample PDF"
              >
                + ปจ.2 Cert
              </button>
            </div>
          </div>

          {/* Drag & Drop Input Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30' 
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/40 dark:bg-slate-800/30'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              multiple 
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.dwg,.dxf"
            />
            
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Upload size={18} />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isTh ? 'ลากและวางไฟล์ที่นี่ หรือ คลิกเพื่อเลือกไฟล์' : 'Drag & drop files here, or click to browse'}
              </div>
              <p className="text-[10px] text-slate-400">
                Supports PDF, Images (PNG/JPG), Word, Excel, CAD Drawings (Up to 25MB per file)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
          <Paperclip size={20} className="mx-auto mb-1 text-slate-300 dark:text-slate-600" />
          <span>{isTh ? 'ยังไม่มีเอกสารแนบในคำขอนี้' : 'No attachments or documents uploaded for this job yet.'}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400/60 dark:hover:border-blue-600/60 transition-all flex items-center justify-between gap-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {renderFileIcon(att)}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
                      {att.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getCategoryBadgeClass(att.category)}`}>
                      {att.category}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span>{formatFileSize(att.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(att.uploadedAt).toLocaleDateString()} {new Date(att.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {att.uploadedBy && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500">{att.uploadedBy}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Preview, Download, Delete */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(att)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Preview Attachment"
                >
                  <Eye size={13} />
                </button>

                {att.url && (
                  <a
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer inline-flex items-center"
                    title="Download File"
                  >
                    <Download size={13} />
                  </a>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove Attachment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal for Images or Documents */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl overflow-hidden space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {renderFileIcon(previewAttachment)}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-md font-mono">
                    {previewAttachment.name}
                  </h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${getCategoryBadgeClass(previewAttachment.category)}`}>
                    {previewAttachment.category}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl min-h-[240px] max-h-[460px] overflow-hidden">
              {previewAttachment.type.startsWith('image/') ? (
                <img 
                  src={previewAttachment.url} 
                  alt={previewAttachment.name}
                  className="max-h-[380px] w-auto object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                    <FileCheck size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {previewAttachment.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatFileSize(previewAttachment.size)} • {previewAttachment.type}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 text-left space-y-1">
                    <div><strong>Document Classification:</strong> {previewAttachment.category}</div>
                    <div><strong>Uploaded Timestamp:</strong> {new Date(previewAttachment.uploadedAt).toLocaleString()}</div>
                    <div><strong>Authorization:</strong> Verified QA/QC Rigging Inspection</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={previewAttachment.url}
                download={previewAttachment.name}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
              >
                <Download size={14} />
                <span>{isTh ? 'ดาวน์โหลดเอกสาร' : 'Download Document'}</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                {isTh ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
