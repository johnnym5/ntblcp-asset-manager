'use client';

/**
 * @fileOverview Root Shell - Dashboard Command Hub.
 * Standardized terminology for professional asset management.
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
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronLeft,
  Activity,
  History as HistoryIcon,
  LayoutDashboard,
  ShieldCheck,
  ClipboardCheck,
  User as UserIcon,
  ChevronDown,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Trash2,
  FileJson,
  Zap,
  RefreshCw,
  FolderOpen,
  FileText,
  ShieldAlert,
  SearchCode,
  Monitor,
  FileUp,
  Inbox,
  LayoutGrid,
  ArrowRight,
  X
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
import { NotificationsCenter } from '@/components/NotificationsCenter';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { HelpCenter } from '@/components/HelpCenter';
import { storage } from '@/offline/storage';
import { TactileMenu } from '@/components/TactileMenu';
import { InboxSheet } from '@/components/inbox-sheet';
import { SyncStatusDialog } from '@/components/SyncStatusDialog';
import { SyncConfirmationDialog } from '@/components/sync-confirmation-dialog';
import { useLongPress } from '@/hooks/use-long-press';

function BellNotificationToast({ notification }: { notification: Notification }) {
  const Icon = notification.variant === 'destructive' ? AlertCircle : notification.variant === 'success' ? CheckCircle2 : Info;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        "absolute top-full mt-3 right-0 z-[100] w-[280px] p-3 rounded-2xl border shadow-3xl flex items-start gap-3 backdrop-blur-3xl bg-card/95 border-border origin-top-right",
        notification.variant === 'destructive' ? "border-destructive/30" : "border-border"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl shrink-0",
        notification.variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none text-foreground">{notification.title}</p>
        <p className="text-[9px] font-medium opacity-60 line-clamp-2 mt-1.5 italic leading-relaxed">{notification.description}</p>
      </div>
    </motion.div>
  );
}

export default function SPAHub() {
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
  const { unreadCount, notifications, lastAddedId } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isSyncStatusOpen, setIsSyncStatusOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN' || !!userProfile?.isZonalAdmin;
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
      default: return <DashboardWorkstation />;
    }
  }, [activeView]);

  useEffect(() => {
    if (profileSetupComplete && sessionStorage.getItem('assetain-fresh-login') === 'true') setIsWelcomeOpen(true);
  }, [profileSetupComplete]);

  useEffect(() => {
    if (lastAddedId) {
      const latest = notifications.find(n => n.id === lastAddedId);
      if (latest) {
        setActiveToast(latest);
        const timer = setTimeout(() => setActiveToast(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAddedId, notifications]);

  const syncLongPress = useLongPress(() => setIsSyncStatusOpen(true));
  const bellLongPress = useLongPress(() => setActiveView('AUDIT_LOG'));

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profileSetupComplete) return <UserProfileSetup />;

  const modeClass = appSettings?.appMode === 'verification' ? 'mode-verification' : appSettings?.appMode === 'reporting' ? 'mode-reporting' : '';

  return (
    <div className={cn("app-container bg-background font-sans text-foreground h-screen flex flex-col overflow-hidden", modeClass)}>
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
      
      <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-8 bg-background/80 backdrop-blur-3xl z-[60] shrink-0">
        <div className="flex items-center gap-2 sm:gap-8">
          <AnimatePresence>
            {(activeView !== 'DASHBOARD' || selectedCategories.length > 0) && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <TactileMenu 
                  title="System Navigation"
                  options={[
                    { label: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('DASHBOARD') },
                    { label: 'Registry', icon: FolderOpen, onClick: () => setActiveView('REGISTRY') },
                    { label: 'Folders', icon: LayoutGrid, onClick: () => { setActiveView('GROUPS'); } },
                    { label: 'Reporting', icon: FileText, onClick: () => setActiveView('REPORTS') },
                    { label: 'Alerts', icon: ShieldAlert, onClick: () => setActiveView('ALERTS') },
                    { label: 'History', icon: HistoryIcon, onClick: () => setActiveView('AUDIT_LOG') },
                    ...(isAdmin ? [
                      { label: 'Settings', icon: SettingsIcon, onClick: () => setActiveView('SETTINGS') }
                    ] : [])
                  ]}
                >
                  <button onClick={goBack} className="h-9 w-9 flex items-center justify-center bg-muted/50 rounded-xl text-foreground/40 hover:text-primary transition-all border border-border tactile-pulse shadow-sm">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </TactileMenu>
              </motion.div>
            )}
          </AnimatePresence>

          <TactileMenu 
            title="Registry Jumps"
            options={[
              { label: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('DASHBOARD') },
              { label: 'Registry', icon: Boxes, onClick: () => setActiveView('REGISTRY') },
              { label: 'History', icon: HistoryIcon, onClick: () => setActiveView('AUDIT_LOG') }
            ]}
          >
            <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-3 p-1.5 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all text-primary tactile-pulse">
              <Boxes className="h-5 w-5" />
              {!isMobile && (
                <div className="flex flex-col text-left">
                  <h1 className="text-xs font-black uppercase text-foreground tracking-tight leading-none">Assetain</h1>
                  <span className="text-[7px] font-black uppercase text-primary tracking-[0.25em] mt-1 opacity-60">{appSettings?.appMode === 'verification' ? 'ASSESSMENT' : 'MANAGEMENT'}</span>
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
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-xs flex-1 text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && setIsMobileSearchOpen(false)}
                />
                <button onClick={() => { setIsMobileSearchOpen(false); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </motion.div>
            ) : (
              <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-4 px-5 py-2 bg-muted/30 border border-border rounded-xl text-foreground/40 hover:text-primary transition-all h-10 max-w-[400px] w-full group">
                <Search className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1 truncate">Global Registry Search...</span>
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-2 font-mono text-[9px] font-medium opacity-60 ml-2 group-hover:bg-primary/10 group-hover:text-primary">⌘K</kbd>
              </button>
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
                <TooltipContent className="text-[8px] font-black uppercase">Review Requests</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div 
            {...syncLongPress}
            onContextMenu={(e) => { e.preventDefault(); setIsSyncStatusOpen(true); }}
            className="flex items-center bg-muted/30 p-1 rounded-xl border border-border shadow-inner cursor-pointer"
          >
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Download className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Update from Cloud</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Upload className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Save to Cloud</TooltipContent></Tooltip></TooltipProvider>
          </div>

          <div className="relative">
            <button 
              {...bellLongPress}
              onClick={() => setIsNotificationsOpen(true)} 
              onContextMenu={(e) => { e.preventDefault(); setActiveView('AUDIT_LOG'); }}
              className="p-2 sm:p-2.5 bg-muted rounded-xl text-foreground/40 hover:text-foreground transition-all relative"
            >
              <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-600 rounded-full border-2 border-background" />}
            </button>
          </div>

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
