/**
 * @fileOverview Registry Integrity Engine.
 * Provides high-performance heuristics for identifying data quality gaps and duplicates.
 */

import type { Asset } from '@/types/domain';

export interface IntegrityIssue {
  id: string;
  type: 'DUPLICATE_SERIAL' | 'INCONSISTENT_LOCATION' | 'MISSING_HIERARCHY' | 'CASE_MISMATCH';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  affectedIds: string[];
  suggestedFix?: string;
}

export const IntegrityEngine = {
  /**
   * Scans a registry pulse for data quality violations.
   */
  async runFullAudit(assets: Asset[]): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];
    
    // 1. Duplicate Serial Detection
    const serialMap = new Map<string, string[]>();
    assets.forEach(a => {
      const sn = (a.serialNumber || '').trim().toUpperCase();
      if (sn && sn !== 'N/A' && sn !== 'NONE' && sn.length > 2) {
        const list = serialMap.get(sn) || [];
        list.push(a.id);
        serialMap.set(sn, list);
      }
    });

    serialMap.forEach((ids, sn) => {
      if (ids.length > 1) {
        issues.push({
          id: `dup-sn-${sn}`,
          type: 'DUPLICATE_SERIAL',
          severity: 'CRITICAL',
          description: `Duplicate Serial Number detected: ${sn}`,
          affectedIds: ids,
          suggestedFix: "Verify physical nameplates and update record serials."
        });
      }
    });

    // 2. Inconsistent Location Casing
    const locationVariants = new Map<string, Set<string>>();
    assets.forEach(a => {
      if (a.location) {
        const normalized = a.location.trim().toLowerCase();
        const set = locationVariants.get(normalized) || new Set();
        set.add(a.location.trim());
        locationVariants.set(normalized, set);
      }
    });

    locationVariants.forEach((variants, normalized) => {
      if (variants.size > 1) {
        issues.push({
          id: `loc-case-${normalized}`,
          type: 'CASE_MISMATCH',
          severity: 'WARNING',
          description: `Inconsistent casing for location: ${Array.from(variants).join(', ')}`,
          affectedIds: assets.filter(a => a.location?.trim().toLowerCase() === normalized).map(a => a.id),
          suggestedFix: "Standardize to Title Case."
        });
      }
    });

    // 3. Hierarchy Gaps
    const missingHierarchy = assets.filter(a => !a.section || a.section === 'General' || !a.subsection);
    if (missingHierarchy.length > 0) {
      issues.push({
        id: 'hierarchy-gaps',
        type: 'MISSING_HIERARCHY',
        severity: 'INFO',
        description: `${missingHierarchy.length} records are missing detailed provenance hierarchy.`,
        affectedIds: missingHierarchy.map(a => a.id),
        suggestedFix: "Use Batch Update to assign Major Sections."
      });
    }

    return issues;
  },

  /**
   * Standardizes location strings to Title Case.
   */
  standardizeLocation(loc: string): string {
    return loc
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
};
