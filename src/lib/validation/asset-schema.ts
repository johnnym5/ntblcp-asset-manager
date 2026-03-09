'use client';

import { z } from 'zod';

/**
 * @fileOverview Zod schema for Asset data validation.
 * Used primarily during Excel imports to ensure data integrity before database insertion.
 */

export const AssetSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  sn: z.string().optional(),
  serialNumber: z.string().optional(),
  assetIdCode: z.string().optional(),
  location: z.string().optional(),
  lga: z.string().optional(),
  site: z.string().optional(),
  assignee: z.string().optional(),
  condition: z.string().optional(),
  remarks: z.string().optional(),
  verifiedStatus: z.enum(["Verified", "Unverified", "Discrepancy"]).optional().default("Unverified"),
  verifiedDate: z.string().optional(),
  lastModified: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  lastModifiedByState: z.string().optional(),
  grantId: z.string().optional(),
}).passthrough();

export type ValidatedAsset = z.infer<typeof AssetSchema>;
