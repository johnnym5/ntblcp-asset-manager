
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
import type { Asset } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface UpdatedAssetsDialogProps {
  assets: Asset[] | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function UpdatedAssetsDialog({ assets, onOpenChange }: UpdatedAssetsDialogProps) {
  const isOpen = !!assets;

  const assetsByCategory = React.useMemo(() => {
    if (!assets) return {};
    return assets.reduce((acc, asset) => {
      const category = asset.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [assets]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Recent Asset Updates</SheetTitle>
          <SheetDescription>
            The following assets were recently updated by another user.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6 py-4">
          <div className="space-y-6">
            {Object.keys(assetsByCategory).length > 0 ? (
              Object.entries(assetsByCategory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryAssets]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {categoryAssets.map((asset, index) => (
                        <li key={asset.id}>
                          <div className="text-sm">
                            <p className="font-medium">{asset.description || 'No Description'}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.assetIdCode ? `ID: ${asset.assetIdCode}` : ''}
                              {asset.assetIdCode && asset.serialNumber ? ' / ' : ''}
                              {asset.serialNumber ? `SN: ${asset.serialNumber}` : ''}
                            </p>
                          </div>
                          {index < categoryAssets.length - 1 && <Separator className="mt-3" />}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No asset details to show.</p>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
