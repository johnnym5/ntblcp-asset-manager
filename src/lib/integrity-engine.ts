/**
 * @fileOverview Registry Integrity Engine.
 * Provides high-performance heuristics for identifying data quality gaps and critical alerts.
 * Phase 64: Added Coordinate Precision and Fidelity Gap scanners.
 */

import type { Asset } from '@/types/domain';

export interface IntegrityIssue {
  id: string;
  type: 'DUPLICATE_SERIAL' | 'INCONSISTENT_LOCATION' | 'MISSING_HIERARCHY' | 'CASE_MISMATCH' | 'UNOPTIMIZED_MEDIA' | 'TACTICAL_ALERT' | 'COORDINATE_DRIFT' | 'FIDELITY_GAP';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  affectedIds: string[];
  suggestedFix?: string;
}

export const IntegrityEngine = {
  /**
   * Scans a registry pulse for data quality violations and high-risk exceptions.
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

    // 3. Coordinate Drift (Low Precision Geotags)
    const lowPrecision = assets.filter(a => a.geotag && a.geotag.accuracy > 50);
    if (lowPrecision.length > 0) {
      issues.push({
        id: 'coordinate-drift',
        type: 'COORDINATE_DRIFT',
        severity: 'WARNING',
        description: `${lowPrecision.length} assets have low-precision spatial anchors (>50m drift).`,
        affectedIds: lowPrecision.map(a => a.id),
        suggestedFix: "Re-anchor GPS coordinates in an open-sky environment."
      });
    }

    // 4. Fidelity Gaps (High-Value items missing evidence)
    const fidelityGaps = assets.filter(a => a.value > 1000000 && !a.photoUrl && !a.photoDataUri);
    if (fidelityGaps.length > 0) {
      issues.push({
        id: 'fidelity-gaps',
        type: 'FIDELITY_GAP',
        severity: 'WARNING',
        description: `${fidelityGaps.length} high-value assets (over 1M NGN) are missing visual evidence.`,
        affectedIds: fidelityGaps.map(a => a.id),
        suggestedFix: "Use the Document Scanner to capture high-fidelity photo proof."
      });
    }

    // 5. Inconsistent Location Casing
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

    // 6. Hierarchy Gaps
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
  },

  /**
   * Calculates a holistic health score (0-100) based on identified issues.
   */
  calculateFidelityScore(assets: Asset[], issues: IntegrityIssue[]): number {
    if (assets.length === 0) return 100;
    
    let penalty = 0;
    issues.forEach(issue => {
      const weight = issue.severity === 'CRITICAL' ? 10 : issue.severity === 'WARNING' ? 5 : 2;
      penalty += weight;
    });

    return Math.max(0, 100 - penalty);
  }
};
