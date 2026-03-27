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
import { History, User, Clock, RotateCcw, AlertCircle } from 'lucide-react';
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
        <div className="text-xs grid grid-cols-3 gap-2 items-center">
            <span className="text-muted-foreground col-span-1">{label}</span>
            <span className="line-through text-muted-foreground/80 col-span-1 truncate" title={oldValue}>{oldValue || 'N/A'}</span>
            <span className="text-foreground col-span-1 truncate" title={newValue}>{newValue || 'N/A'}</span>
        </div>
    );
};

export function ActivityLogDialog({ isOpen, onOpenChange, onRevert }: ActivityLogDialogProps) {
  const { assets } = useAppState();
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);

  const recentlyModifiedAssets = React.useMemo(() => {
    return [...assets]
      .filter(asset => asset.lastModified)
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
      .slice(0, 50); // Show last 50 changes
  }, [assets]);

  const activitiesByUser = React.useMemo(() => {
    return recentlyModifiedAssets.reduce((acc, asset) => {
        const user = asset.lastModifiedBy || 'Unknown';
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
        <DialogContent className="max-w-3xl flex flex-col h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight"><History className="text-primary" /> Recent Activity</DialogTitle>
            <DialogDescription>
              Review regional modifications. You can selectively revert the last change for any asset here.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-muted/5 border-y">
            {Object.keys(activitiesByUser).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-3">
                {Object.entries(activitiesByUser).map(([userKey, userAssets]) => {
                  const userAssetIds = userAssets.map(a => a.id);
                  const allForUserSelected = userAssets.filter(a => a.previousState).length > 0 && userAssets.filter(a => a.previousState).every(a => selectedAssetIds.includes(a.id));

                  return (
                    <AccordionItem value={userKey} key={userKey} className="border border-border/50 rounded-xl bg-background overflow-hidden shadow-sm">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                           <div className='flex items-center gap-3'>
                              <div className="p-1.5 bg-primary/10 rounded-lg">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-bold text-sm">{userKey}</span>
                              <Badge variant="secondary" className="font-bold">{userAssets.length} changes</Badge>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-dashed">
                            <Checkbox id={`select-all-${userKey}`} 
                              checked={allForUserSelected}
                              onCheckedChange={(checked) => handleSelectAllForUser(userAssets, !!checked)}
                              disabled={userAssets.filter(a => a.previousState).length === 0}
                            />
                            <Label htmlFor={`select-all-${userKey}`} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Select all revertible for this user</Label>
                          </div>
                          
                          <div className="space-y-3">
                          {userAssets.map((asset) => (
                            <Card key={`${asset.id}-${asset.lastModified}`} className="border-border/40 shadow-none">
                              <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-3">
                                      <Checkbox 
                                          id={`select-${asset.id}-${asset.lastModified}`}
                                          className="mt-1"
                                          checked={selectedAssetIds.includes(asset.id)}
                                          onCheckedChange={(checked) => handleSelectAsset(asset.id, !!checked)}
                                          disabled={!asset.previousState}
                                      />
                                      <div>
                                          <CardTitle className="text-sm font-bold">{asset.description || 'Asset'}</CardTitle>
                                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{asset.category} &bull; ID: {asset.assetIdCode || asset.sn}</CardDescription>
                                      </div>
                                    </div>
                                    {asset.previousState && (
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 text-[10px] font-bold uppercase" onClick={() => onRevert(asset.id)}>
                                            <RotateCcw className="mr-1.5 h-3 w-3" /> Revert
                                        </Button>
                                    )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                                </div>
                                  
                                  {asset.previousState ? (
                                    <div className="space-y-2 rounded-lg border bg-muted/5 p-3">
                                        <h4 className="font-black text-[9px] uppercase tracking-widest text-primary">Modifications in this sync</h4>
                                        <Separator className="opacity-50" />
                                        <div className="space-y-1.5">
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
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-dashed italic">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>Initial registration or project import. No history to revert.</span>
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
                <History className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-lg font-black uppercase tracking-widest">No Activity Found</h3>
                <p className="text-xs font-medium max-w-[200px] mt-2">Changes made during regional syncs will appear here.</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 sm:justify-between items-center bg-muted/10">
            <Button variant="destructive" className="h-11 font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/10" disabled={selectedAssetIds.length === 0} onClick={() => setIsConfirmRevertOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Revert ({selectedAssetIds.length}) Selected
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="h-11 font-bold">Exit Audit Log</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmRevertOpen} onOpenChange={setIsConfirmRevertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">Confirm Bulk Revert?</AlertDialogTitle>
                  <AlertDialogDescription className="font-medium">
                      You are about to undo the last modification for {selectedAssetIds.length} assets. This will return them to their previous state in the cloud. This action is final.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkRevert} className="bg-destructive hover:bg-destructive/90 font-bold uppercase tracking-widest text-xs h-11">
                      Execute Revert
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}