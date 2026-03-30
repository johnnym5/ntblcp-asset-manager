"use client";

/**
 * @fileOverview RegistryCard - Stacked Label-Value Renderer.
 * Follows the high-fidelity operational design pulse.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Tag, MapPin, User, Activity, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect }: RegistryCardProps) {
  const visibleFields = record.fields.filter(f => {
    const header = record.headers.find(h => h.id === f.headerId);
    return header?.visible && header.normalizedName !== 'sn';
  });

  return (
    <Card 
      className={cn(
        "border-2 transition-all duration-300 rounded-[1.5rem] overflow-hidden group cursor-pointer shadow-md tactile-pulse",
        selected ? "bg-primary/5 border-primary/20 shadow-primary/5" : "bg-card hover:border-primary/20"
      )}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {/* Top Operational Strip */}
        <div className="px-5 py-3 bg-muted/30 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleSelect && (
              <input 
                type="checkbox" 
                checked={selected} 
                onChange={(e) => { e.stopPropagation(); onToggleSelect(record.id); }}
                className="h-4 w-4 rounded border-2 border-primary/20 bg-background"
              />
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">S/N: {record.sn || '---'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono font-bold text-muted-foreground opacity-40 uppercase tracking-widest">Row: {record.rowNumber}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-40 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stacked Field Container */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-y-4">
            {visibleFields.map((field) => {
              const header = record.headers.find(h => h.id === field.headerId);
              if (!header) return null;

              return (
                <div key={field.headerId} className="space-y-1 group/field">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 flex items-center gap-2 group-hover/field:text-primary group-hover/field:opacity-80 transition-all">
                    {getFieldIcon(header.normalizedName)}
                    {header.displayName}
                  </label>
                  <p className={cn(
                    "text-sm font-black uppercase tracking-tight text-foreground truncate leading-tight",
                    header.normalizedName === 'asset_description' ? "text-base text-primary" : ""
                  )}>
                    {field.displayValue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Metadata Pulse */}
        <div className="px-5 py-3 border-t border-dashed bg-muted/10 flex flex-wrap gap-2">
          {record.sectionName && (
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg border-primary/10">
              {record.sectionName}
            </Badge>
          )}
          {record.assetFamily && (
            <Badge variant="secondary" className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg bg-muted text-muted-foreground">
              {record.assetFamily}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getFieldIcon(key: string) {
  switch(key) {
    case 'location': return <MapPin className="h-2.5 w-2.5" />;
    case 'assignee_location': return <User className="h-2.5 w-2.5" />;
    case 'asset_description': return <Tag className="h-2.5 w-2.5" />;
    case 'condition': return <Activity className="h-2.5 w-2.5" />;
    case 'asset_id_code': return <Hash className="h-2.5 w-2.5" />;
    default: return null;
  }
}
