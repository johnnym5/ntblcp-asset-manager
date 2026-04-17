'use client';

/**
 * @fileOverview QRScannerDialog - Physical Identity Pulse Workstation.
 * Phase 2: Removed redundant manual close button.
 * Phase 3: Added missing dependencies to useEffect to comply with exhaustive-deps.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X, Loader2, Search, ArrowRight } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useToast } from '@/hooks/use-toast';

interface QRScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (assetId: string) => void;
}

export function QRScannerDialog({ isOpen, onOpenChange, onScanSuccess }: QRScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
          scannerRef.current = scanner;
          scanner.render((decodedText) => {
            onScanSuccess(decodedText);
            scanner.clear();
            onOpenChange(false);
          }, () => {});
          setIsInitializing(false);
        } catch (e) {
          toast({ variant: "destructive", title: "Scanner Failure" });
          onOpenChange(false);
        }
      }, 500);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [isOpen, onOpenChange, onScanSuccess, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-primary/10 shadow-2xl bg-background">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <QrCode className="text-primary h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Identity Scanner</DialogTitle>
            </div>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-2">
              Target a physical asset label to open its digital record pulse.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 bg-background flex flex-col items-center justify-center min-h-[350px] relative">
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Waking Camera...</span>
            </div>
          )}
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-primary/10" />
          <div className="mt-8 p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 w-full flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm"><Search className="h-4 w-4 text-primary" /></div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase text-primary">Scanning Protocol</p>
              <p className="text-[9px] font-medium text-muted-foreground italic">Align the QR pulse inside the central frame.</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/20 border-t flex items-center justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] tracking-widest rounded-xl px-10">
            Cancel Pulse
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
