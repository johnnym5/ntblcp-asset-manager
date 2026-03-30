"use client";

/**
 * @fileOverview RegistryCard - High-Fidelity Professional Register Renderer.
 * Implements the "Glass Cockpit" design standard with stacked label-value pairs.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Tag, 
  MapPin, 
  User, 
  Activity, 
  Hash, 
  Calendar,
  Box,
  Truck,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssetRecord, DensityMode } from '@/types/registry';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  densityMode?: DensityMode;
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect, densityMode = "expanded" }: RegistryCardProps) {
  // Critical fields for the top identification pulse
  const descriptionField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_description';
  });

  // Filter fields based on density mode
  const visibleFields = record.fields.filter(f => {
    const header = record.headers.find(h => h.id === f.headerId);
    if (!header || !header.visible) return false;
    // Don't repeat the S/N or Description in the stack if it's primary
    if (header.normalizedName === 'sn' || header.normalizedName === 'asset_description') return false;
    
    if (densityMode === 'compact') {
      // In compact mode, only show location, assignee, and tag/serial
      return ['location', 'assignee_location', 'asset_id_code', 'serial_number'].includes(header.normalizedName);
    }
    return true;
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
        {/* Top Operational Strip: S/N on left, Row/Menu on right */}
        <div className="px-5 py-3 bg-muted/30 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleSelect && (
              <input 
                type="checkbox" 
                checked={selected} 
                onChange={(e) => { e.stopPropagation(); onToggleSelect(record.id); }}
                className="h-4 w-4 rounded border-2 border-primary/20 bg-background accent-primary"
              />
            )}
            <div className="flex items-center gap-2">
              <Box className="h-3 w-3 text-primary opacity-40" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">S/N: {record.sn || '---'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="h-5 px-2 text-[8px] font-mono font-bold uppercase tracking-widest bg-muted/50 border-none">
              Record #{record.rowNumber}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Register Body: Stacked Label-Value Pairs */}
        <div className={cn(
          "p-5 space-y-4",
          densityMode === 'compact' ? "space-y-3" : "space-y-5"
        )}>
          {/* Primary Identification Pulse */}
          <div className="space-y-1 group/field">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 flex items-center gap-2 group-hover/field:text-primary transition-all">
              <Tag className="h-2.5 w-2.5" /> Asset Description
            </label>
            <p className="text-base font-black uppercase tracking-tight text-foreground truncate leading-tight transition-colors group-hover:text-primary">
              {descriptionField?.displayValue || 'Untitled Registry Record'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-y-4">
            {visibleFields.map((field) => {
              const header = record.headers.find(h => h.id === field.headerId);
              if (!header) return null;

              return (
                <div key={field.headerId} className="space-y-1 group/field border-l-2 border-transparent hover:border-primary/20 pl-3 transition-all">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 flex items-center gap-2 group-hover/field:opacity-100 transition-all">
                    {getFieldIcon(header.normalizedName)}
                    {header.displayName}
                  </label>
                  <p className="text-sm font-black uppercase tracking-tight text-foreground/90 truncate leading-tight">
                    {field.displayValue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Metadata Pulse: Provenance & Lifecycle */}
        <div className="px-5 py-3 border-t border-dashed bg-muted/10 flex flex-wrap gap-2">
          {record.sectionName && (
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg border-primary/10 text-primary">
              {record.sectionName}
            </Badge>
          )}
          {record.assetFamily && (
            <Badge variant="secondary" className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg bg-muted text-muted-foreground">
              {record.assetFamily}
            </Badge>
          )}
          <div className="ml-auto text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
            Assetain Core v5.0
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getFieldIcon(key: string) {
  switch(key) {
    case 'location': return <MapPin className="h-2.5 w-2.5" />;
    case 'assignee_location': return <User className="h-2.5 w-2.5" />;
    case 'asset_id_code': return <Hash className="h-2.5 w-2.5" />;
    case 'condition': return <Activity className="h-2.5 w-2.5" />;
    case 'serial_number': return <ShieldCheck className="h-2.5 w-2.5" />;
    case 'asset_class': return <Package className="h-2.5 w-2.5" />;
    case 'manufacturer': return <Truck className="h-2.5 w-2.5" />;
    case 'date_purchased_received': return <Calendar className="h-2.5 w-2.5" />;
    default: return null;
  }
}
