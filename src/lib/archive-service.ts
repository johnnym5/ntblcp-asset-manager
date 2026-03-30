/**
 * @fileOverview Disaster Recovery Service - System Archival Pulse.
 * Orchestrates full-state backups for the entire Assetain environment.
 */

import { storage } from '@/offline/storage';
import { saveAs } from 'file-saver';

export const ArchiveService = {
  /**
   * Generates a timestamped JSON pulse containing the entire application state.
   * Includes Registry, Sandbox, Settings, and the Sync Queue.
   */
  async generateFullSnapshot() {
    const assets = await storage.getAssets();
    const sandbox = await storage.getSandbox();
    const settings = await storage.getSettings();
    const queue = await storage.getQueue();

    const snapshot = {
      version: '5.0.2',
      timestamp: new Date().toISOString(),
      metadata: {
        totalRecords: assets.length,
        stagedRecords: sandbox.length,
        pendingOps: queue.length,
        activeProject: settings?.activeGrantId || 'NONE'
      },
      data: {
        registry: assets,
        sandbox: sandbox,
        governance: settings,
        writeAheadLog: queue
      }
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const fileName = `Assetain-Full-Snapshot-${new Date().toISOString().split('T')[0]}.json`;
    saveAs(blob, fileName);
    
    return snapshot.metadata;
  },

  /**
   * Scans the registry for logical integrity violations.
   */
  async runIntegrityAudit(assets: any[]) {
    const duplicates = new Map<string, number>();
    const missingFields = { serials: 0, tags: 0, locations: 0 };
    
    assets.forEach(a => {
      if (a.serialNumber && a.serialNumber !== 'N/A') {
        duplicates.set(a.serialNumber, (duplicates.get(a.serialNumber) || 0) + 1);
      }
      if (!a.serialNumber || a.serialNumber === 'N/A') missingFields.serials++;
      if (!a.assetIdCode) missingFields.tags++;
      if (!a.location) missingFields.locations++;
    });

    const serialConflicts = Array.from(duplicates.entries())
      .filter(([_, count]) => count > 1)
      .map(([sn]) => sn);

    return {
      healthy: serialConflicts.length === 0 && missingFields.serials === 0,
      conflicts: serialConflicts.length,
      gaps: missingFields,
      score: Math.max(0, 100 - (serialConflicts.length * 5) - (Object.values(missingFields).reduce((a, b) => a + b, 0) / 10))
    };
  }
};
