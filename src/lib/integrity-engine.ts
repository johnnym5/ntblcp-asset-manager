/**
 * @fileOverview Registry Integrity Engine.
 * Provides high-performance heuristics for identifying data quality gaps and naming inconsistencies.
 * Phase 400: Integrated Fuzzy Naming Auditor for global register standardization.
 */

import type { Asset } from '@/types/domain';
import { getFuzzySignature } from './utils';
import { LocationEngine } from '@/services/location-engine';

export interface IntegrityIssue {
  id: string;
  type: 'DUPLICATE_SERIAL' | 'INCONSISTENT_LOCATION' | 'MISSING_HIERARCHY' | 'CASE_MISMATCH' | 'UNOPTIMIZED_MEDIA' | 'TACTICAL_ALERT' | 'FIDELITY_GAP' | 'NAMING_VARIANT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  affectedIds: string[];
  suggestedFix?: string;
}

export const IntegrityEngine = {
  /**
   * Scans a registry pulse for data quality violations and naming anomalies.
   */
  async runFullAudit(assets: Asset[]): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];
    
    // 1. Tactical Alerts (High-Risk Conditions)
    const highRiskAssets = assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || ''));
    if (highRiskAssets.length > 0) {
      issues.push({
        id: 'tactical-alerts',
        type: 'TACTICAL_ALERT',
        severity: 'CRITICAL',
        description: `${highRiskAssets.length} assets are in a critical state (Stolen/Burnt/Unsalvageable).`,
        affectedIds: highRiskAssets.map(a => a.id),
        suggestedFix: "Navigate to the Alerts Cockpit to initiate recovery pulses."
      });
    }

    // 2. Duplicate Serial Detection
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

    // 3. Naming Variant & Normalization Audit
    const locationVariants = new Map<string, Set<string>>();
    assets.forEach(a => {
      if (a.location) {
        const fuzzy = getFuzzySignature(a.location);
        const set = locationVariants.get(fuzzy) || new Set();
        set.add(a.location.trim());
        locationVariants.set(fuzzy, set);
      }
    });

    locationVariants.forEach((variants, fuzzy) => {
      if (variants.size > 1) {
        const variantsList = Array.from(variants);
        const canonical = LocationEngine.normalize(variantsList[0]).normalized;
        
        issues.push({
          id: `naming-var-${fuzzy}`,
          type: 'NAMING_VARIANT',
          severity: 'WARNING',
          description: `Naming variations discovered for location [${canonical}]: ${variantsList.join(', ')}`,
          affectedIds: assets.filter(a => getFuzzySignature(a.location) === fuzzy).map(a => a.id),
          suggestedFix: `Standardize all variant pulses to canonical name: ${canonical}`
        });
      }
    });

    // 4. Case Mismatch Audit (Simple Casing check)
    const caseVariants = new Map<string, Set<string>>();
    assets.forEach(a => {
      if (a.location) {
        const lower = a.location.trim().toLowerCase();
        const set = caseVariants.get(lower) || new Set();
        set.add(a.location.trim());
        caseVariants.set(lower, set);
      }
    });

    caseVariants.forEach((variants, lower) => {
      if (variants.size > 1 && !locationVariants.has(getFuzzySignature(lower))) {
        issues.push({
          id: `case-mis-${lower}`,
          type: 'CASE_MISMATCH',
          severity: 'INFO',
          description: `Inconsistent casing detected: ${Array.from(variants).join(', ')}`,
          affectedIds: assets.filter(a => a.location?.trim().toLowerCase() === lower).map(a => a.id),
          suggestedFix: "Standardize to Title Case for visual parity."
        });
      }
    });

    return issues;
  },

  /**
   * Helper to standardize location strings.
   */
  standardizeLocation(raw: string): string {
    return LocationEngine.normalize(raw).normalized;
  }
};
