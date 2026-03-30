'use client';

/**
 * @fileOverview SettingsWorkstation - Operational Control Center.
 * Phase 30: Broadened categories, Automation pulses, and UX Mode Orchestration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  FolderKanban, 
  UserCog, 
  Palette, 
  Database, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  Save, 
  Loader2, 
  Sun, 
  Moon, 
  ShieldCheck,
  Zap,
  RefreshCw,
  ScanSearch,
  PlaneTakeoff,
  Columns,
  Wrench,
  GraduationCap,
  Cpu,
  Lock,
  Cloud,
  History,
  FileUp,
  FileDown,
  Activity,
  User,
  Info,
  Smartphone
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/user-management';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import type { AppSettings, Grant, SheetDefinition, UXMode } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SettingsPage() {
  const { appSettings, refreshRegistry, settingsLoaded, isSyncing } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Schema Editor State
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  useEffect(() => {
    if (appSettings) {
      setDraftSettings(JSON.parse(JSON.stringify(appSettings)));
    }
  }, [appSettings]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(appSettings) !== JSON.stringify(draftSettings);
  }, [appSettings, draftSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!draftSettings) return;
    setDraftSettings({ ...draftSettings, [key]: value });
  };

  const handleCommitChanges = async () => {
    if (!draftSettings) return;
    setIsSaving(true);
    try {
      await FirestoreService.updateSettings(draftSettings);
      await storage.saveSettings(draftSettings);
      await refreshRegistry();
      toast({ title: "Environment Synchronized", description: "Global configuration pulse broadcasted successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failure", description: "Could not establish cloud parity for settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const resetOnboarding = () => {
    handleSettingChange('onboardingComplete', false);
    toast({ title: "Tour Pulse Reset", description: "The welcome guide will appear on your next dashboard visit." });
  };

  if (authLoading || !settingsLoaded || !draftSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const SectionHeading = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-primary/10 rounded-2xl">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-black uppercase tracking-tight leading-none">{title}</h3>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1 opacity-60">{description}</p>
      </div>
    </div>
  );

  const SettingRow = ({ label, description, children, icon: Icon }: { label: string, description: string, children: React.ReactNode, icon?: any }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border-2 border-border/40 bg-card/50 hover:border-primary/20 transition-all gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary opacity-60" />}
          <Label className="text-sm font-black uppercase tracking-tight">{label}</Label>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed max-w-sm italic">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Pulse */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <Settings className="text-primary h-8 w-8" /> Control Center
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Broadband Configuration & Automation Hub
            </p>
          </div>
          <Button 
            onClick={handleCommitChanges} 
            disabled={!hasChanges || isSaving}
            className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Commit Configuration
          </Button>
        </div>

        <Tabs defaultValue="environment" className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-auto flex flex-wrap gap-2 border-2 border-border/40 w-fit">
            <TabsTrigger value="environment" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <GraduationCap className="h-3.5 w-3.5" /> Environment
            </TabsTrigger>
            <TabsTrigger value="registry" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Columns className="h-3.5 w-3.5" /> Registry
            </TabsTrigger>
            <TabsTrigger value="workflows" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Cpu className="h-3.5 w-3.5" /> Workflows
            </TabsTrigger>
            <TabsTrigger value="security" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <Lock className="h-3.5 w-3.5" /> Governance
            </TabsTrigger>
            <TabsTrigger value="system" className="px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" /> System
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Environment Pulse */}
          <TabsContent value="environment" className="space-y-10 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-10">
                <div>
                  <SectionHeading title="User Experience" description="Interface logic & accessibility rules" icon={GraduationCap} />
                  <div className="space-y-4">
                    <SettingRow label="Operational Mode" description="Switch between beginner-friendly guidance and high-speed expert pulses." icon={Smartphone}>
                      <Select value={draftSettings.uxMode} onValueChange={(v) => handleSettingChange('uxMode', v as UXMode)}>
                        <SelectTrigger className="w-36 h-11 rounded-xl font-black uppercase text-[10px] tracking-tighter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="beginner" className="text-[10px] font-black uppercase">Beginner Mode</SelectItem>
                          <SelectItem value="advanced" className="text-[10px] font-black uppercase">Advanced Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    
                    <SettingRow label="Help Tooltips" description="Show descriptive pulses when hovering over buttons and technical labels." icon={Info}>
                      <Switch checked={draftSettings.showHelpTooltips} onCheckedChange={(v) => handleSettingChange('showHelpTooltips', v)} />
                    </SettingRow>

                    <SettingRow label="Welcome Guide" description="Replay the onboarding walkthrough to refresh system knowledge." icon={History}>
                      <Button variant="outline" size="sm" onClick={resetOnboarding} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest border-2">Reset Tour</Button>
                    </SettingRow>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <SectionHeading title="Visual Identity" description="Theming & surface language" icon={Palette} />
                  <div className="space-y-4">
                    <SettingRow label="System Theme" description="Choose between high-contrast light mode or dark AMOLED auditor view." icon={Sun}>
                      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border-2">
                        <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('light')} className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2">
                          <Sun className="h-3 w-3" /> Light
                        </Button>
                        <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('dark')} className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2">
                          <Moon className="h-3 w-3" /> Dark
                        </Button>
                      </div>
                    </SettingRow>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Registry Pulse */}
          <TabsContent value="registry" className="space-y-10 outline-none">
            <SectionHeading title="Registry Display" description="Table layout & field visibility setup" icon={Columns} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {draftSettings.grants.map((grant) => (
                  <Card key={grant.id} className={cn(
                    "border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden",
                    draftSettings.activeGrantId === grant.id ? "border-primary bg-primary/5 shadow-2xl" : "border-border/40 bg-card/50"
                  )}>
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-xl", draftSettings.activeGrantId === grant.id ? "bg-primary text-white" : "bg-muted")}>
                            <FolderKanban className="h-5 w-5" />
                          </div>
                          <div>
                            <Input 
                              value={grant.name} 
                              onChange={(e) => handleSettingChange('grants', draftSettings.grants.map(g => g.id === grant.id ? { ...g, name: e.target.value } : g))}
                              className="border-none bg-transparent font-black text-xl uppercase tracking-tighter p-0 h-auto focus-visible:ring-0"
                            />
                            <p className="text-[9px] font-mono text-muted-foreground uppercase mt-1">ID: {grant.id}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary">
                          {Object.keys(grant.sheetDefinitions || {}).length} Categories
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.keys(grant.sheetDefinitions || {}).map(sheetName => (
                          <div key={sheetName} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/40 group hover:border-primary/20 transition-all">
                            <span className="text-[10px] font-black uppercase truncate">{sheetName}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}
                              className="h-8 w-8 rounded-lg text-primary opacity-40 group-hover:opacity-100 hover:bg-primary/10"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <aside className="space-y-6">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/5 shadow-none overflow-hidden">
                  <CardHeader className="bg-primary/5 p-6 border-b border-dashed">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Layout Protocol</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                    Registry arrangement allows you to redefine table headers and field mappings per category. Changes are broadcast during the next config pulse and will update all auditor viewports.
                  </CardContent>
                </Card>
              </aside>
            </div>
          </TabsContent>

          {/* Tab 3: Workflows Pulse */}
          <TabsContent value="workflows" className="space-y-10 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-10">
                <div>
                  <SectionHeading title="Automation Center" description="Deterministic intelligence rules" icon={Cpu} />
                  <div className="space-y-4">
                    <SettingRow label="Auto-Sync Pulse" description="Automatically broadcast modifications to the cloud registry as soon as a stable connection is detected." icon={Cloud}>
                      <Switch checked={true} disabled /> {/* Hardcoded for current architecture pulse */}
                    </SettingRow>
                    
                    <SettingRow label="Predictive OCR" description="Automatically initialize the AI analysis pulse immediately after a photo is captured." icon={Zap}>
                      <Switch checked={false} disabled /> {/* Placeholder for future intelligence automation */}
                    </SettingRow>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <SectionHeading title="Data Exchange" description="Import & Export governance" icon={FileUp} />
                  <div className="space-y-4">
                    <SettingRow label="Sandbox Mandatory" description="Force all new imports into the Sandbox Store for reconciliation before merging." icon={ShieldCheck}>
                      <Switch checked={true} disabled />
                    </SettingRow>
                    
                    <SettingRow label="Legacy Structure" description="Include original row data and unmapped columns in exports for 100% fidelity." icon={FileDown}>
                      <Switch checked={true} disabled />
                    </SettingRow>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Security Pulse */}
          <TabsContent value="security" className="space-y-10 outline-none">
            <SectionHeading title="Identity Governance" description="System auditors & regional scopes" icon={Lock} />
            <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
              <CardContent className="p-8">
                <UserManagement 
                  users={draftSettings.authorizedUsers}
                  onUsersChange={(newUsers) => handleSettingChange('authorizedUsers', newUsers)}
                  adminProfile={userProfile}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: System Pulse */}
          <TabsContent value="system" className="space-y-10 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <SectionHeading title="Infrastructure Health" description="Triple-layer parity monitoring" icon={RefreshCw} />
                <div className="space-y-4">
                  <SettingRow label="Manual Reconciliation" description="Force a full state-refresh across Local, Shadow, and Cloud layers." icon={Activity}>
                    <Button variant="outline" size="sm" onClick={refreshRegistry} disabled={isSyncing} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest border-2">
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                      Sync Now
                    </Button>
                  </SettingRow>
                  
                  <SettingRow label="Registry Snapshot" description="Export the entire active register as a deterministic JSON archive." icon={PlaneTakeoff}>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest border-2">Backup Pulse</Button>
                  </SettingRow>
                </div>
              </div>

              <div>
                <SectionHeading title="Danger Zone" description="Immutable state operations" icon={Trash2} />
                <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-orange-600" />
                    <h4 className="text-sm font-black uppercase tracking-tight text-orange-700">Wipe Registry Cache</h4>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                    Purging the local encrypted store is irreversible. This should only be performed during critical state corruption.
                  </p>
                  <Button variant="ghost" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 transition-all">
                    Reset Local Pulse
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={selectedSheetDef.name}
          onSave={(orig, newDef, all) => {
            const updatedGrants = draftSettings.grants.map(grant => {
              if (grant.id === activeGrantForSchema) {
                const newSheetDefs = { ...grant.sheetDefinitions };
                if (all) {
                  Object.keys(newSheetDefs).forEach(k => { newSheetDefs[k] = { ...newDef, name: k }; });
                } else {
                  newSheetDefs[newDef.name] = newDef;
                  if (orig && orig !== newDef.name) delete newSheetDefs[orig];
                }
                return { ...grant, sheetDefinitions: newSheetDefs };
              }
              return grant;
            });
            handleSettingChange('grants', updatedGrants);
          }}
        />
      )}
    </AppLayout>
  );
}
