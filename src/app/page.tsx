
'use client';

/**
 * @fileOverview Root Shell - Unified Command Hub (SPA).
 * Phase 306: Implemented Bell-Anchored Notification Toast Pulse.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Info
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
import { NotificationsCenter } from '@/components/NotificationsSheet';
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
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={cn(
        "absolute top-full right-0 mt-4 w-72 p-4 rounded-2xl border-2 shadow-3xl z-[100] flex items-center gap-4 backdrop-blur-xl",
        notification.variant === 'destructive' ? "bg-red-600 border-red-500 text-white" :
        notification.variant === 'success' ? "bg-green-600 border-green-500 text-white" :
        "bg-[#0A0A0A] border-white/10 text-white"
      )}
    >
      <div className="shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-tight truncate leading-none">{notification.title}</p>
        <p className="text-[9px] font-medium opacity-80 line-clamp-1 mt-1">{notification.description}</p>
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
    setMissingFieldFilter
  } = useAppState();
  
  const isMobile = useIsMobile();
  const { unreadCount, notifications, lastAddedId } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profileSetupComplete) {
      const isFreshLogin = sessionStorage.getItem('assetain-fresh-login') === 'true';
      if (isFreshLogin) {
        setIsWelcomeOpen(true);
      }
    }
  }, [profileSetupComplete]);

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

  const handleOnboardingComplete = async () => {
    setIsWelcomeOpen(false);
    sessionStorage.removeItem('assetain-fresh-login');
    if (appSettings) {
      const nextSettings = { ...appSettings, onboardingComplete: true };
      setAppSettings(nextSettings);
      await storage.saveSettings(nextSettings);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-black"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!profileSetupComplete) return <UserProfileSetup />;

  const renderWorkstation = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'REGISTRY': return <RegistryWorkstation />;
      case 'GROUPS': return <AssetGroupsWorkstation isEmbedded={false} />;
      case 'ANOMALIES': return <DiscrepancyWorkstation isEmbedded={false} />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'VERIFY': return <VerifyWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation isEmbedded={false} />;
      case 'REPORTS': return <ReportsWorkstation isEmbedded={false} />;
      case 'ALERTS': return <AlertsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  const showTooltips = appSettings?.showHelpTooltips !== false;
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  return (
    <div className="app-container bg-black font-sans text-white h-screen flex flex-col overflow-hidden">
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
      
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-black/80 backdrop-blur-3xl z-[60] shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <TooltipProvider disableHoverableContent={!showTooltips}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-2.5 p-1.5 sm:p-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all text-primary group tactile-pulse">
                  <Boxes className="h-5 w-5" />
                  <div className="flex flex-col text-left">
                    <h1 className="text-xs sm:text-sm font-black uppercase text-white tracking-tight leading-none">Assetain</h1>
                    <span className="text-[6px] sm:text-[7px] font-black uppercase text-primary tracking-[0.2em] mt-0.5 opacity-60">Control Hub</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] font-black uppercase">Return to Overview Dashboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex-1 flex items-center justify-center mx-2 sm:mx-12">
          <AnimatePresence mode="wait">
            {!isSearchExpanded ? (
              <motion.button
                key="search-trigger"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setIsSearchExpanded(true)}
                className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-white/40 hover:text-primary hover:border-primary/20 transition-all group"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Registry Search</span>
                {!isMobile && (
                  <div className="flex items-center gap-1 ml-4 px-1 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-black opacity-40">
                    <span>⌘</span>
                    <span>K</span>
                  </div>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", maxWidth: "500px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative flex items-center group"
              >
                <Search className="absolute left-4 h-3.5 w-3.5 text-primary" />
                <input 
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  placeholder={isMobile ? "Search..." : "Quick Search Records..."}
                  className="w-full h-10 bg-white/[0.05] border-2 border-primary/20 rounded-xl pl-10 pr-12 sm:pr-24 text-xs font-bold focus:outline-none focus:border-primary transition-all placeholder:text-white/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                  onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {!isMobile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsFilterOpen(true)}
                      className={cn("h-7 w-7 rounded-lg text-white/20 hover:text-primary relative", isFilterOpen && "text-primary")}
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="p-1 rounded-lg text-white/20 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
            <TooltipProvider disableHoverableContent={!showTooltips}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[9px] font-black uppercase">Fetch latest from Cloud</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider disableHoverableContent={!showTooltips}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary">
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[9px] font-black uppercase">Push changes to Cloud</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider disableHoverableContent={!showTooltips}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setIsOnline(!isOnline)} className="flex items-center gap-1.5 sm:gap-2 group tactile-pulse px-1 sm:px-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                  <span className={cn("text-[7px] sm:text-[8px] font-black uppercase tracking-widest", isOnline ? "text-green-500" : "text-red-500")}>{isOnline ? (isMobile ? 'ON' : 'Online') : (isMobile ? 'OFF' : 'Offline')}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[9px] font-black uppercase">{isOnline ? 'System is connected' : 'Working in local scope'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <button onClick={() => setIsHelpOpen(true)} className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-primary transition-all">
            <HelpCircle className="h-4 w-4" />
          </button>

          <div className="relative">
            <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-600 rounded-full flex items-center justify-center border-2 border-black"><span className="text-[7px] font-black text-white">!</span></div>}
            </button>
            <AnimatePresence>
              {activeToast && <NotificationToast key={activeToast.id} notification={activeToast} />}
            </AnimatePresence>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-xs hover:border-primary/40 transition-all overflow-hidden shrink-0">
                {userProfile?.displayName?.[0] || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black border-white/10 text-white rounded-xl shadow-3xl p-1">
              <DropdownMenuLabel className="p-3">
                <p className="text-xs font-black uppercase">{userProfile?.displayName}</p>
                <p className="text-[9px] font-bold text-white/40 uppercase mt-0.5">{userProfile?.role} &bull; {userProfile?.state}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-2.5 rounded-lg focus:bg-primary focus:text-black m-1">
                <SettingsIcon className="mr-2 h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={logout} className="p-2.5 rounded-lg focus:bg-red-600 focus:text-white m-1 text-red-500">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 relative flex flex-col p-4 sm:p-6 overflow-hidden bg-black">
        <div className="flex-1 flex flex-col border border-white/10 rounded-[2.5rem] bg-[#050505]/50 overflow-hidden relative shadow-inner">
          <ErrorBoundary module={activeView}>
            <ScrollArea className="flex-1 custom-scrollbar">
              <div className="min-h-full flex flex-col relative">
                <div className="flex-1 p-4 sm:p-8 lg:p-10 max-w-[1600px] mx-auto w-full">
                  {renderWorkstation()}
                </div>
              </div>
            </ScrollArea>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
