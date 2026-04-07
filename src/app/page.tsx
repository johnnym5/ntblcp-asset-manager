'use client';

/**
 * @fileOverview Root Shell - Unified Command Hub (SPA).
 * Consolidated for production: eliminates sub-pages to reduce build size and memory footprint.
 * Phase 1200: Integrated GIS and Alerts into the primary workstation switch.
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
  Wifi,
  WifiOff,
  Search,
  X,
  Download,
  Upload,
  RefreshCw,
  LayoutDashboard,
  Filter,
  Navigation,
  ShieldAlert
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
import { GISWorkstation } from '@/components/workstations/GISWorkstation';
import { AlertsWorkstation } from '@/components/workstations/AlertsWorkstation';
import { NotificationsCenter } from '@/components/NotificationsSheet';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications } from '@/hooks/use-notifications';
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
import type { WorkstationView } from '@/types/domain';

export default function SPAHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { 
    activeView, 
    setActiveView, 
    isOnline, 
    setIsOnline,
    searchTerm,
    setSearchTerm,
    setIsFilterOpen,
    manualDownload,
    manualUpload,
    isSyncing,
    filters
  } = useAppState();
  
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      case 'GIS': return <GISWorkstation />;
      case 'ALERTS': return <AlertsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  return (
    <div className="app-container bg-black font-sans text-white">
      <CommandPalette />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/80 backdrop-blur-3xl z-50 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-3 p-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all text-primary group tactile-pulse">
              <Boxes className="h-5 w-5" />
              <div className="flex flex-col text-left">
                <h1 className="text-sm font-black uppercase text-white tracking-tight leading-none">Assetain</h1>
                <span className="text-[7px] font-black uppercase text-primary tracking-[0.2em] mt-0.5 opacity-60">Control Hub</span>
              </div>
            </button>
          </div>

          <div className="hidden lg:flex items-center flex-1 justify-center mx-12">
            <AnimatePresence mode="wait">
              {!isSearchExpanded ? (
                <motion.button
                  key="search-trigger"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex items-center gap-3 px-5 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-white/40 hover:text-primary hover:border-primary/20 transition-all group"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Global Spotlight Search</span>
                  <div className="flex items-center gap-1 ml-4 px-1 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-black opacity-40">
                    <span>⌘</span>
                    <span>K</span>
                  </div>
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
                    placeholder="Registry Search..."
                    className="w-full h-10 bg-white/[0.05] border-2 border-primary/20 rounded-xl pl-10 pr-24 text-xs font-bold focus:outline-none focus:border-primary transition-all placeholder:text-white/10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                    onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsFilterOpen(true)}
                      className={cn("h-7 w-7 rounded-lg text-white/20 hover:text-primary relative", filters.length > 0 && "text-primary")}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {filters.length > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full flex items-center justify-center border border-black"><span className="text-[6px] font-black text-black">{filters.length}</span></span>}
                    </Button>
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="p-1 rounded-lg text-white/20 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[9px] font-black uppercase">Fetch Cloud State</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-8 w-8 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary">
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[9px] font-black uppercase">Push Local Updates</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <button onClick={() => setIsOnline(!isOnline)} className="flex items-center gap-2 group tactile-pulse px-2">
              <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
              <span className={cn("text-[8px] font-black uppercase tracking-widest", isOnline ? "text-green-500" : "text-red-500")}>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
            
            <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-600 rounded-full flex items-center justify-center border-2 border-black"><span className="text-[7px] font-black text-white">!</span></div>}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-xs hover:border-primary/40 transition-all overflow-hidden shrink-0">
                  {userProfile.displayName[0]}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black border-white/10 text-white rounded-xl shadow-3xl p-1">
                <DropdownMenuLabel className="p-3">
                  <p className="text-xs font-black uppercase">{userProfile.displayName}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase mt-0.5">{userProfile.role} &bull; {userProfile.state}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => setActiveView('REGISTRY')} className="p-2.5 rounded-lg focus:bg-primary focus:text-black m-1">
                  <Boxes className="mr-2 h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase">Registry</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView('GIS')} className="p-2.5 rounded-lg focus:bg-primary focus:text-black m-1">
                  <Navigation className="mr-2 h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase">GIS Hub</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView('ALERTS')} className="p-2.5 rounded-lg focus:bg-destructive focus:text-white m-1">
                  <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase">Alerts</span>
                </DropdownMenuItem>
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

        <div className="flex-1 relative overflow-hidden">
          <ErrorBoundary module={activeView}>
            <ScrollArea className="h-full no-scrollbar">
              <div className="p-4 md:p-6 lg:p-8">{renderWorkstation()}</div>
            </ScrollArea>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
