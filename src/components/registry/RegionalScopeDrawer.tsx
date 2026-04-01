'use client';

/**
 * @fileOverview RegionalScopeDrawer - High-Fidelity Location Management.
 * Recreated to match the exact visual pulse from the user's screenshot.
 * Phase 135: Refined layout with zonal checkboxes and circular counts.
 */

import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  ArrowUpDown, 
  Layers, 
  Check, 
  Search,
  X,
  Database,
  ChevronDown
} from 'lucide-react';
import { NIGERIAN_ZONES, NIGERIAN_STATES } from '@/lib/constants';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';

interface RegionalScopeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegionalScopeDrawer({ isOpen, onOpenChange }: RegionalScopeDrawerProps) {
  const { assets, selectedLocations, setSelectedLocations } = useAppState();
  const [sortMode, setSortMode] = useState<'A-Z' | 'VOLUME' | 'ZONES'>('ZONES');

  // Calculate counts per state
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      const loc = a.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [assets]);

  const toggleState = (state: string) => {
    const next = new Set(selectedLocations);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    setSelectedLocations(Array.from(next));
  };

  const toggleZone = (states: string[]) => {
    const next = new Set(selectedLocations);
    const allIn = states.every(s => next.has(s));
    if (allIn) states.forEach(s => next.delete(s));
    else states.forEach(s => next.add(s));
    setSelectedLocations(Array.from(next));
  };

  const resetAll = () => {
    setSelectedLocations([]);
  };

  const isAllSelected = selectedLocations.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 border-none bg-black text-white shadow-3xl overflow-hidden rounded-l-[2.5rem]">
        {/* Header Pulse */}
        <div className="p-8 pb-6 border-b border-white/5 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Manage Regional Scope</h2>
            <Button variant="ghost" onClick={resetAll} className="h-auto p-0 text-primary font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-transparent hover:opacity-80">
              <RefreshCw className="h-3 w-3" /> Reset to All
            </Button>
          </div>

          {/* Toolbar segments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setSortMode('A-Z')}
                className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", sortMode === 'A-Z' ? "text-white" : "text-white/20")}
              >
                <ArrowUpDown className="h-3.5 w-3.5" /> A-Z
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button 
                onClick={() => setSortMode('VOLUME')}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl transition-all", sortMode === 'VOLUME' ? "bg-white/10 text-white" : "text-white/20")}
              >
                <Database className="h-3.5 w-3.5" /> Volume
              </button>
            </div>
            <button 
              onClick={() => setSortMode('ZONES')}
              className={cn("flex items-center gap-2 px-6 py-2 rounded-xl transition-all", sortMode === 'ZONES' ? "bg-white/10 text-white" : "text-white/20")}
            >
              <Layers className="h-3.5 w-3.5" /> Zones
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-6 space-y-10 pb-32">
            {/* Overall Project Scope */}
            <button 
              onClick={resetAll}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                isAllSelected ? "bg-primary/5 border-primary/40" : "bg-[#0A0A0A] border-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all shadow-lg",
                  isAllSelected ? "bg-primary border-primary" : "border-white/20"
                )}>
                  {isAllSelected && <Check className="h-3.5 w-3.5 text-black font-black" />}
                </div>
                <span className={cn("text-xs font-black uppercase tracking-tight", isAllSelected ? "text-white" : "text-white/40")}>Overall Project Scope</span>
              </div>
              <div className="h-5 w-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                <span className="text-[8px] font-mono font-bold text-white/40">{assets.length}</span>
              </div>
            </button>

            {/* Zonal Lists organized as per screenshot */}
            {Object.entries(NIGERIAN_ZONES).map(([zone, states]) => {
              const zoneStatesIn = states.filter(s => selectedLocations.includes(s));
              const isZoneAllIn = zoneStatesIn.length === states.length;
              const isZonePartial = zoneStatesIn.length > 0 && !isZoneAllIn;

              return (
                <div key={zone} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{zone.toUpperCase()} ZONE</h3>
                    <button 
                      onClick={() => toggleZone(states)}
                      className={cn(
                        "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isZoneAllIn ? "bg-primary border-primary shadow-lg shadow-primary/20" : isZonePartial ? "border-primary/40 bg-primary/5" : "border-white/20"
                      )}
                    >
                      {isZoneAllIn && <Check className="h-3.5 w-3.5 text-black font-black" />}
                      {isZonePartial && <div className="h-1 w-2.5 bg-primary/60 rounded-full" />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {states.map(state => {
                      const isSelected = selectedLocations.includes(state);
                      const count = stateCounts[state] || 0;
                      return (
                        <button 
                          key={state}
                          onClick={() => toggleState(state)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl group transition-all",
                            isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-white/10 group-hover:border-white/20"
                            )}>
                              {isSelected && <Check className="h-3.5 w-3.5 text-black font-black" />}
                            </div>
                            <span className={cn(
                              "text-xs font-black uppercase tracking-tight",
                              isSelected ? "text-white" : "text-white/20"
                            )}>{state}</span>
                          </div>
                          <div className="h-5 w-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                            <span className="text-[8px] font-mono font-bold text-white/10">{count}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex items-center justify-center">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform active:scale-95"
          >
            Confirm Spatial Scope
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}