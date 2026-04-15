'use client';

/**
 * @fileOverview Import Workspace - Standalone Fallback Page.
 * Mounts the high-fidelity ImportWorkstation component.
 */

import React from 'react';
import AppLayout from '@/components/app-layout';
import { ImportWorkstation } from '@/components/workstations/ImportWorkstation';

export default function StandaloneImportPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <ImportWorkstation />
      </div>
    </AppLayout>
  );
}
