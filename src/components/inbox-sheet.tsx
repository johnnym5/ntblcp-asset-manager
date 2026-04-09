'use client';

/**
 * @fileOverview Governance Inbox - Request & Approval Pop-up Window.
 * Converted from Sheet to Dialog for focused workstation parity.
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Inbox, User, Clock, GitPullRequest, Check, X, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { FirestoreService } from '@/services/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const ChangeDetail = ({ label, oldValue, newValue }: { label: string, oldValue?: any, newValue?: any }) => {
    if (oldValue === newValue || (oldValue === undefined && newValue === '')) return null;
    return (
        <div className="text-[11px] grid grid-cols-12 gap-2 py-2 border-b border-border/40 last:border-0 items-center">
            <span className="text-muted-foreground col-span-4 font-bold uppercase tracking-tighter truncate">{label}</span>
            <div className="col-span-8 flex items-center gap-2 overflow-hidden">
                <span className="line-through text-destructive/60 truncate max-w-[80px]" title={String(oldValue || 'EMPTY')}>{String(oldValue || 'EMPTY')}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-green-600 font-black truncate" title={String(newValue || 'NEW')}>{String(newValue || 'NEW')}</span>
            </div>
        </div>
    );
};

export function InboxSheet({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { assets, isSyncing, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pendingAssets = assets
    .filter(asset => asset.approvalStatus === 'PENDING')
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime());

  const handleAction = async (assetIds: string[], action: 'APPROVE' | 'REJECT') => {
      setIsProcessing(true);
      try {
        for (const id of assetIds) {
          await FirestoreService.adjudicateAssetPulse(id, action);
        }
        await refreshRegistry();
        toast({ 
          title: action === 'APPROVE' ? "Batch Applied" : "Requests Discarded", 
          description: `Successfully adjudicated ${assetIds.length} registry pulses.` 
        });
        setSelectedIds(new Set());
      } catch (e) {
        toast({ variant: "destructive", title: "Adjudication Failure" });
      } finally {
        setIsProcessing(false);
      }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingAssets.map(a => a.id)));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 border-none rounded-[2.5rem] overflow-hidden shadow-3xl bg-background/95 backdrop-blur-xl">
        <div className="p-10 border-b bg-white/[0.02]">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Inbox className="text-primary h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white leading-none">Approval Queue</DialogTitle>
                          <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-white/40">
                              Adjudicate field modifications
                          </DialogDescription>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-10 px-6 font-black text-[9px] uppercase tracking-widest border-white/10 bg-white/5 hover:bg-primary/5 rounded-xl"
                        onClick={refreshRegistry}
                        disabled={isSyncing}
                    >
                        {isSyncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                        Reconcile Cloud
                    </Button>
                </div>
            </DialogHeader>
        </div>

        {pendingAssets.length > 0 && (
          <div className="px-10 py-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox 
                id="select-all-inbox" 
                checked={selectedIds.size === pendingAssets.length && pendingAssets.length > 0} 
                onCheckedChange={toggleAll}
                className="h-6 w-6 rounded-lg border-2 border-primary/40 data-[state=checked]:bg-primary"
              />
              <label htmlFor="select-all-inbox" className="text-[11px] font-black uppercase tracking-widest text-primary/80 cursor-pointer">
                {selectedIds.size > 0 ? `${selectedIds.size} Records Selected` : `Select All Pending`}
              </label>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => handleAction(Array.from(selectedIds), 'REJECT')} className="h-10 text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10">Reject Selection</Button>
                <Button size="sm" onClick={() => handleAction(Array.from(selectedIds), 'APPROVE')} className="h-10 text-[10px] font-black uppercase bg-primary text-black shadow-xl shadow-primary/20">Approve Batch</Button>
              </div>
            )}
          </div>
        )}
        
        <ScrollArea className="flex-1 px-10 py-8 bg-black">
          {pendingAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {pendingAssets.map((asset) => (
                <Card key={asset.id} className={cn(
                  "border-2 transition-all rounded-[2rem] overflow-hidden bg-white/[0.02] shadow-xl",
                  selectedIds.has(asset.id) ? "border-primary bg-primary/[0.02]" : "border-white/5 hover:border-white/10"
                )}>
                  <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Checkbox 
                          checked={selectedIds.has(asset.id)} 
                          onCheckedChange={() => toggleSelect(asset.id)}
                          className="h-5 w-5 rounded-full border-2 border-white/10"
                        />
                        <div className="space-y-1">
                          <h4 className="text-base font-black uppercase text-white tracking-tight truncate max-w-[200px]">{asset.description}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 text-white/40">{asset.category}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border-2 border-dashed border-white/5 p-5 bg-black/40">
                       <h4 className="font-black text-[9px] uppercase tracking-widest text-primary flex items-center gap-2 mb-1">
                          <GitPullRequest className="h-3.5 w-3.5"/> Modifications
                       </h4>
                       <div className="space-y-0.5">
                          {asset.pendingChanges && Object.keys(asset.pendingChanges).length > 0 ? (
                              Object.keys(asset.pendingChanges).map(key => (
                                  <ChangeDetail 
                                      key={key}
                                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                      oldValue={(asset as any)[key]}
                                      newValue={(asset.pendingChanges as any)[key]}
                                  />
                              ))
                          ) : (
                              <div className="text-[9px] font-bold text-white/20 uppercase p-4 text-center">Status Update Only</div>
                          )}
                       </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-white/30 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" /> <span>{asset.changeSubmittedBy?.displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" /> <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/[0.02] flex gap-2 border-t border-white/5">
                    <Button variant="ghost" onClick={() => handleAction([asset.id], 'REJECT')} className="flex-1 h-10 text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10">Reject</Button>
                    <Button onClick={() => handleAction([asset.id], 'APPROVE')} className="flex-1 h-10 text-[9px] font-black uppercase bg-primary text-black">Approve</Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center opacity-20">
              <Inbox className="h-20 w-20 mb-6 text-white" />
              <h3 className="text-2xl font-black uppercase tracking-widest text-white">Queue Clear</h3>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-8 bg-[#050505] border-t border-white/5 text-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest text-white/40 hover:text-white">Dismiss Workspace</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
