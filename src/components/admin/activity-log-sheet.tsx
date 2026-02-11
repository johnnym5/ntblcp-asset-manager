
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
import { ScrollArea } from '../ui/scroll-area';
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
        <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2"><History /> Recent Activity</DialogTitle>
            <DialogDescription>
              Review changes made to assets across the system. You can revert the last change for any asset here.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            {Object.keys(activitiesByUser).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(activitiesByUser).map(([userKey, userAssets]) => {
                  const userAssetIds = userAssets.map(a => a.id);
                  const selectedForUser = selectedAssetIds.filter(id => userAssetIds.includes(id));
                  const allForUserSelected = userAssets.filter(a => a.previousState).length > 0 && userAssets.filter(a => a.previousState).every(a => selectedAssetIds.includes(a.id));

                  return (
                    <AccordionItem value={userKey} key={userKey} className="border-b-0 rounded-lg bg-muted/50 overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/80">
                           <div className='flex items-center gap-2'>
                              <User className="h-4 w-4" />
                              <span className="font-semibold">{userKey}</span>
                              <Badge variant="secondary">{userAssets.length} change(s)</Badge>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-background border">
                            <Checkbox id={`select-all-${userKey}`} 
                              checked={allForUserSelected}
                              onCheckedChange={(checked) => handleSelectAllForUser(userAssets, !!checked)}
                              disabled={userAssets.filter(a => a.previousState).length === 0}
                            />
                            <Label htmlFor={`select-all-${userKey}`} className="text-sm font-medium">Select all revertible changes for this user</Label>
                          </div>
                          <div className="space-y-4">
                          {userAssets.map((asset) => (
                            <Card key={`${asset.id}-${asset.lastModified}`} className="bg-background">
                              <CardHeader>
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
                                          <CardTitle className="text-base">{asset.description || 'Asset'}</CardTitle>
                                          <CardDescription>{asset.category} <Badge variant="secondary" className="ml-2">ID: {asset.assetIdCode || asset.sn}</Badge></CardDescription>
                                      </div>
                                    </div>
                                    {asset.previousState && (
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive flex-shrink-0" onClick={() => onRevert(asset.id)}>
                                            <RotateCcw className="mr-2 h-4 w-4" /> Revert
                                        </Button>
                                    )}
                                </div>
                              </CardHeader>
                              <CardContent className="text-sm space-y-3">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                                  </div>
                                </div>
                                  
                                  {asset.previousState ? (
                                    <div className="space-y-2 rounded-md border p-3">
                                        <h4 className="font-semibold text-xs">Changes in this update:</h4>
                                        <Separator />
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
                                  ) : (
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 p-3 bg-muted/50 rounded-md border border-dashed">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>This change was likely an asset creation or a sync from the cloud. No previous state to revert to.</span>
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
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <History className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">No Recent Activity</h3>
                <p className="text-sm">Changes made to assets will appear here.</p>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="p-6 pt-4 border-t sm:justify-between">
            <Button variant="destructive" disabled={selectedAssetIds.length === 0} onClick={() => setIsConfirmRevertOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Revert ({selectedAssetIds.length}) Selected
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmRevertOpen} onOpenChange={setIsConfirmRevertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will revert the last change for {selectedAssetIds.length} selected asset(s). This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkRevert} className="bg-destructive hover:bg-destructive/90">
                      Yes, Revert Changes
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
