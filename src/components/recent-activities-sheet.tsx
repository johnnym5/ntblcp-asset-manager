
'use client';
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Inbox, User, MapPin, Clock, X, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Separator } from './ui/separator';

interface RecentActivitiesSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onViewDetails: (asset: Asset) => void;
}

export function RecentActivitiesSheet({ isOpen, onOpenChange, onViewDetails }: RecentActivitiesSheetProps) {
  const { assets, dismissedActivities, setDismissedActivities } = useAppState();

  const handleDismiss = (activityId: string) => {
    setDismissedActivities(prev => [...new Set([...prev, activityId])]);
  };

  const handleClearAll = () => {
    setDismissedActivities([]);
  };

  const recentlyModifiedAssets = assets
    .filter(asset => asset.lastModified && asset.lastModifiedBy && !dismissedActivities.includes(asset.lastModified))
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
    .slice(0, 50); // Limit to the 50 most recent changes for performance

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Recent Activities</SheetTitle>
          <SheetDescription>
            Showing the most recently modified assets across the system.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1">
          {recentlyModifiedAssets.length > 0 ? (
            <div className="space-y-4 p-6">
              {recentlyModifiedAssets.map((asset) => (
                <Card key={asset.id} className="relative group">
                  <CardHeader>
                    <CardTitle className="text-base pr-8">{asset.description || 'Asset'}</CardTitle>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100"
                    onClick={() => handleDismiss(asset.lastModified!)}
                    aria-label="Dismiss activity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <CheckCheck className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">All Caught Up</h3>
              <p className="text-sm">There are no new activities to show.</p>
            </div>
          )}
        </ScrollArea>
        <SheetFooter className="p-6 pt-4 border-t">
            {recentlyModifiedAssets.length > 0 && dismissedActivities.length > 0 && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleClearAll}>
                    Clear dismissed activities
                </Button>
            )}
            <SheetClose asChild>
                <Button variant="outline">Close</Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
