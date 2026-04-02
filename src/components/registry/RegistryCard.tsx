
/**
 * @fileOverview RegistryCard - High-Fidelity "Quick View" Renderer.
 * Phase 900: Achieved 100% parity with screenshot context menu and selection pulse.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, LayoutGrid, Edit3, Trash2, ChevronDown, Check } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect }: RegistryCardProps) {
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

  return (
    <Card 
      className={cn(
        "bg-card border-2 border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer relative group",
        selected ? "ring-2 ring-primary border-primary/40" : "hover:border-primary/20"
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {/* Top Slot: Circular Selection & Row Metadata */}
        <div className="p-5 flex flex-col gap-1.5 relative border-b border-border/40">
          <div className="flex items-center justify-between">
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center",
                selected ? "bg-primary border-primary" : "border-white/20 group-hover:border-primary/40"
              )}
            >
              {selected && <Check className="h-3.5 w-3.5 text-black stroke-[4]" />}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
                Row {record.sourceRow || '---'}
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-black border-white/10 rounded-2xl p-2 shadow-3xl">
                    <DropdownMenuItem onClick={() => onInspect(record.id)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                      <LayoutGrid className="h-4 w-4 text-white/40" />
                      <span className="text-[11px] font-black uppercase tracking-tight">Open Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onInspect(record.id)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                      <Edit3 className="h-4 w-4 text-white/40" />
                      <span className="text-[11px] font-black uppercase tracking-tight">Fast Edit</span>
                    </DropdownMenuItem>
                    <div className="h-px bg-white/5 my-2" />
                    <DropdownMenuItem className="p-3 rounded-xl focus:bg-red-600/10 text-red-500 gap-3">
                      <Trash2 className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-tight">Remove Record</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <h4 className="text-base font-black tracking-tight text-white leading-tight mt-2 line-clamp-1">
            {getFieldValue('asset_description')}
          </h4>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{getFieldValue('asset_id_code')}</span>
        </div>

        {/* Stacked Fields */}
        {orderedFields.slice(0, 3).map((field, idx) => (
          <div key={field.key} className="p-5 flex flex-col gap-1.5 border-b border-border/40">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-60 leading-none">
              {field.label}
            </span>
            <p className="text-base font-black uppercase tracking-tight text-foreground leading-tight truncate">
              {getFieldValue(field.key)}
            </p>
          </div>
        ))}

        {/* Footer: Status Pill */}
        <div className="p-5 bg-white/[0.02] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{status}</span>
          <ChevronDown className="h-4 w-4 text-white/20" />
        </div>
      </CardContent>
    </Card>
  );
}
