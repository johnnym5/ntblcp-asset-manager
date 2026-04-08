import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NIGERIAN_STATES, NIGERIAN_STATE_CAPITALS } from "./constants";
import { Timestamp } from 'firebase/firestore';
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a "Fuzzy Fingerprint" of a string for resilient matching.
 * Removes all non-alphanumeric characters, spaces, and casing.
 * e.g., "Akwa-Ibom" -> "akwaibom"
 */
export function getFuzzySignature(input: any): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Sanitizes search input to prevent regex breaks and ensure clean data pulse.
 */
export function sanitizeSearch(query: string): string {
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
}

/**
 * Recursively removes undefined fields, converts Date objects to Firestore Timestamps,
 * and sanitizes keys for Firebase compatibility (RTDB/Firestore).
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return Timestamp.fromDate(obj) as any;
  if (obj instanceof Timestamp) return obj as any;
  
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v)) as any;
  }
  
  const sanitizedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === 'previousState') continue;
      const value = (obj as any)[key];
      const safeKey = key.replace(/[.#$/[\]\n\r]/g, '_').trim();
      if (value !== undefined) {
        if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
          sanitizedObj[safeKey] = sanitizeForFirestore(value);
        } else if (value instanceof Date) {
          sanitizedObj[safeKey] = Timestamp.fromDate(value);
        } else {
          sanitizedObj[safeKey] = value;
        }
      }
    }
  }
  return sanitizedObj as T;
}

export const normalizeAssetLocation = (location?: string): string => {
    if (!location) return '';
    const originalLocation = location.trim();
    if (!originalLocation) return '';

    const lowerCaseLocation = originalLocation.toLowerCase();
    const fuzzyInput = getFuzzySignature(originalLocation);

    // Try fuzzy match against canonical states first
    const matchedState = NIGERIAN_STATES.find(state => 
      getFuzzySignature(state) === fuzzyInput || 
      lowerCaseLocation.includes(state.toLowerCase())
    );
    
    if (matchedState) return matchedState;

    for (const state in NIGERIAN_STATE_CAPITALS) {
        if (lowerCaseLocation.includes(NIGERIAN_STATE_CAPITALS[state].toLowerCase())) {
            return state;
        }
    }
    return originalLocation.replace(/\b\w/g, l => l.toUpperCase());
};

export const getStatusClasses = (status?: 'Verified' | 'Unverified' | 'Discrepancy') => {
    switch (status) {
        case 'Verified':
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 hover:bg-green-200/60 dark:hover:bg-green-900/80 focus:ring-green-500';
        case 'Unverified':
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800 hover:bg-red-200/60 dark:hover:bg-red-900/80 focus:ring-red-500';
        case 'Discrepancy':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800 hover:bg-yellow-200/60 dark:hover:bg-yellow-900/80 focus:ring-yellow-500';
        default:
            return '';
    }
}
