import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NIGERIAN_STATES, NIGERIAN_STATE_CAPITALS, ZONAL_STORES, SPECIAL_LOCATIONS } from "./constants";
import React from "react";
import type { Asset } from "./types";
import { Timestamp } from 'firebase/firestore';

/**
 * Architecture Utility: Merges tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Security/Data Utility: Sanitizes input to prevent NoSQL injection patterns.
 */
export const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return input;
    // Remove characters that could be used for NoSQL injection or basic script tags
    return input.replace(/[${}]/g, "").trim();
};

/**
 * Recursively trims strings and prepares object for database storage.
 * Handles Firebase Timestamps and ensures clean data types.
 */
export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    if (!obj) return obj;
    const sanitizedObj: Record<string, unknown> = {};
    
    for (const key in obj) {
        const value = (obj as any)[key];
        if (value !== undefined && value !== null) {
            if (value instanceof Date) {
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else if (typeof value === 'string') {
                sanitizedObj[key] = value.trim();
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
                sanitizedObj[key] = sanitizeForFirestore(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

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

export const assetMatchesGlobalFilter = (asset: Asset, filters: string[]): boolean => {
    if (!filters || filters.length === 0 || filters.includes('All')) {
        return true;
    }

    const assetLocation = (asset.location || "").toLowerCase().trim();
    
    return filters.some(filter => {
        const lowerCaseFilter = filter.toLowerCase().trim();
        const isZone = ZONAL_STORES.includes(filter);

        if (isZone) {
            return assetLocation.includes(lowerCaseFilter) && assetLocation.includes("zonal store");
        }
        
        if (SPECIAL_LOCATIONS.includes(filter)) {
            return assetLocation.includes(lowerCaseFilter);
        }

        const capitalCity = NIGERIAN_STATE_CAPITALS[filter]?.toLowerCase().trim();
        const matchesState = assetLocation.startsWith(lowerCaseFilter);
        const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
        return matchesState || matchesCapital;
    });
};
