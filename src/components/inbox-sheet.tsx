
'use client';
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import type { Asset, InboxMessageGroup } from '@/lib/types';
import { UpdatedAssetsDialog } from './updated-assets-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Inbox, X, ArrowRight, LogIn, LogOut } from 'lucide-react';
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
    setUnreadInboxCount(0);
  };

  const handleDismissGroup = (groupId: string) => {
    setInboxMessages(prev => prev.filter(group => group.id !== groupId));
  };
  
  const handleViewDetails = (group: InboxMessageGroup) => {
      // The full updated assets are now stored in the group itself
      setViewingAssets(group.updatedAssets || []);
      // Viewing details should not dismiss the group. The user can dismiss it manually.
  };

  const renderMessageGroup = (group: InboxMessageGroup) => {
    if (group.type === 'activity') {
      const isLogin = group.activityMessage?.includes('logged into');
      return (
        <Card key={group.id} className="relative group">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLogin ? <LogIn className="h-5 w-5 text-green-500" /> : <LogOut className="h-5 w-5 text-red-500" />}
              <p className="text-sm">{group.activityMessage}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
              onClick={() => handleDismissGroup(group.id)}
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={group.id} className="relative group">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between pr-8">
            <span>Updates from {group.updatedBy}</span>
          </CardTitle>
           <CardDescription>
            {group.updatedByState && `From ${group.updatedByState} - `}Last update: {new Date(group.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
              {(group.changes || []).map((change, index) => (
                  <div key={index} className="p-2 rounded-md bg-muted/50">
                      <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold">{change.assetDescription}</p>
                          {change.category && (
                              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full whitespace-nowrap">{change.category}</span>
                          )}
                      </div>
                      <div className="flex items-center text-muted-foreground flex-wrap mt-1">
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
          <Button onClick={() => handleViewDetails(group)}>View Asset Details ({(group.updatedAssets || []).length})</Button>
        </CardContent>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
          onClick={() => handleDismissGroup(group.id)}
          aria-label="Dismiss message"
        >
            <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Inbox</SheetTitle>
            <SheetDescription>
              Asset updates and user activity will appear here.
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-6 py-4">
            {inboxMessages.length > 0 ? (
              <div className="space-y-4">
                {inboxMessages.map(renderMessageGroup)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Your inbox is empty</h3>
                <p className="text-sm">New events will appear here automatically.</p>
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
