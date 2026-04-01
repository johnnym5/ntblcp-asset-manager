/**
 * @fileOverview RegistryCard - High-Fidelity "Quick View" Renderer.
 * Phase 125: Strictly matched to provided mockup with stacked fields and separators.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, Tag, MapPin, User, FileText, Database } from 'lucide-react';
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
  // Filter for fields specifically marked for Quick View
  const quickFields = record.fields.filter(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.visible && h?.normalizedName !== 'row_number';
  });

  return (
    <Card 
      className={cn(
        "bg-white border-2 border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer",
        selected ? "ring-2 ring-primary border-primary/40" : ""
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {quickFields.map((field, idx) => {
          const header = record.headers.find(h => h.id === field.headerId);
          const isFirst = idx === 0;
          
          return (
            <div 
              key={field.headerId} 
              className={cn(
                "p-4 flex flex-col gap-1 relative",
                !isFirst && "border-t border-border/40"
              )}
            >
              {/* Row info and Menu pulse only on the first field (S/N typically) */}
              {isFirst && (
                <div className="absolute top-4 right-4 flex items-center gap-3">
                  <span className="text-[9px] font-medium text-muted-foreground opacity-60 uppercase tracking-tighter">
                    Row {record.sourceRow || '---'}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-2">
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

              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">
                {header?.displayName || 'Unknown Field'}
              </span>
              <p className="text-sm font-bold text-foreground leading-tight truncate pr-16">
                {field.displayValue || '---'}
              </p>
            </div>
          );
        })}
        
        {/* Visual Source Indicator at Base */}
        <div 
          className="h-1.5 w-full opacity-80" 
          style={{ backgroundColor: record.accentColor || 'var(--primary)' }} 
        />
      </CardContent>
    </Card>
  );
}
