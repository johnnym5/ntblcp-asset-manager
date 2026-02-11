
'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { History, User, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface ActivityLogSheetProps {
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

export function ActivityLogSheet({ isOpen, onOpenChange, onRevert }: ActivityLogSheetProps) {
  const { assets } = useAppState();

  const recentlyModifiedAssets = React.useMemo(() => {
    return [...assets]
      .filter(asset => asset.lastModified)
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
      .slice(0, 50); // Show last 50 changes
  }, [assets]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2"><History /> Recent Activity</SheetTitle>
          <SheetDescription>
            A log of the most recent asset modifications across the system. You can revert the last change for any asset here.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {recentlyModifiedAssets.length > 0 ? (
            <div className="space-y-4">
              {recentlyModifiedAssets.map((asset) => (
                <Card key={`${asset.id}-${asset.lastModified}`} className="bg-muted/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{asset.description || 'Asset'}</CardTitle>
                            <CardDescription>{asset.category} <Badge variant="secondary" className="ml-2">ID: {asset.assetIdCode || asset.sn}</Badge></CardDescription>
                        </div>
                        {asset.previousState && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onRevert(asset.id)}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Revert
                            </Button>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                     <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>By: <strong>{asset.lastModifiedBy || 'Unknown'}</strong> ({asset.lastModifiedByState || 'N/A'})</span>
                        </div>
                       <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                      </div>
                     </div>
                      
                      {asset.previousState ? (
                        <div className="space-y-2 rounded-md border p-3 bg-background">
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
                        <div className="text-xs text-muted-foreground flex items-center gap-2 p-3 bg-background rounded-md border border-dashed">
                            <AlertCircle className="h-4 w-4" />
                            <span>This change was likely an asset creation or a sync from the cloud. No previous state to revert to.</span>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <History className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">No Recent Activity</h3>
              <p className="text-sm">Changes made to assets will appear here.</p>
            </div>
          )}
        </ScrollArea>
        <SheetFooter className="p-6 pt-4 border-t">
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
