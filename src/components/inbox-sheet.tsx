
'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Inbox, User, MapPin, Clock, GitPullRequest, Check, X, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface InboxSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApprove?: (assetId: string, comment?: string) => Promise<void>;
  onReject?: (assetId: string, comment?: string) => Promise<void>;
}

const ChangeDetail = ({ label, oldValue, newValue }: { label: string, oldValue?: any, newValue?: any }) => {
    if (oldValue === newValue || (oldValue === undefined && newValue === '')) return null;
    return (
        <div className="text-xs grid grid-cols-3 gap-2 py-1 border-b border-dashed last:border-0">
            <span className="text-muted-foreground col-span-1 font-medium">{label}</span>
            <span className="line-through text-destructive/70 col-span-1 truncate" title={String(oldValue || 'N/A')}>{String(oldValue || 'N/A')}</span>
            <span className="text-green-600 font-bold col-span-1 truncate" title={String(newValue || 'N/A')}>{String(newValue || 'N/A')}</span>
        </div>
    );
};


export function InboxSheet({ isOpen, onOpenChange, onApprove, onReject }: InboxSheetProps) {
  const { assets, setAssetToView } = useAppState();
  const [comments, setComments] = useState<Record<string, string>>({});

  const handleViewDetails = (asset: Asset) => {
    setAssetToView(asset);
    onOpenChange(false);
  }

  const pendingAssets = assets
    .filter(asset => asset.approvalStatus === 'pending')
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime());

  const handleAction = async (assetId: string, action: 'approve' | 'reject') => {
      const comment = comments[assetId] || '';
      if (action === 'approve') {
          await onApprove?.(assetId, comment);
      } else {
          await onReject?.(assetId, comment);
      }
      setComments(prev => {
          const next = { ...prev };
          delete next[assetId];
          return next;
      });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <div className="p-6 border-b bg-muted/20">
            <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                    <Inbox className="text-primary h-5 w-5" /> Approval Queue
                </SheetTitle>
                <SheetDescription>
                    Review modifications proposed by field officers. Approved changes will be applied to production.
                </SheetDescription>
            </SheetHeader>
        </div>
        
        <ScrollArea className="flex-1 px-6 py-4 bg-muted/5">
          {pendingAssets.length > 0 ? (
            <div className="space-y-6">
              {pendingAssets.map((asset) => (
                <Card key={asset.id} className="border-primary/10 shadow-sm overflow-hidden bg-background">
                  <CardHeader className="bg-muted/10 pb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base font-bold">{asset.description || 'Asset'}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-primary/20 text-primary">{asset.category}</Badge>
                                <span className="text-[10px] font-mono text-muted-foreground">ID: {asset.assetIdCode || asset.sn}</span>
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => handleViewDetails(asset)}>Inspect Full Profile</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4 pt-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="text-xs">From: <strong>{asset.changeSubmittedBy?.displayName || 'Unknown'}</strong> ({asset.changeSubmittedBy?.state})</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground justify-end">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                        </div>
                     </div>

                      <div className="space-y-2 rounded-xl border border-dashed p-4 bg-muted/5">
                         <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                            <GitPullRequest className="h-3 w-3"/> Proposed Snapshot
                         </h4>
                         <div className="space-y-1">
                            {asset.pendingChanges && Object.keys(asset.pendingChanges).length > 0 ? (
                                Object.keys(asset.pendingChanges).map(key => (
                                    <ChangeDetail 
                                        key={key}
                                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        oldValue={asset[key as keyof Asset] as string}
                                        newValue={(asset.pendingChanges as any)[key]}
                                    />
                                ))
                            ) : (
                                <p className="text-xs italic text-muted-foreground">No specific field changes detected (likely a status-only update).</p>
                            )}
                         </div>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor={`comment-${asset.id}`} className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <MessageSquare className="h-3 w-3" /> Admin Decision Comment
                          </Label>
                          <Textarea 
                            id={`comment-${asset.id}`}
                            placeholder="Add reasoning for acceptance/rejection (visible to user)..."
                            className="min-h-[60px] text-xs resize-none bg-muted/20 border-none shadow-inner"
                            value={comments[asset.id] || ''}
                            onChange={(e) => setComments(prev => ({ ...prev, [asset.id]: e.target.value }))}
                          />
                      </div>
                  </CardContent>
                  <CardFooter className="bg-muted/5 gap-2 border-t px-6 py-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-9 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/10" 
                        onClick={() => handleAction(asset.id, 'reject')}
                    >
                        <X className="mr-2 h-3.5 w-3.5" /> Reject Request
                    </Button>
                     <Button 
                        size="sm" 
                        className="flex-1 h-9 text-xs font-bold shadow-lg shadow-primary/10" 
                        onClick={() => handleAction(asset.id, 'approve')}
                    >
                        <Check className="mr-2 h-3.5 w-3.5" /> Approve & Update
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/40 py-20">
              <Inbox className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-lg font-black uppercase tracking-widest">Queue Clear</h3>
              <p className="text-xs font-medium max-w-[200px] mt-2">No pending modifications require your review at this time.</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-6 border-t bg-muted/20">
            <SheetFooter>
                <SheetClose asChild>
                    <Button variant="outline" className="w-full font-bold uppercase text-xs tracking-widest h-11">Close Queue</Button>
                </SheetClose>
            </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
