/**
 * @fileOverview StructurePreview - Strict Template Visualization Layer.
 * Phase 1205: Added indicator for Template matching status.
 * Phase 1206: Integrated Header Exclusion Toggles.
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
  ScanSearch,
  Info,
  Wrench,
  Activity,
  XCircle,
  PlusCircle,
  MousePointer2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscoveredGroup } from '@/parser/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StructurePreviewProps {
  groups: DiscoveredGroup[];
  selectedIds: Set<string>;
  onToggleId: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onAction?: (group: DiscoveredGroup) => void;
  excludedHeaders: Record<string, Set<string>>;
  onToggleHeader: (groupId: string, header: string) => void;
}

export function StructurePreview({ 
  groups, 
  selectedIds, 
  onToggleId, 
  onSelectAll, 
  onAction,
  excludedHeaders,
  onToggleHeader
}: StructurePreviewProps) {
  const allSelected = groups.length > 0 && selectedIds.size === groups.filter(g => g.isTemplateMatched).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-2">
          <h4 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-4 leading-none">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ScanSearch className="h-6 w-6 text-primary" />
            </div>
            Registry Skeleton
          </h4>
          <p className="text-[11px] font-bold uppercase text-white/40 tracking-[0.25em] leading-relaxed italic">
            Column A discovery pulse: identifying structural register blocks.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-3 px-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-3 pr-4 border-r border-white/10">
            <Checkbox 
              id="select-all-groups" 
              checked={allSelected} 
              onCheckedChange={(c) => onSelectAll(!!c)} 
              className="h-6 w-6 rounded-lg border-2 border-primary/40 data-[state=checked]:bg-primary"
            />
            <label htmlFor="select-all-groups" className="text-[11px] font-black uppercase tracking-widest text-primary cursor-pointer">
              Select All Registered
            </label>
          </div>
          <Badge variant="outline" className="h-6 px-3 border-white/10 text-white/40 font-mono text-[9px]">{groups.length} Groups Discovered</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {groups.length > 0 ? (
          groups.map((group) => {
            const isSelected = selectedIds.has(group.id);
            const isMatched = group.isTemplateMatched;
            const exclusions = excludedHeaders[group.id] || new Set();

            return (
              <Card 
                key={group.id} 
                className={cn(
                  "bg-[#050505] border-2 rounded-[2.5rem] overflow-hidden shadow-3xl transition-all group",
                  isSelected ? "border-primary/40 bg-primary/[0.01]" : "border-white/5",
                  !isMatched && "opacity-80 grayscale-[0.5]"
                )}
              >
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => onToggleId(group.id)}
                      disabled={!isMatched}
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all border-2",
                        isSelected ? "bg-primary border-primary text-black shadow-xl" : "bg-white/5 border-white/10 text-white/20",
                        !isMatched && "opacity-20 cursor-not-allowed border-dashed"
                      )}
                    >
                      {isSelected ? <Check className="h-8 w-8 stroke-[3]" /> : isMatched ? <Layers className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </button>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h5 className={cn(
                          "text-xl font-black uppercase tracking-tight transition-colors leading-none",
                          isMatched ? "text-white" : "text-white/40"
                        )}>
                          {group.groupName}
                        </h5>
                        {isMatched ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase"><FileCheck className="h-2.5 w-2.5 mr-1" /> Template Matched</Badge>
                        ) : (
                          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[8px] font-black uppercase"><Wrench className="h-2.5 w-2.5 mr-1" /> Definition Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Row 1 Title & Row 2 Headers</span>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> {group.rowCount} DATA ROWS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {exclusions.size > 0 && isSelected && (
                       <Badge variant="outline" className="h-8 px-4 border-orange-500/20 bg-orange-500/5 text-orange-500 font-black uppercase text-[10px]">
                         {exclusions.size} Columns Skipped
                       </Badge>
                    )}
                    {!isMatched ? (
                      <Button 
                        onClick={() => onAction?.(group)}
                        className="h-12 px-8 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-orange-600/20"
                      >
                        <PlusCircle className="h-4 w-4" /> Define as Template
                      </Button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-xl"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                        <span className="text-[10px] font-black uppercase text-green-600/60 tracking-widest">READY FOR INGESTION</span>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-0 bg-black">
                  <div className="px-10 py-3 bg-white/[0.03] border-b border-white/5 flex items-center gap-4">
                    <Info className="h-3 w-3 text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">Select individual columns to import or skip</span>
                  </div>
                  <ScrollArea className="w-full">
                    <div className="flex items-center p-8 gap-4 min-w-max">
                      {group.headerSet.map((header, hIdx) => {
                        const isExcluded = exclusions.has(header);
                        return (
                          <button 
                            key={`${group.id}-${hIdx}`}
                            onClick={() => onToggleHeader(group.id, header)}
                            disabled={!isSelected}
                            className={cn(
                              "flex flex-col gap-3 min-w-[160px] p-5 rounded-2xl border transition-all shadow-inner text-left group/col relative overflow-hidden",
                              !isSelected ? "opacity-20 grayscale" : 
                              isExcluded ? "bg-white/[0.01] border-white/5 opacity-40" : "bg-white/[0.03] border-white/10 hover:border-primary/40 shadow-xl"
                            )}
                          >
                            {isSelected && !isExcluded && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover/col:opacity-40 transition-opacity">
                                <MousePointer2 className="h-3 w-3 text-primary" />
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">
                                COL {hIdx + 1}
                              </span>
                              <Checkbox 
                                checked={!isExcluded} 
                                disabled={!isSelected}
                                onCheckedChange={() => onToggleHeader(group.id, header)}
                                className="h-4 w-4 rounded-md border-white/20 data-[state=checked]:bg-primary"
                              />
                            </div>
                            <p className={cn(
                              "text-[10px] font-black uppercase leading-tight truncate transition-colors",
                              isExcluded ? "text-white/20" : "text-white/80 group-hover/col:text-primary"
                            )} title={header}>
                              {header || 'EMPTY'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="py-48 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8">
            <ScanSearch className="h-24 w-24 text-white" />
            <h4 className="text-3xl font-black uppercase tracking-[0.3em] text-white">Discovery Inactive</h4>
          </div>
        )}
      </div>
    </div>
  );
}
