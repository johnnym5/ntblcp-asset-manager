
/**
 * @fileOverview Registry Utilities.
 * Handles header normalization, hierarchical data transformation, and color coding.
 * Phase 807: Hardened fuzzy mapping logic for absolute field parity.
 */

import type { Asset } from "@/types/domain";
import type { RegistryHeader, AssetRecord, RegistryFieldValue, DataType, RegistryPreset } from "@/types/registry";
import { getFuzzySignature } from "./utils";

/**
 * Normalizes source headers to canonical snake_case keys.
 */
export function normalizeHeaderName(name: string): string {
  let n = name.toLowerCase().trim();
  
  if (n.includes("purchase price") && (n.includes("naira") || n.includes("(n)") || n.includes("ngn"))) return "purchase_price_ngn";
  if (n.includes("purchase price") && (n.includes("usd") || n.includes("[usd]"))) return "purchase_price_usd";
  if (n.includes("chq no") || n.includes("goods received note")) return "goods_received_note_no";
  if (n.includes("assignee")) return "assignee_location";
  if (n.includes("asset description")) return "asset_description";
  if (n.includes("asset id code") || n.includes("tag number") || n.includes("tag numbers") || n.includes("tag no")) return "asset_id_code";
  if (n.includes("asset class") || n.includes("classification")) return "asset_class";
  if (n === "s/n" || n === "sn") return "sn";
  if (n === "serial number" || n === "serial numbers") return "serial_number";
  if (n === "model number" || n === "model numbers" || n === "model no") return "model_number";
  if (n === "date purchased or received" || n === "year of purchase") return "date_purchased_received";

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
 * Canonical Registry Headers with Grouping.
 */
export const DEFAULT_REGISTRY_HEADERS: Omit<RegistryHeader, "id" | "orderIndex">[] = [
  // Identity
  { rawName: "S/N", displayName: "S/N", normalizedName: "sn", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", locked: true, group: "Identity" },
  { rawName: "Asset Description", displayName: "Asset Description", normalizedName: "asset_description", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  { rawName: "Asset ID Code", displayName: "Asset ID Code", normalizedName: "asset_id_code", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  { rawName: "Serial Number", displayName: "Serial Number", normalizedName: "serial_number", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  
  // Location
  { rawName: "Location", displayName: "Location", normalizedName: "location", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location" },
  { rawName: "Assignee (Location)", displayName: "Assignee (Location)", normalizedName: "assignee_location", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location" },
  
  // Classification
  { rawName: "Asset Class", displayName: "Asset Class", normalizedName: "asset_class", visible: true, table: false, quickView: false, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  { rawName: "Manufacturer", displayName: "Manufacturer", normalizedName: "manufacturer", visible: true, table: false, quickView: false, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  { rawName: "Model Number", displayName: "Model Number", normalizedName: "model_number", visible: true, table: false, quickView: false, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  
  // Procurement
  { rawName: "Suppliers", displayName: "Suppliers", normalizedName: "suppliers", visible: true, table: false, quickView: false, inChecklist: false, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Procurement" },
  { rawName: "Date Purchased or Received", displayName: "Date Received", normalizedName: "date_purchased_received", visible: true, table: false, quickView: false, inChecklist: false, editable: true, filterable: true, sortEnabled: true, dataType: "date", group: "Procurement" },
  { rawName: "Purchase price (Naira)", displayName: "Price (NGN)", normalizedName: "purchase_price_ngn", visible: true, table: false, quickView: false, inChecklist: false, editable: true, filterable: true, sortEnabled: true, dataType: "currency", group: "Procurement" },
  
  // Condition
  { rawName: "Condition", displayName: "Condition", normalizedName: "condition", visible: true, table: true, quickView: true, inChecklist: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Condition" },
  { rawName: "Remarks", displayName: "Remarks", normalizedName: "remarks", visible: true, table: false, quickView: false, inChecklist: true, editable: true, filterable: true, sortEnabled: false, dataType: "text", group: "Condition" },

  // Metadata & Hierarchy
  { rawName: "Source Sheet", displayName: "Source Sheet", normalizedName: "source_sheet", visible: true, table: false, quickView: false, inChecklist: false, editable: false, filterable: true, sortEnabled: true, dataType: "text", group: "Metadata" },
  { rawName: "Row Number", displayName: "Row Number", normalizedName: "row_number", visible: true, table: false, quickView: false, inChecklist: false, editable: false, filterable: true, sortEnabled: true, dataType: "number", group: "Metadata" },
];

/**
 * Registry Presets for Arranged Views.
 */
export const REGISTRY_PRESETS: RegistryPreset[] = [
  {
    id: "quick",
    name: "Quick View",
    description: "Optimized for fast field scanning.",
    visibleHeaderNames: ["sn", "location", "assignee_location", "asset_description", "asset_id_code", "serial_number", "condition", "row_number"],
    densityMode: "compact"
  },
  {
    id: "full",
    name: "Full View",
    description: "Total registry transparency.",
    visibleHeaderNames: DEFAULT_REGISTRY_HEADERS.map(h => h.normalizedName),
    densityMode: "expanded"
  }
];

/**
 * Transforms a Domain Asset to an AssetRecord for the high-density grid.
 * Improved with fuzzy metadata search for absolute field parity.
 */
export function transformAssetToRecord(asset: Asset, headers: RegistryHeader[], branding?: Record<string, string>): AssetRecord {
  const fields: RegistryFieldValue[] = headers.map(header => {
    let rawValue: any = "";
    
    // 1. Resolve from standard domain properties
    switch(header.normalizedName) {
      case "sn": rawValue = asset.sn; break;
      case "location": rawValue = asset.location; break;
      case "assignee_location": rawValue = asset.custodian; break;
      case "asset_description": rawValue = asset.description || asset.name; break;
      case "asset_id_code": rawValue = asset.assetIdCode; break;
      case "serial_number": rawValue = asset.serialNumber; break;
      case "asset_class": rawValue = asset.category; break;
      case "condition": rawValue = asset.condition; break;
      case "manufacturer": rawValue = asset.manufacturer; break;
      case "model_number": rawValue = asset.modelNumber; break;
      case "remarks": rawValue = asset.remarks; break;
      case "purchase_price_ngn": rawValue = asset.value; break;
      case "date_purchased_received": rawValue = asset.purchaseDate; break;
      case "source_sheet": rawValue = asset.importMetadata?.sheetName; break;
      case "row_number": rawValue = asset.importMetadata?.rowNumber; break;
      default:
        rawValue = "";
    }

    // 2. Fuzzy Metadata Crawl: If the primary property is empty, search unmapped columns
    const isActuallyEmpty = rawValue === undefined || rawValue === null || String(rawValue).trim() === "" || String(rawValue).trim() === "---" || String(rawValue).trim().toLowerCase() === "nil" || String(rawValue).trim().toLowerCase() === "n/a";
    
    if (isActuallyEmpty) {
      const meta = asset.metadata || {};
      // Exact match
      rawValue = meta[header.rawName] || meta[header.displayName] || meta[header.normalizedName] || "";
      
      // Fuzzy match (handles casing variations in Excel)
      if (!rawValue) {
        const fuzzyHeader = getFuzzySignature(header.displayName);
        const matchedKey = Object.keys(meta).find(k => getFuzzySignature(k) === fuzzyHeader);
        if (matchedKey) rawValue = meta[matchedKey];
      }
    }

    return {
      headerId: header.id,
      rawValue,
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
