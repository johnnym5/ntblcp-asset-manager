
/**
 * @fileOverview RegistryTable - High-Performance Tabular Workstation.
 * Phase 350: Updated status pulse to "Pill Capsule" aesthetic.
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
  PenTool,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Limit columns for density
  const visibleHeaders = records[0]?.headers.filter(h => h.visible).slice(0, 5) || [];

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
            {visibleHeaders.map(h => (
              <TableHead key={h.id} className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">{h.displayName}</TableHead>
            ))}
            <TableHead className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status Pulse</TableHead>
            <TableHead className="px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const status = record.rawRow.status as string;
            return (
              <TableRow 
                key={record.id} 
                className={cn(
                  "hover:bg-primary/[0.02] transition-colors cursor-pointer border-b last:border-0",
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
                    <span className="font-black text-[11px] uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate">{String(record.rawRow.description || 'Untitled')}</span>
                    <span className="text-[8px] font-mono font-bold text-white/20 uppercase">S/N: {record.sn || '---'}</span>
                  </div>
                </TableCell>
                
                {visibleHeaders.map(h => {
                  const field = record.fields.find(f => f.headerId === h.id);
                  return (
                    <TableCell key={h.id} className="py-4 px-4">
                      <span className="text-[10px] font-black uppercase text-white/60 truncate">{field?.displayValue || '---'}</span>
                    </TableCell>
                  );
                })}

                <TableCell className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <Select value={status}>
                    <SelectTrigger className={cn(
                      "h-8 w-32 rounded-full font-black uppercase text-[8px] tracking-widest border-2 transition-all",
                      status === 'VERIFIED' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      status === 'DISCREPANCY' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-white/5 text-white/40 border-white/10"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", status === 'VERIFIED' ? "bg-green-500" : status === 'DISCREPANCY' ? "bg-red-500" : "bg-white/20")} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      <SelectItem value="VERIFIED" className="text-[9px] font-black uppercase">Verified</SelectItem>
                      <SelectItem value="UNVERIFIED" className="text-[9px] font-black uppercase">Unverified</SelectItem>
                      <SelectItem value="DISCREPANCY" className="text-[9px] font-black uppercase">Discrepancy</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="px-6 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/5 opacity-40 group-hover:opacity-100 transition-all">
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
