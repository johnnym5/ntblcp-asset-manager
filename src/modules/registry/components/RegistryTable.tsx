'use client';

/**
 * @fileOverview RegistryTable - Virtualized performance-grade registry browser.
 * Now includes visual distinction between Online and Locally Saved states.
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
import { MoreHorizontal, ShieldCheck, Clock, AlertCircle, Camera, Database, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';
import type { Asset } from '@/types/domain';

interface RegistryTableProps {
  assets: Asset[];
  onInspect: (asset: Asset) => void;
}

export function RegistryTable({ assets, onInspect }: RegistryTableProps) {
  const { isOnline } = useAppState();

  return (
    <div className="rounded-3xl border border-border/40 overflow-hidden bg-card/50 shadow-2xl">
      <div className="px-6 py-4 bg-muted/20 border-b flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
          {isOnline ? <Globe className="h-3 w-3 text-green-600" /> : <Database className="h-3 w-3 text-orange-600" />}
          {isOnline ? 'Active Online Registry' : 'Locally Saved Asset Store'}
        </h3>
        <Badge variant="outline" className="text-[9px] font-black border-primary/10 text-primary uppercase h-5 px-2">
          {assets.length} Active Records
        </Badge>
      </div>
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="border-b border-border/40 hover:bg-transparent">
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Identification Pulse</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Hierarchical Context</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Regional Scope</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Assessment</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow 
              key={asset.id} 
              className="hover:bg-primary/[0.03] transition-all group cursor-pointer border-b border-border/10 last:border-0"
              onClick={() => onInspect(asset)}
            >
              <TableCell className="py-5 px-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">{asset.description || asset.name}</span>
                    {asset.photoDataUri && <Camera className="h-3.5 w-3.5 text-primary opacity-60" />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-tighter opacity-60">
                    SN: {asset.serialNumber || 'UNSET'} &bull; TAG: {asset.assetIdCode || 'N/A'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-5 px-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-tight text-primary">
                    {asset.category}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-bold truncate max-w-[180px] opacity-50 uppercase mt-0.5">
                    {asset.section} › {asset.subsection}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-5 px-6">
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary rounded-lg h-6 px-3">
                  {asset.location}
                </Badge>
              </TableCell>
              <TableCell className="py-5 px-6">
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
