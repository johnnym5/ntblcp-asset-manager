import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NIGERIAN_STATES, NIGERIAN_STATE_CAPITALS } from "./constants";
import { Timestamp } from 'firebase/firestore';
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively removes undefined fields and converts Date objects to Firestore Timestamps.
 * Essential for nested objects like 'recovery' in error logs or 'metadata' in assets.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  
  // Handle Firestore native types and Dates
  if (obj instanceof Date) return Timestamp.fromDate(obj) as any;
  if (obj instanceof Timestamp) return obj as any;
  
  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v)) as any;
  }
  
  // Handle Objects
  if (typeof obj === 'object') {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === 'previousState') continue; // Skip undo buffer for Firestore
        
        const value = (obj as any)[key];
        if (value !== undefined) {
          sanitizedObj[key] = sanitizeForFirestore(value);
        }
      }
    }
    return sanitizedObj as T;
  }

  return obj;
}

export const normalizeAssetLocation = (location?: string): string => {
    if (!location) return '';
    const originalLocation = location.trim();
    if (!originalLocation) return '';

    const lowerCaseLocation = originalLocation.toLowerCase();

    const matchedState = NIGERIAN_STATES.find(state => lowerCaseLocation.includes(state.toLowerCase()));
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
