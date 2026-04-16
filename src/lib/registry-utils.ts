/**
 * @fileOverview Registry Utilities.
 * Handles header normalization, hierarchical data transformation, and color coding.
 * Phase 810: Hardened for independent folder templates and fuzzy property mapping.
 * Phase 811: Optimized transformAssetToRecord to handle Chassis/Engine for vehicles.
 * Phase 812: Added Guidance Dictionary for field explanations.
 * Phase 813: Added LGA to default headers and ensured core property resolution.
 * Phase 814: Implemented resilient property resolver for snake_case/camelCase parity.
 */

import type { Asset } from "@/types/domain";
import type { RegistryHeader, AssetRecord, RegistryFieldValue, DataType } from "@/types/registry";
import { getFuzzySignature } from "./utils";

/**
 * Normalizes source headers to canonical camelCase keys matching the Asset schema.
 */
export function normalizeHeaderName(name: string): string {
  let n = name.toLowerCase().trim();
  
  if (n.includes("purchase price") && (n.includes("naira") || n.includes("(n)") || n.includes("ngn"))) return "value";
  if (n.includes("purchase price") && (n.includes("usd") || n.includes("[usd]"))) return "purchasePriceUsd";
  if (n.includes("chq no") || n.includes("goods received note") || n.includes("grn no")) return "grnNo";
  if (n.includes("assignee") || n.includes("auditor")) return "custodian";
  if (n.includes("asset description")) return "description";
  if (n.includes("asset id code") || n.includes("tag number") || n.includes("tag numbers") || n.includes("tag no")) return "assetIdCode";
  if (n.includes("asset class") || n.includes("classification") || n === "category") return "category";
  if (n === "s/n" || n === "sn") return "sn";
  if (n === "serial number" || n === "serial numbers") return "serialNumber";
  if (n === "model number" || n === "model numbers" || n === "model no") return "modelNumber";
  if (n.includes("chasis no") || n.includes("chassis no")) return "chassisNo";
  if (n.includes("engine no")) return "engineNo";
  if (n.includes("lga")) return "lga";
  if (n.includes("supplier")) return "supplier";
  if (n.includes("remarks") || n.includes("comment")) return "remarks";
  if (n.includes("pv no") || n.includes("pv/jv no")) return "pvNo";
  if (n.includes("date purchased") || n.includes("year of purchase") || n.includes("date received")) return "purchaseDate";
  if (n.includes("useful life")) return "usefulLifeYears";
  if (n.includes("funder")) return "funder";
  if (n.includes("site")) return "site";

  return n
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Deterministic Color Coding Engine.
 */
export function getColorForSource(source: string, branding?: Record<string, string>): string {
  if (branding && branding[source]) return branding[source];
  if (!source) return "hsl(45, 100%, 50%)"; // Assetain Gold
  
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
}

/**
 * Baseline Generic Headers. 
 * Note: These are used as fallbacks only. Folder-specific templates override these.
 */
export const DEFAULT_REGISTRY_HEADERS: Omit<RegistryHeader, "id" | "orderIndex">[] = [
  { 
    rawName: "S/N", 
    displayName: "S/N", 
    normalizedName: "sn", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", locked: true, group: "Identity",
    guidance: "The record's positional sequence number in the project register.",
    example: "1, 2, 3..."
  },
  { 
    rawName: "Asset Description", 
    displayName: "Asset Description", 
    normalizedName: "description", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity",
    guidance: "A human-readable name for the asset. Should include type and brand.",
    example: "Toyota Hilux 4x4 or HP EliteBook 840"
  },
  { 
    rawName: "Asset ID Code", 
    displayName: "Asset ID Code", 
    normalizedName: "assetIdCode", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity",
    guidance: "The unique NTBLCP-assigned tracking number found on the physical tag. Essential for program auditing.",
    example: "NTBLCP/TB/LAG/001"
  },
  { 
    rawName: "Location", 
    displayName: "Location", 
    normalizedName: "location", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location",
    guidance: "The physical State or Facility where the asset is currently deployed.",
    example: "Lagos State or Abuja Zonal Store"
  },
  { 
    rawName: "LGA", 
    displayName: "LGA", 
    normalizedName: "lga", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location",
    guidance: "The Local Government Area associated with the facility.",
    example: "Ikeja, Alimosho, etc."
  },
  { 
    rawName: "Assignee", 
    displayName: "Assignee", 
    normalizedName: "custodian", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location",
    guidance: "The officer or facility staff member responsible for the asset.",
    example: "Dr. Ibrahim or Lab Unit"
  },
  { 
    rawName: "Condition", 
    displayName: "Condition", 
    normalizedName: "condition", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Condition",
    guidance: "The current physical state of the item.",
    example: "New, Used-Good, or Stolen"
  },
  { 
    rawName: "Serial Number", 
    displayName: "Serial Number", 
    normalizedName: "serialNumber", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity",
    guidance: "The unique manufacturer's code. For vehicles, use Chassis/Engine instead.",
    example: "ABC123456789"
  },
  { 
    rawName: "Chassis No", 
    displayName: "Chassis No", 
    normalizedName: "chassisNo", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity",
    guidance: "The unique Vehicle Identification Number (VIN) stamped on the frame. Primary ID for vehicles.",
    example: "VIN-XXXX-XXXX"
  },
  { 
    rawName: "Engine No", 
    displayName: "Engine No", 
    normalizedName: "engineNo", 
    visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity",
    guidance: "The unique ID of the vehicle's physical motor block.",
    example: "E-12345-6789"
  }
];

/**
 * Transforms a Domain Asset to an AssetRecord for the high-density grid.
 * Dynamically resolves values based on the PROVIDED headers (the folder's template).
 * Uses a resilient key resolver to handle snake_case and camelCase variants.
 */
export function transformAssetToRecord(asset: Asset, headers: RegistryHeader[], branding?: Record<string, string>): AssetRecord {
  const fields: RegistryFieldValue[] = headers.map(header => {
    let rawValue: any = undefined;
    
    // Normalize key for switch resolution (e.g., asset_id_code -> assetidcode)
    const norm = header.normalizedName.toLowerCase().replace(/_/g, '');

    // 1. Resolve from Core Domain Properties using resilient matching
    switch(norm) {
      case "sn": rawValue = asset.sn; break;
      case "location": rawValue = asset.location; break;
      case "state": rawValue = asset.location; break;
      case "custodian": rawValue = asset.custodian; break;
      case "assignee": rawValue = asset.custodian; break;
      case "description": rawValue = asset.description || asset.name; break;
      case "assetdescription": rawValue = asset.description || asset.name; break;
      case "assetidcode": rawValue = asset.assetIdCode; break;
      case "serialnumber": rawValue = asset.serialNumber; break;
      case "chassisno": rawValue = asset.chassisNo; break;
      case "engineno": rawValue = asset.engineNo; break;
      case "lga": rawValue = asset.lga; break;
      case "category": rawValue = asset.category; break;
      case "assetclass": rawValue = asset.category; break;
      case "condition": rawValue = asset.condition; break;
      case "manufacturer": rawValue = asset.manufacturer; break;
      case "modelnumber": rawValue = asset.modelNumber; break;
      case "remarks": rawValue = asset.remarks; break;
      case "value": rawValue = asset.value; break;
      case "purchasedate": rawValue = asset.purchaseDate; break;
      case "supplier": rawValue = asset.supplier; break;
      case "grnno": rawValue = asset.grnNo; break;
      case "pvno": rawValue = asset.pvNo; break;
      case "usefullifeyears": rawValue = asset.usefulLifeYears; break;
      case "funder": rawValue = asset.funder; break;
      case "site": rawValue = asset.site; break;
      case "source_sheet": rawValue = asset.importMetadata?.sheetName; break;
      case "row_number": rawValue = asset.importMetadata?.rowNumber; break;
    }

    // 2. Fuzzy Discovery Pulse: If core prop is empty, hunt in metadata
    const isEmpty = rawValue === undefined || rawValue === null || String(rawValue).trim() === "" || String(rawValue).trim().toLowerCase() === "n/a" || String(rawValue).trim() === "---";
    
    if (isEmpty) {
      const meta = asset.metadata || {};
      // Exact Match
      rawValue = meta[header.rawName] || meta[header.displayName] || meta[header.normalizedName];
      
      // Fuzzy Fingerprint Match
      if (rawValue === undefined || rawValue === null) {
        const fuzzyHeader = getFuzzySignature(header.displayName);
        const matchedKey = Object.keys(meta).find(k => getFuzzySignature(k) === fuzzyHeader);
        if (matchedKey) rawValue = meta[matchedKey];
      }
    }

    return {
      headerId: header.id,
      rawValue: rawValue ?? "",
      displayValue: formatDisplayValue(rawValue, header.dataType)
    };
  });

  const sourceName = asset.category || asset.importMetadata?.sheetName || "Registry";

  return {
    id: asset.id,
    rowNumber: asset.importMetadata?.rowNumber || 0,
    sn: asset.sn,
    sourceSheet: sourceName,
    sourceRow: asset.importMetadata?.rowNumber,
    sectionName: asset.section,
    subsectionName: asset.subsection,
    assetFamily: asset.assetFamily,
    yearBucket: asset.yearBucket,
    headers,
    fields,
    rawRow: { ...asset } as any,
    accentColor: getColorForSource(sourceName, branding)
  };
}

function formatDisplayValue(val: any, type: DataType): string {
  if (val === null || val === undefined || String(val).trim() === "" || String(val).trim().toLowerCase() === "nil") return "---";
  if (type === "currency") {
    const num = Number(val);
    return isNaN(num) ? String(val) : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
  }
  if (type === "date") {
    try { 
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString(); 
    } catch(e) { return String(val); }
  }
  return String(val);
}
