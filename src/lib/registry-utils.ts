/**
 * @fileOverview Registry Utilities.
 * Handles header normalization, hierarchical data transformation, and color coding.
 */

import type { Asset } from "@/types/domain";
import type { RegistryHeader, AssetRecord, RegistryFieldValue, DataType, RegistryPreset } from "@/types/registry";

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
  if (n.includes("asset id code") || n.includes("tag number") || n.includes("tag numbers")) return "asset_id_code";
  if (n.includes("asset class") || n.includes("classification")) return "asset_class";
  if (n === "s/n" || n === "sn") return "sn";
  if (n === "serial number" || n === "serial numbers") return "serial_number";
  if (n === "date purchased or received" || n === "year of purchase") return "date_purchased_received";

  return n
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Deterministic Color Coding Engine.
 * Generates consistent HSL accents for sheet separation.
 * Supports manual override via branding map.
 */
export function getColorForSource(source: string, branding?: Record<string, string>): string {
  if (branding && branding[source]) return branding[source];
  if (!source) return "hsl(45, 95%, 40%)"; // Default Gold
  
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
  { rawName: "S/N", displayName: "S/N", normalizedName: "sn", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", locked: true, group: "Identity" },
  { rawName: "Asset Description", displayName: "Asset Description", normalizedName: "asset_description", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  { rawName: "Asset ID Code", displayName: "Asset ID Code", normalizedName: "asset_id_code", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  { rawName: "Serial Number", displayName: "Serial Number", normalizedName: "serial_number", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Identity" },
  
  // Location
  { rawName: "Location", displayName: "Location", normalizedName: "location", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location" },
  { rawName: "Assignee (Location)", displayName: "Assignee (Location)", normalizedName: "assignee_location", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Location" },
  
  // Classification
  { rawName: "Asset Class", displayName: "Asset Class", normalizedName: "asset_class", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  { rawName: "Manufacturer", displayName: "Manufacturer", normalizedName: "manufacturer", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  { rawName: "Model Number", displayName: "Model Number", normalizedName: "model_number", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Classification" },
  
  // Procurement
  { rawName: "Suppliers", displayName: "Suppliers", normalizedName: "suppliers", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Procurement" },
  { rawName: "Date Purchased or Received", displayName: "Date Purchased or Received", normalizedName: "date_purchased_received", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "date", group: "Procurement" },
  { rawName: "Chq No / Goods Received Note No.", displayName: "Chq No / GRN No.", normalizedName: "goods_received_note_no", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Procurement" },
  { rawName: "PV No", displayName: "PV No", normalizedName: "pv_no", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Procurement" },
  { rawName: "Purchase price (Naira)", displayName: "Price (NGN)", normalizedName: "purchase_price_ngn", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "currency", group: "Procurement" },
  { rawName: "Purchase Price [USD]", displayName: "Price (USD)", normalizedName: "purchase_price_usd", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "currency", group: "Procurement" },
  { rawName: "Funder", displayName: "Funder", normalizedName: "funder", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Procurement" },
  { rawName: "Useful life", displayName: "Useful life", normalizedName: "useful_life", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "number", group: "Procurement" },
  
  // Condition
  { rawName: "Condition", displayName: "Condition", normalizedName: "condition", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", group: "Condition" },
  { rawName: "Remarks", displayName: "Remarks", normalizedName: "remarks", visible: true, editable: true, filterable: true, sortEnabled: false, dataType: "text", group: "Condition" },

  // Metadata & Hierarchy
  { rawName: "Source Sheet", displayName: "Source Sheet", normalizedName: "source_sheet", visible: true, editable: false, filterable: true, sortEnabled: true, dataType: "text", group: "Metadata" },
  { rawName: "Row Number", displayName: "Row Number", normalizedName: "row_number", visible: true, editable: false, filterable: true, sortEnabled: true, dataType: "number", group: "Metadata" },
  { rawName: "Section", displayName: "Major Section", normalizedName: "section_name", visible: true, editable: false, filterable: true, sortEnabled: true, dataType: "text", group: "Hierarchy" },
  { rawName: "Subsection", displayName: "Subsection", normalizedName: "subsection_name", visible: true, editable: false, filterable: true, sortEnabled: true, dataType: "text", group: "Hierarchy" },
];

/**
 * Registry Presets for Arranged Views.
 */
export const REGISTRY_PRESETS: RegistryPreset[] = [
  {
    id: "quick",
    name: "Quick View",
    description: "Optimized for fast field scanning.",
    visibleHeaderNames: ["sn", "location", "assignee_location", "asset_description", "asset_id_code", "asset_class", "manufacturer", "model_number", "serial_number", "condition", "row_number", "source_sheet", "section_name"],
    densityMode: "compact"
  },
  {
    id: "full",
    name: "Full View",
    description: "Total registry transparency.",
    visibleHeaderNames: DEFAULT_REGISTRY_HEADERS.map(h => h.normalizedName),
    densityMode: "expanded"
  },
  {
    id: "procurement",
    name: "Procurement View",
    description: "Focused on financial and supplier data.",
    visibleHeaderNames: ["sn", "asset_description", "suppliers", "date_purchased_received", "purchase_price_ngn", "funder", "useful_life"],
    densityMode: "comfortable"
  }
];

/**
 * Transforms a Domain Asset to an AssetRecord.
 */
export function transformAssetToRecord(asset: Asset, headers: RegistryHeader[], branding?: Record<string, string>): AssetRecord {
  const fields: RegistryFieldValue[] = headers.map(header => {
    let rawValue: any = "";
    
    switch(header.normalizedName) {
      case "sn": rawValue = asset.serialNumber || ""; break;
      case "location": rawValue = asset.location || ""; break;
      case "assignee_location": rawValue = asset.custodian || ""; break;
      case "asset_description": rawValue = asset.description || ""; break;
      case "asset_id_code": rawValue = asset.assetIdCode || ""; break;
      case "asset_class": rawValue = asset.category || ""; break;
      case "condition": rawValue = asset.condition || ""; break;
      case "purchase_price_ngn": rawValue = asset.value || 0; break;
      case "date_purchased_received": rawValue = asset.purchaseDate || ""; break;
      case "serial_number": rawValue = asset.serialNumber || ""; break;
      case "source_sheet": rawValue = asset.importMetadata?.sheetName || ""; break;
      case "row_number": rawValue = asset.importMetadata?.rowNumber || 0; break;
      case "section_name": rawValue = asset.section || ""; break;
      case "subsection_name": rawValue = asset.subsection || ""; break;
      default:
        // Use optional chaining and default to empty object to prevent TypeError if metadata is missing
        const metadata = asset.metadata || {};
        rawValue = (metadata as any)[header.rawName] || (metadata as any)[header.normalizedName] || "";
    }

    return {
      headerId: header.id,
      rawValue,
      displayValue: formatDisplayValue(rawValue, header.dataType)
    };
  });

  const sheetName = asset.importMetadata?.sheetName || "";

  return {
    id: asset.id,
    rowNumber: asset.importMetadata?.rowNumber || 0,
    sn: asset.serialNumber,
    sourceSheet: sheetName,
    sourceRow: asset.importMetadata?.rowNumber,
    sectionName: asset.section,
    subsectionName: asset.subsection,
    assetFamily: asset.assetFamily,
    yearBucket: asset.yearBucket,
    headers,
    fields,
    rawRow: { ...asset } as any,
    accentColor: getColorForSource(sheetName, branding)
  };
}

function formatDisplayValue(val: any, type: DataType): string {
  if (val === null || val === undefined || val === "") return "---";
  if (type === "currency") {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(val));
  }
  if (type === "date") {
    try { return new Date(val).toLocaleDateString(); } catch(e) { return String(val); }
  }
  return String(val);
}
