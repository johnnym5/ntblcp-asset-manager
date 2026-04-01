'use client';

/**
 * @fileOverview StructurePreview - The Template Visualization Layer.
 * Renders discovered group headers and their associated technical column sets.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  LayoutGrid, 
  Tag, 
  CheckCircle2, 
  Search,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscoveredGroup } from '@/parser/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface StructurePreviewProps {
  groups: DiscoveredGroup[];
}

export function StructurePreview({ groups }: StructurePreviewProps) {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2 px-1">
        <h4 className="text-xl font-black uppercase text-white tracking-tight flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-primary" /> Discovered Register Structure
        </h4>
        <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest leading-relaxed italic">
          Verify group-to-header mapping before proceeding to full asset ingestion.
        </p>
      </div>

      <div className="space-y-6">
        {groups.length > 0 ? (
          groups.map((group, idx) => (
            <Card 
              key={`${group.groupName}-${idx}`} 
              className="bg-[#050505] border-2 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl transition-all hover:border-primary/20 group"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-base font-black uppercase text-white tracking-tight group-hover:text-primary transition-colors">
                      GROUP: {group.groupName}
                    </h5>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">Row {group.startRow} anchor</span>
                      <div className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">TPL: {group.templateId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "h-7 px-4 rounded-full font-black uppercase text-[8px] tracking-widest border-2",
                      group.headerSource === 'explicit' 
                        ? "bg-green-500/5 border-green-500/20 text-green-500" 
                        : "bg-blue-500/5 border-blue-500/20 text-blue-500"
                    )}
                  >
                    {group.headerSource === 'explicit' ? 'Explicit Header' : 'Inferred Template'}
                  </Badge>
                  <Badge variant="outline" className="h-7 px-4 rounded-full font-black uppercase text-[8px] tracking-widest border-white/10 text-white/40">
                    {group.columnSet?.length || group.headerSet.length} Columns
                  </Badge>
                </div>
              </div>

              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="flex items-center p-8 gap-3 min-w-max">
                    {group.headerSet.map((header, hIdx) => (
                      <div 
                        key={`${group.templateId}-${header}-${hIdx}`}
                        className="flex flex-col gap-2 min-w-[140px] p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-inner group/col"
                      >
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em] group-hover/col:text-primary transition-colors">
                          Column {String.fromCharCode(65 + hIdx)}
                        </span>
                        <p className="text-[11px] font-black uppercase text-white/80 leading-tight truncate" title={header}>
                          {header}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="bg-white/5" />
                </ScrollArea>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-40 text-center opacity-20 border-4 border-dashed rounded-[4rem] flex flex-col items-center gap-6">
            <Database className="h-20 w-20" />
            <div className="space-y-1">
              <h4 className="text-2xl font-black uppercase tracking-widest">Discovery Silent</h4>
              <p className="text-sm font-medium italic">Execute a scanner pulse to identify register structural nodes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
