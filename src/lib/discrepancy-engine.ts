/**
 * @fileOverview Intelligent Discrepancy Detection & Smart Suggestion Engine.
 * Scans assets for pattern anomalies and provides logical data recovery suggestions.
 * Phase 600: Updated with Category-Aware Validation Rules.
 */

import type { Asset, AssetDiscrepancy, MatchConfidence, DiscrepancySeverity, DiscrepancyStatus } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';
import { ClassificationEngine } from './classification-engine';
import { VALIDATION_GROUPS, type CategoryValidationRules } from './validation-rules';

export const DiscrepancyEngine = {
  /**
   * Scans a list of assets to determine common patterns and flag anomalies with smart suggestions.
   */
  scan(assets: Asset[]): Asset[] {
    if (assets.length === 0) return [];

    // 1. Calculate Dataset Patterns
    const stats = this.analyzePatterns(assets);

    // 2. Map anomalies and suggestions back to assets
    return assets.map((asset, index) => {
      const discrepancies = this.findAnomaliesAndSuggestions(asset, assets, index, stats);
      const score = this.calculateFidelity(discrepancies);
      
      return {
        ...asset,
        discrepancies,
        overallFidelityScore: score
      };
    });
  },

  /**
   * Analyzes an entire dataset to find the "expected norm" for key columns.
   */
  analyzePatterns(assets: Asset[]) {
    const idTypes = { numeric: 0, alphanumeric: 0, total: 0 };
    const snLengths: number[] = [];
    const idPrefixes: Record<string, number> = {};

    assets.forEach(a => {
      const id = String(a.assetIdCode || '');
      if (id) {
        idTypes.total++;
        if (/^\d+$/.test(id)) idTypes.numeric++;
        else idTypes.alphanumeric++;

        const prefix = id.substring(0, 3).toUpperCase();
        idPrefixes[prefix] = (idPrefixes[prefix] || 0) + 1;
      }

      const sn = String(a.serialNumber || '');
      if (sn && sn !== 'N/A') snLengths.push(sn.length);
    });

    const dominantIdType = idTypes.numeric > idTypes.alphanumeric ? 'NUMERIC' : 'ALPHANUMERIC';
    const avgSnLength = snLengths.length > 0 ? snLengths.reduce((a, b) => a + b, 0) / snLengths.length : 0;

    return { dominantIdType, avgSnLength, idPrefixes };
  },

  /**
   * Checks an individual asset and looks for "Column Hunt" or "Contextual" suggestions.
   */
  findAnomaliesAndSuggestions(asset: Asset, allAssets: Asset[], currentIndex: number, stats: any): AssetDiscrepancy[] {
    const classification = asset.classification || ClassificationEngine.classify(asset);
    const rules = VALIDATION_GROUPS[classification.validationGroup] || VALIDATION_GROUPS.unknown;
    
    const found: AssetDiscrepancy[] = [];

    // 1. Category-Specific Rule Enforcement
    found.push(...this.checkFieldRules(asset, rules));

    // 2. ID Pattern Break Check
    const id = String(asset.assetIdCode || '');
    if (id && rules.assetIdCode !== 'forbidden') {
      const isNumeric = /^\d+$/.test(id);
      if (stats.dominantIdType === 'NUMERIC' && !isNumeric) {
        const suggestion = this.huntForValue(asset.metadata, (val) => /^\d+$/.test(String(val)));
        found.push(this.createFlag(
          'assetIdCode', 
          id, 
          'Pattern Break: Alphanumeric ID found in numeric register.', 
          'MEDIUM', 
          'HIGH',
          suggestion
        ));
      }
    }

    // 3. Serial Number Validation
    if (rules.serialNumber === 'required' || rules.serialNumber === 'optional') {
      const sn = String(asset.serialNumber || '');
      if (!sn || sn === 'N/A') {
        const suggestion = this.huntForValue(asset.metadata, (val) => {
          const s = String(val);
          return s.length > 5 && /[A-Z]/.test(s) && /\d/.test(s);
        });

        if (suggestion) {
          found.push(this.createFlag(
            'serialNumber', 
            sn, 
            'Data Recovery: Found potential serial number in unmapped columns.', 
            'MEDIUM', 
            'HIGH',
            suggestion
          ));
        } else if (rules.serialNumber === 'required') {
          // Contextual extrapolation for missing sequence
          const prev = allAssets[currentIndex - 1];
          if (prev && prev.serialNumber && /^\d+$/.test(prev.serialNumber)) {
            const nextSn = String(parseInt(prev.serialNumber) + 1);
            found.push(this.createFlag('serialNumber', '', 'Sequence Gap: Suggested serial based on preceding record.', 'HIGH', 'MEDIUM', nextSn));
          } else {
            found.push(this.createFlag('serialNumber', '', 'Required serial number is missing for this asset type.', 'HIGH', 'HIGH'));
          }
        }
      }
    }

    // 4. Missing Description Extrapolation
    if (!asset.description) {
      const neighbors = allAssets.slice(Math.max(0, currentIndex - 2), currentIndex + 3);
      const commonDesc = this.findMode(neighbors.map(n => n.description).filter(Boolean));
      found.push(this.createFlag('description', '', 'Fidelity Gap: Missing description. Suggested based on group context.', 'CRITICAL', 'LOW', commonDesc));
    }

    return found;
  },

  /**
   * Validates mandatory and forbidden fields based on category rules.
   */
  checkFieldRules(asset: Asset, rules: CategoryValidationRules): AssetDiscrepancy[] {
    const findings: AssetDiscrepancy[] = [];
    
    Object.entries(rules).forEach(([field, rule]) => {
      const val = (asset as any)[field];
      const hasValue = val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'N/A';

      if (rule === 'required' && !hasValue) {
        // Special case: don't flag missing serial if engine/chassis exists for vehicles
        if (field === 'serialNumber' && (asset.engineNo || asset.chassisNo)) return;
        
        findings.push(this.createFlag(field, '', `Required field [${field}] is missing for this asset category.`, 'HIGH', 'HIGH'));
      } else if (rule === 'forbidden' && hasValue) {
        findings.push(this.createFlag(field, val, `Forbidden field [${field}] should not be populated for this asset type.`, 'MEDIUM', 'HIGH'));
      }
    });
    
    return findings;
  },

  /**
   * Scans unmapped metadata for a value that passes a logical check.
   */
  huntForValue(metadata: Record<string, unknown> | undefined, validator: (val: any) => boolean): string | undefined {
    if (!metadata) return undefined;
    for (const [key, value] of Object.entries(metadata)) {
      if (value && validator(value)) {
        return String(value);
      }
    }
    return undefined;
  },

  findMode(arr: string[]): string | undefined {
    if (arr.length === 0) return undefined;
    const counts: Record<string, number> = {};
    arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  },

  createFlag(
    field: string, 
    val: any, 
    reason: string, 
    severity: DiscrepancySeverity, 
    confidence: MatchConfidence,
    suggestion?: any
  ): AssetDiscrepancy {
    return {
      id: uuidv4(),
      field,
      originalValue: val,
      suggestedValue: suggestion,
      reason,
      severity,
      confidence,
      status: 'PENDING',
      flaggedAt: new Date().toISOString()
    };
  },

  calculateFidelity(discrepancies: AssetDiscrepancy[]): number {
    if (discrepancies.length === 0) return 100;
    const penalty = discrepancies.reduce((sum, d) => {
      const weight = d.severity === 'CRITICAL' ? 40 : d.severity === 'HIGH' ? 20 : d.severity === 'MEDIUM' ? 10 : 5;
      return sum + weight;
    }, 0);
    return Math.max(0, 100 - penalty);
  }
};
