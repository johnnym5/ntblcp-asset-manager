'use client';

/**
 * @fileOverview HeaderManager - The Advanced Registry Checklist.
 * Phase 38: Implemented Triple-View Toggles (Card, List, Check).
 * Phase 39: Converted to focused Dialog window with vertical group stacking.
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
  Lock,
  Eye,
  List,
  ClipboardCheck,
  CheckCircle2
} from 'lucide-react';
import type { RegistryHeader } from '@/types/registry';
import { DEFAULT_REGISTRY_HEADERS } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { storage } from '@/offline/storage';
import { FirestoreService } from '@/services/firebase/firestore';
import { addNotification } from '@/hooks/use-notifications';

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

export function HeaderManagerDrawer({ isOpen, onOpenChange, headers, onUpdateHeaders }: HeaderManagerProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, isOnline } = useAppState();
  const [search, setSearch] = useState("");
  const [localHeaders, setLocalHeaders] = useState<RegistryHeader[]>(headers);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const groups = ["Identity", "Location", "Classification", "Procurement", "Condition", "Metadata", "Hierarchy"] as const;

  React.useEffect(() => {
    if (isOpen) setLocalHeaders(headers);
  }, [isOpen, headers]);

  const toggleFlag = (id: string, key: 'visible' | 'table' | 'quickView' | 'inChecklist') => {
    if (!isAdmin) return;
    setLocalHeaders(prev => prev.map(h => h.id === id ? { ...h, [key]: !h[key] } : h));
  };

  const renameHeader = (id: string, newName: string) => {
    if (!isAdmin) return;
    setLocalHeaders(prev => prev.map(h => h.id === id ? { ...h, displayName: newName } : h));
  };

  const handleReset = () => {
    if (!isAdmin) return;
    const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i })) as RegistryHeader[];
    setLocalHeaders(initial);
  };

  const handleCommit = async () => {
    if (!isAdmin || !appSettings) return;
    
    const updatedSettings = { ...appSettings, globalHeaders: localHeaders };
    
    try {
      await storage.saveSettings(updatedSettings);
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      setAppSettings(updatedSettings);
      onUpdateHeaders(localHeaders);
      addNotification({ title: "Registry Schema Synchronized", variant: "success" });
      onOpenChange(false);
    } catch (e) {
      addNotification({ title: "Commit Failure", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 border-none rounded-[2.5rem] shadow-3xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Columns className="text-primary h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-3xl font-black uppercase tracking-tight">Field Setup</DialogTitle>
                  <DialogDescription className="font-bold uppercase text-[9px] tracking-widest text-primary mt-1">
                    GLOBAL REGISTRY ORCHESTRATION
                  </DialogDescription>
                </div>
              </div>
              {!isAdmin && <Badge className="bg-muted text-muted-foreground border-border h-7 px-3 rounded-full font-black uppercase text-[8px] tracking-widest gap-2"><Lock className="h-3 w-3" /> Read Only</Badge>}
            </div>
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
          <div className="flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-widest opacity-40">
            <span>Registry Parameter</span>
            <div className="flex gap-10 pr-4">
              <span className="flex items-center gap-1.5"><Eye className="h-2.5 w-2.5" /> Card</span>
              <span className="flex items-center gap-1.5"><List className="h-2.5 w-2.5" /> List</span>
              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-2.5 w-2.5" /> Check</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-8 space-y-10 pb-32">
            {groups.map(groupName => {
              const groupHeaders = localHeaders.filter(h => 
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
                              <Input value={header.displayName} onChange={(e) => renameHeader(header.id, e.target.value)} className="border-none bg-transparent p-0 h-auto font-black text-sm uppercase tracking-tight focus-visible:ring-0 shadow-none truncate" disabled={!header.editable || !isAdmin} />
                              {header.locked && <Lock className="h-3 w-3 text-primary opacity-40 shrink-0" />}
                            </div>
                            <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase opacity-40 truncate">SRC: {header.rawName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-8 pl-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch checked={header.quickView} onCheckedChange={() => toggleFlag(header.id, 'quickView')} disabled={!isAdmin} className="data-[state=checked]:bg-primary" />
                              </TooltipTrigger>
                              <TooltipContent className="text-[8px] font-black uppercase">Card View</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch checked={header.table} onCheckedChange={() => toggleFlag(header.id, 'table')} disabled={!isAdmin} className="data-[state=checked]:bg-primary" />
                              </TooltipTrigger>
                              <TooltipContent className="text-[8px] font-black uppercase">Table View</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch checked={header.inChecklist} onCheckedChange={() => toggleFlag(header.id, 'inChecklist')} disabled={!isAdmin} className="data-[state=checked]:bg-primary" />
                              </TooltipTrigger>
                              <TooltipContent className="text-[8px] font-black uppercase">Fidelity Check</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          {isAdmin ? (
            <>
              <Button variant="ghost" onClick={handleReset} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all">
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset Default
              </Button>
              <Button onClick={handleCommit} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Commit Arrangement Pulse
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] bg-muted text-muted-foreground">
              Exit Arrangement View
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
