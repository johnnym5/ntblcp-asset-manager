/**
 * @fileOverview RegistryCard - High-Density UI Pulse.
 * Optimized for maximum content within visual workstation.
 * Phase 5: Implemented Dynamic Header Awareness based on QuickView setting.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, Trash2, ChevronDown, Check, Globe, CloudOff } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  densityMode?: 'compact' | 'comfortable';
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect }: RegistryCardProps) {
  const { appSettings, headers: globalHeaders } = useAppState();
  const { userProfile } = useAuth();

  const isManagementMode = appSettings?.appMode === 'management';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  // Identify fields enabled for Quick View in the Header Manager
  const activeHeaders = globalHeaders.filter(h => h.quickView);
  
  // Explicitly separate core description from details for better visual grouping
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

  return (
    <Card 
      className={cn(
        "bg-card border border-border/60 rounded-lg overflow-hidden transition-all cursor-pointer relative",
        selected ? "ring-1 ring-primary border-primary/40" : "hover:border-primary/20"
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        <div className="p-3 flex flex-col gap-1 border-b border-border/40">
          <div className="flex items-center justify-between mb-1">
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
              className={cn(
                "h-4 w-4 rounded-full border transition-all flex items-center justify-center",
                selected ? "bg-primary border-primary" : "border-white/10"
              )}
            >
              {selected && <Check className="h-2.5 w-2.5 text-black stroke-[4]" />}
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "p-0.5 rounded border",
                syncStatus === 'synced' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
              )}>
                {syncStatus === 'synced' ? <Globe className="h-2.5 w-2.5" /> : <CloudOff className="h-2.5 w-2.5" />}
              </div>
              
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-black border-white/10 text-white p-1">
                    <DropdownMenuItem onClick={() => onInspect(record.id)} className="p-2 rounded focus:bg-primary/10 gap-2">
                      <span className="text-[10px] font-black uppercase">Inspect Record</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <h4 className="text-[11px] font-black uppercase text-white truncate leading-tight">
            {descriptionField?.displayValue || 'Untitled Asset'}
          </h4>
          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{tagField?.displayValue || 'NO TAG'}</span>
        </div>

        <div className="divide-y divide-border/40 bg-white/[0.01]">
          {activeHeaders
            .filter(h => h.normalizedName !== 'asset_description' && h.normalizedName !== 'asset_id_code')
            .slice(0, 4) // Safety limit for card density
            .map((header) => {
              const field = record.fields.find(f => f.headerId === header.id);
              return (
                <div key={header.id} className="px-3 py-1.5 flex items-center justify-between gap-4 group/field">
                  <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 shrink-0 group-hover/field:text-primary transition-colors">
                    {header.displayName}
                  </span>
                  <p className="text-[9px] font-bold uppercase text-foreground truncate text-right">
                    {field?.displayValue || '---'}
                  </p>
                </div>
              );
            })}
        </div>

        {(!isManagementMode || isAdmin) && (
          <div className="px-3 py-1.5 bg-white/[0.02] flex items-center justify-between border-t border-border/20">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full shadow-sm",
                status === 'VERIFIED' ? "bg-green-500" : "bg-white/20"
              )} />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{status}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-white/10" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
