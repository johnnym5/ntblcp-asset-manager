'use client';

/**
 * @fileOverview Audit Trail - Traceability & Restoration Pulse.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { History, User, Clock, RotateCcw, AlertCircle, ArrowRight, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRevert: (assetId: string) => Promise<void>;
}

export function ActivityLogDialog({ isOpen, onOpenChange, onRevert }: ActivityLogDialogProps) {
  const { assets } = useAppState();
  const [logSearch, setLogSearch] = useState('');

  const modifiedAssets = React.useMemo(() => {
    let results = assets.filter(a => a.lastModified);
    if (logSearch) {
        const query = logSearch.toLowerCase();
        results = results.filter(a => 
            (a.description || '').toLowerCase().includes(query) || 
            (a.lastModifiedBy || '').toLowerCase().includes(query) ||
            (a.assetIdCode || '').toLowerCase().includes(query)
        );
    }
    return results.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).slice(0, 50);
  }, [assets, logSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl flex flex-col h-[90vh] overflow-hidden p-0 border-primary/10 rounded-3xl bg-background">
          <div className="p-8 pb-4 bg-muted/20 border-b space-y-6">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <History className="text-primary h-8 w-8" /> Audit Trail Log
                    </DialogTitle>
                </div>
                <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                    Traceability and historical pulse for the active project registry.
                </DialogDescription>
            </DialogHeader>
            
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                <Input 
                    placeholder="Search by auditor, ID, or asset description..." 
                    className="pl-11 h-12 rounded-2xl bg-background/50 border-none shadow-inner focus-visible:ring-primary/20 transition-all"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                />
            </div>
          </div>
          
          <ScrollArea className="flex-1 px-8 py-6 bg-background">
            <div className="space-y-4">
                {modifiedAssets.map((asset) => (
                    <Card key={asset.id} className="border-2 border-border/40 shadow-none hover:border-primary/20 transition-all border-dashed rounded-3xl overflow-hidden bg-card">
                        <CardHeader className="p-6 pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-sm font-black">{asset.description || asset.name}</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-primary">
                                        {asset.category} &bull; TAG: {asset.assetIdCode || 'UNTAGGED'}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 border-primary/10 text-primary">
                                    Row: {asset.importMetadata?.rowNumber || 'Manual'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    <span>Auditor: {asset.lastModifiedBy}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>Sync Replay: {formatDistanceToNow(new Date(asset.lastModified), { addSuffix: true })}</span>
                                </div>
                            </div>
                            
                            {asset.previousState ? (
                                <div className="p-4 rounded-2xl bg-muted/5 border-2 border-dashed border-primary/10">
                                    <p className="text-[9px] font-black uppercase text-primary mb-2 flex items-center gap-2">
                                        <RotateCcw className="h-3 w-3" /> Restoration Pulse Detected
                                    </p>
                                    <div className="text-[10px] font-medium italic opacity-60">
                                        This record contains a historical buffer and can be rolled back to its previous verified state.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-3 p-4 bg-muted/20 rounded-2xl border-2 border-dashed italic">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <span>Initial entry or snapshot import. Historical state not tracked.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {modifiedAssets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <History className="h-16 w-16 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Audit Ledger Clear</p>
                    </div>
                )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <DialogClose asChild>
              <Button variant="ghost" className="h-12 font-black uppercase text-[10px] tracking-widest rounded-2xl px-10">Exit Review Mode</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
