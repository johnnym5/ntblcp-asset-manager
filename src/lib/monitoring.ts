/**
 * @fileOverview Advanced Error Monitoring & Resilience Service.
 * Translates technical failures into layman-friendly pulses and logs audits to the cloud.
 * Phase 1980: Removed FirestoreService dependency to break circular module loop.
 */

'use client';

import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeForFirestore } from '@/lib/utils';
import type { ErrorLogEntry, ErrorSeverity } from '@/types/domain';

export interface TraceContext {
  component?: string;
  module?: string;
  action?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  recoveryAttempted?: boolean;
  recoveryAction?: string;
  recoveryResult?: string;
  [key: string]: any;
}

class MonitoringService {
  private isInitialized = false;

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    window.addEventListener('error', (event) => {
      this.trackError(event.error, { action: 'GLOBAL_WINDOW_ERROR', module: 'Client Runtime' }, 'CRITICAL');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, { action: 'UNHANDLED_PROMISE_REJECTION', module: 'Async Runtime' }, 'CRITICAL');
    });

    this.isInitialized = true;
    console.log("🚀 Assetain Resilience Pulse Active");
  }

  /**
   * Captures, translates, and logs an error to the administrative audit ledger.
   * Directly uses Firestore SDK to avoid circular service dependencies.
   */
  async trackError(error: any, context: TraceContext = {}, severity: ErrorSeverity = 'WARNING') {
    if (typeof window === 'undefined') return;

    const technicalMessage = error?.message || String(error);
    const laymanExplanation = this.translateToLayman(technicalMessage, error?.code);

    const logEntry: ErrorLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity,
      status: 'PENDING',
      user: {
        id: context.userId || 'anonymous',
        name: context.userName || 'Anonymous User',
        role: context.userRole || 'VIEWER'
      },
      context: {
        page: window.location.pathname,
        module: context.module || 'System',
        action: context.action || 'Operational Pulse',
        browser: navigator.userAgent,
        isOnline: navigator.onLine
      },
      error: {
        type: error?.name || 'PulseAnomaly',
        message: technicalMessage,
        technicalMessage,
        laymanExplanation,
        stack: error?.stack || null
      },
      recovery: {
        attempted: !!context.recoveryAttempted,
        action: context.recoveryAction || null,
        result: context.recoveryResult || null
      }
    };

    // In-memory reporting for dev
    if (process.env.NODE_ENV !== 'production') {
      console.group(`🛑 RECOVERY AUDIT: ${logEntry.error.laymanExplanation}`);
      console.table(logEntry.context);
      console.groupEnd();
    }

    // Direct cloud archival
    if (db) {
      try {
        const logRef = doc(db, 'error_logs', logEntry.id);
        await setDoc(logRef, sanitizeForFirestore(logEntry));
      } catch (e) {
        console.error("Monitoring: Failed to commit error pulse to cloud ledger", e);
      }
    }
  }

  /**
   * Records a business-level event for the operational audit trail.
   */
  trackEvent(name: string, data: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 OPERATIONAL PULSE [${name}]:`, data);
    }
  }

  /**
   * Translates cryptic technical messages into plain English for auditors and admins.
   */
  private translateToLayman(message: string, code?: string): string {
    const msg = message.toLowerCase();

    if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
      return "Administrative clearance denied for this action.";
    }
    if (msg.includes('network-error') || msg.includes('failed to fetch') || msg.includes('timeout')) {
      return "Cloud heartbeat interrupted. Operation enqueued for background sync.";
    }
    if (msg.includes('not-found') || msg.includes('document missing')) {
      return "Requested record could not be found in the registry.";
    }
    if (msg.includes('quota-exceeded')) {
      return "Cloud storage capacity reached. Contact system administrator.";
    }
    if (msg.includes('offline')) {
      return "Working in offline regional scope. Changes saved locally.";
    }
    if (msg.includes('parsing failed') || msg.includes('invalid workbook')) {
      return "Workbook structure mismatch. Deterministic ingestion failed.";
    }
    if (msg.includes('validation')) {
      return "Data fidelity check failed. Required parameters are missing.";
    }

    return "An unexpected operational pulse anomaly occurred. Resilience protocols active.";
  }
}

export const monitoring = new MonitoringService();
