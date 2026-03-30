/**
 * @fileOverview Registry Utilities.
 * Handles header normalization and data transformation.
 */

import type { Asset } from "@/types/domain";
import type { RegistryHeader, AssetRecord, RegistryFieldValue, DataType } from "@/types/registry";

/**
 * Normalizes source headers to canonical snake_case keys.
 * Implements the strict mapping contract for Assetain Registry.
 */
export function normalizeHeaderName(name: string): string {
  let n = name.toLowerCase().trim();
  
  // Specific mappings for currency and financial fields
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
 * Default Template for Registry Headers.
 * Strictly follows the canonical 19-field set required by the PRD.
 */
export const DEFAULT_REGISTRY_HEADERS: Omit<RegistryHeader, "id" | "orderIndex">[] = [
  { rawName: "S/N", displayName: "S/N", normalizedName: "sn", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text", locked: true },
  { rawName: "Location", displayName: "Location", normalizedName: "location", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Assignee (Location)", displayName: "Assignee (Location)", normalizedName: "assignee_location", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Asset Description", displayName: "Asset Description", normalizedName: "asset_description", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Asset ID Code", displayName: "Asset ID Code", normalizedName: "asset_id_code", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Asset Class", displayName: "Asset Class", normalizedName: "asset_class", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Manufacturer", displayName: "Manufacturer", normalizedName: "manufacturer", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Model Number", displayName: "Model Number", normalizedName: "model_number", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Serial Number", displayName: "Serial Number", normalizedName: "serial_number", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Suppliers", displayName: "Suppliers", normalizedName: "suppliers", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Date Purchased or Received", displayName: "Date Purchased or Received", normalizedName: "date_purchased_received", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "date" },
  { rawName: "Chq No / Goods Received Note No.", displayName: "Chq No / GRN No.", normalizedName: "goods_received_note_no", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "PV No", displayName: "PV No", normalizedName: "pv_no", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Purchase price (Naira)", displayName: "Purchase price (Naira)", normalizedName: "purchase_price_ngn", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "currency" },
  { rawName: "Purchase Price [USD]", displayName: "Purchase Price [USD]", normalizedName: "purchase_price_usd", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "currency" },
  { rawName: "Funder", displayName: "Funder", normalizedName: "funder", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Useful life", displayName: "Useful life", normalizedName: "useful_life", visible: false, editable: true, filterable: true, sortEnabled: true, dataType: "number" },
  { rawName: "Condition", displayName: "Condition", normalizedName: "condition", visible: true, editable: true, filterable: true, sortEnabled: true, dataType: "text" },
  { rawName: "Remarks", displayName: "Remarks", normalizedName: "remarks", visible: true, editable: true, filterable: true, sortEnabled: false, dataType: "text" },
];

/**
 * Transforms a Domain Asset to a Registry AssetRecord.
 * Maintains raw data integrity while providing normalized fields for display.
 */
export function transformAssetToRecord(asset: Asset, headers: RegistryHeader[]): AssetRecord {
  const fields: RegistryFieldValue[] = headers.map(header => {
    let rawValue: any = "";
    
    // Map canonical fields from domain Asset object
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
      default:
        // Check metadata for unmapped fields
        rawValue = (asset.metadata as any)[header.rawName] || (asset.metadata as any)[header.normalizedName] || "";
    }

    return {
      headerId: header.id,
      rawValue,
      displayValue: formatDisplayValue(rawValue, header.dataType)
    };
  });

  return {
    id: asset.id,
    rowNumber: asset.importMetadata?.rowNumber || 0,
    sn: asset.serialNumber,
    sourceSheet: asset.importMetadata?.sheetName,
    sourceRow: asset.importMetadata?.rowNumber,
    sectionName: asset.section,
    subsectionName: asset.subsection,
    assetFamily: asset.assetFamily,
    yearBucket: asset.yearBucket,
    headers,
    fields,
    rawRow: { ...asset } as any
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
