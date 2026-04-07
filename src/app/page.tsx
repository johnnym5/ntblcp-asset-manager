'use client';

/**
 * @fileOverview Root Shell - Unified Command Hub.
 * Optimized for RBAC and Location-Aware Pulse filtering.
 * Phase 400: Integrated Discrepancy Review Workstation.
 * Phase 401: Replaced navigation toggle with Global Spotlight Search Pulse.
 * Phase 402: Refined Search Bar UI for high-fidelity Spotlight-style interaction.
 * Phase 403: Implemented Expanding Search bar (Start Closed) and active sanitization.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { 
  Boxes, 
  Loader2, 
  LogOut, 
  Bell, 
  ArrowLeft,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  ShieldCheck,
  MapPin,
  Terminal,
  SearchCode,
  LayoutDashboard,
  Search,
  Filter,
  Command,
  X,
  FileUp,
  ClipboardCheck,
  History
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
import { canPerform } from '@/core/auth/rbac';
import { motion, AnimatePresence } from 'framer-motion';

export default function SPAHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { 
    activeView, 
    setActiveView, 
    isOnline, 
    setIsOnline,
    assets,
    searchTerm,
    setSearchTerm,
    setIsFilterOpen
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
      case 'GROUPS': return <AssetGroupsWorkstation />;
      case 'ANOMALIES': return <DiscrepancyWorkstation />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'VERIFY': return <VerifyWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation />;
      case 'REPORTS': return <ReportsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(sanitizeSearch(val));
  };

  return (
    <div className="app-container bg-black font-sans text-white">
      <CommandPalette />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/80 backdrop-blur-3xl z-50 shrink-0">
          <div className="flex items-center gap-6">
            {activeView !== 'DASHBOARD' ? (
              <button onClick={() => setActiveView('DASHBOARD')} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-primary group tactile-pulse">
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back</span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl"><Boxes className="h-5 w-5 text-primary" /></div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black uppercase text-white tracking-tighter leading-none">Assetain</h1>
                  <span className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mt-1 opacity-60">Control</span>
                </div>
              </div>
            )}
          </div>

          {/* Spotlight Search Bar - Start Closed Expansion */}
          <div className="hidden lg:flex items-center flex-1 justify-center mx-12">
            <AnimatePresence mode="wait">
              {!isSearchExpanded ? (
                <motion.button
                  key="search-trigger"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex items-center gap-3 px-6 py-2.5 bg-white/[0.03] border border-white/5 rounded-2xl text-white/40 hover:text-primary hover:border-primary/20 transition-all group shadow-xl"
                >
                  <Search className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Global Pulse Search</span>
                  <div className="flex items-center gap-1 ml-4 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black opacity-40">
                    <span>CMD</span>
                    <span>K</span>
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="search-input"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", maxWidth: "600px", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative flex items-center group"
                >
                  <Search className="absolute left-5 h-4 w-4 text-primary" />
                  <input 
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    placeholder="Search Registry, Folders or Anomalies..."
                    className="w-full h-12 bg-white/[0.05] border-2 border-primary/20 rounded-2xl pl-12 pr-12 text-sm font-medium focus:outline-none focus:border-primary transition-all placeholder:text-white/10 shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                  />
                  <button 
                    onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }}
                    className="absolute right-4 p-1 rounded-lg text-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 border-r border-white/5">
              <Badge variant="outline" className="h-7 px-3 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[8px] tracking-widest gap-2">
                <ShieldCheck className="h-3 w-3" /> {userProfile.role}
              </Badge>
              <Badge variant="outline" className="h-7 px-3 border-white/10 bg-white/5 text-white/40 font-black uppercase text-[8px] tracking-widest gap-2">
                <MapPin className="h-3 w-3" /> {userProfile.isZonalAdmin ? userProfile.assignedZone : userProfile.state}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setIsOnline(!isOnline)} className="flex items-center gap-2 group tactile-pulse">
                <div className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                <span className={cn("text-[8px] font-black uppercase tracking-widest hidden lg:inline", isOnline ? "text-green-500" : "text-red-500")}>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
              
              <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-black"><span className="text-[8px] font-black text-white">!</span></div>}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 group cursor-pointer pl-1">
                  <div className={cn("h-10 w-10 rounded-full border transition-all flex items-center justify-center font-black text-xs", activeView === 'SETTINGS' ? "bg-primary text-black border-primary" : "bg-primary/10 border-primary/20 text-primary")}>
                    {userProfile.displayName[0]}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black border-white/5 text-white rounded-2xl shadow-3xl">
                <DropdownMenuLabel className="p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black uppercase">{userProfile.displayName}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase">{userProfile.role} • {userProfile.state}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                
                <DropdownMenuItem onClick={() => setActiveView('REGISTRY')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                  <Database className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">Registry</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setActiveView('VERIFY')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">Verification Queue</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setActiveView('IMPORT')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                  <FileUp className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">Import Data</span>
                </DropdownMenuItem>

                {canPerform(userProfile as any, 'DATABASE_ADMIN_TOOLS') && (
                  <DropdownMenuItem onClick={() => setActiveView('ANOMALIES')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                    <SearchCode className="mr-2 h-4 w-4" />
                    <span className="text-[11px] font-black uppercase">Anomaly Dashboard</span>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={logout} className="p-3 focus:bg-red-600 focus:text-white rounded-xl cursor-pointer m-1 text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <ErrorBoundary module={activeView}>
            <ScrollArea className="h-full custom-scrollbar">
              <div className="p-12 lg:p-16">{renderWorkstation()}</div>
            </ScrollArea>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
