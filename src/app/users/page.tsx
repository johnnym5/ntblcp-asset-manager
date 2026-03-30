'use client';

/**
 * @fileOverview Users & Roles - Identity Governance Workspace.
 * Refined for Phase 7 with high-fidelity administrative controls.
 */

import React from 'react';
import AppLayout from '@/components/app-layout';
import { Users, ShieldCheck, Settings, ShieldAlert, KeyRound } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { UserManagement } from '@/components/admin/user-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedUser } from '@/types/domain';

export default function UsersRolesPage() {
  const { appSettings, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const handleUsersChange = async (newUsers: AuthorizedUser[]) => {
    if (!appSettings) return;
    
    try {
      const updatedSettings = { ...appSettings, authorizedUsers: newUsers };
      
      // 1. Commit to Cloud if Online
      await FirestoreService.updateSettings(updatedSettings);
      
      // 2. Commit to Local Persistence
      await storage.saveSettings(updatedSettings);
      
      // 3. Trigger Global Reconciliation
      await refreshRegistry();
      
      toast({ title: "Identity Ledger Updated", description: "Authorization changes broadcasted to all regional sessions." });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed", description: "Governance heartbeat interruption." });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" /> Identity Governance
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Manage system auditors, regional scopes, and cryptographic access levels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Card className="border-2 border-border/40 rounded-[2.5rem] overflow-hidden shadow-2xl bg-card/50">
              <CardContent className="p-8">
                <UserManagement 
                  users={appSettings?.authorizedUsers || []}
                  onUsersChange={handleUsersChange}
                  adminProfile={userProfile}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-[2rem] border-2 border-dashed border-border/40 shadow-none bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-6 bg-primary/10 rounded-full mb-2">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight">Access Protocol</h4>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic opacity-70">
                Auditors are cryptographically locked into their authorized geographical scopes (States or Zonal Stores). Access changes are broadcast during the next configuration heartbeat.
              </p>
            </Card>

            <div className="p-8 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-600" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Identity Rule</h4>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                Only Super Administrators can provision new auditors or modify regional jurisdictions.
              </p>
            </div>

            <Card className="border-border/40 rounded-3xl bg-muted/20">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Security Pulse</h4>
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span>WAF Protection</span>
                  <span className="text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span>Session TTL</span>
                  <span className="text-primary">24H Pulse</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
