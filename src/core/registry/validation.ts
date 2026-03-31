/**
 * @fileOverview Registry Validation Rules.
 * Strict deterministic Zod schemas for system data.
 */

import { z } from 'zod';

export const GeotagSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  timestamp: z.string().datetime(),
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  grantId: z.string().min(1, "Grant ID is required"),
  
  // Hierarchical Context
  section: z.string().default("General"),
  subsection: z.string().default("Base Register"),
  assetFamily: z.string().default("Uncategorized"),
  
  // Location & Assignment
  location: z.string().min(1, "Location is required"),
  custodian: z.string().default("Unassigned"),
  
  // State & Assessment
  status: z.enum(["VERIFIED", "UNVERIFIED", "DISCREPANCY"]).default("UNVERIFIED"),
  condition: z.string().default("Unassessed"),
  
  // Financial & Technical
  purchaseDate: z.string().optional(),
  value: z.number().nonnegative().default(0),
  serialNumber: z.string().default("N/A"),
  assetIdCode: z.string().optional(),
  photoDataUri: z.string().optional(),
  photoUrl: z.string().optional(),
  
  // Forensic Fields
  signatureDataUri: z.string().optional(),
  signatureUrl: z.string().optional(),
  
  geotag: GeotagSchema.optional(),

  // Nested Structured Data
  hierarchy: z.object({
    document: z.string(),
    section: z.string(),
    subsection: z.string(),
    assetFamily: z.string(),
  }),
  
  importMetadata: z.object({
    sourceFile: z.string(),
    sheetName: z.string(),
    rowNumber: z.number().int(),
    importedAt: z.string().datetime(),
  }),

  metadata: z.record(z.unknown()),
  
  // System Metadata
  lastModified: z.string().datetime(),
  lastModifiedBy: z.string(),
  lastModifiedByState: z.string().optional(),
  
  // Restoration Buffer
  previousState: z.record(z.unknown()).nullable().optional(),
  
  // Governance
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  pendingChanges: z.record(z.unknown()).optional(),
  changeSubmittedBy: z.object({
    displayName: z.string(),
    loginName: z.string(),
    state: z.string()
  }).optional(),
  adminComment: z.string().optional(),
  yearBucket: z.number().optional(),
});

export type ValidatedAsset = z.infer<typeof AssetSchema>;

/**
 * Validates a raw object from the parser or UI.
 */
export function validateAsset(data: unknown): ValidatedAsset {
  return AssetSchema.parse(data);
}
