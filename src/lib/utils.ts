import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NIGERIAN_STATES, NIGERIAN_STATE_CAPITALS } from "./constants";
import { Timestamp } from "firebase/firestore";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures objects are safe for Firestore by converting Dates to Timestamps 
 * and removing forbidden properties like 'previousState'.
 */
export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        // CRITICAL: Ensure audit buffer is NEVER pushed to the cloud
        if (key === 'previousState') continue;
        if (value !== undefined) {
            if (value instanceof Date) {
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
                // Recursively sanitize nested objects (like changeSubmittedBy)
                sanitizedObj[key] = sanitizeForFirestore(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

/**
 * Performs a deep merge of two objects, specifically for restoration operations.
 */
export const deepMerge = (target: any, source: any) => {
    const output = { ...target };
    if (source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!(key in target)) Object.assign(output, { [key]: source[key] });
                else output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
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
