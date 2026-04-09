/**
 * @fileOverview RegistryCard - High-Density UI Pulse.
 * Phase 905: Added long-press and right-click selection support.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Globe, CloudOff, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { useAppState } from '@/contexts/app-state-context';
import { useLongPress } from '@/hooks/use-long-press';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleExpand?: () => void;
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect, onToggleExpand }: RegistryCardProps) {
  const { appSettings, headers: globalHeaders } = useAppState();

  const isVerificationMode = appSettings?.appMode === 'verification';
  const activeHeaders = globalHeaders.filter(h => h.quickView);
  const forcedFieldNames = ['condition', 'remarks', 'status', 'verified_status'];
  
  const descriptionField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_description';
  });

  const tagField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_id_code';
  });

  const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
  const syncStatus = (record.rawRow as any).syncStatus || 'local';

  // Integrated Long-Press Selection
  const longPressProps = useLongPress(() => {
    onToggleSelect?.(record.id);
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggleSelect?.(record.id);
  };

  return (
    <Card 
      className={cn(
        "bg-card border border-border/60 rounded-xl overflow-hidden transition-all relative group h-full",
        selected ? "ring-1 ring-primary border-primary/40 shadow-2xl" : "hover:border-primary/20",
      )}
      {...longPressProps}
      onContextMenu={handleContextMenu}
    >
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-3.5 flex flex-col gap-1 border-b border-border/40 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center justify-between mb-1.5">
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
              className={cn(
                "h-4.5 w-4.5 rounded-lg border transition-all flex items-center justify-center",
                selected ? "bg-primary border-primary" : "border-white/10"
              )}
            >
              {selected && <Check className="h-3 w-3 text-black stroke-[4]" />}
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-0.5 rounded border",
                syncStatus === 'synced' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
              )}>
                {syncStatus === 'synced' ? <Globe className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
              </div>
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </div>

          <h4 className="text-[12px] font-black uppercase text-foreground truncate leading-tight tracking-tight">
            {descriptionField?.displayValue || 'Untitled Asset'}
          </h4>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{tagField?.displayValue || 'NO TAG'}</span>
        </div>

        <div className="divide-y divide-border/40 bg-white/[0.01] flex-1">
          {activeHeaders
            .filter(h => h.normalizedName !== 'asset_description' && h.normalizedName !== 'asset_id_code')
            .filter(h => isVerificationMode || !forcedFieldNames.includes(h.normalizedName))
            .slice(0, 3)
            .map((header) => {
              const field = record.fields.find(f => f.headerId === header.id);
              return (
                <div key={header.id} className="px-3.5 py-2 flex items-center justify-between gap-4 group/field">
                  <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 shrink-0 group-hover/field:text-primary transition-colors">
                    {header.displayName}
                  </span>
                  <p className="text-[10px] font-bold uppercase text-foreground/80 truncate text-right">
                    {field?.displayValue || '---'}
                  </p>
                </div>
              );
            })}
        </div>

        {isVerificationMode && (
          <div className="px-3.5 py-2 bg-white/[0.03] flex items-center justify-between border-t border-border/20">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === 'VERIFIED' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/20"
              )} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest",
                status === 'VERIFIED' ? "text-green-500" : "text-white/40"
              )}>{status}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}