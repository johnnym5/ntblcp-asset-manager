'use client';

/**
 * @fileOverview Universal Command Palette - Organized Functional Pulses.
 * Phase 69: Updated groupings and removed Spatial triggers.
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
  Camera, 
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
  Users
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
      <CommandInput placeholder="Search records or execute command pulse..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>No matching pulse discovered.</CommandEmpty>
        
        <CommandGroup heading="General">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Hub</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Registry Engineering">
          <CommandItem onSelect={() => runCommand(() => router.push('/assets'))}>
            <Boxes className="mr-2 h-4 w-4" />
            <span>Asset Registry</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/import'))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Import Center</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => refreshRegistry())}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Force Sync Heartbeat</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quality & Traceability">
          <CommandItem onSelect={() => runCommand(() => router.push('/verify'))}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>Verification Queue</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/sync-queue'))}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Sync Pulse Log</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/reports'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Reporting Hub</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/audit-log'))}>
            <History className="mr-2 h-4 w-4" />
            <span>Activity Ledger</span>
          </CommandItem>
        </CommandGroup>

        {userProfile?.isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Governance & Systems">
              <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Identity Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/infrastructure'))}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Infrastructure Command</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/database'))}>
                <Terminal className="mr-2 h-4 w-4" />
                <span>Database Mission Control</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Registry Access">
          {assets.slice(0, 5).map(asset => (
            <CommandItem key={asset.id} onSelect={() => runCommand(() => router.push(`/assets?id=${asset.id}`))}>
              <ShieldCheck className="mr-2 h-4 w-4 text-primary opacity-40" />
              <span className="truncate">{asset.description}</span>
              <span className="ml-auto text-[8px] font-mono opacity-40">{asset.assetIdCode || 'PULSE'}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Session Control">
          <CommandItem onSelect={() => runCommand(() => logout())}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Terminate System Session</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
