/**
 * @fileOverview RegistryCard - Source-Aware Professional Register Renderer.
 * Phase 23: Added photo evidence thumbnails and multi-select support.
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
  Package,
  Layers,
  Database,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { AssetRecord, DensityMode } from '@/types/registry';
import type { Asset } from '@/types/domain';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  densityMode?: DensityMode;
}

export function RegistryCard({ record, onInspect, selected, onToggleSelect, densityMode = "expanded" }: RegistryCardProps) {
  const asset = record.rawRow as unknown as Asset;

  // Primary Identification Pulse
  const descriptionField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_description';
  });

  // Arrangement Filtering
  const visibleFields = record.fields.filter(f => {
    const header = record.headers.find(h => h.id === f.headerId);
    if (!header || !header.visible) return false;
    
    // Core markers are always shown in the top strip
    if (['sn', 'asset_description', 'row_number'].includes(header.normalizedName)) return false;
    
    return true;
  });

  return (
    <Card 
      className={cn(
        "border-2 transition-all duration-300 rounded-[1.5rem] overflow-hidden group cursor-pointer shadow-md tactile-pulse relative",
        selected ? "bg-primary/5 border-primary shadow-primary/5" : "bg-card hover:border-primary/20"
      )}
      style={{ borderLeft: `6px solid ${record.accentColor || 'var(--primary)'}` }}
      onClick={() => onInspect(record.id)}
    >
      <CardContent className="p-0">
        {/* Top Strip: Primary Identity Anchor (S/N and Row ID) */}
        <div className="px-5 py-3 bg-muted/30 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleSelect && (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                <Checkbox 
                  checked={selected} 
                  onCheckedChange={() => onToggleSelect(record.id)}
                  className="h-4 w-4 rounded border-2 border-primary/20 bg-background accent-primary"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Box className="h-3 w-3 opacity-40" style={{ color: record.accentColor }} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: record.accentColor }}>
                S/N: {record.sn || '---'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {asset.photoDataUri && (
              <div className="h-6 w-6 rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm shrink-0">
                <img src={asset.photoDataUri} className="h-full w-full object-cover" alt="Evidence" />
              </div>
            )}
            <Badge variant="secondary" className="h-5 px-2 text-[8px] font-mono font-bold uppercase tracking-widest bg-muted/50 border-none">
              Record #{record.rowNumber}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Register Body: Stacked Label-Value Pairs */}
        <div className={cn(
          "p-5 space-y-4",
          densityMode === 'compact' ? "space-y-2" : "space-y-5"
        )}>
          {/* Main Description */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 flex items-center gap-2">
              <Tag className="h-2 w-2" /> Asset Description
            </label>
            <p className={cn(
              "font-black uppercase tracking-tight text-foreground truncate leading-tight transition-colors group-hover:text-primary",
              densityMode === 'compact' ? "text-sm" : "text-base"
            )}>
              {descriptionField?.displayValue || 'Untitled Registry Record'}
            </p>
          </div>

          {/* Dynamic Field Stack */}
          <div className={cn(
            "grid gap-y-4",
            densityMode === 'compact' ? "grid-cols-2 gap-x-4 gap-y-2" : "grid-cols-1"
          )}>
            {visibleFields.map((field) => {
              const header = record.headers.find(h => h.id === field.headerId);
              if (!header) return null;

              return (
                <div key={field.headerId} className="space-y-0.5 border-l-2 border-transparent hover:border-primary/20 pl-2 transition-all">
                  <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 flex items-center gap-1.5">
                    {getFieldIcon(header.normalizedName)}
                    {header.displayName}
                  </label>
                  <p className={cn(
                    "font-black uppercase tracking-tight text-foreground/90 truncate leading-tight",
                    densityMode === 'compact' ? "text-[10px]" : "text-sm"
                  )}>
                    {field.displayValue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Strip: Source Fidelity & Subsection Chips */}
        <div className="px-5 py-3 border-t border-dashed bg-muted/10 flex flex-wrap items-center gap-2">
          {record.sourceSheet && (
            <Badge 
              variant="outline" 
              className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg"
              style={{ borderColor: `${record.accentColor}40`, backgroundColor: `${record.accentColor}10`, color: record.accentColor }}
            >
              <Database className="h-2 w-2 mr-1" /> {record.sourceSheet}
            </Badge>
          )}
          {record.subsectionName && (
            <Badge variant="secondary" className="h-5 px-2 text-[8px] font-black tracking-widest rounded-lg bg-muted text-muted-foreground">
              <Layers className="h-2 w-2 mr-1" /> {record.subsectionName}
            </Badge>
          )}
          <div className="ml-auto text-[7px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
            Hierarchy Aware Pulse
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
    default: return <Database className="h-2.5 w-2.5" />;
  }
}
