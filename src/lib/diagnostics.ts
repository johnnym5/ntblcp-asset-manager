/**
 * @fileOverview System Diagnostics Engine.
 * Performs real-time health audits on the Triple-Layer Redundancy architecture.
 */

import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { getSettings as getRtdbSettings } from '@/lib/database';

export interface DiagnosticResult {
  node: 'CLOUD' | 'MIRROR' | 'LOCAL';
  status: 'STABLE' | 'LATENT' | 'DISCONNECTED';
  latency: number; // ms
  message: string;
}

export const SystemDiagnostics = {
  /**
   * Executes a holistic heartbeat check across all storage layers.
   */
  async runSelfTest(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // 1. Local Node Test (IndexedDB)
    const localStart = performance.now();
    try {
      await storage.getSettings();
      results.push({
        node: 'LOCAL',
        status: 'STABLE',
        latency: Math.round(performance.now() - localStart),
        message: 'Persistence layer responsive.'
      });
    } catch (e) {
      results.push({
        node: 'LOCAL',
        status: 'DISCONNECTED',
        latency: 0,
        message: 'IndexedDB corruption detected.'
      });
    }

    // 2. Cloud Node Test (Firestore)
    const cloudStart = performance.now();
    try {
      if (navigator.onLine) {
        await FirestoreService.getSettings();
        results.push({
          node: 'CLOUD',
          status: 'STABLE',
          latency: Math.round(performance.now() - cloudStart),
          message: 'Cloud Authority reached.'
        });
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      results.push({
        node: 'CLOUD',
        status: 'DISCONNECTED',
        latency: 0,
        message: 'Cloud heartbeat missing.'
      });
    }

    // 3. Mirror Node Test (RTDB)
    const mirrorStart = performance.now();
    try {
      if (navigator.onLine) {
        await getRtdbSettings();
        results.push({
          node: 'MIRROR',
          status: 'STABLE',
          latency: Math.round(performance.now() - mirrorStart),
          message: 'Shadow Mirror active.'
        });
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      results.push({
        node: 'MIRROR',
        status: 'DISCONNECTED',
        latency: 0,
        message: 'Replication link severed.'
      });
    }

    return results;
  }
};
