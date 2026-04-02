/**
 * @fileOverview StructurePreview - The Template Visualization Layer.
 * Renders discovered group blocks and their unique header sets for auditor verification.
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
  ArrowRight,
  Terminal,
  Layers,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscoveredGroup } from '@/parser/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface StructurePreviewProps {
  groups: DiscoveredGroup[];
  debugMode?: boolean;
}

export function StructurePreview({ groups, debugMode = true }: StructurePreviewProps) {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2 px-1">
        <h4 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-4 leading-none">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          Register Skeleton Discovery
        </h4>
        <p className="text-[11px] font-bold uppercase text-white/40 tracking-[0.25em] leading-relaxed italic">
          Verify discovered structural groups and row counts before full ingestion.
        </p>
      </div>

      <div className="space-y-8">
        {groups.length > 0 ? (
          groups.map((group, idx) => (
            <Card key={`${group.id}`} className="bg-[#050505] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-3xl transition-all hover:border-primary/20 group">
              {/* Group Header Pulse */}
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/5">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-primary transition-colors leading-none">
                      {group.groupName}
                    </h5>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Row {group.startRow + 1}</span>
                      <div className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="flex items-center gap-1.5"><Terminal className="h-3 w-3" /> {group.headerSource} Header Pulse</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-8 px-5 rounded-full font-black uppercase text-[9px] tracking-[0.2em] border-white/10 text-white/40">
                    {group.columnCount} COLUMNS
                  </Badge>
                </div>
              </div>

              {/* Column Visualization Layer */}
              <CardContent className="p-0 bg-black">
                <ScrollArea className="w-full">
                  <div className="flex items-center p-8 gap-4 min-w-max">
                    {group.headerSet.map((header, hIdx) => (
                      <div 
                        key={`${group.templateId}-${hIdx}`}
                        className="flex flex-col gap-3 min-w-[160px] p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner group/col transition-all hover:bg-white/[0.04] hover:border-primary/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em] group-hover/col:text-primary transition-colors">
                            POS {hIdx + 1}
                          </span>
                          <div className="h-1.5 w-1.5 rounded-full bg-white/10 group-hover/col:bg-primary/40" />
                        </div>
                        <p className="text-xs font-black uppercase text-white/80 leading-tight truncate" title={header}>
                          {header || 'EMPTY_HEADER'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
                </ScrollArea>

                {debugMode && (
                  <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-white/20 tracking-widest">
                      <Terminal className="h-3 w-3" /> Template ID: <span className="text-white/40 font-mono">{group.templateId}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-48 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-white/[0.01]">
            <div className="p-10 bg-white/5 rounded-full">
              <Search className="h-24 w-24 text-white" />
            </div>
            <div className="space-y-2">
              <h4 className="text-3xl font-black uppercase tracking-[0.3em] text-white">No Structure Pulses</h4>
              <p className="text-sm font-medium italic text-white/60">Traverse a registry workbook to discover structural nodes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
