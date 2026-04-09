'use client';

/**
 * @fileOverview Root Shell - Unified Command Hub (SPA).
 * Phase 1305: Production hardening - adaptive headers and bottom-safe action bars.
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
  HelpCircle,
  ChevronLeft,
  Activity,
  History,
  LayoutDashboard,
  ShieldCheck,
  ClipboardCheck,
  User as UserIcon,
  ChevronDown,
  Command,
  Download,
  Upload,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardWorkstation } from '@/components/workstations/DashboardWorkstation';
import { SettingsWorkstation } from '@/components/workstations/SettingsWorkstation';
import { RegistryWorkstation } from '@/components/workstations/RegistryWorkstation';
import { AssetGroupsWorkstation } from '@/components/workstations/AssetGroupsWorkstation';
import { DiscrepancyWorkstation } from '@/components/workstations/DiscrepancyWorkstation';
import { ImportWorkstation } from '@/components/workstations/ImportWorkstation';
import { VerifyWorkstation } from '@/components/workstations/VerifyWorkstation';
import { AuditLogWorkstation } from '@/components/workstations/AuditLogWorkstation';
import { ReportsWorkstation } from '@/components/workstations/ReportsWorkstation';
import { AlertsWorkstation } from '@/components/workstations/AlertsWorkstation';
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
import { AssetFilterSheet } from '@/components/asset-filter-sheet';
import { storage } from '@/offline/storage';

function NotificationToast({ notification }: { notification: Notification }) {
  const Icon = notification.variant === 'destructive' ? AlertCircle : notification.variant === 'success' ? CheckCircle2 : Info;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className={cn(
        "absolute top-full right-0 mt-2 w-64 p-3 rounded-xl border shadow-3xl z-[100] flex items-center gap-3 backdrop-blur-3xl",
        notification.variant === 'destructive' ? "bg-destructive border-destructive text-destructive-foreground" :
        notification.variant === 'success' ? "bg-green-600 border-green-500 text-white" :
        "bg-card/90 border-border text-foreground"
      )}
    >
      <div className="p-1.5 bg-white/10 rounded-lg shrink-0"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none">{notification.title}</p>
        <p className="text-[8px] font-medium opacity-80 line-clamp-1 mt-1">{notification.description}</p>
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
    setIsCommandPaletteOpen
  } = useAppState();
  
  const isMobile = useIsMobile();
  const { unreadCount, notifications, lastAddedId } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const CurrentWorkstation = useMemo(() => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'REGISTRY': return <RegistryWorkstation />;
      case 'GROUPS': return <AssetGroupsWorkstation isEmbedded={false} />;
      case 'ANOMALIES': return <DiscrepancyWorkstation isEmbedded={false} />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'VERIFY': return appSettings?.appMode === 'verification' ? <VerifyWorkstation /> : <DashboardWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation isEmbedded={false} />;
      case 'REPORTS': return <ReportsWorkstation isEmbedded={false} />; 
      case 'ALERTS': return <AlertsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  }, [activeView, appSettings?.appMode]);

  useEffect(() => {
    if (profileSetupComplete && sessionStorage.getItem('assetain-fresh-login') === 'true') setIsWelcomeOpen(true);
  }, [profileSetupComplete]);

  useEffect(() => {
    if (lastAddedId) {
      const latest = notifications.find(n => n.id === lastAddedId);
      if (latest) {
        setActiveToast(latest);
        const timer = setTimeout(() => setActiveToast(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAddedId, notifications]);

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profileSetupComplete) return <UserProfileSetup />;

  return (
    <div className="app-container bg-background font-sans text-foreground h-screen flex flex-col overflow-hidden">
      <CommandPalette />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <WelcomeExperience isOpen={isWelcomeOpen} onComplete={() => { setIsWelcomeOpen(false); sessionStorage.removeItem('assetain-fresh-login'); if (appSettings) { const ns = { ...appSettings, onboardingComplete: true }; setAppSettings(ns); storage.saveSettings(ns); } }} />
      
      <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-8 bg-background/80 backdrop-blur-3xl z-[60] shrink-0">
        <div className="flex items-center gap-4 sm:gap-8">
          <AnimatePresence>
            {(activeView !== 'DASHBOARD' || selectedCategories.length > 0) && (
              <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onClick={goBack} className="h-9 w-9 flex items-center justify-center bg-muted/50 rounded-xl text-foreground/40 hover:text-primary transition-all border border-border tactile-pulse">
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-3 p-1.5 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all text-primary tactile-pulse">
            <Boxes className="h-5 w-5" />
            <div className="hidden xs:flex flex-col text-left">
              <h1 className="text-xs font-black uppercase text-foreground tracking-tight leading-none">Assetain</h1>
              <span className="text-[7px] font-black uppercase text-primary tracking-[0.25em] mt-1 opacity-60">{appSettings?.appMode || 'MANAGER'}</span>
            </div>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center mx-4 sm:mx-12">
          <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-4 px-5 py-2 bg-muted/30 border border-border rounded-xl text-foreground/40 hover:text-primary transition-all h-10 max-w-[400px] w-full">
            <Search className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1 truncate">{isMobile ? 'Search...' : 'Universal Registry Search...'}</span>
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-2 font-mono text-[9px] font-medium opacity-60 ml-2">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center bg-muted/30 p-1 rounded-xl border border-border shadow-inner">
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Download className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Sync Down</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary"><Upload className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Sync Up</TooltipContent></Tooltip></TooltipProvider>
          </div>

          <button onClick={() => setIsOnline(!isOnline)} className="flex items-center gap-2 group tactile-pulse px-2">
            <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]")} />
            <span className={cn("text-[8px] font-black uppercase tracking-widest hidden sm:block", isOnline ? "text-green-500" : "text-red-500")}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
          
          <div className="relative">
            <button onClick={() => setIsNotificationsOpen(true)} className="p-2.5 bg-muted rounded-xl text-foreground/40 hover:text-foreground transition-all relative">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-600 rounded-full border-2 border-background" />}
            </button>
            <AnimatePresence>{activeToast && <NotificationToast key={activeToast.id} notification={activeToast} />}</AnimatePresence>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full border-2 border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-[11px] hover:border-primary/40 transition-all shrink-0 shadow-lg">
                {userProfile?.displayName?.[0] || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl shadow-3xl p-1.5">
              <DropdownMenuLabel className="p-3">
                <p className="text-[11px] font-black uppercase">{userProfile?.displayName}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{userProfile?.role} &bull; {userProfile?.state}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-2.5 rounded-xl focus:bg-primary/10 focus:text-primary gap-3"><SettingsIcon className="h-4 w-4" /><span className="text-[10px] font-black uppercase">App Settings</span></DropdownMenuItem>
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
                <div className="flex-1 p-4 sm:p-8 max-w-[1800px] mx-auto w-full pb- safe">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeView} initial={{ opacity: 0, scale: 0.99, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.99, y: -10 }} transition={{ duration: 0.25 }} className="h-full w-full">
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
