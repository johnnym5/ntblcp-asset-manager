'use client';

/**
 * @fileOverview Users & Roles - Identity Governance Workspace.
 */

import React from 'react';
import AppLayout from '@/components/app-layout';
import { Users, UserPlus, ShieldCheck, Mail, MapPin, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { UserManagement } from '@/components/admin/user-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersRolesPage() {
  const { appSettings, refreshRegistry } = useAppState();

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
                  onUsersChange={async (newUsers) => {
                    // This will be handled by Phase 7 logic
                    console.log("Identity update pulse staged.");
                  }}
                  adminProfile={null}
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
              <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Identity Rule</h4>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                Only Super Administrators can provision new auditors or modify regional jurisdictions.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
