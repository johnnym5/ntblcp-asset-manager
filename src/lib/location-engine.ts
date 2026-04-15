/**
 * @fileOverview Deterministic Location Normalization Engine.
 * Resolves raw input strings to canonical Nigerian administrative hierarchies.
 * Phase 300: Fully integrated getFuzzySignature for absolute naming resilience.
 */

import { NIGERIAN_GEO_DATA, type StateInfo } from '@/lib/nigeria-geo';
import { getFuzzySignature } from '@/lib/utils';
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

    const fuzzyInput = getFuzzySignature(raw);
    
    // 1. Try Fuzzy State Match (Handles Akwaibom, AKWA IBOM, Akwa-Ibom etc)
    const stateMatch = NIGERIAN_GEO_DATA.find(s => 
      getFuzzySignature(s.name) === fuzzyInput || 
      s.aliases.some(a => getFuzzySignature(a) === fuzzyInput)
    );
    
    if (stateMatch) {
      return this._pulse(raw, stateMatch, 'HIGH', 'MATCHED');
    }

    // 2. Try Fuzzy Capital Match (Handles Uyo, Ikeja, etc)
    const capitalMatch = NIGERIAN_GEO_DATA.find(s => getFuzzySignature(s.capital) === fuzzyInput);
    if (capitalMatch) {
      return this._pulse(raw, capitalMatch, 'HIGH', 'MATCHED');
    }

    // 3. Containment Match (e.g., "Lagos Store" -> Lagos)
    const partialMatch = NIGERIAN_GEO_DATA.find(s => {
      const fuzzyName = getFuzzySignature(s.name);
      return fuzzyInput.includes(fuzzyName) || fuzzyName.includes(fuzzyInput);
    });
    
    if (partialMatch) {
      return this._pulse(raw, partialMatch, 'MEDIUM', 'PARTIAL');
    }

    // 4. Fallback: Title Case for display
    return {
      raw,
      normalized: raw.replace(/\b\w/g, l => l.toUpperCase()),
      state: 'Unknown',
      zone: 'Global',
      confidence: 'LOW',
      status: 'NEEDS_REVIEW'
    };
  },

  _pulse(raw: string, state: StateInfo, confidence: MatchConfidence, status: LocationMatchStatus): LocationPulse {
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
    const zoneA = a.normalizedZone || 'Z';
    const zoneB = b.normalizedZone || 'Z';
    if (zoneA !== zoneB) return zoneA.localeCompare(zoneB);

    const stateA = a.normalizedState || 'Z';
    const stateB = b.normalizedState || 'Z';
    if (stateA !== stateB) return stateA.localeCompare(stateB);

    const locA = a.location || 'Z';
    const locB = b.location || 'Z';
    return locA.localeCompare(locB);
  }
};
