/**
 * @fileOverview Registry Validation Rules.
 * Strict deterministic Zod schemas for system data.
 */

import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(2, "Description must be valid"),
  category: z.string().min(1, "Category is required"),
  
  // Hierarchical Context
  asset_family: z.string().default("Uncategorized"),
  section: z.string().default("General"),
  subsection: z.string().default("Base Register"),
  
  // Location & Assignment
  location: z.string().min(1, "Location is required"),
  custodian: z.string().default("Unassigned"),
  
  // State & Assessment
  status: z.enum(["VERIFIED", "UNVERIFIED", "DISCREPANCY"]).default("UNVERIFIED"),
  condition: z.string().default("Unassessed"),
  
  // Financial & Temporal
  purchase_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  value: z.number().nonnegative().default(0),
  serial_number: z.string().default("N/A"),
  asset_id_code: z.string().optional(),

  // Nested Structured Data
  hierarchy: z.object({
    document: z.string(),
    section: z.string(),
    subsection: z.string(),
    asset_family: z.string(),
  }),
  
  import_metadata: z.object({
    source_file: z.string(),
    sheet_name: z.string(),
    row_number: z.number().int(),
    imported_at: z.string().datetime(),
  }),

  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  
  // System Metadata
  last_modified: z.string().datetime(),
  last_modified_by: z.string(),
});

export type ValidatedAsset = z.infer<typeof AssetSchema>;

/**
 * Validates a raw object from the parser or UI.
 * Throws structured errors if deterministic rules are violated.
 */
export function validateAsset(data: unknown): ValidatedAsset {
  return AssetSchema.parse(data);
}
