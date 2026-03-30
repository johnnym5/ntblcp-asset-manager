'use client';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { History, User, Clock, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActivityLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRevert: (assetId: string) => Promise<void>;
}

const ChangeDetail = ({ label, oldValue, newValue }: { label: string, oldValue?: any, newValue?: any }) => {
    if (oldValue === newValue || oldValue === undefined) return null;
    return (
        <div className="text-[11px] grid grid-cols-12 gap-2 items-center py-1">
            <span className="text-muted-foreground col-span-4 font-bold uppercase tracking-tighter">{label}</span>
            <div className="col-span-8 flex items-center gap-2">
                <span className="line-through text-destructive/60 truncate max-w-[100px]" title={String(oldValue)}>{String(oldValue) || 'EMPTY'}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-green-600 font-black truncate" title={String(newValue)}>{String(newValue) || 'EMPTY'}</span>
            </div>
        </div>
    );
};

export function ActivityLogDialog({ isOpen, onOpenChange, onRevert }: ActivityLogDialogProps) {
  const { assets, activeGrantId } = useAppState();
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);

  const recentlyModifiedAssets = React.useMemo(() => {
    return [...assets]
      .filter(asset => asset.lastModified && (!activeGrantId || asset.grantId === activeGrantId))
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
      .slice(0, 50);
  }, [assets, activeGrantId]);

  const activitiesByUser = React.useMemo(() => {
    return recentlyModifiedAssets.reduce((acc, asset) => {
        const user = asset.lastModifiedBy || 'System';
        const userState = asset.lastModifiedByState || 'N/A';
        const userKey = `${user} (${userState})`;
        if (!acc[userKey]) {
            acc[userKey] = [];
        }
        acc[userKey].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);
  }, [recentlyModifiedAssets]);

  const handleSelectAllForUser = (userAssets: Asset[], checked: boolean) => {
    const assetIds = userAssets.map(a => a.id).filter(id => userAssets.find(a => a.id === id)?.previousState);
    setSelectedAssetIds(prev => {
        const otherIds = prev.filter(id => !assetIds.includes(id));
        return checked ? [...new Set([...otherIds, ...assetIds])] : otherIds;
    });
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
      setSelectedAssetIds(prev => {
          const newSet = new Set(prev);
          if (checked) {
              newSet.add(assetId);
          } else {
              newSet.delete(assetId);
          }
          return Array.from(newSet);
      });
  };

  const handleBulkRevert = async () => {
    setIsConfirmRevertOpen(false);
    for (const assetId of selectedAssetIds) {
        await onRevert(assetId);
    }
    setSelectedAssetIds([]);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl flex flex-col h-[90vh] overflow-hidden p-0 border-primary/10 rounded-3xl">
          <DialogHeader className="p-8 pb-4 bg-muted/20 border-b">
            <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                <History className="text-primary h-8 w-8" /> Recent Activity Log
            </DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Audit trails for the active project registry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-background">
            {Object.keys(activitiesByUser).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-4">
                {Object.entries(activitiesByUser).map(([userKey, userAssets]) => {
                  const revertibleCount = userAssets.filter(a => a.previousState).length;
                  const allForUserSelected = revertibleCount > 0 && userAssets.filter(a => a.previousState).every(a => selectedAssetIds.includes(a.id));

                  return (
                    <AccordionItem value={userKey} key={userKey} className="border-2 border-border/50 rounded-2xl bg-card overflow-hidden transition-all duration-300 hover:border-primary/20">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-primary/5 transition-colors">
                           <div className='flex items-center gap-4'>
                              <div className="p-2 bg-primary/10 rounded-xl">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="text-left">
                                  <span className="font-black text-sm block leading-none">{userKey}</span>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 block">{userAssets.length} modifications tracked</span>
                              </div>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 space-y-4">
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border-2 border-dashed">
                            <Checkbox id={`select-all-${userKey}`} 
                              checked={allForUserSelected}
                              onCheckedChange={(checked) => handleSelectAllForUser(userAssets, !!checked)}
                              disabled={revertibleCount === 0}
                            />
                            <Label htmlFor={`select-all-${userKey}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">
                                Select all {revertibleCount} revertible changes for this user
                            </Label>
                          </div>
                          
                          <div className="grid gap-4 sm:grid-cols-1">
                          {userAssets.map((asset) => (
                            <Card key={`${asset.id}-${asset.lastModified}`} className="border-border/40 shadow-none hover:shadow-lg transition-all border-2">
                              <CardHeader className="p-5 pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-4">
                                      <Checkbox 
                                          id={`select-${asset.id}`}
                                          className="mt-1"
                                          checked={selectedAssetIds.includes(asset.id)}
                                          onCheckedChange={(checked) => handleSelectAsset(asset.id, !!checked)}
                                          disabled={!asset.previousState}
                                      />
                                      <div>
                                          <CardTitle className="text-sm font-black">{asset.description || 'Asset Registry Entry'}</CardTitle>
                                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-primary">
                                              {asset.category} &bull; ID: {asset.assetIdCode || asset.sn || 'UNTAGGED'}
                                          </CardDescription>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-mono h-5 opacity-60">ROW: {asset.sourceRow || 'MANUAL'}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-5 pt-0 space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                    <Clock className="h-3 w-3" />
                                    <span>Sync Replay: {formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                                </div>
                                  
                                  {asset.previousState ? (
                                    <div className="space-y-3 rounded-xl border-2 bg-muted/5 p-4 border-dashed">
                                        <h4 className="font-black text-[9px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <RotateCcw className="h-3 w-3"/> Modification Delta (Old → New)
                                        </h4>
                                        <Separator className="opacity-50" />
                                        <div className="space-y-1">
                                            {Object.keys(asset.previousState).map(key => {
                                                const typedKey = key as keyof Asset;
                                                return (
                                                    <ChangeDetail 
                                                        key={key}
                                                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                        oldValue={(asset.previousState as any)[key]}
                                                        newValue={asset[typedKey] as string}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-3 p-3 bg-muted/20 rounded-xl border-2 border-dashed italic">
                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                        <span>Initial registration or batch import. No prior state available for revert.</span>
                                    </div>
                                  )}
                              </CardContent>
                            </Card>
                          ))}
                          </div>
                        </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/40 py-20">
                <History className="h-20 w-20 mb-6 opacity-10" />
                <h3 className="text-xl font-black uppercase tracking-widest">Registry Log Clear</h3>
                <p className="text-sm font-medium max-w-[250px] mt-2 opacity-60">Modifications made during project syncs will populate this audit trail.</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 sm:justify-between items-center bg-muted/10 border-t">
            <Button 
                variant="destructive" 
                className="h-12 font-black uppercase text-xs tracking-widest shadow-2xl shadow-destructive/20 px-8 rounded-2xl" 
                disabled={selectedAssetIds.length === 0} 
                onClick={() => setIsConfirmRevertOpen(true)}
            >
              <RotateCcw className="mr-3 h-4 w-4" /> Revert ({selectedAssetIds.length}) Selected Changes
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" className="h-12 font-bold px-8 rounded-2xl">Exit Audit Mode</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmRevertOpen} onOpenChange={setIsConfirmRevertOpen}>
          <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive text-2xl font-black tracking-tight">Confirm Mass Revert?</AlertDialogTitle>
                  <AlertDialogDescription className="font-medium text-sm leading-relaxed">
                      You are about to undo the last modification for {selectedAssetIds.length} assets. This will return them to their previous state in the cloud. This action is final.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="font-bold rounded-xl">Review Changes</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkRevert} className="bg-destructive hover:bg-destructive/90 font-black uppercase tracking-widest text-xs h-12 rounded-xl px-8 shadow-xl shadow-destructive/20">
                      Execute Revert Now
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
