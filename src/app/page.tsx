'use client';

/**
 * @fileOverview SPA Orchestrator Hub.
 * Manages the unified workstation switching logic with high-fidelity transitions.
 */

import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/app-layout';
import Loading from './loading';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { Zap } from 'lucide-react';

// Workstations
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

export default function SPAOrchestrator() {
  const { activeView, settingsLoaded } = useAppState();
  const { profileSetupComplete, loading: authLoading } = useAuth();

  if (authLoading || !settingsLoaded) return <Loading />;
  if (!profileSetupComplete) return <UserProfileSetup />;

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <Suspense fallback={<Loading />}>
            {renderWorkstation(activeView)}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}

function renderWorkstation(view: string) {
  switch (view) {
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
    default: return (
      <div className="flex flex-col items-center justify-center py-40 opacity-20 space-y-6">
        <div className="p-8 bg-primary/10 rounded-[3rem] shadow-inner">
          <Zap className="h-20 w-20 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-black uppercase tracking-[0.2em]">{view.replace('_', ' ')} Workstation</h3>
          <p className="text-sm font-medium italic">Synchronizing SPA logic pulse...</p>
        </div>
      </div>
    );
  }
}