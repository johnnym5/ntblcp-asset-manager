/**
 * @fileOverview Registry Validation Rules.
 * Strict deterministic Zod schemas for system data.
 */

import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string().uuid(),
  category: z.string().min(1, "Asset class is required"),
  description: z.string().min(2, "Description must be valid"),
  grantId: z.string(),
  location: z.string(),
  condition: z.string().default("Unassessed"),
  verifiedStatus: z.enum(["Verified", "Unverified", "Discrepancy"]),
  lastModified: z.string().datetime(),
  lastModifiedBy: z.string(),
  
  // Optional but typed fields
  sn: z.string().optional(),
  serialNumber: z.string().optional(),
  assetIdCode: z.string().optional(),
  lga: z.string().optional(),
  site: z.string().optional(),
  assignee: z.string().optional(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  remarks: z.string().optional(),
  majorSection: z.string().optional(),
  subsectionName: z.string().optional(),
  yearBucket: z.number().int().optional(),
}).passthrough();

export type ValidatedAsset = z.infer<typeof AssetSchema>;

/**
 * Validates a raw object from the parser or UI.
 * Throws structured errors if deterministic rules are violated.
 */
export function validateAsset(data: unknown): ValidatedAsset {
  return AssetSchema.parse(data);
}
