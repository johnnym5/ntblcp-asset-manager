
'use client';
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Inbox, User, MapPin, Clock, GitPullRequest, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/lib/types';
import { Badge } from './ui/badge';

interface InboxSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApprove?: (assetId: string) => void;
  onReject?: (assetId: string) => void;
}

const ChangeDetail = ({ label, oldValue, newValue }: { label: string, oldValue?: any, newValue?: any }) => {
    if (oldValue === newValue) return null;
    return (
        <div className="text-xs grid grid-cols-3 gap-2">
            <span className="text-muted-foreground col-span-1">{label}</span>
            <span className="line-through text-muted-foreground/80 col-span-1 truncate">{oldValue || 'N/A'}</span>
            <span className="text-foreground col-span-1 truncate">{newValue || 'N/A'}</span>
        </div>
    );
};


export function InboxSheet({ isOpen, onOpenChange, onApprove, onReject }: InboxSheetProps) {
  const { assets, setAssetToView } = useAppState();

  const handleViewDetails = (asset: Asset) => {
    setAssetToView(asset);
    onOpenChange(false);
  }

  const pendingAssets = assets
    .filter(asset => asset.approvalStatus === 'pending')
    .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime());

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Approval Queue</SheetTitle>
          <SheetDescription>
            Review and approve or reject changes submitted by other users.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {pendingAssets.length > 0 ? (
            <div className="space-y-4">
              {pendingAssets.map((asset) => (
                <Card key={asset.id} className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">{asset.description || 'Asset'}</CardTitle>
                    <CardDescription>{asset.category} <Badge variant="secondary" className="ml-2">ID: {asset.assetIdCode || asset.sn}</Badge></CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Submitted by: <strong>{asset.changeSubmittedBy?.displayName || 'Unknown'}</strong> ({asset.changeSubmittedBy?.state})</span>
                      </div>
                       <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(asset.lastModified!), { addSuffix: true })}</span>
                      </div>
                      <div className="space-y-2 rounded-md border p-3 bg-background">
                         <h4 className="font-semibold text-sm flex items-center gap-2"><GitPullRequest className="h-4 w-4"/> Proposed Changes</h4>
                         {asset.pendingChanges && Object.keys(asset.pendingChanges).map(key => (
                            <ChangeDetail 
                                key={key}
                                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                oldValue={asset[key as keyof Asset] as string}
                                newValue={(asset.pendingChanges as any)[key]}
                            />
                         ))}
                      </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleViewDetails(asset)}>View Full Asset</Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onReject?.(asset.id)}>
                        <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                     <Button size="sm" onClick={() => onApprove?.(asset.id)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">Queue is Empty</h3>
              <p className="text-sm">No pending changes to review at this time.</p>
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
