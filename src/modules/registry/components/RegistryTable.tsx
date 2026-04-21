'use client';

/**
 * @fileOverview RegistryTable - High-Performance Registry Workstation.
 * Phase 13: Refined density and deterministic typography.
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
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Camera, 
  ArrowUpDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { SortConfig } from "@/types/domain";

interface RegistryTableProps {
  assets: Asset[];
  onInspect: (asset: Asset) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: keyof Asset) => void;
  sortConfig: SortConfig;
}

const SortHeader = ({ 
  label, 
  sortKey, 
  currentSort, 
  onSort 
}: { 
  label: string; 
  sortKey: keyof Asset; 
  currentSort: SortConfig; 
  onSort: (key: keyof Asset) => void;
}) => {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground group select-none">
      <button 
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-2 transition-colors",
          isActive ? "text-primary" : "hover:text-primary"
        )}
      >
        {label} 
        <ArrowUpDown className={cn(
          "h-3 w-3 transition-opacity shrink-0",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )} />
      </button>
    </TableHead>
  );
};

export function RegistryTable({ 
  assets, 
  onInspect, 
  selectedIds, 
  onToggleSelection, 
  onSelectAll,
  onSort,
  sortConfig
}: RegistryTableProps) {
  const allSelected = assets.length > 0 && selectedIds.size === assets.length;

  return (
    <div className="relative h-full overflow-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b-2 border-border/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 px-6">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={(v) => onSelectAll(!!v)} 
                className="h-5 w-5 rounded-lg border-2"
              />
            </TableHead>
            <SortHeader label="Physical Identification" sortKey="description" currentSort={sortConfig} onSort={onSort} />
            <SortHeader label="Scope & Assignee" sortKey="location" currentSort={sortConfig} onSort={onSort} />
            <SortHeader label="Pulse Status" sortKey="status" currentSort={sortConfig} onSort={onSort} />
            <TableHead className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow 
              key={asset.id} 
              className={cn(
                "hover:bg-primary/[0.03] transition-all group cursor-pointer border-b border-border/10 last:border-0 tactile-pulse",
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
              <TableCell className="py-4 px-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-black tracking-tight transition-colors uppercase truncate max-w-[240px]",
                      selectedIds.has(asset.id) ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}>
                      {String(asset.description || asset.name || 'Untitled')}
                    </span>
                    {asset.photoDataUri && <Camera className="h-3 w-3 text-primary opacity-60 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest opacity-60">SN: {asset.serialNumber || 'UNSET'}</span>
                    <span className="text-[8px] font-mono font-bold text-primary/60 uppercase tracking-widest">ROW: {asset.importMetadata?.rowNumber || 'MAN'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 px-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-foreground truncate max-w-[140px]">{asset.location || 'GLOBAL'}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 truncate">{asset.custodian || 'UNASSIGNED'}</span>
                </div>
              </TableCell>
              <TableCell className="py-4 px-4">
                <div className={cn(
                  "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest h-7 px-3 rounded-full border shadow-sm w-fit",
                  asset.status === 'VERIFIED' 
                    ? "text-green-600 border-green-500/20 bg-green-50" 
                    : asset.status === 'DISCREPANCY' 
                      ? "text-destructive border-destructive/20 bg-destructive/5" 
                      : "text-orange-600 border-orange-500/20 bg-orange-50"
                )}>
                  {asset.status === 'VERIFIED' ? <ShieldCheck className="h-3 w-3 shrink-0" /> : asset.status === 'DISCREPANCY' ? <AlertCircle className="h-3 w-3 shrink-0" /> : <Clock className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{asset.status || 'UNVERIFIED'}</span>
                </div>
              </TableCell>
              <TableCell className="py-4 px-6 text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/50 opacity-40 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}