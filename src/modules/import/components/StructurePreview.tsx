/**
 * @fileOverview StructurePreview - The Template Visualization Layer.
 * Phase 400: Enhanced with Explicit vs Inferred status and row counting.
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
  ChevronRight,
  Check,
  FileCheck,
  ScanSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscoveredGroup } from '@/parser/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface StructurePreviewProps {
  groups: DiscoveredGroup[];
  selectedIds: Set<string>;
  onToggleId: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export function StructurePreview({ groups, selectedIds, onToggleId, onSelectAll }: StructurePreviewProps) {
  const allSelected = groups.length > 0 && selectedIds.size === groups.length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-2">
          <h4 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-4 leading-none">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ScanSearch className="h-6 w-6 text-primary" />
            </div>
            Registry Skeleton Discovery
          </h4>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-[0.25em] leading-relaxed italic">
            Structural boundaries identified via Column A traversal.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
          <Checkbox 
            id="select-all-groups" 
            checked={allSelected} 
            onCheckedChange={(c) => onSelectAll(!!c)} 
            className="h-5 w-5 rounded-lg border-2"
          />
          <label htmlFor="select-all-groups" className="text-[10px] font-black uppercase tracking-widest text-white/60 cursor-pointer pr-4">
            Select All Blocks ({groups.length})
          </label>
        </div>
      </div>

      <div className="space-y-8">
        {groups.length > 0 ? (
          groups.map((group) => {
            const isSelected = selectedIds.has(group.id);
            const isExplicit = group.headerSource === 'explicit';

            return (
              <Card 
                key={group.id} 
                className={cn(
                  "bg-[#050505] border-2 rounded-[2.5rem] overflow-hidden shadow-3xl transition-all group",
                  isSelected ? "border-primary/40 bg-primary/[0.01]" : "border-white/5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                )}
              >
                {/* Group Header Pulse */}
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => onToggleId(group.id)}
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all border-2",
                        isSelected ? "bg-primary border-primary text-black shadow-xl" : "bg-white/5 border-white/10 text-white/20"
                      )}
                    >
                      {isSelected ? <Check className="h-8 w-8 stroke-[3]" /> : <Layers className="h-6 w-6" />}
                    </button>
                    <div className="space-y-1.5">
                      <h5 className={cn(
                        "text-xl font-black uppercase tracking-tight transition-colors leading-none",
                        isSelected ? "text-white" : "text-white/40"
                      )}>
                        {group.groupName}
                      </h5>
                      <div className="flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Rows {group.startRow + 1}-{group.endRow + 1}</span>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="flex items-center gap-1.5">
                          {isExplicit ? <FileCheck className="h-3 w-3 text-green-500" /> : <Layers className="h-3 w-3 text-orange-500" />}
                          {group.headerSource} Template Pulse
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-8 px-5 rounded-full font-black uppercase text-[9px] tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
                      {group.rowCount} RECORDS FOUND
                    </Badge>
                  </div>
                </div>

                {/* Column Visualization Layer */}
                <CardContent className="p-0 bg-black">
                  <ScrollArea className="w-full">
                    <div className="flex items-center p-8 gap-4 min-w-max">
                      {group.headerSet.map((header, hIdx) => (
                        <div 
                          key={`${group.id}-${hIdx}`}
                          className={cn(
                            "flex flex-col gap-3 min-w-[160px] p-5 rounded-2xl border transition-all shadow-inner group/col",
                            isSelected ? "bg-white/[0.03] border-white/10" : "bg-white/[0.01] border-white/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">
                              POS {hIdx + 1}
                            </span>
                            <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                          </div>
                          <p className="text-xs font-black uppercase text-white/80 leading-tight truncate" title={header}>
                            {header || 'NULL_FIELD'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="py-48 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-white/[0.01]">
            <div className="p-10 bg-white/5 rounded-full">
              <Search className="h-24 w-24 text-white" />
            </div>
            <div className="space-y-2">
              <h4 className="text-3xl font-black uppercase tracking-[0.3em] text-white">Discovery Inactive</h4>
              <p className="text-sm font-medium italic text-white/60">Upload a registry workbook to begin structural analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
