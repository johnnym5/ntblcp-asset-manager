'use client';

/**
 * @fileOverview HeaderManager - The Advanced Registry Checklist.
 * Phase 35: Removed redundant manual close button.
 * Phase 36: Converted to centered Dialog pop-up window.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Columns, 
  GripVertical, 
  RotateCcw, 
  Search,
  LayoutGrid,
  Zap,
  ShieldCheck,
  Tag,
  MapPin,
  Info,
  Lock
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 border-none rounded-[2.5rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Columns className="text-primary h-6 w-6" />
              </div>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight">Field Setup</DialogTitle>
            </div>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-2">
              Technical Orchestration & Field Visibility Checklist
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search registry fields..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-background border-none shadow-inner text-xs font-bold"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {REGISTRY_PRESETS.map(preset => (
              <Button key={preset.id} variant="outline" size="sm" onClick={() => applyPreset(preset)} className="h-8 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest bg-card shadow-sm hover:bg-primary/5 transition-all">
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
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{groupName}</h4>
                  </div>
                  <div className="space-y-2">
                    {groupHeaders.map((header) => (
                      <div key={header.id} className={cn("p-5 rounded-3xl border-2 transition-all flex items-center justify-between group relative", header.visible ? "bg-card border-border/40 hover:border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60")}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="cursor-grab opacity-20 group-hover:opacity-100 transition-opacity"><GripVertical className="h-4 w-4" /></div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Input value={header.displayName} onChange={(e) => renameHeader(header.id, e.target.value)} className="border-none bg-transparent p-0 h-auto font-black text-sm uppercase tracking-tight focus-visible:ring-0 shadow-none truncate" disabled={!header.editable} />
                              {header.locked && <Lock className="h-3 w-3 text-primary opacity-40 shrink-0" />}
                            </div>
                            <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase opacity-40 truncate">SRC: {header.rawName}</span>
                          </div>
                        </div>
                        <Switch checked={header.visible} onCheckedChange={() => toggleVisibility(header.id)} disabled={header.locked} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button variant="ghost" onClick={onReset} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all">
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset Template
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">
            Commit Arrangement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
