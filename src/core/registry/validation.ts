/**
 * @fileOverview Registry Validation Rules.
 * Strict deterministic Zod schemas for system data.
 * Updated Phase 1999: Optimized recursive fields to resolve strict ConditionGroup mismatches.
 */

import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string().uuid(),
  sn: z.string().default(""),
  name: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  grantId: z.string().min(1, "Grant ID is required"),
  
  // Data Synchronization Status
  syncStatus: z.enum(['synced', 'local']).optional(),

  // Hierarchical Context
  section: z.string().default("General"),
  subsection: z.string().default("Base Register"),
  assetFamily: z.string().default("Uncategorized"),
  
  // Location & Assignment
  location: z.string().min(1, "Location is required"),
  normalizedLocation: z.string().optional(),
  normalizedState: z.string().optional(),
  normalizedZone: z.string().optional(),
  normalizedLga: z.string().optional(),
  locationConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  locationStatus: z.enum(['MATCHED', 'PARTIAL', 'UNASSIGNED', 'NEEDS_REVIEW', 'INVALID']).optional(),
  
  lga: z.string().default(""),
  custodian: z.string().default("Unassigned"),
  site: z.string().default(""),
  
  // State & Assessment
  status: z.enum(["VERIFIED", "UNVERIFIED", "DISCREPANCY"]).default("UNVERIFIED"),
  condition: z.string().default("Unassessed"),
  conditionGroup: z.enum(["Good", "Bad", "Stolen", "Obsolete", "Unsalvageable", "Discrepancy"]).default("Good"),
  remarks: z.string().default(""),
  conditionNotes: z.string().optional(),
  conditionHistory: z.array(z.any()).optional(),
  discrepancyFlag: z.boolean().optional(),
  reviewStatus: z.enum(['PENDING', 'RESOLVED', 'FLAGGED']).optional(),
  
  // Fidelity Pulse
  discrepancies: z.array(z.any()).default([]),
  overallFidelityScore: z.number().default(100),
  unseenUpdateFields: z.array(z.string()).default([]),

  // Financial & Technical
  purchaseDate: z.string().optional(),
  value: z.number().nonnegative().default(0),
  purchasePriceUsd: z.number().nonnegative().default(0),
  serialNumber: z.string().default("N/A"),
  assetIdCode: z.string().default(""),
  manufacturer: z.string().default(""),
  modelNumber: z.string().default(""),
  chassisNo: z.string().default(""),
  engineNo: z.string().default(""),
  supplier: z.string().default(""),
  grnNo: z.string().default(""),
  pvNo: z.string().default(""),
  pvJvNo: z.string().default(""),
  usefulLifeYears: z.string().default(""),
  funder: z.string().default(""),
  
  classification: z.any().optional(),

  photoDataUri: z.string().optional(),
  photoUrl: z.string().optional(),
  
  // Forensic Fields
  signatureDataUri: z.string().optional(),
  signatureUrl: z.string().optional(),

  // Spatial
  geotag: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional()
  }).optional(),
  
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
  
  // Restoration Buffer & Governance
  // Note: Using any to prevent recursive type inference conflicts in useForm
  previousState: z.any().nullable().optional(),
  pendingChanges: z.any().optional(),

  sourceGroup: z.string().optional(),
  sourceColumnAGroup: z.string().optional(),
  templateId: z.string().optional(),

  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  changeSubmittedBy: z.object({
    displayName: z.string(),
    loginName: z.string(),
    state: z.string()
  }).optional(),
  adminComment: z.string().optional(),
  yearBucket: z.number().optional(),
  updateCount: z.number().default(0),
});

export type ValidatedAsset = z.infer<typeof AssetSchema>;

/**
 * Validates a raw object from the parser or UI.
 */
export function validateAsset(data: unknown): ValidatedAsset {
  return AssetSchema.parse(data);
}
