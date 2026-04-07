/**
 * @fileOverview Intelligent Discrepancy Detection Engine.
 * Scans assets for pattern anomalies, semantic inconsistencies, and data quality gaps.
 */

import type { Asset, AssetDiscrepancy, MatchConfidence, DiscrepancySeverity } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';

export const DiscrepancyEngine = {
  /**
   * Scans a list of assets to determine common patterns and flag anomalies.
   */
  scan(assets: Asset[]): Asset[] {
    if (assets.length === 0) return [];

    // 1. Calculate Patterns
    const stats = this.analyzePatterns(assets);

    // 2. Map anomalies back to assets
    return assets.map(asset => {
      const discrepancies = this.findAnomalies(asset, stats);
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
  private analyzePatterns(assets: Asset[]) {
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

    // Determine the majority ID type
    const dominantIdType = idTypes.numeric > idTypes.alphanumeric ? 'NUMERIC' : 'ALPHANUMERIC';
    const avgSnLength = snLengths.length > 0 ? snLengths.reduce((a, b) => a + b, 0) / snLengths.length : 0;

    return { dominantIdType, avgSnLength, idPrefixes };
  },

  /**
   * Checks an individual asset against the calculated norms.
   */
  private findAnomalies(asset: Asset, stats: any): AssetDiscrepancy[] {
    const found: AssetDiscrepancy[] = [];

    // 1. ID Pattern Break
    const id = String(asset.assetIdCode || '');
    if (id) {
      const isNumeric = /^\d+$/.test(id);
      if (stats.dominantIdType === 'NUMERIC' && !isNumeric) {
        found.push(this.createFlag('assetIdCode', id, 'Pattern Break: Alphanumeric ID found in a predominantly numeric register.', 'MEDIUM', 'HIGH'));
      }
    }

    // 2. Unusual ID Length
    if (id && id.length < 3) {
      found.push(this.createFlag('assetIdCode', id, 'Suspiciously short Tag ID.', 'LOW', 'MEDIUM'));
    }

    // 3. Serial Number Anomaly
    const sn = String(asset.serialNumber || '');
    if (sn && sn !== 'N/A' && stats.avgSnLength > 0) {
      if (sn.length > stats.avgSnLength * 2) {
        found.push(this.createFlag('serialNumber', sn, 'Suspiciously long serial number compared to average.', 'LOW', 'LOW'));
      }
    }

    // 4. Missing required fields that seem to be gaps
    if (!asset.description) {
      found.push(this.createFlag('description', '', 'Critical: Missing asset description.', 'HIGH', 'HIGH'));
    }

    if (!asset.location) {
      found.push(this.createFlag('location', '', 'Critical: Missing location scope.', 'HIGH', 'HIGH'));
    }

    // 5. Semantic Checks
    if (asset.value > 1000000 && (!asset.serialNumber || asset.serialNumber === 'N/A')) {
      found.push(this.createFlag('serialNumber', asset.serialNumber, 'High-value item missing specific serial number identification.', 'MEDIUM', 'HIGH'));
    }

    return found;
  },

  private createFlag(field: string, val: any, reason: string, severity: DiscrepancySeverity, confidence: MatchConfidence): AssetDiscrepancy {
    return {
      id: uuidv4(),
      field,
      originalValue: val,
      reason,
      severity,
      confidence,
      status: 'PENDING',
      flaggedAt: new Date().toISOString()
    };
  },

  private calculateFidelity(discrepancies: AssetDiscrepancy[]): number {
    if (discrepancies.length === 0) return 100;
    const penalty = discrepancies.reduce((sum, d) => {
      const weight = d.severity === 'CRITICAL' ? 40 : d.severity === 'HIGH' ? 20 : d.severity === 'MEDIUM' ? 10 : 5;
      return sum + weight;
    }, 0);
    return Math.max(0, 100 - penalty);
  }
};
