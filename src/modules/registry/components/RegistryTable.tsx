'use client';

/**
 * @fileOverview RegistryTable - Virtualized performance-grade registry browser.
 * Updated for Phase 2 with selection pulse and refined operational density.
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreHorizontal, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Camera, 
  Database, 
  Globe,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';
import type { Asset } from '@/types/domain';

interface RegistryTableProps {
  assets: Asset[];
  onInspect: (asset: Asset) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export function RegistryTable({ 
  assets, 
  onInspect, 
  selectedIds, 
  onToggleSelection, 
  onSelectAll 
}: RegistryTableProps) {
  const { isOnline } = useAppState();

  const allSelected = assets.length > 0 && selectedIds.size === assets.length;

  return (
    <div className="relative h-full overflow-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
          <TableRow className="border-b-2 border-border/40 hover:bg-transparent">
            <TableHead className="w-12 px-6">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={(v) => onSelectAll(!!v)} 
                className="h-5 w-5 rounded-lg border-2 data-[state=checked]:bg-primary"
              />
            </TableHead>
            <TableHead className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors group">
                Identification Pulse <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </TableHead>
            <TableHead className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hierarchical Context</TableHead>
            <TableHead className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Regional Scope</TableHead>
            <TableHead className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assessment</TableHead>
            <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow 
              key={asset.id} 
              className={cn(
                "hover:bg-primary/[0.03] transition-all group cursor-pointer border-b border-border/10 last:border-0",
                selectedIds.has(asset.id) ? "bg-primary/[0.05]" : "bg-card/30"
              )}
              onClick={() => onInspect(asset)}
            >
              <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={selectedIds.has(asset.id)} 
                  onCheckedChange={() => onToggleSelection(asset.id)}
                  className="h-5 w-5 rounded-lg border-2"
                />
              </TableCell>
              <TableCell className="py-5 px-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-black tracking-tight transition-colors",
                      selectedIds.has(asset.id) ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}>
                      {asset.description || asset.name}
                    </span>
                    {asset.photoDataUri && <Camera className="h-3.5 w-3.5 text-primary opacity-60" />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-tighter opacity-60">
                    SN: {asset.serialNumber || 'UNSET'} &bull; TAG: {asset.assetIdCode || 'N/A'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-5 px-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-tight text-primary/80">
                    {asset.category}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-bold truncate max-w-[180px] opacity-50 uppercase mt-0.5">
                    {asset.section} › {asset.subsection}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-5 px-4">
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary rounded-lg h-6 px-3">
                  {asset.location}
                </Badge>
              </TableCell>
              <TableCell className="py-5 px-4">
                <div className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                  asset.status === 'VERIFIED' ? "text-green-600" : asset.status === 'DISCREPANCY' ? "text-destructive" : "text-orange-600"
                )}>
                  {asset.status === 'VERIFIED' ? <ShieldCheck className="h-3.5 w-3.5" /> : asset.status === 'DISCREPANCY' ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {asset.status}
                </div>
              </TableCell>
              <TableCell className="py-5 px-6 text-right">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-muted/50 opacity-40 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
