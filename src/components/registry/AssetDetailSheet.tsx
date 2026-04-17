'use client';

/**
 * @fileOverview AssetDetailSheet - Professional Audit Dossier Wrapper.
 * Preserved for non-registry pages (GIS, Alerts, Gallery) that require a pop-up context.
 * Phase 1408: Added quick verification controls to the dossier overlay.
 * Phase 1409: Added Project Name badge for multi-grant clarity.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  Tag,
  Globe,
  CloudOff,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetDossier } from './AssetDossier';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import type { Asset } from '@/types/domain';

interface AssetDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AssetRecord;
  onEdit: (id: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  const { refreshRegistry, filteredAssets, appSettings } = useAppState();
  const { userProfile } = useAuth();

  if (!record) return null;

  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const grantId = (record.rawRow as any).grantId;
  const grantName = appSettings?.grants.find(g => g.id === grantId)?.name || 'Registry';

  const handleQuickUpdate = async (id: string, updates: Partial<Asset>) => {
    const asset = filteredAssets.find(a => a.id === id);
    if (!asset) return;

    const updatedAsset: Asset = {
      ...asset,
      ...updates,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName || 'Auditor',
      lastModifiedByState: userProfile?.state
    };

    try {
      await enqueueMutation('UPDATE', 'assets', updatedAsset);
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.map(a => a.id === id ? updatedAsset : a));
      await refreshRegistry();
    } catch (e) {
      console.error("Dossier: Assessment update interrupted.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-background text-foreground border-border sm:rounded-[2.5rem] shadow-3xl flex flex-col">
        {/* Dossier Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-xl shadow-inner hidden sm:block">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-foreground leading-none">
                Asset Dossier
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[8px] h-5 px-2 rounded-full">
                  {grantName}
                </Badge>
                <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                  {record.sourceSheet || 'REGISTRY PULSE'}
                </Badge>
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-muted-foreground uppercase opacity-40">
                  <Tag className="h-3 w-3" /> ID: {record.id.split('-')[0]}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all",
              syncStatus === 'synced' ? "bg-green-500/5 border-green-500/20 text-green-600" : "bg-blue-500/5 border-blue-500/20 text-blue-600"
            )}>
              {syncStatus === 'synced' ? <Globe className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              <span className="text-[9px] font-black uppercase tracking-widest">{syncStatus === 'synced' ? 'Synchronized' : 'Local Pulse'}</span>
            </div>
            <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border shadow-inner">
              <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg hover:bg-background"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg hover:bg-background"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <ScrollArea className="flex-1 custom-scrollbar">
          <div className="p-6">
            <AssetDossier 
              record={record} 
              onEdit={onEdit} 
              onQuickUpdate={handleQuickUpdate}
            />
          </div>
        </ScrollArea>

        <div className="p-6 bg-background border-t border-border text-center shrink-0 pb-safe">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-all">Dismiss Dossier</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
