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
  Plus, 
  LogOut,
  CheckCircle2,
  ListTodo,
  FileText,
  Users,
  Package,
  ClipboardList,
  RefreshCw,
  SearchCode,
  ShieldAlert
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { assets, refreshRegistry, appSettings, setActiveView } = useAppState();
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
      <CommandInput placeholder="Type a command or search assets..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>Nothing found.</CommandEmpty>
        
        <CommandGroup heading="Main Navigation">
          <CommandItem onSelect={() => runCommand(() => setActiveView('DASHBOARD'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveView('REGISTRY'))}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Registry</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveView('ALERTS'))}>
            <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Critical Alerts</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Inventory Operations">
          <CommandItem onSelect={() => runCommand(() => setActiveView('IMPORT'))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload Records</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => refreshRegistry())}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Sync Pulse</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Audit & Reports">
          <CommandItem onSelect={() => runCommand(() => setActiveView('VERIFY'))}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>Records to Review</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveView('REPORTS'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </CommandItem>
        </CommandGroup>

        {userProfile?.isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin Tools">
              <CommandItem onSelect={() => runCommand(() => setActiveView('USERS'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Auditors & Users</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setActiveView('SETTINGS'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Global Settings</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Search">
          {assets.slice(0, 5).map(asset => (
            <CommandItem key={asset.id} onSelect={() => runCommand(() => { setSearchTerm(asset.id.split('-')[0]); setActiveView('REGISTRY'); })}>
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
