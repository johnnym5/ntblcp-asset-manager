'use client';

/**
 * @fileOverview Root Shell - Unified Command Hub (SPA).
 * Phase 1301: Implemented Light/Dark theme background adaptation.
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
  X,
  Download,
  Upload,
  Filter,
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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, sanitizeSearch } from '@/lib/utils';
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
import { FirestoreService } from '@/services/firebase/firestore';

function NotificationToast({ notification }: { notification: Notification }) {
  const Icon = notification.variant === 'destructive' ? AlertCircle : notification.variant === 'success' ? CheckCircle2 : Info;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className={cn(
        "absolute top-full right-0 mt-2 w-56 p-2 rounded-lg border shadow-2xl z-[100] flex items-center gap-2 backdrop-blur-xl",
        notification.variant === 'destructive' ? "bg-destructive border-destructive text-destructive-foreground" :
        notification.variant === 'success' ? "bg-green-600 border-green-500 text-white" :
        "bg-card border-border text-foreground"
      )}
    >
      <div className="shrink-0">
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-tight truncate leading-none">{notification.title}</p>
        <p className="text-[7px] font-medium opacity-80 line-clamp-1 mt-0.5">{notification.description}</p>
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
    searchTerm,
    setSearchTerm,
    isFilterOpen,
    setIsFilterOpen,
    manualDownload,
    manualUpload,
    isSyncing,
    appSettings,
    setAppSettings,
    locationOptions,
    selectedLocations,
    setSelectedLocations,
    assigneeOptions,
    selectedAssignees,
    setSelectedAssignees,
    conditionOptions,
    selectedConditions,
    setSelectedConditions,
    statusOptions,
    selectedStatuses,
    setSelectedStatuses,
    missingFieldFilter,
    setMissingFieldFilter,
    goBack,
    selectedCategories,
    activeFilterCount
  } = useAppState();
  
  const isMobile = useIsMobile();
  const { unreadCount, notifications, lastAddedId } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const CurrentWorkstation = useMemo(() => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'REGISTRY': return <RegistryWorkstation />;
      case 'GROUPS': return <AssetGroupsWorkstation isEmbedded={false} />;
      case 'ANOMALIES': return <DiscrepancyWorkstation isEmbedded={false} />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'VERIFY': return <VerifyWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation isEmbedded={false} />;
      case 'REPORTS': return <ReportsWorkstation isEmbedded={true} />; 
      case 'ALERTS': return <AlertsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  }, [activeView]);

  useEffect(() => {
    if (profileSetupComplete) {
      const isFreshLogin = sessionStorage.getItem('assetain-fresh-login') === 'true';
      if (isFreshLogin) setIsWelcomeOpen(true);
    }
  }, [profileSetupComplete]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) scrollViewport.scrollTop = 0;
    }
  }, [activeView]);

  useEffect(() => {
    if (lastAddedId) {
      const latest = notifications.find(n => n.id === lastAddedId);
      if (latest) {
        setActiveToast(latest);
        const timer = setTimeout(() => setActiveToast(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAddedId, notifications]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') setIsSearchExpanded(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleOnboardingComplete = async () => {
    setIsWelcomeOpen(false);
    sessionStorage.removeItem('assetain-fresh-login');
    if (appSettings) {
      const nextSettings = { ...appSettings, onboardingComplete: true };
      setAppSettings(nextSettings);
      await storage.saveSettings(nextSettings);
    }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!profileSetupComplete) return <UserProfileSetup />;

  const showTooltips = appSettings?.showHelpTooltips !== false;
  const isAdmin = userProfile?.isAdmin || false;

  return (
    <div className="app-container bg-background font-sans text-foreground h-screen flex flex-col overflow-hidden">
      <CommandPalette />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <WelcomeExperience isOpen={isWelcomeOpen} onComplete={handleOnboardingComplete} />
      
      <AssetFilterSheet 
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        isAdmin={isAdmin}
        locationOptions={locationOptions}
        selectedLocations={selectedLocations}
        setSelectedLocations={setSelectedLocations}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        conditionOptions={conditionOptions}
        selectedConditions={selectedConditions}
        setSelectedConditions={setSelectedConditions}
        statusOptions={statusOptions}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        missingFieldFilter={missingFieldFilter}
        setMissingFieldFilter={setMissingFieldFilter}
      />
      
      <header className="h-11 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-background/80 backdrop-blur-3xl z-[60] shrink-0">
        <div className="flex items-center gap-2 sm:gap-6">
          <AnimatePresence>
            {(activeView !== 'DASHBOARD' || selectedCategories.length > 0) && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={goBack}
                className="h-8 w-8 flex items-center justify-center bg-muted/50 rounded-lg text-foreground/40 hover:text-primary transition-all border border-border tactile-pulse"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <TooltipProvider disableHoverableContent={!showTooltips}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-2 p-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition-all text-primary group tactile-pulse">
                  <Boxes className="h-3.5 w-3.5" />
                  <div className="flex flex-col text-left">
                    <h1 className="text-[10px] font-black uppercase text-foreground tracking-tight leading-none">Assetain</h1>
                    <span className="text-[6px] font-black uppercase text-primary tracking-[0.2em] mt-0.5 opacity-60">Manager</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[8px] font-black uppercase">Home</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="hidden lg:flex items-center gap-2.5 pl-4 border-l border-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Welcome,</span>
            <span className="text-[10px] font-black uppercase text-foreground tracking-tight">
              {userProfile?.displayName}
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center mx-2 sm:mx-8">
          <AnimatePresence mode="wait">
            {!isSearchExpanded ? (
              <motion.button
                key="search-trigger"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => setIsSearchExpanded(true)}
                className="flex items-center gap-3 px-3 py-1 bg-muted/30 border border-border rounded-lg text-foreground/40 hover:text-primary hover:border-primary/20 transition-all group"
              >
                <Search className="h-3 w-3" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Search Registry</span>
              </motion.button>
            ) : (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", maxWidth: "350px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative flex items-center group"
              >
                <Search className="absolute left-3 h-3 w-3 text-primary" />
                <input 
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Quick Search..."
                  className="w-full h-7 bg-muted/50 border-2 border-primary/20 rounded-lg pl-8 pr-16 text-[9px] font-bold focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                  onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                />
                <div className="absolute right-1 flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                      "h-5 w-5 rounded-md text-foreground/20 hover:text-primary relative", 
                      activeFilterCount > 0 && "text-primary"
                    )}
                  >
                    <Filter className="h-2.5 w-2.5" />
                    {activeFilterCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />}
                  </Button>
                  <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="p-1 rounded-md text-foreground/20 hover:text-foreground">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center bg-muted/30 p-0.5 rounded-lg border border-border">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-6 w-6 rounded-md hover:bg-primary/10 text-foreground/40 hover:text-primary">
                    <Download className="h-2.5 w-2.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-6 w-6 rounded-md hover:bg-primary/10 text-foreground/40 hover:text-primary">
                    <Upload className="h-2.5 w-2.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Upload</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <button onClick={() => setIsOnline(!isOnline)} className="flex items-center gap-1.5 group tactile-pulse px-1 sm:px-2">
            <div className={cn("h-1 w-1 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
            <span className={cn("text-[7px] font-black uppercase tracking-widest", isOnline ? "text-green-500" : "text-red-500")}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
          
          <button onClick={() => setIsHelpOpen(true)} className="p-1.5 bg-muted rounded-md text-foreground/40 hover:text-primary transition-all">
            <HelpCircle className="h-3 w-3" />
          </button>

          <div className="relative">
            <button onClick={() => setIsNotificationsOpen(true)} className="relative p-1.5 bg-muted rounded-md text-foreground/40 hover:text-foreground transition-all">
              <Bell className="h-3 w-3" />
              {unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-600 rounded-full border border-background" />}
            </button>
            <AnimatePresence>
              {activeToast && <NotificationToast key={activeToast.id} notification={activeToast} />}
            </AnimatePresence>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 sm:h-7 sm:w-7 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-[9px] hover:border-primary/40 transition-all shrink-0">
                {userProfile?.displayName?.[0] || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-card border-border text-card-foreground rounded-lg shadow-3xl p-1">
              <DropdownMenuLabel className="p-2">
                <p className="text-[9px] font-black uppercase">{userProfile?.displayName}</p>
                <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">{userProfile?.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-1.5 rounded-md focus:bg-primary/10 focus:text-primary m-0.5">
                <SettingsIcon className="mr-2 h-2.5 w-2.5" />
                <span className="text-[8px] font-black uppercase">App Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="p-1.5 rounded-md focus:bg-red-600 focus:text-white m-0.5 text-red-500">
                <LogOut className="mr-2 h-2.5 w-2.5" />
                <span className="text-[8px] font-black uppercase">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 relative flex flex-col p-2 sm:p-2 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col border border-border rounded-xl bg-card/30 overflow-hidden relative">
          <ErrorBoundary module={activeView}>
            <ScrollArea ref={scrollAreaRef} className="flex-1 custom-scrollbar">
              <div className="min-h-full flex flex-col relative">
                <div className="flex-1 p-2 sm:p-4 lg:p-4 max-w-[1600px] mx-auto w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeView}
                      initial={{ opacity: 0, scale: 0.99, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.99, y: -4 }}
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
