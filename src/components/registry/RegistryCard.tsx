/**
 * @fileOverview RegistryCard - High-Fidelity "Quick View" Renderer.
 * Optimized for High-Density Grid Pulse.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, LayoutGrid, Edit3, Trash2, ChevronDown, Check, Bell } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { Badge } from '../ui/badge';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  densityMode?: 'compact' | 'comfortable';
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect, densityMode = 'compact' }: RegistryCardProps) {
  const orderedFields = [
    { key: 'sn', label: 'S/N' },
    { key: 'location', label: 'Location' },
    { key: 'assignee_location', label: 'Assignee (Location)' },
    { key: 'asset_description', label: 'Asset Description' }
  ];

  const getFieldValue = (key: string) => {
    const field = record.fields.find(f => {
      const h = record.headers.find(header => header.id === f.headerId);
      return h?.normalizedName === key;
    });
    return field?.displayValue || '---';
  };

  const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
  const updateCount = (record.rawRow as any).updateCount || 0;
  const hasUnseen = ((record.rawRow as any).unseenUpdateFields?.length || 0) > 0;

  return (
    <Card 
      className={cn(
        "bg-card border-2 border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer relative group",
        selected ? "ring-2 ring-primary border-primary/40" : "hover:border-primary/20"
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {/* Selection & Notification Pulse */}
        <div className="p-3 flex flex-col gap-1 relative border-b border-border/40">
          <div className="flex items-center justify-between mb-1">
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                selected ? "bg-primary border-primary" : "border-white/20 group-hover:border-primary/40"
              )}
            >
              {selected && <Check className="h-3 w-3 text-black stroke-[4]" />}
            </div>
            
            <div className="flex items-center gap-2">
              {updateCount > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/5 rounded-lg border border-primary/10">
                  <Bell className={cn("h-2.5 w-2.5", hasUnseen ? "text-red-600 animate-pulse" : "text-primary/40")} />
                  <span className="text-[8px] font-black text-primary">{updateCount}</span>
                </div>
              )}
              
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-black border-white/10 rounded-xl p-1 shadow-3xl">
                    <DropdownMenuItem onClick={() => onInspect(record.id)} className="p-2 rounded-lg focus:bg-primary/10 gap-2">
                      <LayoutGrid className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Audit Profile</span>
                    </DropdownMenuItem>
                    <div className="h-px bg-white/5 my-1" />
                    <DropdownMenuItem className="p-2 rounded-lg focus:bg-red-600/10 text-red-500 gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <h4 className="text-[11px] font-black uppercase tracking-tight text-white leading-tight line-clamp-1">
            {getFieldValue('asset_description')}
          </h4>
          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{getFieldValue('asset_id_code')}</span>
        </div>

        {/* Stacked Fields - Compressed */}
        <div className="divide-y divide-border/40">
          {orderedFields.slice(0, 3).map((field) => (
            <div key={field.key} className="px-3 py-2 flex flex-col gap-0.5">
              <span className="text-[7px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-60 leading-none">
                {field.label}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-tight text-foreground truncate leading-none">
                {getFieldValue(field.key)}
              </p>
            </div>
          ))}
        </div>

        {/* Footer: Status Pill */}
        <div className="px-3 py-2 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-1 w-1 rounded-full",
              status === 'VERIFIED' ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-white/20"
            )} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/60">{status}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-white/20" />
        </div>
      </CardContent>
    </Card>
  );
}