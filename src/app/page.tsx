'use client';

/**
 * @fileOverview Root Shell - Unified Global Command Hub.
 * Phase 230: Updated logic header to use high-fidelity AssetFilterSheet.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { 
  Boxes, 
  Loader2, 
  LogOut, 
  CloudDownload, 
  CloudUpload, 
  Bell, 
  ArrowLeft,
  Search,
  Filter,
  ArrowUpDown,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DashboardWorkstation } from '@/components/workstations/DashboardWorkstation';
import { SettingsWorkstation } from '@/components/workstations/SettingsWorkstation';
import { NotificationsCenter } from '@/components/NotificationsSheet';
import { CommandPalette } from '@/components/CommandPalette';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications } from '@/hooks/use-notifications';
import { AssetFilterSheet } from '@/components/asset-filter-sheet';
import { SortDrawer } from '@/components/registry/SortDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function SPAHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { 
    activeView, 
    setActiveView, 
    appSettings, 
    isOnline, 
    isSyncing, 
    manualDownload, 
    manualUpload,
    searchTerm,
    setSearchTerm,
    headers,
    
    // Logic States
    selectedLocations,
    setSelectedLocations,
    selectedAssignees,
    setSelectedAssignees,
    selectedStatuses,
    setSelectedStatuses,
    selectedConditions,
    setSelectedConditions,
    missingFieldFilter,
    setMissingFieldFilter,
    
    // Options
    locationOptions,
    assigneeOptions,
    conditionOptions,
    statusOptions,
    
    // Sort
    sortKey,
    setSortKey,
    sortDir,
    setSortDir
  } = useAppState();
  
  const { unreadCount } = useNotifications();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (profileSetupComplete && !appSettings?.onboardingComplete) {
      setShowWelcome(true);
    }
  }, [profileSetupComplete, appSettings]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  const renderWorkstation = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'SETTINGS': return <SettingsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + selectedConditions.length + (missingFieldFilter ? 1 : 0);

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans selection:bg-primary/30 text-white">
      <CommandPalette />
      <WelcomeExperience isOpen={showWelcome} onComplete={() => setShowWelcome(false)} />
      <NotificationsCenter isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/80 backdrop-blur-3xl z-40 gap-8">
          <div className="flex items-center gap-6 shrink-0">
            {activeView !== 'DASHBOARD' ? (
              <button 
                onClick={() => setActiveView('DASHBOARD')} 
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-primary group tactile-pulse"
              >
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Boxes className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black uppercase text-white tracking-tighter leading-none">NTBLCP</h1>
                  <span className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mt-1 opacity-60">Asset Intelligence</span>
                </div>
              </div>
            )}
          </div>

          {/* Global Command Hub Pulse */}
          <div className="flex-1 max-w-2xl relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Global Search: Descriptions, Tag IDs, or Serials..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-11 pr-24 rounded-xl bg-white/[0.03] border-white/5 text-sm font-medium focus-visible:ring-primary/20 text-white placeholder:text-white/20 shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSortOpen(true)}
                className="h-9 w-9 rounded-lg text-white/20 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "h-9 w-9 rounded-lg text-white/20 hover:text-primary hover:bg-primary/10 transition-all relative",
                  activeFilterCount > 0 && "text-primary bg-primary/5"
                )}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <div className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full border-2 border-black" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 mr-2">
              <button 
                onClick={manualDownload} 
                disabled={isSyncing}
                title="Fetch Cloud Updates"
                className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-pulse")} />
              </button>
              <button 
                onClick={manualUpload} 
                disabled={isSyncing}
                title="Push Local Changes"
                className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <CloudUpload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 pr-4 border-r border-white/5">
              <div className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
              <button 
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
                    <span className="text-[8px] font-black text-white leading-none">{unreadCount}</span>
                  </div>
                )}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 group cursor-pointer pl-2">
                  <div className={cn(
                    "h-10 w-10 rounded-full border transition-all flex items-center justify-center font-black text-xs shadow-xl",
                    activeView === 'SETTINGS' 
                      ? "bg-primary text-black border-primary" 
                      : "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary group-hover:text-black"
                  )}>
                    {userProfile?.displayName?.[0] || 'A'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black border-white/5 text-white rounded-2xl">
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black uppercase tracking-tight">{userProfile?.displayName}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{userProfile?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => setActiveView('SETTINGS')} className="p-3 focus:bg-primary focus:text-black rounded-xl cursor-pointer m-1">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span className="text-[11px] font-black uppercase">System Settings</span>
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

        <ScrollArea className="flex-1">
          <div className="p-6 lg:p-10 min-h-full">
            <ErrorBoundary module={activeView}>
              <Suspense fallback={
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-40">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Waking Workstation...</p>
                </div>
              }>
                {renderWorkstation()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </ScrollArea>
      </main>

      <AssetFilterSheet 
        isOpen={isFilterOpen} 
        onOpenChange={setIsFilterOpen} 
        locationOptions={locationOptions}
        selectedLocations={selectedLocations}
        setSelectedLocations={setSelectedLocations}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        conditionOptions={conditionOptions}
        selectedConditions={selectedConditions}
        setSelectedConditions={setSelectedConditions}
        missingFieldFilter={missingFieldFilter}
        setMissingFieldFilter={setMissingFieldFilter}
      />

      <SortDrawer 
        isOpen={isSortOpen} 
        onOpenChange={setIsSortOpen} 
        headers={headers} 
        sortBy={sortKey} 
        sortDirection={sortDir} 
        onUpdateSort={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }} 
      />
    </div>
  );
}
