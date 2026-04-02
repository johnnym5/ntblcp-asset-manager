/**
 * @fileOverview RegistryCard - High-Fidelity "Quick View" Renderer.
 * Phase 850: Achieved 100% visual parity with the stacked field reference.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical } from 'lucide-react';
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
  densityMode?: 'compact' | 'comfortable' | 'expanded';
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect, densityMode = 'comfortable' }: RegistryCardProps) {
  // Ordered fields for the specific reference layout
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

  return (
    <Card 
      className={cn(
        "bg-card border-2 border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer relative",
        selected ? "ring-2 ring-primary border-primary/40" : "hover:border-primary/20"
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {orderedFields.map((field, idx) => {
          const isFirst = idx === 0;
          const val = getFieldValue(field.key);
          
          return (
            <div 
              key={field.key} 
              className={cn(
                "p-5 flex flex-col gap-1.5 relative",
                !isFirst && "border-t border-border/40"
              )}
            >
              {/* Top Slot: Row Info & Command Pulse */}
              {isFirst && (
                <div className="absolute top-5 right-5 flex items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
                    Row {record.sourceRow || '---'}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-2 shadow-2xl">
                        <DropdownMenuItem onClick={() => onInspect(record.id)}>Inspect Pulse</DropdownMenuItem>
                        {onToggleSelect && (
                          <DropdownMenuItem onClick={() => onToggleSelect(record.id)}>
                            {selected ? 'Deselect Record' : 'Select for Batch'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              {/* Label Pulse */}
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-60 leading-none">
                {field.label}
              </span>

              {/* Value Pulse */}
              <p className={cn(
                "text-base font-black tracking-tight text-foreground leading-tight",
                field.key === 'asset_description' ? "line-clamp-2" : "truncate pr-20"
              )}>
                {val}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
