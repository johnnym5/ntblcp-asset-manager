/**
 * @fileOverview RegistryTable - High-Density Dynamic Register.
 * Phase 92: Unified dynamic header support and deterministic column sizing.
 */

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Camera, 
  Database, 
  Box,
  MapPin,
  ShieldCheck,
  User,
  Activity,
  History,
  Clock,
  Navigation,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import type { Asset } from '@/types/domain';

interface RegistryTableProps {
  records: AssetRecord[];
  onInspect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export function RegistryTable({ 
  records, 
  onInspect, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll 
}: RegistryTableProps) {
  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));

  // Identify visible headers from the first record pulse
  const visibleHeaders = records[0]?.headers.filter(h => h.visible) || [];
  
  // Limit columns for tabular density
  const primaryDisplayHeaders = visibleHeaders
    .filter(h => !['sn', 'asset_description', 'row_number'].includes(h.normalizedName))
    .slice(0, 4);

  return (
    <div className="rounded-[2rem] border-2 border-border/40 overflow-hidden bg-card/50 shadow-xl custom-scrollbar">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 px-6">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={(v) => onSelectAll(!!v)} 
                className="h-5 w-5 rounded-lg border-2"
              />
            </TableHead>
            <TableHead className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground min-w-[240px]">Primary Identity</TableHead>
            {primaryDisplayHeaders.map(h => (
              <TableHead key={h.id} className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {h.displayName}
              </TableHead>
            ))}
            <TableHead className="px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const asset = record.rawRow as unknown as Asset;
            const descriptionField = record.fields.find(f => {
              const h = record.headers.find(header => header.id === f.headerId);
              return h?.normalizedName === 'asset_description';
            });

            return (
              <TableRow 
                key={record.id} 
                className={cn(
                  "hover:bg-primary/[0.02] transition-colors cursor-pointer group border-b last:border-0",
                  selectedIds.has(record.id) ? "bg-primary/5" : "bg-transparent"
                )}
                onClick={() => onInspect(record.id)}
              >
                <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.has(record.id)} 
                    onCheckedChange={() => onToggleSelect(record.id)}
                    className="h-5 w-5 rounded-lg border-2"
                  />
                </TableCell>
                <TableCell className="py-4 px-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[11px] uppercase tracking-tight text-foreground group-hover:text-primary transition-colors truncate max-w-[280px]">
                        {descriptionField?.displayValue || 'Untitled Record'}
                      </span>
                      <div className="flex items-center gap-1 opacity-40">
                        {asset.photoUrl && <Camera className="h-2.5 w-2.5" />}
                        {asset.geotag && <Navigation className="h-2.5 w-2.5" />}
                        {(asset.signatureUrl || asset.signatureDataUri) && <PenTool className="h-2.5 w-2.5" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/40">
                        <Box className="h-2.5 w-2.5 opacity-40" style={{ color: record.accentColor }} />
                        <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: record.accentColor }}>
                          S/N: {record.sn || '---'}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-muted-foreground opacity-40">PULSE: {record.id.split('-')[0].toUpperCase()}</span>
                    </div>
                  </div>
                </TableCell>
                
                {primaryDisplayHeaders.map(h => {
                  const field = record.fields.find(f => f.headerId === h.id);
                  return (
                    <TableCell key={h.id} className="py-4 px-4">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] font-black uppercase text-foreground truncate max-w-[140px]">
                          {field?.displayValue || '---'}
                        </span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground opacity-40 flex items-center gap-1">
                          {getFieldIcon(h.normalizedName)} {h.displayName}
                        </span>
                      </div>
                    </TableCell>
                  );
                })}

                <TableCell className="px-6 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/50 opacity-40 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function getFieldIcon(key: string) {
  switch(key) {
    case 'location': return <MapPin className="h-2 w-2" />;
    case 'assignee_location': return <User className="h-2 w-2" />;
    case 'condition': return <Activity className="h-2 w-2" />;
    case 'verification_status': return <ShieldCheck className="h-2 w-2" />;
    default: return <Database className="h-2 w-2" />;
  }
}
