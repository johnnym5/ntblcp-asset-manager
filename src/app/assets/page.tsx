'use client';

/**
 * @fileOverview Registry Workspace - Standalone Fallback Page.
 * Mounts the high-fidelity RegistryWorkstation component.
 */

import React from 'react';
import AppLayout from '@/components/app-layout';
import { RegistryWorkstation } from '@/components/workstations/RegistryWorkstation';

export default function StandaloneRegistryPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <RegistryWorkstation />
      </div>
    </AppLayout>
  );
}
