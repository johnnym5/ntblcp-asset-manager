/**
 * @fileOverview Location Normalization & Matching Engine.
 * Resolves raw input strings to canonical Nigerian administrative hierarchies.
 */

import { NIGERIAN_GEO_DATA, type StateInfo } from '@/lib/nigeria-geo';
import type { MatchConfidence, LocationMatchStatus } from '@/types/domain';

export interface LocationPulse {
  raw: string;
  normalized: string;
  state: string;
  zone: string;
  confidence: MatchConfidence;
  status: LocationMatchStatus;
}

export const LocationEngine = {
  /**
   * Normalizes a raw string to a canonical Nigerian state pulse.
   */
  normalize(input: string | null | undefined): LocationPulse {
    const raw = (input || '').trim();
    if (!raw) {
      return { 
        raw: '', 
        normalized: 'Unassigned', 
        state: 'Unassigned', 
        zone: 'Global', 
        confidence: 'NONE', 
        status: 'UNASSIGNED' 
      };
    }

    const clean = raw.toLowerCase().replace(/\s+/g, ' ').replace(/[.,]/g, '');
    
    // 1. Try Exact State Match
    const stateMatch = NIGERIAN_GEO_DATA.find(s => 
      s.name.toLowerCase() === clean || 
      s.aliases.some(a => a.toLowerCase() === clean)
    );
    if (stateMatch) {
      return this.pulse(raw, stateMatch, 'HIGH', 'MATCHED');
    }

    // 2. Try Capital Match
    const capitalMatch = NIGERIAN_GEO_DATA.find(s => s.capital.toLowerCase() === clean);
    if (capitalMatch) {
      return this.pulse(raw, capitalMatch, 'HIGH', 'MATCHED');
    }

    // 3. Fuzzy Keyword Match (e.g., "Lagos Store" -> Lagos)
    const fuzzyMatch = NIGERIAN_GEO_DATA.find(s => {
      const name = s.name.toLowerCase();
      return clean.includes(name) || name.includes(clean);
    });
    if (fuzzyMatch) {
      return this.pulse(raw, fuzzyMatch, 'MEDIUM', 'PARTIAL');
    }

    // 4. Fallback: Unclassified
    return {
      raw,
      normalized: raw,
      state: 'Unknown',
      zone: 'Global',
      confidence: 'LOW',
      status: 'NEEDS_REVIEW'
    };
  },

  private pulse(raw: string, state: StateInfo, confidence: MatchConfidence, status: LocationMatchStatus): LocationPulse {
    return {
      raw,
      normalized: state.name,
      state: state.name,
      zone: state.zone,
      confidence,
      status
    };
  },

  /**
   * Comparative sort pulse for location-aware registers.
   */
  compareAssets(a: any, b: any): number {
    // 1. Zone Priority
    const zoneA = a.normalizedZone || 'Z';
    const zoneB = b.normalizedZone || 'Z';
    if (zoneA !== zoneB) return zoneA.localeCompare(zoneB);

    // 2. State Priority
    const stateA = a.normalizedState || 'Z';
    const stateB = b.normalizedState || 'Z';
    if (stateA !== stateB) return stateA.localeCompare(stateB);

    // 3. LGA / Location
    const locA = a.location || 'Z';
    const locB = b.location || 'Z';
    return locA.localeCompare(locB);
  }
};
