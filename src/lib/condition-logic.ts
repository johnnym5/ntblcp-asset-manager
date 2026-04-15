/**
 * @fileOverview Deterministic Condition Grouping Engine.
 * Ensures every asset is classified into one of the 6 canonical groups.
 */

import type { ConditionGroup, Asset } from '@/types/domain';

export const CONDITION_GROUPS: ConditionGroup[] = [
  'Good',
  'Bad',
  'Stolen',
  'Obsolete',
  'Unsalvageable',
  'Discrepancy'
];

export const GROUP_COLORS: Record<ConditionGroup, string> = {
  'Good': 'text-green-500',
  'Bad': 'text-orange-500',
  'Stolen': 'text-red-600',
  'Obsolete': 'text-muted-foreground',
  'Unsalvageable': 'text-red-900',
  'Discrepancy': 'text-amber-500'
};

export const GROUP_BG_COLORS: Record<ConditionGroup, string> = {
  'Good': 'bg-green-500/10 border-green-500/20',
  'Bad': 'bg-orange-500/10 border-orange-500/20',
  'Stolen': 'bg-red-600/10 border-red-600/20',
  'Obsolete': 'bg-muted/10 border-muted/20',
  'Unsalvageable': 'bg-red-900/10 border-red-900/20',
  'Discrepancy': 'bg-amber-500/10 border-amber-500/20'
};

/**
 * Maps a raw condition string to a canonical ConditionGroup.
 */
export function getCanonicalGroup(condition?: string): ConditionGroup {
  if (!condition || condition.trim() === '') return 'Good';

  const c = condition.toLowerCase().trim();

  if (c.includes('good') || c.includes('new') || c.includes('working')) return 'Good';
  if (c.includes('bad') || c.includes('repair')) return 'Bad';
  if (c.includes('stolen') || c.includes('loss')) return 'Stolen';
  if (c.includes('obsolete')) return 'Obsolete';
  if (c.includes('unsalvageable') || c.includes('burnt') || c.includes('writeoff')) return 'Unsalvageable';
  
  // If unclear or marked as discrepancy explicitly
  if (c.includes('unclear') || c.includes('discrepancy') || c.includes('review')) return 'Discrepancy';

  return 'Good'; // Default fallback
}

/**
 * Aggregates a list of assets by their condition groups.
 */
export function groupAssetsByCondition(assets: Asset[]): Record<ConditionGroup, Asset[]> {
  const result: Record<ConditionGroup, Asset[]> = {
    'Good': [],
    'Bad': [],
    'Stolen': [],
    'Obsolete': [],
    'Unsalvageable': [],
    'Discrepancy': []
  };

  assets.forEach(asset => {
    const group = asset.conditionGroup || getCanonicalGroup(asset.condition);
    result[group].push(asset);
  });

  return result;
}
