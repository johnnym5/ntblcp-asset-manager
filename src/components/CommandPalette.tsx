'use client';

/**
 * @fileOverview Universal Command Palette - High-Speed Operational Interface.
 * Phase 54: Integrated Tag Printing Command Pulse.
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
  Printer
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
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Hub</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/assets'))}>
            <Boxes className="mr-2 h-4 w-4" />
            <span>Asset Registry</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/gallery'))}>
            <Camera className="mr-2 h-4 w-4" />
            <span>Evidence Gallery</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/audit-log'))}>
            <History className="mr-2 h-4 w-4" />
            <span>Activity Ledger</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => refreshRegistry())}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Force Sync Heartbeat</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/import'))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload New Registry</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/assets?action=print'))}>
            <Printer className="mr-2 h-4 w-4" />
            <span>Generate Asset Tags</span>
          </CommandItem>
        </CommandGroup>

        {userProfile?.isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Governance">
              <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
                <User className="mr-2 h-4 w-4" />
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

        <CommandGroup heading="Top Assets">
          {assets.slice(0, 5).map(asset => (
            <CommandItem key={asset.id} onSelect={() => runCommand(() => router.push(`/assets?id=${asset.id}`))}>
              <ShieldCheck className="mr-2 h-4 w-4 text-primary opacity-40" />
              <span className="truncate">{asset.description}</span>
              <span className="ml-auto text-[8px] font-mono opacity-40">{asset.assetIdCode || 'PULSE'}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Session">
          <CommandItem onSelect={() => runCommand(() => logout())}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Terminate System Session</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
