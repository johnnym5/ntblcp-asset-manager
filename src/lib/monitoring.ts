/**
 * @fileOverview Advanced Error Monitoring & Resilience Service.
 * Translates technical failures into layman-friendly pulses and logs audits to the cloud.
 */

'use client';

import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from '@/services/firebase/firestore';
import type { ErrorLogEntry, ErrorSeverity, ErrorLogStatus } from '@/types/domain';

export interface TraceContext {
  component?: string;
  module?: string;
  action?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  [key: string]: any;
}

class MonitoringService {
  private isInitialized = false;

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    window.addEventListener('error', (event) => {
      this.trackError(event.error, { action: 'GLOBAL_WINDOW_ERROR', module: 'Client Runtime' });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, { action: 'UNHANDLED_PROMISE_REJECTION', module: 'Async Runtime' });
    });

    this.isInitialized = true;
    console.log("🚀 Assetain Intelligence Monitoring Initialized");
  }

  /**
   * Captures, translates, and logs an error to the administrative audit ledger.
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
        module: context.module || 'Unknown Module',
        action: context.action || 'Unknown Action',
        browser: navigator.userAgent,
        isOnline: navigator.onLine
      },
      error: {
        type: error?.name || 'UnexpectedError',
        message: technicalMessage,
        technicalMessage,
        laymanExplanation,
        stack: error?.stack
      },
      recovery: {
        attempted: !!context.recoveryAttempted,
        action: context.recoveryAction,
        result: context.recoveryResult
      }
    };

    // In-memory reporting for dev
    if (process.env.NODE_ENV !== 'production') {
      console.group(`🛑 RECOVERY AUDIT: ${logEntry.error.laymanExplanation}`);
      console.table(logEntry.context);
      console.groupEnd();
    }

    // Direct cloud archival
    try {
      await FirestoreService.logErrorAudit(logEntry);
    } catch (e) {
      console.error("Monitoring: Failed to commit error pulse to cloud ledger", e);
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
      return "You do not have the required administrative permission to perform this update.";
    }
    if (msg.includes('network-error') || msg.includes('failed to fetch') || msg.includes('timeout')) {
      return "The connection to the cloud was interrupted. Your change has been queued locally.";
    }
    if (msg.includes('not-found') || msg.includes('document missing')) {
      return "The requested record could not be found. It may have been removed by another auditor.";
    }
    if (msg.includes('quota-exceeded')) {
      return "The project's data limit has been reached. Please contact a system administrator.";
    }
    if (msg.includes('offline')) {
      return "You are currently working in an offline zone. Changes will sync when connectivity returns.";
    }
    if (msg.includes('parsing failed') || msg.includes('invalid workbook')) {
      return "The uploaded file format is not deterministic. Please check the Excel template structure.";
    }
    if (msg.includes('validation')) {
      return "Some required fields are missing or in an invalid format. Check the record and try again.";
    }

    return "An unexpected operational glitch occurred. The system is attempting to recover.";
  }
}

export const monitoring = new MonitoringService();
