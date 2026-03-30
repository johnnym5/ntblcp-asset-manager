/**
 * @fileOverview HeaderManager - The Advanced Registry Checklist.
 * Phase 22: Supports hierarchical grouping, presets, and locked field orchestration.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Columns, 
  GripVertical, 
  Eye, 
  RotateCcw, 
  X, 
  Search,
  LayoutGrid,
  Zap,
  ShieldCheck,
  Tag,
  MapPin,
  Truck,
  History,
  Info
} from 'lucide-react';
import type { RegistryHeader, RegistryPreset } from '@/types/registry';
import { REGISTRY_PRESETS } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface HeaderManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  headers: RegistryHeader[];
  onUpdateHeaders: (headers: RegistryHeader[]) => void;
  onReset: () => void;
}

const GroupIcon = ({ group }: { group: string }) => {
  switch(group) {
    case 'Identity': return <Tag className="h-3 w-3 text-primary" />;
    case 'Location': return <MapPin className="h-3 w-3 text-blue-500" />;
    case 'Classification': return <LayoutGrid className="h-3 w-3 text-green-500" />;
    case 'Procurement': return <Zap className="h-3 w-3 text-orange-500" />;
    case 'Condition': return <ShieldCheck className="h-3 w-3 text-red-500" />;
    case 'Hierarchy': return <Columns className="h-3 w-3 text-purple-500" />;
    default: return <Info className="h-3 w-3 text-muted-foreground" />;
  }
};

export function HeaderManagerDrawer({ isOpen, onOpenChange, headers, onUpdateHeaders, onReset }: HeaderManagerProps) {
  const [search, setSearch] = useState("");

  const groups = ["Identity", "Location", "Classification", "Procurement", "Condition", "Metadata", "Hierarchy"] as const;

  const toggleVisibility = (id: string) => {
    onUpdateHeaders(headers.map(h => h.id === id ? { ...h, visible: !h.visible } : h));
  };

  const renameHeader = (id: string, newName: string) => {
    onUpdateHeaders(headers.map(h => h.id === id ? { ...h, displayName: newName } : h));
  };

  const applyPreset = (preset: RegistryPreset) => {
    onUpdateHeaders(headers.map(h => ({
      ...h,
      visible: preset.visibleHeaderNames.includes(h.normalizedName)
    })));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Columns className="text-primary h-6 w-6" />
                </div>
                Registry Checklist
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Manage field visibility and arrangement for the operational register.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search available fields..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-background border-none shadow-inner text-xs font-bold"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {REGISTRY_PRESETS.map(preset => (
              <Button 
                key={preset.id} 
                variant="outline" 
                size="sm" 
                onClick={() => applyPreset(preset)}
                className="h-8 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest bg-card shadow-sm hover:bg-primary/5 transition-all"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-8 space-y-10">
            {groups.map(groupName => {
              const groupHeaders = headers.filter(h => 
                h.group === groupName && 
                (h.displayName.toLowerCase().includes(search.toLowerCase()) || h.rawName.toLowerCase().includes(search.toLowerCase()))
              );

              if (groupHeaders.length === 0) return null;

              return (
                <div key={groupName} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <GroupIcon group={groupName} />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{groupName} Pulse</h4>
                  </div>
                  
                  <div className="space-y-2">
                    {groupHeaders.map((header) => (
                      <div 
                        key={header.id}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                          header.visible ? "bg-card border-border/40 hover:border-primary/20" : "bg-muted/30 border-transparent opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="cursor-grab opacity-20 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <Input 
                              value={header.displayName}
                              onChange={(e) => renameHeader(header.id, e.target.value)}
                              className="border-none bg-transparent p-0 h-auto font-black text-sm uppercase tracking-tight focus-visible:ring-0 shadow-none"
                              disabled={!header.editable}
                            />
                            <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase opacity-40">Source: {header.rawName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={header.visible} 
                            onCheckedChange={() => toggleVisibility(header.id)}
                            disabled={header.locked}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onReset}
            className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset Template
          </Button>
          <SheetClose asChild>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">
              Apply Checklist
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
