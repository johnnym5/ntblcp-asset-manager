'use client';

/**
 * @fileOverview Universal Command Palette.
 * Phase 165: Applied professional Asset Manager friendly naming.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Boxes, 
  LayoutDashboard, 
  FileUp, 
  History, 
  Settings, 
  Monitor, 
  Plus, 
  Search,
  Zap,
  User,
  LogOut,
  Terminal,
  ShieldCheck,
  Printer,
  CheckCircle2,
  ListTodo,
  FileText,
  Users,
  ClipboardCheck,
  Activity,
  ShieldX,
  Package,
  ClipboardList,
  RefreshCw
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { assets, refreshRegistry } = useAppState();
  const { userProfile, logout } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search inventory or run system command..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>No matching records found.</CommandEmpty>
        
        <CommandGroup heading="Main Dashboard">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Inventory Dashboard</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Inventory Management">
          <CommandItem onSelect={() => runCommand(() => router.push('/assets'))}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Asset Inventory</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/import'))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Import Data</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => refreshRegistry())}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Reconcile Asset Register</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Audit & Compliance">
          <CommandItem onSelect={() => runCommand(() => router.push('/verify'))}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>Field Audit Queue</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/sync-queue'))}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Cloud Sync Status</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/reports'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Inventory Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/audit-log'))}>
            <History className="mr-2 h-4 w-4" />
            <span>Audit Trail</span>
          </CommandItem>
        </CommandGroup>

        {userProfile?.isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="System Administration">
              <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>User Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/infrastructure'))}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>System Infrastructure</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/database'))}>
                <Terminal className="mr-2 h-4 w-4" />
                <span>Database Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Inventory Search">
          {assets.slice(0, 5).map(asset => (
            <CommandItem key={asset.id} onSelect={() => runCommand(() => router.push(`/assets?id=${asset.id}`))}>
              <Package className="mr-2 h-4 w-4 text-primary opacity-40" />
              <span className="truncate">{asset.description}</span>
              <span className="ml-auto text-[8px] font-mono opacity-40">{asset.assetIdCode || 'TAG_ID'}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Session">
          <CommandItem onSelect={() => runCommand(() => logout())}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
