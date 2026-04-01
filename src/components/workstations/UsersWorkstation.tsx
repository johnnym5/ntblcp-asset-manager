'use client';

/**
 * @fileOverview UsersWorkstation - User Management Module.
 * Phase 165: Renamed to User Management.
 */

import React from 'react';
import { Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { UserManagement } from '@/components/admin/user-management';
import { Card, CardContent } from '@/components/ui/card';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedUser } from '@/types/domain';

export function UsersWorkstation() {
  const { appSettings, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const handleUsersChange = async (newUsers: AuthorizedUser[]) => {
    if (!appSettings) return;
    try {
      const updatedSettings = { ...appSettings, authorizedUsers: newUsers };
      await FirestoreService.updateSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
      await refreshRegistry();
      toast({ title: "User Directory Updated" });
    } catch (e) { toast({ variant: "destructive", title: "Update Failed" }); }
  };

  if (!userProfile?.isAdmin) return <div className="py-40 text-center opacity-20"><ShieldAlert className="h-20 w-20 mx-auto" /><h2 className="text-xl font-black uppercase mt-4">Clearance Required</h2></div>;

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" /> User Management
        </h2>
        <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Manage system auditors, regional scopes, and access levels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="border-2 border-border/40 rounded-[2.5rem] overflow-hidden shadow-2xl bg-card/50">
            <CardContent className="p-8">
              <UserManagement users={appSettings?.authorizedUsers || []} onUsersChange={handleUsersChange} adminProfile={userProfile} />
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card className="rounded-[2rem] border-2 border-dashed p-8 text-center flex flex-col items-center justify-center space-y-4 bg-muted/5">
            <div className="p-6 bg-primary/10 rounded-full"><ShieldCheck className="h-10 w-10 text-primary" /></div>
            <h4 className="text-sm font-black uppercase">Access Protocol</h4>
            <p className="text-[10px] font-medium text-muted-foreground italic opacity-70">Auditors are cryptographically locked into their authorized geographical scopes.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
