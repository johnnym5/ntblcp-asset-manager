'use client';

/**
 * @fileOverview Import Preview Modal.
 * Phase 2: Removed redundant manual close button.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseZap, ShieldCheck, X, Loader2 } from 'lucide-react';
import type { Asset } from '@/types/domain';

interface ImportPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export function ImportPreviewDialog({
  isOpen,
  onOpenChange,
  assets,
  onConfirm,
  isProcessing
}: ImportPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-primary/10 shadow-2xl">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
              <DatabaseZap className="text-primary h-8 w-8" /> Sandbox Reconciliation
            </DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-2">
              Reviewing {assets.length} hierarchical records before registry commitment.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-8 bg-background">
          <ReconciliationView 
            assets={assets} 
            summary={{
              workbookName: 'Import Preview',
              sheetName: 'Sheet',
              profileId: 'preview',
              totalRows: assets.length,
              groupCount: 0,
              dataRowsImported: assets.length,
              rowsRejected: 0,
              duplicatesDetected: 0,
              templatesDiscovered: 0,
              sectionBreakdown: {},
              groups: []
            }}
          />
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-row items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold rounded-xl px-8">
            Discard Batch
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isProcessing}
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Merge sandbox to registry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
