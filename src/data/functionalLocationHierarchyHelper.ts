import { 
  S2_TURNOVER_HIERARCHY, 
  UnitRecord, 
  SystemRecord, 
  EquipmentRecord, 
  RowHighlightType 
} from './s2FunctionalLocationData';
import { 
  INITIAL_MAPPED_MARKERS, 
  getStoredMappedMarkers, 
  MappedLocationMarker 
} from './plotPlanMappingData';

export interface FlatAssetHierarchyItem {
  nodeId: string;
  unitId: string;
  unitName: string;
  unitFullName: string;
  systemId: string;
  systemName: string;
  systemDescription: string;
  level: number;
  levelType: 'unit' | 'system' | 'equipment' | 'component' | 'instrument' | 'subsystem' | 'custom';
  tag: string;
  name: string;
  refCode?: string;
  description?: string;
  highlight?: RowHighlightType;
  isCriticalPath?: boolean;
  status?: string;
  breadcrumbPath: string;
  parentTag?: string;
  plotPlanMarker?: MappedLocationMarker;
}

/**
 * Traverses S2_TURNOVER_HIERARCHY and flattens all units, systems, equipment, and components
 * with linked plot plan markers and full breadcrumb path.
 */
export function getAllFlattenedAssets(): FlatAssetHierarchyItem[] {
  const result: FlatAssetHierarchyItem[] = [];
  const markers = getStoredMappedMarkers();

  S2_TURNOVER_HIERARCHY.forEach(unit => {
    unit.systems.forEach(system => {
      // Recursive equipment visitor
      const traverseEquipment = (
        eqList: EquipmentRecord[], 
        currentLevel: number, 
        parentPath: string, 
        parentTag?: string
      ) => {
        eqList.forEach((eq, idx) => {
          const nodeId = `${unit.id}-eq-${eq.tag.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`;
          const currentPath = `${parentPath} > ${eq.tag}`;
          const levelType = currentLevel === 3 ? 'equipment' : currentLevel === 4 ? 'component' : 'instrument';

          // Look up if this asset has a pre-mapped spatial marker on the plot plan
          const marker = markers.find(m => 
            m.nodeId === nodeId || 
            m.tag.toLowerCase() === eq.tag.toLowerCase() ||
            (m.refCode && eq.refCode && m.refCode === eq.refCode)
          );

          result.push({
            nodeId,
            unitId: unit.id,
            unitName: unit.name,
            unitFullName: unit.fullName,
            systemId: system.id,
            systemName: system.name,
            systemDescription: system.description || 'Process System Boundary',
            level: currentLevel,
            levelType,
            tag: eq.tag,
            name: eq.tag,
            refCode: eq.refCode,
            description: eq.description,
            highlight: eq.highlight,
            isCriticalPath: !!eq.isCriticalPath,
            status: eq.status || 'Ready for Turnover',
            breadcrumbPath: currentPath,
            parentTag,
            plotPlanMarker: marker
          });

          if (eq.children && eq.children.length > 0) {
            traverseEquipment(eq.children, currentLevel + 1, currentPath, eq.tag);
          }
        });
      };

      const systemPath = `${unit.name.split(' ')[0]} > ${system.name}`;
      traverseEquipment(system.equipment, 3, systemPath);
    });
  });

  return result;
}

/**
 * Returns available units from S2_TURNOVER_HIERARCHY
 */
export function getHierarchyUnits(): { id: string; name: string; fullName: string; systemCount: number }[] {
  return S2_TURNOVER_HIERARCHY.map(u => ({
    id: u.id,
    name: u.name,
    fullName: u.fullName,
    systemCount: u.systems.length
  }));
}

/**
 * Returns systems belonging to a unit by unitId or unitName
 */
export function getSystemsForUnit(unitIdentifier: string): SystemRecord[] {
  if (!unitIdentifier) return [];
  const unit = S2_TURNOVER_HIERARCHY.find(u => 
    u.id.toLowerCase() === unitIdentifier.toLowerCase() ||
    u.name.toLowerCase().includes(unitIdentifier.toLowerCase()) ||
    unitIdentifier.toLowerCase().includes(u.name.toLowerCase().split(' ')[0])
  );
  return unit ? unit.systems : [];
}

/**
 * Returns equipment directly under a system
 */
export function getEquipmentForSystem(unitIdentifier: string, systemIdentifier: string): EquipmentRecord[] {
  const systems = getSystemsForUnit(unitIdentifier);
  const sys = systems.find(s => 
    s.id.toLowerCase() === systemIdentifier.toLowerCase() ||
    s.name.toLowerCase() === systemIdentifier.toLowerCase() ||
    systemIdentifier.toLowerCase().includes(s.name.toLowerCase())
  );
  return sys ? sys.equipment : [];
}

/**
 * Searches assets by query string across tag, name, description, unit, and system
 */
export function searchAssets(query: string): FlatAssetHierarchyItem[] {
  const all = getAllFlattenedAssets();
  if (!query.trim()) return all;
  const q = query.toLowerCase().trim();
  return all.filter(a => 
    a.tag.toLowerCase().includes(q) ||
    (a.description && a.description.toLowerCase().includes(q)) ||
    (a.refCode && a.refCode.toLowerCase().includes(q)) ||
    a.systemName.toLowerCase().includes(q) ||
    a.unitName.toLowerCase().includes(q) ||
    a.breadcrumbPath.toLowerCase().includes(q)
  );
}

/**
 * Finds a specific asset by its tag or ref code
 */
export function findAssetByTag(tagOrRef: string): FlatAssetHierarchyItem | undefined {
  if (!tagOrRef) return undefined;
  const all = getAllFlattenedAssets();
  const clean = tagOrRef.trim().toLowerCase();
  return all.find(a => 
    a.tag.toLowerCase() === clean || 
    (a.refCode && a.refCode.toLowerCase() === clean) ||
    clean.includes(a.tag.toLowerCase())
  );
}
