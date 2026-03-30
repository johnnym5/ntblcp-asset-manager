'use client';

/**
 * @fileOverview Governance Inbox - Request & Approval Management.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Inbox, User, Clock, GitPullRequest, Check, X, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingAssets = assets
    .filter(asset => asset.approvalStatus === 'PENDING')
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime());

  const handleAction = async (assetId: string, action: 'APPROVE' | 'REJECT') => {
      setIsProcessing(true);
      // Logic for committing the pending change or discarding it would be triggered here
      // via the facade. For Phase 6, we implement the UI state.
      setTimeout(async () => {
        await refreshRegistry();
        setIsProcessing(false);
      }, 800);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 border-primary/10 rounded-l-3xl overflow-hidden shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="p-8 border-b bg-muted/20">
            <SheetHeader>
                <div className="flex items-center justify-between">
                    <SheetTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Inbox className="text-primary h-6 w-6" />
                        </div>
                        Approval Queue
                    </SheetTitle>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 rounded-xl"
                        onClick={refreshRegistry}
                        disabled={isSyncing}
                    >
                        {isSyncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                        Sync Queue
                    </Button>
                </div>
                <SheetDescription className="mt-2 font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                    Registry modifications proposed by field auditors.
                </SheetDescription>
            </SheetHeader>
        </div>
        
        <ScrollArea className="flex-1 px-8 py-6 bg-background">
          {pendingAssets.length > 0 ? (
            <div className="space-y-8">
              {pendingAssets.map((asset) => (
                <Card key={asset.id} className="border-2 border-border/50 shadow-none hover:border-primary/20 transition-all rounded-3xl overflow-hidden bg-card">
                  <CardHeader className="bg-muted/10 p-6 pb-4 border-b">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">{asset.description || asset.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary rounded-lg">{asset.category}</Badge>
                                <span className="text-[10px] font-mono text-muted-foreground font-bold">SN: {asset.serialNumber || 'UNSET'}</span>
                            </CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="p-1.5 bg-muted rounded-lg"><User className="h-3.5 w-3.5" /></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Submitted By</span>
                                <span className="text-xs font-bold">{asset.changeSubmittedBy?.displayName || 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground justify-end text-right">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Wait Time</span>
                                <span className="text-xs font-bold">{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                            </div>
                            <div className="p-1.5 bg-muted rounded-lg"><Clock className="h-3.5 w-3.5" /></div>
                        </div>
                     </div>

                      <div className="space-y-3 rounded-2xl border-2 border-dashed p-5 bg-muted/5">
                         <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2 mb-1">
                            <GitPullRequest className="h-3.5 w-3.5"/> Proposed Modification Pulse
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
                                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase p-4 text-center border-2 border-dashed rounded-xl">No structural field changes (Audit Status Only)</div>
                            )}
                         </div>
                      </div>
                  </CardContent>
                  <CardFooter className="bg-muted/10 gap-3 border-t p-6">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isProcessing}
                        className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-destructive border-destructive/20 hover:bg-destructive/10 rounded-2xl transition-all" 
                        onClick={() => handleAction(asset.id, 'REJECT')}
                    >
                        <X className="mr-2 h-4 w-4" /> Reject Request
                    </Button>
                     <Button 
                        size="sm" 
                        disabled={isProcessing}
                        className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl transition-all" 
                        onClick={() => handleAction(asset.id, 'APPROVE')}
                    >
                        <Check className="mr-2 h-4 w-4" /> Apply Changes
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/40 py-20">
              <div className="p-8 bg-muted/20 rounded-full mb-6">
                <Inbox className="h-16 w-16 opacity-20" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest">Queue Status: Clear</h3>
              <p className="text-sm font-medium max-w-[280px] mt-2 opacity-60 leading-relaxed">All proposed registry modifications have been adjudicated.</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-8 border-t bg-muted/20">
            <SheetFooter>
                <SheetClose asChild>
                    <Button variant="ghost" className="w-full font-black uppercase text-xs tracking-widest h-14 rounded-2xl">Exit Approval Mode</Button>
                </SheetClose>
            </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
