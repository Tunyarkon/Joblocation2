import React, { useState, useMemo } from 'react';
import { 
  FolderTree, Search, X, Check, MapPin, 
  Layers, Building2, Tag, ShieldCheck, ChevronRight, 
  Cpu, Flame, ExternalLink, Sparkles, Filter, CornerDownRight,
  FolderOpen
} from 'lucide-react';
import { 
  FlatAssetHierarchyItem, 
  getAllFlattenedAssets, 
  getHierarchyUnits 
} from '../../data/functionalLocationHierarchyHelper';

interface AssetHierarchySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: FlatAssetHierarchyItem) => void;
  selectedAssetTag?: string;
  initialUnitId?: string;
}

export default function AssetHierarchySelectModal({
  isOpen,
  onClose,
  onSelectAsset,
  selectedAssetTag,
  initialUnitId
}: AssetHierarchySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>(initialUnitId || 'all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [mappedOnly, setMappedOnly] = useState(false);

  const units = useMemo(() => getHierarchyUnits(), []);
  const allAssets = useMemo(() => getAllFlattenedAssets(), []);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(item => {
      // Unit filter
      if (selectedUnitFilter !== 'all' && item.unitId !== selectedUnitFilter && !item.unitName.includes(selectedUnitFilter)) {
        return false;
      }
      // Critical path filter
      if (criticalOnly && !item.isCriticalPath) {
        return false;
      }
      // Mapped on plot plan filter
      if (mappedOnly && !item.plotPlanMarker) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.tag.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.refCode && item.refCode.toLowerCase().includes(q)) ||
          item.systemName.toLowerCase().includes(q) ||
          item.unitName.toLowerCase().includes(q) ||
          item.breadcrumbPath.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAssets, selectedUnitFilter, criticalOnly, mappedOnly, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <FolderTree size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Browse Functional Location & Asset Hierarchy</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {allAssets.length} Assets
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select an engineering asset to bind with the Turnaround Job Location package and plot plan blueprint.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tag (e.g. S2-DR, 11-C, F-101), description, system, or ref code (e.g. 10-03)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Unit Filter Pills & Checkboxes */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setSelectedUnitFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedUnitFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Units
              </button>
              {units.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitFilter(u.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                    selectedUnitFilter === u.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {u.name.split(' ')[0]} ({u.systemCount} Sys)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={e => setCriticalOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-600 border-slate-300 cursor-pointer"
                />
                <span className="text-amber-600 dark:text-amber-400 font-bold">★ Critical Path</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={mappedOnly}
                  onChange={e => setMappedOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer"
                />
                <span className="text-blue-600 dark:text-blue-400">📍 Mapped on Plot Plan</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Found <strong className="text-slate-800 dark:text-slate-200">{filteredAssets.length}</strong> matching assets in hierarchy
          </span>
          <span className="font-mono text-slate-400">
            Click any row to bind asset with Job Location
          </span>
        </div>

        {/* Asset Items List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
          {filteredAssets.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <FolderTree size={36} className="mx-auto opacity-30" />
              <p className="text-xs font-semibold">No equipment found matching criteria "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedUnitFilter('all'); setCriticalOnly(false); setMappedOnly(false); }}
                className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredAssets.map(item => {
              const isSelected = selectedAssetTag && selectedAssetTag.toLowerCase() === item.tag.toLowerCase();

              return (
                <div
                  key={item.nodeId}
                  onClick={() => {
                    onSelectAsset(item);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Top Row: Unit > System > Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        {item.unitName.split(' ')[0]}
                      </span>
                      <span>›</span>
                      <span className="text-slate-500 font-semibold truncate max-w-xs">
                        {item.systemName}
                      </span>
                      {item.refCode && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            Ref: {item.refCode}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Main Tag & Description */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.tag}
                      </span>

                      {item.description && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-md">
                          — {item.description}
                        </span>
                      )}

                      {/* Level Pill */}
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                        L{item.level} • {item.levelType}
                      </span>

                      {/* Critical Path Badge */}
                      {item.isCriticalPath && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          ★ CRITICAL PATH
                        </span>
                      )}

                      {/* Project / EWR highlight */}
                      {item.highlight && item.highlight !== 'none' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          item.highlight === 'EWR' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.highlight}
                        </span>
                      )}
                    </div>

                    {/* Bottom Metadata: Plot Plan Location */}
                    {item.plotPlanMarker ? (
                      <div className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-medium pt-0.5">
                        <MapPin size={11} className="shrink-0" />
                        <span>
                          Mapped on Plot Plan: Grid <strong className="font-mono font-bold">{item.plotPlanMarker.gridZone}</strong> (X: {item.plotPlanMarker.x}%, Y: {item.plotPlanMarker.y}%)
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">
                        Not yet plotted on spatial blueprint (Spatial location can be pinned later)
                      </div>
                    )}
                  </div>

                  {/* Right Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}
                    >
                      {isSelected ? <Check size={14} /> : <CornerDownRight size={14} />}
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Selected asset will automatically populate Job Title, Unit, System, Ref Code, and Plot Plan coordinates.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
