/**
 * @fileOverview Deterministic Location Normalization Engine.
 * Resolves raw input strings to canonical Nigerian administrative hierarchies.
 * Proxy service matching the core lib implementation.
 */

import { LocationEngine as CoreEngine } from '@/lib/location-engine';
export type { LocationPulse } from '@/lib/location-engine';

export const LocationEngine = CoreEngine;
