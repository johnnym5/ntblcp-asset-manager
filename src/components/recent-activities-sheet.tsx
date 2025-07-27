
'use client';
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Inbox, User, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';

interface RecentActivitiesSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onViewDetails: (asset: Asset) => void;
}

export function RecentActivitiesSheet({ isOpen, onOpenChange, onViewDetails }: RecentActivitiesSheetProps) {
  const { assets } = useAppState();

  const recentlyModifiedAssets = assets
    .filter(asset => asset.lastModified && asset.lastModifiedBy)
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
    .slice(0, 50); // Limit to the 50 most recent changes for performance

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Recent Activities</SheetTitle>
          <SheetDescription>
            Showing the most recently modified assets across the system.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {recentlyModifiedAssets.length > 0 ? (
            <div className="space-y-4">
              {recentlyModifiedAssets.map((asset) => (
                <Card key={asset.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{asset.description || 'Asset'}</CardTitle>
                    <CardDescription>{asset.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                     <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Modified by: <strong>{asset.lastModifiedBy || 'Unknown'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>From: <strong>{asset.lastModifiedByState || 'Unknown Location'}</strong></span>
                      </div>
                       <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                      </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="secondary" size="sm" onClick={() => onViewDetails(asset)}>View Details</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">No Recent Activity</h3>
              <p className="text-sm">Changes to assets will appear here.</p>
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
