'use client';

/**
 * @fileOverview RegistryTable - Virtualized performance-grade registry browser.
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
import { MoreHorizontal, ShieldCheck, Clock, AlertCircle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';

interface RegistryTableProps {
  assets: Asset[];
  onInspect: (asset: Asset) => void;
}

export function RegistryTable({ assets, onInspect }: RegistryTableProps) {
  return (
    <div className="rounded-3xl border border-border/40 overflow-hidden bg-card/50 shadow-2xl">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b border-border/40">
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Identification</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Hierarchy Pulse</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Location</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Status</th>
            <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow 
              key={asset.id} 
              className="hover:bg-primary/[0.02] transition-colors group cursor-pointer border-b border-border/10 last:border-0"
              onClick={() => onInspect(asset)}
            >
              <TableCell className="py-4 px-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight">{asset.description || asset.name}</span>
                    {asset.photoDataUri && <Camera className="h-3 w-3 text-primary" />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5 tracking-tighter">
                    SN: {asset.serialNumber || 'UNSET'} &bull; TAG: {asset.assetIdCode || 'N/A'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4 px-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-primary">
                    {asset.category}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[180px] opacity-70">
                    {asset.section} › {asset.subsection}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4 px-6">
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary rounded-lg h-6">
                  {asset.location}
                </Badge>
              </TableCell>
              <TableCell className="py-4 px-6">
                <div className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                  asset.status === 'VERIFIED' ? "text-green-500" : asset.status === 'DISCREPANCY' ? "text-destructive" : "text-orange-500"
                )}>
                  {asset.status === 'VERIFIED' ? <ShieldCheck className="h-3 w-3" /> : asset.status === 'DISCREPANCY' ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {asset.status}
                </div>
              </TableCell>
              <TableCell className="py-4 px-6 text-right">
                <Button variant="ghost" size="icon" className="rounded-xl opacity-40 group-hover:opacity-100">
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
