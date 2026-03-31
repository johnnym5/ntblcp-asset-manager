import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deep recursive utility to ensure objects are safe for Firestore.
 * - Converts Dates to Timestamps.
 * - Recursively removes undefined values from objects and arrays.
 * - Filters out sensitive local-only keys (e.g., previousState).
 */
export const sanitizeForFirestore = <T extends any>(obj: T): T => {
    if (obj === null || obj === undefined) return obj as T;

    // Handle Dates
    if (obj instanceof Date) {
        return Timestamp.fromDate(obj) as any;
    }

    // Handle Arrays Recursively
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item)) as any;
    }

    // Handle Objects Recursively
    if (typeof obj === 'object' && !(obj instanceof Timestamp)) {
        const sanitizedObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // CRITICAL: Ensure audit buffer is NEVER pushed to the cloud
                if (key === 'previousState') continue;

                const value = (obj as any)[key];
                if (value !== undefined) {
                    sanitizedObj[key] = sanitizeForFirestore(value);
                }
            }
        }
        return sanitizedObj as T;
    }

    // Return primitives as is
    return obj;
};

/**
 * Deep merge utility for restoration pulses.
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