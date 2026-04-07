/**
 * @fileOverview RegistryCard - High-Density UI Pulse.
 * Optimized for maximum content within visual workstation.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, LayoutGrid, Trash2, ChevronDown, Check, Bell, Globe, CloudOff } from 'lucide-react';
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
  const { appSettings } = useAppState();
  const { userProfile } = useAuth();

  const isManagementMode = appSettings?.appMode === 'management';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const orderedFields = [
    { key: 'sn', label: 'S/N' },
    { key: 'location', label: 'Location' },
    { key: 'asset_description', label: 'Description' }
  ];

  const getFieldValue = (key: string) => {
    const field = record.fields.find(f => {
      const h = record.headers.find(header => header.id === f.headerId);
      return h?.normalizedName === key;
    });
    return field?.displayValue || '---';
  };

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
        <div className="p-2 flex flex-col gap-0.5 border-b border-border/40">
          <div className="flex items-center justify-between mb-0.5">
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
                {syncStatus === 'synced' ? <Globe className="h-2 w-2" /> : <CloudOff className="h-2 w-2" />}
              </div>
              
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-white">
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-black border-white/10 text-white p-1">
                    <DropdownMenuItem onClick={() => onInspect(record.id)} className="p-1.5 rounded focus:bg-primary/10 gap-2">
                      <span className="text-[9px] font-black uppercase">Inspect</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase text-white truncate leading-tight">
            {getFieldValue('asset_description')}
          </h4>
          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">{getFieldValue('asset_id_code')}</span>
        </div>

        <div className="divide-y divide-border/40 bg-white/[0.01]">
          {orderedFields.slice(0, 2).map((field) => (
            <div key={field.key} className="px-2 py-1 flex items-center justify-between gap-2">
              <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 shrink-0">
                {field.label}
              </span>
              <p className="text-[8px] font-bold uppercase text-foreground truncate text-right">
                {getFieldValue(field.key)}
              </p>
            </div>
          ))}
        </div>

        {(!isManagementMode || isAdmin) && (
          <div className="px-2 py-1 bg-white/[0.02] flex items-center justify-between border-t border-border/20">
            <div className="flex items-center gap-1">
              <div className={cn(
                "h-1 w-1 rounded-full",
                status === 'VERIFIED' ? "bg-green-500" : "bg-white/20"
              )} />
              <span className="text-[7px] font-black uppercase tracking-widest text-white/40">{status}</span>
            </div>
            <ChevronDown className="h-2.5 w-2.5 text-white/10" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}