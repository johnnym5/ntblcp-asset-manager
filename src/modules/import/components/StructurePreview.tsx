/**
 * @fileOverview StructurePreview - The Template Visualization Layer.
 * Phase 750: Enhanced with Header Source (Explicit/Inferred/Synthetic) visibility.
 * Phase 751: Added Select All functionality for discovered groups.
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
  Activity
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

  const getSourceBadge = (source: string) => {
    switch(source) {
      case 'explicit': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase"><FileCheck className="h-2.5 w-2.5 mr-1" /> Explicit Header</Badge>;
      case 'inferred': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] font-black uppercase"><Layers className="h-2.5 w-2.5 mr-1" /> Inferred Pulse</Badge>;
      case 'synthetic': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[8px] font-black uppercase"><Wrench className="h-2.5 w-2.5 mr-1" /> Synthetic Template</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-2">
          <h4 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-4 leading-none">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ScanSearch className="h-6 w-6 text-primary" />
            </div>
            Single-Sheet Registry Skeleton
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
              Select All Blocks
            </label>
          </div>
          <Badge variant="outline" className="h-6 px-3 border-white/10 text-white/40 font-mono text-[9px]">{groups.length} Groups Discovered</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {groups.length > 0 ? (
          groups.map((group) => {
            const isSelected = selectedIds.has(group.id);

            return (
              <Card 
                key={group.id} 
                className={cn(
                  "bg-[#050505] border-2 rounded-[2.5rem] overflow-hidden shadow-3xl transition-all group",
                  isSelected ? "border-primary/40 bg-primary/[0.01]" : "border-white/5 opacity-60"
                )}
              >
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => onToggleId(group.id)}
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all border-2",
                        isSelected ? "bg-primary border-primary text-black shadow-xl" : "bg-white/5 border-white/10 text-white/20"
                      )}
                    >
                      {isSelected ? <Check className="h-8 w-8 stroke-[3]" /> : <Activity className="h-6 w-6" />}
                    </button>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h5 className={cn(
                          "text-xl font-black uppercase tracking-tight transition-colors leading-none",
                          isSelected ? "text-white" : "text-white/40"
                        )}>
                          {group.groupName}
                        </h5>
                        {getSourceBadge(group.headerSource)}
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Rows {group.startRow + 1}-{group.endRow + 1}</span>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {group.headerSetType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="h-8 px-5 rounded-full font-black uppercase text-[10px] tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
                    {group.rowCount} DATA ROWS
                  </Badge>
                </div>

                <CardContent className="p-0 bg-black">
                  <ScrollArea className="w-full">
                    <div className="flex items-center p-8 gap-4 min-w-max">
                      {group.headerSet.map((header, hIdx) => (
                        <div 
                          key={`${group.id}-${hIdx}`}
                          className={cn(
                            "flex flex-col gap-3 min-w-[160px] p-5 rounded-2xl border transition-all shadow-inner",
                            isSelected ? "bg-white/[0.03] border-white/10" : "bg-white/[0.01] border-white/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">
                              COL {hIdx + 1}
                            </span>
                            <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                          </div>
                          <p className="text-[10px] font-black uppercase text-white/80 leading-tight truncate" title={header}>
                            {header || 'EMPTY'}
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
          <div className="py-48 text-center opacity-20 border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-8">
            <ScanSearch className="h-24 w-24 text-white" />
            <h4 className="text-3xl font-black uppercase tracking-[0.3em] text-white">Discovery Inactive</h4>
          </div>
        )}
      </div>
    </div>
  );
}
