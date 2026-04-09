'use client';

/**
 * @fileOverview Dashboard Workstation - Intelligence Hub.
 * Clean naming and operational overview.
 */

import React from 'react';
import { 
  LayoutDashboard,
  RefreshCw,
  DatabaseZap,
  Settings,
  FolderOpen,
  FileText,
  Activity,
  History,
  ShieldCheck,
  Zap,
  Monitor,
  ClipboardCheck,
  FileUp,
  LineChart,
  Trash2,
  AlertCircle,
  Download,
  Palette
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { ReportsWorkstation } from './ReportsWorkstation';
import { SyncQueueWorkstation } from './SyncQueueWorkstation';
import { AuditLogWorkstation } from './AuditLogWorkstation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TactileMenu } from '@/components/TactileMenu';

export function DashboardWorkstation() {
  const { 
    appSettings, 
    setActiveView, 
    manualDownload, 
    isSyncing, 
    isOnline,
    refreshRegistry
  } = useAppState();
  
  const { userProfile } = useAuth();
  
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isReportingMode = appSettings?.appMode === 'reporting';
  const isVerificationMode = appSettings?.appMode === 'verification';

  return (
    <div className="space-y-10 sm:space-y-12 animate-in fade-in duration-700 h-full flex flex-col">
      
      {/* MISSION CONTROL HEADER */}
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-50 bg-background/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner border border-primary/5">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black uppercase text-foreground tracking-tight leading-none">
                Intelligence Hub
              </h2>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em] leading-none">
                {appSettings?.appMode || 'STANDARD'} MODE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-muted/30 p-1 rounded-xl border border-border flex items-center shrink-0">
              <div className="flex items-center gap-1 w-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 lg:flex-none px-6 h-8 rounded-lg font-black uppercase text-[9px] tracking-widest bg-background text-foreground shadow-sm"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveView('REGISTRY')}
                  className="flex-1 lg:flex-none px-6 h-8 rounded-lg font-black uppercase text-[9px] tracking-widest text-muted-foreground hover:text-foreground transition-all"
                >
                  Registry
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <TactileMenu
                title="Synchronize"
                options={[
                  { label: 'Check Cloud Updates', icon: Download, onClick: manualDownload },
                  { label: 'Refresh Data', icon: RefreshCw, onClick: refreshRegistry }
                ]}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={manualDownload} 
                        disabled={isSyncing || !isOnline}
                        className="rounded-xl h-10 w-10 bg-muted border border-border text-muted-foreground hover:text-primary shrink-0 transition-colors"
                      >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[8px] font-black uppercase">Synchronize Database</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TactileMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32">
          
          {/* ANALYTICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Activity className="h-3 w-3 text-primary" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Registry Status</h3>
                </div>
                <AssetSummaryDashboard />
              </div>
            </div>
            
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-3 w-3 text-primary" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Shortcuts</h3>
              </div>
              <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border bg-muted/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <DatabaseZap className="h-4 w-4" /> Quick Actions
                  </h4>
                </div>
                <CardContent className="p-6 space-y-3">
                  <TactileMenu
                    title="System Settings"
                    options={[
                      { label: 'App Configuration', icon: Palette, onClick: () => setActiveView('SETTINGS') },
                      { label: 'User Directory', icon: Users, onClick: () => setActiveView('USERS') }
                    ]}
                  >
                    <Button onClick={() => setActiveView('SETTINGS')} variant="outline" className="w-full h-12 rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-4 hover:bg-muted transition-all justify-start px-5 group">
                      <Settings className="h-4 w-4 text-primary group-hover:rotate-90 transition-transform" /> App Settings
                    </Button>
                  </TactileMenu>

                  <TactileMenu
                    title="Registry Options"
                    options={[
                      { label: 'Import Excel', icon: FileUp, onClick: () => setActiveView('IMPORT') },
                      { label: 'Browse Folders', icon: FolderOpen, onClick: () => setActiveView('REGISTRY') }
                    ]}
                  >
                    <Button onClick={() => setActiveView('REGISTRY')} variant="outline" className="w-full h-12 rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-4 hover:bg-muted transition-all justify-start px-5">
                      <FolderOpen className="h-4 w-4 text-primary" /> Browse All Folders
                    </Button>
                  </TactileMenu>
                  
                  {isVerificationMode && (
                    <Button onClick={() => setActiveView('VERIFY')} variant="outline" className="w-full h-12 rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-4 hover:bg-muted transition-all justify-start px-5 text-green-600 border-green-500/20">
                      <ClipboardCheck className="h-4 w-4" /> Records to Review
                    </Button>
                  )}
                  
                  {isAdmin && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mt-4">
                      <div className="flex items-center gap-3 mb-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Admin Access</span>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                        Full administrative permissions are enabled.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* STATUS GRID */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-muted rounded-lg border border-border"><Monitor className="h-4 w-4 text-primary" /></div>
                <h3 className="text-base font-black uppercase text-foreground tracking-tight">Environment Status</h3>
              </div>
              <Badge variant="outline" className="border-border text-muted-foreground uppercase text-[8px] font-black tracking-widest">Connected</Badge>
            </div>

            <div className={cn(
              "grid grid-cols-1 gap-8 items-start",
              isReportingMode ? "xl:grid-cols-2" : "grid-cols-1"
            )}>
              {isReportingMode && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-1">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Reporting Suite</h3>
                  </div>
                  <div className="p-1 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 shadow-inner">
                    <ReportsWorkstation isEmbedded={true} />
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Data Fidelity</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <SyncQueueWorkstation isEmbedded={true} />
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="audit-log" className="border-none">
                      <Card className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-xl">
                        <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>div>div>svg]:rotate-180">
                          <div className="p-5 flex items-center justify-between w-full pr-6">
                            <div className="flex items-center gap-3">
                              <History className="h-4 w-4 text-primary" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Activity History</h4>
                            </div>
                            <Badge variant="outline" className="text-[7px] font-black border-white/10 uppercase px-2 py-0.5">VIEW HISTORY</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pt-0 border-t border-border">
                          <AuditLogWorkstation isEmbedded={true} />
                          <div className="p-4 bg-muted/5 flex justify-end">
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setActiveView('AUDIT_LOG')}
                              className="h-7 px-3 rounded-md font-black uppercase text-[8px] text-primary hover:bg-primary/10"
                            >
                              Open Activity Ledger
                            </Button>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-12 border-t border-border flex flex-col items-center gap-4 opacity-30">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Assetain Manager v5.0.4</span>
            </div>
            <p className="text-[8px] font-medium uppercase tracking-widest italic">Professional Registry System</p>
          </div>

        </div>
      </div>
    </div>
  );
}
