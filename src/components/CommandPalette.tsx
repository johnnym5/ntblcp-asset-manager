
'use client';

/**
 * @fileOverview Universal Command Search.
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
  RefreshCw,
  SearchCode
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { assets, refreshRegistry, appSettings } = useAppState();
  const { userProfile, logout } = useAuth();

  const isAdvanced = appSettings?.uxMode === 'advanced';

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
      <CommandInput placeholder="Type a command or search assets..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>Nothing found.</CommandEmpty>
        
        <CommandGroup heading="Main Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Inventory">
          <CommandItem onSelect={() => runCommand(() => router.push('/assets'))}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Asset List</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/import'))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload Records</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => refreshRegistry())}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Sync Records</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Audit & Reports">
          <CommandItem onSelect={() => runCommand(() => router.push('/verify'))}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>Records to Review</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/sync-queue'))}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Pending Sync</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/reports'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/audit-log'))}>
            <History className="mr-2 h-4 w-4" />
            <span>Activity History</span>
          </CommandItem>
        </CommandGroup>

        {userProfile?.isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin Tools">
              <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Auditors & Users</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/infrastructure'))}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>System Infrastructure</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/database'))}>
                <SearchCode className="mr-2 h-4 w-4" />
                <span>Database View</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Search">
          {assets.slice(0, 5).map(asset => (
            <CommandItem key={asset.id} onSelect={() => runCommand(() => router.push(`/assets?id=${asset.id}`))}>
              <Package className="mr-2 h-4 w-4 text-primary opacity-40" />
              <span className="truncate">{asset.description}</span>
              <span className="ml-auto text-[8px] font-mono opacity-40">{asset.assetIdCode || 'NO_TAG'}</span>
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
