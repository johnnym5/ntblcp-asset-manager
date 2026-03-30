/**
 * @fileOverview SourceBrandingDrawer - The Decentralized Color Orchestrator.
 * Allows administrators to assign unique accents to registry data sources.
 */

import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, X, RefreshCw, Database, Check, ShieldCheck } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';

interface SourceBrandingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "hsl(45, 95%, 40%)", // Assetain Gold
  "hsl(210, 95%, 40%)", // Blue
  "hsl(142, 76%, 36%)", // Green
  "hsl(0, 84%, 60%)",   // Red
  "hsl(271, 91%, 65%)", // Purple
  "hsl(31, 97%, 55%)",  // Orange
  "hsl(180, 100%, 25%)", // Teal
  "hsl(330, 81%, 60%)", // Pink
];

export function SourceBrandingDrawer({ isOpen, onOpenChange }: SourceBrandingDrawerProps) {
  const { assets, appSettings, refreshRegistry, isOnline } = useAppState();
  const { toast } = useToast();
  
  const [localBranding, setLocalBranding] = useState<Record<string, string>>(appSettings?.sourceBranding || {});
  const [isSaving, setIsSaving] = useState(false);

  // Identify all unique source sheets in the current registry
  const sources = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.importMetadata?.sheetName || "Manual Registry"))).sort();
  }, [assets]);

  const updateColor = (source: string, color: string) => {
    setLocalBranding(prev => ({ ...prev, [source]: color }));
  };

  const handleSave = async () => {
    if (!appSettings) return;
    setIsSaving(true);
    
    const updatedSettings = { ...appSettings, sourceBranding: localBranding };
    
    try {
      await storage.saveSettings(updatedSettings);
      if (isOnline) {
        await FirestoreService.updateSettings(updatedSettings);
      }
      await refreshRegistry();
      toast({ title: "Branding Pulse Applied", description: "Source accents broadcasted to all workstation views." });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Branding Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Palette className="text-primary h-6 w-6" />
                </div>
                Branding Pulse
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Assign visual anchors to your decentralized data sources.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="p-8 space-y-10">
            {sources.length > 0 ? (
              sources.map(source => (
                <div key={source} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <Database className="h-3.5 w-3.5 text-primary opacity-40" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{source}</h4>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-mono border-muted">Active Pulse</Badge>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={`${source}-${color}`}
                        onClick={() => updateColor(source, color)}
                        className={cn(
                          "h-10 w-full rounded-xl border-4 transition-all hover:scale-110 shadow-sm flex items-center justify-center",
                          localBranding[source] === color ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {localBranding[source] === color && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-20 space-y-4 border-4 border-dashed rounded-[3rem]">
                <RefreshCw className="h-16 w-16 mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest">Awaiting Registry Import</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setLocalBranding({})}
            className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            Reset Branding
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            Commit Branding
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
