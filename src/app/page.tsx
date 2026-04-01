'use client';

/**
 * @fileOverview Root Shell - Single Page Application Hub.
 * Rebuilt to match the high-fidelity Amoled design with workstation switching.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { 
  LayoutDashboard, 
  Boxes, 
  FileUp, 
  ShieldCheck, 
  Activity, 
  Settings,
  Map,
  History,
  AlertTriangle,
  Loader2,
  Package,
  LogOut,
  ChevronRight,
  Menu,
  Database,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardWorkstation } from '@/components/workstations/DashboardWorkstation';
import { RegistryWorkstation } from '@/components/workstations/RegistryWorkstation';
import { ImportWorkstation } from '@/components/workstations/ImportWorkstation';
import { VerifyWorkstation } from '@/components/workstations/VerifyWorkstation';
import { ReportsWorkstation } from '@/components/workstations/ReportsWorkstation';
import { AlertsWorkstation } from '@/components/workstations/AlertsWorkstation';
import { AuditLogWorkstation } from '@/components/workstations/AuditLogWorkstation';
import { SyncQueueWorkstation } from '@/components/workstations/SyncQueueWorkstation';
import { UsersWorkstation } from '@/components/workstations/UsersWorkstation';
import { InfrastructureWorkstation } from '@/components/workstations/InfrastructureWorkstation';
import { DatabaseWorkstation } from '@/components/workstations/DatabaseWorkstation';
import { SettingsWorkstation } from '@/components/workstations/SettingsWorkstation';
import { GISWorkstation } from '@/components/workstations/GISWorkstation';
import { RegionalScopeDrawer } from '@/components/registry/RegionalScopeDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { WorkstationView } from '@/types/domain';

export default function SPAHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { activeView, setActiveView, appSettings, isOnline } = useAppState();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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

  const navItems: { id: WorkstationView; label: string; icon: any; adminOnly?: boolean; group: string }[] = [
    { id: 'DASHBOARD', label: 'Intelligence', icon: LayoutDashboard, group: 'Core' },
    { id: 'REGISTRY', label: 'Asset Register', icon: Boxes, group: 'Core' },
    { id: 'VERIFY', label: 'Field Audit', icon: ShieldCheck, group: 'Core' },
    { id: 'GIS', label: 'Spatial Hub', icon: Map, group: 'Core' },
    
    { id: 'IMPORT', label: 'Data Ingestion', icon: FileUp, group: 'Tools' },
    { id: 'REPORTS', label: 'Reporting', icon: Activity, group: 'Tools' },
    { id: 'ALERTS', label: 'Exceptions', icon: AlertTriangle, group: 'Tools' },
    
    { id: 'AUDIT_LOG', label: 'Audit Trail', icon: History, group: 'Systems' },
    { id: 'SYNC_QUEUE', label: 'Sync Status', icon: Activity, group: 'Systems' },
    
    { id: 'USERS', label: 'Users', icon: Package, adminOnly: true, group: 'Admin' },
    { id: 'INFRASTRUCTURE', label: 'Infrastructure', icon: Monitor, adminOnly: true, group: 'Admin' },
    { id: 'DATABASE', label: 'Database', icon: Database, adminOnly: true, group: 'Admin' },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, group: 'Admin' },
  ];

  const renderWorkstation = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'REGISTRY': return <RegistryWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'VERIFY': return <VerifyWorkstation />;
      case 'REPORTS': return <ReportsWorkstation />;
      case 'ALERTS': return <AlertsWorkstation />;
      case 'AUDIT_LOG': return <AuditLogWorkstation />;
      case 'SYNC_QUEUE': return <SyncQueueWorkstation />;
      case 'USERS': return <UsersWorkstation />;
      case 'INFRASTRUCTURE': return <InfrastructureWorkstation />;
      case 'DATABASE': return <DatabaseWorkstation />;
      case 'SETTINGS': return <SettingsWorkstation />;
      case 'GIS': return <GISWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  const NavButton = ({ item }: { item: typeof navItems[0] }) => (
    <button
      onClick={() => setActiveView(item.id)}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group tactile-pulse",
        activeView === item.id 
          ? "bg-primary text-black shadow-2xl shadow-primary/20 scale-[1.02] z-10" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-4">
        <item.icon className={cn("h-5 w-5 transition-transform duration-500", activeView === item.id ? "scale-110" : "group-hover:scale-110")} />
        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
      </div>
      {activeView === item.id && <ChevronRight className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans selection:bg-primary/30">
      <CommandPalette />
      <WelcomeExperience isOpen={showWelcome} onComplete={() => setShowWelcome(false)} />
      
      {/* 1. Global Navigation Pulse (Sidebar) */}
      <aside className={cn(
        "bg-[#050505] border-r border-white/5 flex flex-col transition-all duration-700 ease-out z-50",
        isSidebarOpen ? "w-[280px]" : "w-0 -translate-x-full"
      )}>
        <div className="p-8 pb-4 flex items-center gap-4">
          <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
            <Boxes className="h-6 w-6 text-black fill-current" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">Assetain</h1>
            <span className="text-[8px] font-black uppercase text-primary tracking-[0.3em] mt-1.5 opacity-60">Intelligence Pulse</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-8">
          <div className="space-y-10 pb-20">
            {['Core', 'Tools', 'Systems', 'Admin'].map(group => {
              const items = navItems.filter(i => i.group === group && (!i.adminOnly || userProfile?.isAdmin));
              if (items.length === 0) return null;
              return (
                <div key={group} className="space-y-3">
                  <h4 className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">{group}</h4>
                  <div className="space-y-1">
                    {items.map(item => <NavButton key={item.id} item={item} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* 2. Primary Workstation Hub */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        {/* Workstation Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/80 backdrop-blur-3xl z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("font-black uppercase text-[9px] h-7 px-4 rounded-full border-2", isOnline ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-red-500 border-red-500/20 bg-red-500/5")}>
                <div className={cn("h-1.5 w-1.5 rounded-full mr-2", isOnline ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                {isOnline ? 'Cloud Authority Active' : 'Offline Mode'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsScopeOpen(true)}
              className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <Map className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] font-black uppercase text-white/40 mb-0.5">Regional Scope</span>
                <span className="text-[10px] font-black uppercase text-white">{userProfile?.state}</span>
              </div>
            </button>

            <div className="h-10 w-[2px] bg-white/5 mx-2" />

            <div className="flex items-center gap-4 group cursor-pointer pl-2">
              <div className="flex flex-col items-end text-right leading-none">
                <span className="text-xs font-black uppercase text-white">{userProfile?.displayName}</span>
                <span className="text-[8px] font-bold uppercase text-primary tracking-widest mt-1">{userProfile?.role}</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-black text-primary text-sm shadow-xl group-hover:bg-primary group-hover:text-black transition-all">
                {userProfile?.displayName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Canvas Surface */}
        <ScrollArea className="flex-1">
          <div className="p-8 sm:p-12 min-h-full">
            <ErrorBoundary module={activeView}>
              <Suspense fallback={
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-40">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Initializing Workstation Pulse...</p>
                </div>
              }>
                {renderWorkstation()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </ScrollArea>

        {/* Global Floating Pulse Footer */}
        <div className="fixed bottom-10 right-10 z-50 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="bg-[#0A0A0A]/80 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/5 shadow-2xl flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest whitespace-nowrap">System Pulse: Stable</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-[9px] font-mono font-bold text-primary">v5.0.4-AMOLED</span>
            </div>
          </div>
        </div>
      </main>

      {/* Spatial Scope Manager */}
      <RegionalScopeDrawer isOpen={isScopeOpen} onOpenChange={setIsScopeOpen} />
    </div>
  );
}