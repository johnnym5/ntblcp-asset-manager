
'use client';
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import type { Asset, InboxMessageGroup } from '@/lib/types';
import { UpdatedAssetsDialog } from './updated-assets-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Inbox, X, ArrowRight } from 'lucide-react';
import { Separator } from './ui/separator';

interface InboxSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function InboxSheet({ isOpen, onOpenChange }: InboxSheetProps) {
  const { inboxMessages, setInboxMessages, setUnreadInboxCount } = useAppState();
  const [viewingAssets, setViewingAssets] = useState<Asset[] | null>(null);

  const handleOpen = (open: boolean) => {
    if (open) {
      setUnreadInboxCount(0);
    }
    onOpenChange(open);
  };

  const handleClearAll = () => {
    setInboxMessages([]);
  };

  const handleDismissGroup = (groupKey: string) => {
    setInboxMessages(prev => prev.filter(group => group.updatedBy !== groupKey));
  };
  
  const handleViewDetails = (group: InboxMessageGroup) => {
      // The full updated assets are now stored in the group itself
      setViewingAssets(group.updatedAssets);
      // Viewing details should not dismiss the group. The user can dismiss it manually.
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Asset Update Inbox</SheetTitle>
            <SheetDescription>
              Updates from other users will appear here.
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-6 py-4">
            {inboxMessages.length > 0 ? (
              <div className="space-y-4">
                {inboxMessages.map((group) => (
                  <Card key={group.updatedBy} className="relative group">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between pr-8">
                        <span>Updates from {group.updatedBy}</span>
                      </CardTitle>
                       <CardDescription>
                        Last update: {new Date(group.updatedAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                          {group.changes.map((change, index) => (
                              <div key={index} className="p-2 rounded-md bg-muted/50">
                                  <p className="font-semibold">{change.assetDescription}</p>
                                  <div className="flex items-center text-muted-foreground flex-wrap">
                                    <span>{change.field} changed:</span>
                                    <em className="ml-2 not-italic bg-red-100 dark:bg-red-900/50 px-1 rounded-sm text-red-800 dark:text-red-300">
                                      {change.from}
                                    </em>
                                    <ArrowRight className="h-3 w-3 mx-1" />
                                    <em className="not-italic bg-green-100 dark:bg-green-900/50 px-1 rounded-sm text-green-800 dark:text-green-300">
                                      {change.to}
                                    </em>
                                  </div>
                              </div>
                          ))}
                        </div>
                      <Button onClick={() => handleViewDetails(group)}>View Asset Details ({group.updatedAssets.length})</Button>
                    </CardContent>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                      onClick={() => handleDismissGroup(group.updatedBy)}
                      aria-label="Dismiss message"
                    >
                        <X className="h-4 w-4" />
                    </Button>
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
          <Separator />
          <SheetFooter className="p-6 pt-4">
            {inboxMessages.length > 0 && (
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
