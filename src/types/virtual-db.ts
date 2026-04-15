/**
 * @fileOverview Types for the Virtual Database Management System.
 */

export type { StorageLayer } from './domain';

export type NodeType = 'COLLECTION' | 'DOCUMENT' | 'RECORD' | 'DATABASE' | 'SYSTEM';

export interface DBNode {
  id: string;
  displayName: string;
  rawKey: string;
  type: NodeType;
  source: StorageLayer;
  path: string;
  data?: any;
  childCount?: number;
  versionCount?: number;
  lastUpdated?: string;
  syncStatus?: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'LOCAL_ONLY';
  parentPath?: string;
}

export interface DatabaseStats {
  recordCount: number;
  pendingChanges: number;
  conflictCount: number;
  lastPulse: string;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
}

export type DisplayMode = 'FRIENDLY' | 'MIXED' | 'TECHNICAL';
