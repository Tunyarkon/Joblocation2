export type RowHighlightType = 'none' | 'EWR' | 'Project';

export interface EquipmentRecord {
  tag: string;
  refCode: string;
  highlight: RowHighlightType;
  isCriticalPath?: boolean;
  description?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Ready for Turnover';
  children?: EquipmentRecord[];
}

export interface SystemRecord {
  id: string;
  name: string;
  description?: string;
  equipment: EquipmentRecord[];
}

export interface UnitRecord {
  id: string;
  name: string;
  fullName: string;
  systems: SystemRecord[];
}

export const S2_TURNOVER_HIERARCHY: UnitRecord[] = [
  {
    id: 'unit-aps1',
    name: 'APS-1',
    fullName: 'Atmospheric Pressure Distillation Unit 1',
    systems: [
      {
        id: 'sys-11',
        name: 'System-11',
        description: 'Crude Feed Preheat & Desalter System',
        equipment: [
          { 
            tag: 'S2-DR-001D-180', 
            refCode: '10-03', 
            highlight: 'none', 
            isCriticalPath: true, 
            description: 'Desalter Drum Vessel',
            children: [
              {
                tag: 'S2-DR-001D-MTR-01',
                refCode: '10-03-A',
                highlight: 'none',
                isCriticalPath: true,
                description: 'Mixer Impeller Agitator Motor Skid',
                children: [
                  { tag: 'S2-IN-012 PCV-186', refCode: '10-16', highlight: 'none', isCriticalPath: true, description: 'Pressure Control Valve Loop' }
                ]
              },
              {
                tag: 'S2-DR-001D-BOOT',
                refCode: '10-03-B',
                highlight: 'EWR',
                isCriticalPath: false,
                description: 'Water Draw-off Boot Isolation Spool'
              }
            ]
          },
          { tag: 'S2-PIP-EWR-017', refCode: '10-51', highlight: 'EWR', isCriticalPath: true, description: 'Crude Transfer Piping Spool' },
          { tag: 'S2-SUP-PROJ-002', refCode: '10-60', highlight: 'Project', isCriticalPath: false, description: 'New Supplementary Tie-in Header' },
          { tag: 'S2-V-004A-110', refCode: '10-22', highlight: 'none', isCriticalPath: false, description: 'Pre-flash Drum Vent Condenser' },
          { 
            tag: 'S2-P-101A/B', 
            refCode: '10-34', 
            highlight: 'none', 
            isCriticalPath: false, 
            description: 'Raw Crude Booster Pumps',
            children: [
              { tag: 'S2-P-101A-SEAL', refCode: '10-34-A', highlight: 'Project', isCriticalPath: true, description: 'API 682 Plan 53B Mechanical Seal Skid' },
              { tag: 'S2-P-101B-FLG-01', refCode: '10-34-B', highlight: 'none', isCriticalPath: false, description: 'Suction Strainer & Bleeder Flange Assembly' }
            ]
          }
        ]
      },
      {
        id: 'sys-12',
        name: 'System-12',
        description: 'Atmospheric Furnace & Transfer Line',
        equipment: [
          { tag: 'S2-HX-001 E-108C', refCode: '10-05', highlight: 'none', isCriticalPath: true, description: 'Kerosene/Crude Exchanger Bundle' },
          { tag: 'S2-FUR-101 F-101', refCode: '10-08', highlight: 'EWR', isCriticalPath: true, description: 'Radiant Coil Return Bends' },
          { tag: 'S2-PIP-PROJ-014', refCode: '10-44', highlight: 'Project', isCriticalPath: false, description: 'Decoking Steam Purge Spool' }
        ]
      },
      {
        id: 'sys-13',
        name: 'System-13',
        description: 'Main Crude Column Overhead & Reflux',
        equipment: [
          { tag: 'S2-C-101 T-101', refCode: '10-12', highlight: 'none', isCriticalPath: true, description: 'Crude Fractionation Tower Trays' },
          { tag: 'S2-PIP-EWR-023', refCode: '10-55', highlight: 'EWR', isCriticalPath: false, description: 'Overhead Relief Line Re-routing' },
          { tag: 'S2-IN-145 FCV-201', refCode: '10-19', highlight: 'none', isCriticalPath: false, description: 'Reflux Flow Metering Orifice' }
        ]
      },
      {
        id: 'sys-14',
        name: 'System-14',
        description: 'Kerosene & Diesel Side Strippers',
        equipment: [
          { tag: 'S2-STR-102A C-102', refCode: '10-25', highlight: 'none', isCriticalPath: false, description: 'Side Stream Stripping Column' },
          { tag: 'S2-SUP-PROJ-018', refCode: '10-63', highlight: 'Project', isCriticalPath: true, description: 'Product Flash Point Analyser Tie-in' }
        ]
      },
      {
        id: 'sys-15',
        name: 'System-15',
        description: 'Atmospheric Residue Run-down Circuit',
        equipment: [
          { tag: 'S2-HX-109A/B', refCode: '10-31', highlight: 'none', isCriticalPath: false, description: 'Residue Trim Coolers' },
          { tag: 'S2-PIP-EWR-035', refCode: '10-58', highlight: 'EWR', isCriticalPath: true, description: 'Quench Injection Spool' }
        ]
      },
      {
        id: 'sys-16',
        name: 'System-16',
        description: 'Off-gas Compression & Fuel Gas Scrubber',
        equipment: [
          { tag: 'S2-K-101 COMP', refCode: '10-40', highlight: 'none', isCriticalPath: false, description: 'Wet Gas Compressor Skid' },
          { tag: 'S2-V-106 KO DRUM', refCode: '10-42', highlight: 'Project', isCriticalPath: false, description: 'Suction Knockout Pot' }
        ]
      },
      {
        id: 'sys-17',
        name: 'System-17',
        description: 'Sour Water Stripping & Degassing',
        equipment: [
          { tag: 'S2-SW-011 DRUM', refCode: '10-48', highlight: 'none', isCriticalPath: false, description: 'Sour Water Flash Drum' },
          { tag: 'S2-PIP-EWR-042', refCode: '10-72', highlight: 'EWR', isCriticalPath: false, description: 'Submerged Acid Gas Quench Line' }
        ]
      },
      {
        id: 'sys-18',
        name: 'System-18',
        description: 'Chemical Injection & Neutralizer Dosing',
        equipment: [
          { tag: 'S2-TK-105 AMINE', refCode: '10-65', highlight: 'none', isCriticalPath: false, description: 'Filming Amine Day Tank' },
          { tag: 'S2-IN-310 PH-01', refCode: '10-70', highlight: 'Project', isCriticalPath: false, description: 'In-line Overhead Condensate pH Sensor' }
        ]
      },
      {
        id: 'sys-19',
        name: 'System-19',
        description: 'Utility Steam Condensate & BFW Header',
        equipment: [
          { tag: 'S2-STM-020 HDR', refCode: '10-77', highlight: 'none', isCriticalPath: false, description: 'MP Steam Header Isolation' },
          { tag: 'S2-PIP-EWR-049', refCode: '10-82', highlight: 'EWR', isCriticalPath: true, description: 'Steam Trap Station Bypass' }
        ]
      },
      {
        id: 'sys-20',
        name: 'System-20',
        description: 'Closed Flare & Blowdown Drainage',
        equipment: [
          { tag: 'S2-FL-101 HDR', refCode: '10-88', highlight: 'none', isCriticalPath: true, description: 'Sub-header to LP Flare Header' },
          { tag: 'S2-V-109 SEAL', refCode: '10-91', highlight: 'Project', isCriticalPath: false, description: 'Liquid Seal Drum Connection' }
        ]
      },
      {
        id: 'sys-21',
        name: 'System-21',
        description: 'Instrument Air & Nitrogen Purge Ring',
        equipment: [
          { tag: 'S2-IA-001 RING', refCode: '10-95', highlight: 'none', isCriticalPath: false, description: 'Plant Air Service Header' },
          { tag: 'S2-N2-005 CONN', refCode: '10-98', highlight: 'none', isCriticalPath: true, description: 'High Pressure Nitrogen Purge Station' }
        ]
      }
    ]
  },
  {
    id: 'unit-khf1',
    name: 'KHF-1 / SE / NHF-1',
    fullName: 'Kerosene Hydrotreater & Naphtha Hydrofiner 1',
    systems: [
      {
        id: 'sys-22',
        name: 'System-22',
        description: 'Feed Surge & Coalescer Section',
        equipment: [
          { tag: 'S2-CO-201A/B', refCode: '20-04', highlight: 'none', isCriticalPath: false, description: 'Salt Drier Coalescing Elements' },
          { tag: 'S2-PIP-EWR-052', refCode: '20-11', highlight: 'EWR', isCriticalPath: true, description: 'Feed Filter Dual Basket Spool' }
        ]
      },
      {
        id: 'sys-23',
        name: 'System-23',
        description: 'Reactor Charge Heater & Feed Effluent Train',
        equipment: [
          { tag: 'S2-R-201 RX', refCode: '20-15', highlight: 'none', isCriticalPath: true, description: 'Desulfurization Fixed Bed Reactor' },
          { tag: 'S2-HX-205 COMB', refCode: '20-22', highlight: 'Project', isCriticalPath: false, description: 'Combined Feed Effluent Heat Exchanger' }
        ]
      },
      {
        id: 'sys-24',
        name: 'System-24',
        description: 'High Pressure Separator & Recycle Gas',
        equipment: [
          { tag: 'EWR-002 E-301E', refCode: '30-09', highlight: 'EWR', isCriticalPath: true, description: 'Recycle Gas Trim Cooler' },
          { tag: 'S2-SUP-PROJ-007', refCode: '30-03', highlight: 'Project', isCriticalPath: false, description: 'Wash Water Injection Quench Quill' },
          { tag: 'S2-V-202 HP SEP', refCode: '30-14', highlight: 'none', isCriticalPath: false, description: 'HP Cold Separator Boot Section' },
          { tag: 'S2-C-202 COMP', refCode: '30-20', highlight: 'none', isCriticalPath: true, description: 'Recycle Hydrogen Centrifugal Compressor' }
        ]
      },
      {
        id: 'sys-25',
        name: 'System-25',
        description: 'Product Stripper & Reboiler Circuit',
        equipment: [
          { tag: 'S2-STR-203 TOWER', refCode: '30-28', highlight: 'none', isCriticalPath: false, description: 'H2S Stripping Column Trays' },
          { tag: 'S2-FUR-202 HTR', refCode: '30-33', highlight: 'EWR', isCriticalPath: true, description: 'Stripper Bottom Reboiler Furnace' }
        ]
      },
      {
        id: 'sys-26',
        name: 'System-26',
        description: 'Treated Fuel Gas & Amine Absorption',
        equipment: [
          { tag: 'S2-ABS-204 AMINE', refCode: '30-41', highlight: 'Project', isCriticalPath: false, description: 'Lean Amine Contactor Column' },
          { tag: 'S2-P-206A/B PUMP', refCode: '30-45', highlight: 'none', isCriticalPath: false, description: 'Rich Amine Transfer Booster' }
        ]
      },
      {
        id: 'sys-27',
        name: 'System-27',
        description: 'Treated Jet/Kero Vacuum Drier & Rundown',
        equipment: [
          { tag: 'S2-VD-205 TANK', refCode: '30-52', highlight: 'none', isCriticalPath: false, description: 'Aviation Fuel Vacuum Dehydrator' },
          { tag: 'S2-PIP-EWR-063', refCode: '30-59', highlight: 'EWR', isCriticalPath: true, description: 'Clay Filter Vessel Bypass Loop' }
        ]
      }
    ]
  },
  {
    id: 'unit-vps2',
    name: 'VPS-2 / FCCU / SWS-2 / NHF-2',
    fullName: 'Vacuum Pipestill 2, Fluid Catalytic Cracking & Secondary Hydrotreaters',
    systems: [
      {
        id: 'sys-28',
        name: 'System-28',
        description: 'Vacuum Furnace & Transfer Ejector System',
        equipment: [
          { tag: 'S2-VF-201 FURNACE', refCode: '40-02', highlight: 'none', isCriticalPath: true, description: 'Vacuum Charge Heater Coils' },
          { tag: 'S2-EJ-201A/B/C', refCode: '40-10', highlight: 'Project', isCriticalPath: false, description: '3-Stage Steam Vacuum Ejectors' },
          { tag: 'S2-PIP-EWR-071', refCode: '40-18', highlight: 'EWR', isCriticalPath: true, description: 'Transfer Line Expansion Bellows' }
        ]
      },
      {
        id: 'sys-29',
        name: 'System-29',
        description: 'FCCU Reactor & Regenerator Riser Section',
        equipment: [
          { tag: 'S2-FCC-RX-301', refCode: '40-25', highlight: 'none', isCriticalPath: true, description: 'Disengagement Vessel & Cyclones' },
          { tag: 'S2-FCC-REG-302', refCode: '40-30', highlight: 'Project', isCriticalPath: true, description: 'Combustion Air Grid Distributor' },
          { tag: 'S2-VLV-SLIDE-01', refCode: '40-36', highlight: 'EWR', isCriticalPath: true, description: 'Spent Catalyst Hydraulic Slide Valve' }
        ]
      },
      {
        id: 'sys-30',
        name: 'System-30',
        description: 'FCC Main Fractionator & Gas Plant',
        equipment: [
          { tag: 'S2-C-301 FRAC', refCode: '40-42', highlight: 'none', isCriticalPath: false, description: 'Heavy Cycle Oil Pumparound Circuit' },
          { tag: 'S2-HX-308 ABSORB', refCode: '40-50', highlight: 'Project', isCriticalPath: false, description: 'Lean Oil Intercooler Chiller' }
        ]
      },
      {
        id: 'sys-33',
        name: 'System-33',
        description: 'Secondary Naphtha Hydrofiner Catalyst Section',
        equipment: [
          { tag: 'S2-NHF-R-305', refCode: '40-62', highlight: 'none', isCriticalPath: false, description: 'Hydrodesulfurization Dual Bed Reactor' },
          { tag: 'S2-PIP-EWR-084', refCode: '40-70', highlight: 'EWR', isCriticalPath: true, description: 'Recycle Hydrogen Spillback Loop' }
        ]
      }
    ]
  },
  {
    id: 'unit-gohf3',
    name: 'GOHF-3',
    fullName: 'Gas Oil Hydrofiner Complex 3',
    systems: [
      {
        id: 'sys-31',
        name: 'System-31',
        description: 'High Pressure Diesel Hydrotreating & Stripping Train',
        equipment: [
          { tag: 'S2-GOHF-R-401', refCode: '50-02', highlight: 'none', isCriticalPath: true, description: 'Main High Pressure Hydrotreater Reactor' },
          { tag: 'S2-PIP-EWR-092', refCode: '50-14', highlight: 'EWR', isCriticalPath: true, description: 'Reactor Effluent Air Fin Cooler Spool' },
          { tag: 'S2-SUP-PROJ-029', refCode: '50-25', highlight: 'Project', isCriticalPath: false, description: 'Biodiesel Blending Skid Tie-in' },
          { tag: 'S2-C-403 STRIP', refCode: '50-33', highlight: 'none', isCriticalPath: false, description: 'Diesel Stripper Tower Internal Trays' },
          { tag: 'S2-HX-407 EXCH', refCode: '50-41', highlight: 'none', isCriticalPath: false, description: 'Stripper Feed/Bottom Heat Exchanger' }
        ]
      }
    ]
  }
];
