'use client';

/**
 * @fileOverview SettingsWorkstation - SPA Operational Control Center.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  Palette, 
  Database, 
  Save, 
  Loader2, 
  Sun, 
  Moon, 
  RotateCcw, 
  Lock, 
  RefreshCw,
  Bomb,
  FileUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { ArchiveService } from '@/lib/archive-service';
import type { AppSettings } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function SettingsWorkstation() {
  const { appSettings, refreshRegistry, settingsLoaded } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const recoveryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (appSettings) setDraftSettings(JSON.parse(JSON.stringify(appSettings))); }, [appSettings]);

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Settings Synchronized" });
    } finally { setIsSaving(false); }
  };

  const handleImportRecovery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await ArchiveService.importSnapshot(file); toast({ title: "Recovery Pulse Complete" }); }
    catch (err) { toast({ variant: "destructive", title: "Recovery Failure" }); }
  };

  if (!settingsLoaded || !draftSettings) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3"><Settings className="text-primary h-8 w-8" /> Control Center</h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Configuration & Automation Hub</p>
        </div>
        <Button onClick={handleCommitChanges} disabled={isSaving} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Configuration
        </Button>
      </div>

      <Tabs defaultValue="environment" className="space-y-8">
        <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-auto flex flex-wrap gap-2 border-2 border-border/40 ml-2">
          <TabsTrigger value="environment" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Environment</TabsTrigger>
          <TabsTrigger value="security" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Governance</TabsTrigger>
          <TabsTrigger value="system" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">System</TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="space-y-10 px-2">
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-black uppercase tracking-tight">System Theme</Label>
              <p className="text-[10px] text-muted-foreground italic">Choose between high-contrast light mode or dark amoled auditor view.</p>
            </div>
            <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border-2">
              <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('light')} className="h-8 rounded-lg font-black uppercase text-[9px] gap-2"><Sun className="h-3 w-3" /> Light</Button>
              <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('dark')} className="h-8 rounded-lg font-black uppercase text-[9px] gap-2"><Moon className="h-3 w-3" /> Dark</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="px-2">
          <Card className="rounded-[2.5rem] border-2 border-border/40 bg-card/50 p-8 flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-black uppercase tracking-tight">Global Master Lock</Label>
              <p className="text-[10px] text-muted-foreground italic">Prevent accidental cloud record mutations for all field auditors.</p>
            </div>
            <Switch checked={draftSettings.lockAssetList} onCheckedChange={(v) => setDraftSettings({ ...draftSettings, lockAssetList: v })} />
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-10 px-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5 space-y-6">
              <div className="flex items-center gap-3"><FileUp className="h-5 w-5 text-primary" /><h4 className="text-sm font-black uppercase">Import Recovery Pulse</h4></div>
              <input type="file" ref={recoveryInputRef} onChange={handleImportRecovery} className="hidden" accept=".json" />
              <Button onClick={() => recoveryInputRef.current?.click()} className="w-full h-14 rounded-2xl font-black uppercase bg-primary text-white shadow-xl">Load Recovery Pulse</Button>
            </Card>
            <Card className="p-8 rounded-[2.5rem] border-2 border-dashed border-destructive/20 bg-destructive/5 space-y-4">
              <div className="flex items-center gap-3"><Trash2 className="h-5 w-5 text-destructive" /><h4 className="text-sm font-black uppercase">Danger Zone</h4></div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Purging local encrypted store is irreversible.</p>
              <Button variant="ghost" onClick={() => setIsResetDialogOpen(true)} className="w-full h-12 rounded-xl font-black uppercase text-destructive hover:bg-destructive/10 border-2">Reset Local Pulse</Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10">
          <AlertDialogHeader className="space-y-4">
            <Bomb className="h-12 w-12 text-destructive" />
            <AlertDialogTitle className="text-2xl font-black uppercase">Wipe Local Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic">This will permanently delete all cached registry records from this device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2">Abort Reset</AlertDialogCancel>
            <AlertDialogAction onClick={() => { storage.clearAssets(); window.location.href = '/'; }} className="h-12 px-10 rounded-2xl font-black uppercase bg-destructive text-white shadow-xl">Execute Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}