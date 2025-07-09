
'use client';
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import type { Asset } from '@/lib/types';
import { UpdatedAssetsDialog } from './updated-assets-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Inbox } from 'lucide-react';

interface InboxSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function InboxSheet({ isOpen, onOpenChange }: InboxSheetProps) {
  const { inboxMessages, setInboxMessages, setUnreadInboxCount } = useAppState();
  const [viewingAssets, setViewingAssets] = useState<Asset[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUnreadInboxCount(0);
    }
  }, [isOpen, setUnreadInboxCount]);

  const handleClearAll = () => {
    setInboxMessages({});
  };
  
  const handleViewDetails = (assets: Asset[]) => {
      setViewingAssets(assets);
      // Remove the viewed group from the inbox
      const groupKey = assets[0]?.lastModifiedByState || 'Admin';
      setInboxMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[groupKey];
          return newMessages;
      });
  }

  const messageGroups = Object.entries(inboxMessages);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle>Asset Update Inbox</SheetTitle>
            <SheetDescription>
              Updates from other users will appear here.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6 py-4">
            {messageGroups.length > 0 ? (
              <div className="space-y-4">
                {messageGroups.map(([groupKey, assets]) => (
                  <Card key={groupKey}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Updates from {groupKey}</span>
                        <span className="text-sm font-normal text-muted-foreground">{assets.length} asset{assets.length > 1 ? 's' : ''}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Last updated by {assets[0]?.lastModifiedBy || 'a user'} on {assets[0]?.lastModified ? new Date(assets[0].lastModified).toLocaleDateString() : 'an unknown date'}.
                      </p>
                      <Button onClick={() => handleViewDetails(assets)}>View Details</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Your inbox is empty</h3>
                <p className="text-sm">New asset updates will appear here automatically.</p>
              </div>
            )}
          </ScrollArea>
          <SheetFooter className="mt-auto pt-4 border-t">
            {messageGroups.length > 0 && (
                <Button variant="outline" onClick={handleClearAll}>Clear Inbox</Button>
            )}
            <SheetClose asChild>
              <Button>Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <UpdatedAssetsDialog assets={viewingAssets} onOpenChange={() => setViewingAssets(null)} />
    </>
  );
}
