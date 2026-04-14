'use client';

/**
 * @fileOverview Application Shell - Home Hub.
 * Optimized for Production Deployment & Simplified Terminology.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { 
  Boxes, 
  Loader2, 
  LogOut, 
  Bell, 
  Settings as SettingsIcon,
  Search,
  ChevronLeft,
  Activity,
  History as HistoryIcon,
  LayoutDashboard,
  ShieldCheck,
  ClipboardCheck,
  User as UserIcon,
  Download,
  Upload,
  WifiOff,
  Trash2,
  RefreshCw,
  FolderOpen,
  FileText,
  ShieldAlert,
  SearchCode,
  Monitor,
  FileUp,
  Inbox,
  LayoutGrid,
  X,
  Terminal,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardWorkstation } from '@/components/workstations/DashboardWorkstation';
import { SettingsWorkstation } from '@/components/workstations/SettingsWorkstation';
import { RegistryWorkstation } from '@/components/workstations/RegistryWorkstation';
import { AssetGroupsWorkstation } from '@/components/workstations/AssetGroupsWorkstation';
import { DiscrepancyWorkstation } from '@/components/workstations/DiscrepancyWorkstation';
import { ImportWorkstation } from '@/components/workstations/ImportWorkstation';
import { AuditLogWorkstation } from '@/components/workstations/AuditLogWorkstation';
import { ReportsWorkstation } from '@/components/workstations/ReportsWorkstation';
import { AlertsWorkstation } from '@/components/workstations/AlertsWorkstation';
import { SyncQueueWorkstation } from '@/components/workstations/SyncQueueWorkstation';
import { UsersWorkstation } from '@/components/workstations/UsersWorkstation';
import { InfrastructureWorkstation } from '@/components/workstations/InfrastructureWorkstation';
import { DatabaseWorkstation } from '@/components/workstations/DatabaseWorkstation';
import { NotificationsCenter } from '@/components/NotificationsCenter';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications, clearAll } from '@/hooks/use-notifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { HelpCenter } from '@/components/HelpCenter';
import { storage } from '@/offline/storage';
import { TactileMenu } from '@/components/TactileMenu';
import { InboxSheet } from '@/components/inbox-sheet';
import { SyncStatusDialog } from '@/components/SyncStatusDialog';
import { SyncConfirmationDialog } from '@/components/sync-confirmation-dialog';

export default function HomeHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { 
    activeView, 
    setActiveView, 
    isOnline, 
    setIsOnline,
    manualDownload,
    manualUpload,
    isSyncing,
    appSettings,
    setAppSettings,
    goBack,
    selectedCategories,
    setIsCommandPaletteOpen,
    refreshRegistry,
    assets,
    syncSummary,
    executeSync,
    isSyncConfirmOpen,
    setIsSyncConfirmOpen
  } = useAppState();
  
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isSyncStatusOpen, setIsSyncStatusOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = userProfile?.isAdmin || userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const pendingApprovalsCount = assets.filter(a => a.approvalStatus === 'PENDING').length;

  const CurrentWorkstation = useMemo(() => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'REGISTRY': return <RegistryWorkstation />;
      case 'GROUPS': return <AssetGroupsWorkstation isEmbedded={false} />;
      case 'ANOMALIES': return <DiscrepancyWorkstation isEmbedded={false} />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation isEmbedded={false} />;
      case 'REPORTS': return <ReportsWorkstation isEmbedded={false} />; 
      case 'ALERTS': return <AlertsWorkstation />;
      case 'SYNC_QUEUE': return <SyncQueueWorkstation isEmbedded={false} />;
      case 'USERS': return <UsersWorkstation />; 
      case 'INFRASTRUCTURE': return <InfrastructureWorkstation />; 
      case 'DATABASE': return <DatabaseWorkstation />; 
      default: return <DashboardWorkstation />;
    }
  }, [activeView]);

  useEffect(() => {
    if (profileSetupComplete && sessionStorage.getItem('assetain-fresh-login') === 'true') setIsWelcomeOpen(true);
  }, [profileSetupComplete]);

  const jumpOptions = useMemo(() => {
    const base = [
      { label: 'Home Hub', icon: LayoutDashboard, onClick: () => setActiveView('DASHBOARD') },
      { label: 'Asset List', icon: FolderOpen, onClick: () => setActiveView('REGISTRY') },
      { label: 'Folder Browse', icon: LayoutGrid, onClick: () => setActiveView('GROUPS') },
      { label: 'Report Center', icon: FileText, onClick: () => setActiveView('REPORTS') },
      { label: 'Issue Alerts', icon: ShieldAlert, onClick: () => setActiveView('ALERTS') },
      { label: 'Problem Review', icon: SearchCode, onClick: () => setActiveView('ANOMALIES') },
      { label: 'Activity History', icon: HistoryIcon, onClick: () => setActiveView('AUDIT_LOG') },
      { label: 'Sync Queue', icon: Activity, onClick: () => setActiveView('SYNC_QUEUE') },
    ];

    if (isAdmin) {
      base.push(
        { label: 'Import Data', icon: FileUp, onClick: () => setActiveView('IMPORT') },
        { label: 'Personnel List', icon: UserIcon, onClick: () => setActiveView('USERS') },
        { label: 'System Settings', icon: SettingsIcon, onClick: () => setActiveView('SETTINGS') }
      );
    }

    if (userProfile?.role === 'SUPERADMIN') {
      base.push(
        { label: 'System Infrastructure', icon: Monitor, onClick: () => setActiveView('INFRASTRUCTURE') },
        { label: 'Database Center', icon: Terminal, onClick: () => setActiveView('DATABASE') }
      );
    }

    return base;
  }, [isAdmin, userProfile?.role, setActiveView]);

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profileSetupComplete) return <UserProfileSetup />;

  const modeClass = appSettings?.appMode === 'verification' ? 'mode-verification' : '';

  const handleDownloadPulse = () => {
    // PASS USER STATES FOR SCOPED FETCH
    manualDownload(userProfile?.states || []);
  };

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden bg-background selection:bg-primary/20", modeClass)}>
      <CommandPalette />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />
      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <SyncStatusDialog isOpen={isSyncStatusOpen} onOpenChange={setIsSyncStatusOpen} />
      <SyncConfirmationDialog 
        isOpen={isSyncConfirmOpen} 
        onOpenChange={setIsSyncConfirmOpen}
        summary={syncSummary}
        onConfirm={executeSync}
      />
      <WelcomeExperience isOpen={isWelcomeOpen} onComplete={() => { setIsWelcomeOpen(false); sessionStorage.removeItem('assetain-fresh-login'); if (appSettings) { const ns = { ...appSettings, onboardingComplete: true }; setAppSettings(ns); storage.saveSettings(ns); } }} />
      
      <header className="h-14 pt-safe border-b border-border flex items-center justify-between px-4 sm:px-8 bg-background/80 backdrop-blur-3xl z-[60] shrink-0">
        <div className="flex items-center gap-2 sm:gap-8">
          <AnimatePresence mode="wait">
            {(activeView !== 'DASHBOARD' || selectedCategories.length > 0) && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <button onClick={goBack} className="h-9 w-9 flex items-center justify-center bg-muted/50 rounded-xl text-foreground/40 hover:text-primary transition-all border border-border tactile-pulse shadow-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <TactileMenu 
            title="Switch Workspace"
            options={jumpOptions}
          >
            <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-3 p-1.5 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all text-primary tactile-pulse">
              <Boxes className="h-5 w-5" />
              {!isMobile && (
                <div className="flex flex-col text-left">
                  <h1 className="text-xs font-black uppercase text-foreground tracking-tight leading-none">Assetain</h1>
                  <span className="text-[7px] font-black uppercase text-primary tracking-[0.25em] mt-1 opacity-60">{appSettings?.appMode === 'verification' ? 'FIELD AUDIT' : 'HOME HUB'}</span>
                </div>
              )}
            </button>
          </TactileMenu>
        </div>

        <div className="flex-1 flex items-center justify-center mx-4">
          <AnimatePresence mode="wait">
            {isMobile && !isMobileSearchOpen ? (
              <motion.button 
                key="search-trigger"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setIsMobileSearchOpen(true)}
                className="h-10 w-10 flex items-center justify-center bg-muted/30 border border-border rounded-xl text-primary hover:bg-primary/10 transition-all"
              >
                <Search className="h-4 w-4" />
              </motion.button>
            ) : isMobile && isMobileSearchOpen ? (
              <motion.div 
                key="mobile-search"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 h-10 w-full"
              >
                <Search className="h-3.5 w-3.5 text-primary" />
                <input 
                  autoFocus
                  placeholder="Search assets..."
                  className="bg-transparent border-none outline-none text-xs flex-1 text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && setIsMobileSearchOpen(false)}
                />
                <button onClick={() => { setIsMobileSearchOpen(false); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </motion.div>
            ) : (
              <TactileMenu
                title="Search Hub"
                options={[
                  { label: 'Open Search', icon: Search, onClick: () => setIsCommandPaletteOpen(true) },
                  { label: 'Quick Filters', icon: Filter, onClick: () => setActiveView('REGISTRY') }
                ]}
              >
                <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-4 px-5 py-2 bg-muted/30 border border-border rounded-xl text-foreground/40 hover:text-primary transition-all h-10 max-w-[400px] w-full group">
                  <Search className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1 truncate">Find assets...</span>
                  <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-2 font-mono text-[9px] font-medium opacity-60 ml-2 group-hover:bg-primary/10 group-hover:text-primary">⌘K</kbd>
                </button>
              </TactileMenu>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-5">
          {isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsInboxOpen(true)} 
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 relative tactile-pulse"
                  >
                    <Inbox className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    {pendingApprovalsCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-black text-[8px] font-black shadow-lg animate-bounce">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Pending Approvals</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TactileMenu
            title="Sync Control"
            options={[
              { label: 'Sync Hub', icon: Activity, onClick: () => setIsSyncStatusOpen(true) },
              { label: 'Fetch Data', icon: Download, onClick: handleDownloadPulse, disabled: !isOnline },
              { label: 'Save Changes', icon: manualUpload, disabled: !isOnline },
              ...(isAdmin ? [{ label: 'Force Sync', icon: RefreshCw, onClick: refreshRegistry }] : [])
            ]}
          >
            <div 
              className={cn(
                "flex items-center bg-muted/30 p-1 rounded-xl border border-border shadow-inner cursor-pointer transition-all",
                isSyncing && "bg-primary/10 border-primary/30 px-3"
              )}
            >
              {isSyncing ? (
                <div className="flex items-center gap-2 py-1.5 min-w-[100px] justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing...</span>
                </div>
              ) : (
                <>
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleDownloadPulse} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Download className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Get Updates</TooltipContent></Tooltip></TooltipProvider>
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Upload className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Save Work</TooltipContent></Tooltip></TooltipProvider>
                </>
              )}
            </div>
          </TactileMenu>

          <TactileMenu
            title="Update History"
            options={[
              { label: 'All Alerts', icon: Bell, onClick: () => setIsNotificationsOpen(true) },
              { label: 'Full History', icon: HistoryIcon, onClick: () => setActiveView('AUDIT_LOG') },
              { label: 'Clear Alerts', icon: Trash2, onClick: clearAll, destructive: true }
            ]}
          >
            <button 
              onClick={() => setIsNotificationsOpen(true)} 
              className="p-2 sm:p-2.5 bg-muted rounded-xl text-foreground/40 hover:text-foreground relative"
            >
              <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-600 rounded-full border-2 border-background" />}
            </button>
          </TactileMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full border-2 border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-[11px] hover:border-primary/40 transition-all shrink-0 shadow-lg tactile-pulse">
                {userProfile?.displayName?.[0] || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl shadow-3xl p-1.5">
              <DropdownMenuLabel className="p-3">
                <p className="text-[11px] font-black uppercase">{userProfile?.displayName}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{userProfile?.role} &bull; {userProfile?.state}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-2.5 rounded-xl focus:bg-primary/10 focus:text-primary gap-3"><SettingsIcon className="h-4 w-4" /><span className="text-[10px] font-black uppercase">Settings</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="p-2.5 rounded-xl focus:bg-red-600 focus:text-white text-red-500 gap-3"><LogOut className="h-4 w-4" /><span className="text-[10px] font-black uppercase">Sign Out</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 relative flex flex-col p-2 sm:p-4 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col border border-border rounded-[2.5rem] bg-card/30 overflow-hidden relative shadow-inner">
          <ErrorBoundary module={activeView}>
            <ScrollArea ref={scrollAreaRef} className="flex-1 custom-scrollbar">
              <div className="min-h-full flex flex-col relative">
                <div className="flex-1 p-4 sm:p-8 max-w-[1800px] mx-auto w-full pb-safe">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeView} 
                      initial={{ opacity: 0, scale: 0.99, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.99, y: -10 }} 
                      transition={{ duration: 0.2, ease: "easeOut" }} 
                      className="h-full w-full"
                    >
                      {CurrentWorkstation}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </ScrollArea>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}