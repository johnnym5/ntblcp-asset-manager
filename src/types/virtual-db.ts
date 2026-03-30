/**
 * @fileOverview Types for the Virtual Database Management System.
 */

import type { StorageLayer } from './domain';

export type NodeType = 'COLLECTION' | 'DOCUMENT' | 'RECORD' | 'DATABASE';

export interface DBNode {
  id: string;
  displayName: string;
  rawKey: string;
  type: NodeType;
  source: StorageLayer;
  path: string;
  data?: any;
  childCount?: number;
  lastUpdated?: string;
  syncStatus?: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'LOCAL_ONLY';
}

export interface DBMapping {
  path: string;
  displayName: string;
  canonicalName: string;
  icon?: string;
}
