"use client";

/**
 * @fileOverview SettingsSheet - High-Fidelity Project & Sheet Orchestrator.
 * Phase 150: Achieved 100% screenshot parity for the Projects & Sheets UI.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Plus, 
  ChevronDown, 
  ChevronsUpDown, 
  Trash2, 
  Wrench, 
  Eye, 
  Users, 
  FileUp, 
  ScanSearch,
  Check,
  PlusCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { cn } from '@/lib/utils';
import type { AppSettings, Grant, SheetDefinition } from '@/types/domain';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { appSettings, setAppSettings, refreshRegistry, isOnline, setActiveGrantId } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddProject = async () => {
    if (!newProjectName.trim() || !appSettings) return;
    setIsProcessing(true);
    
    const newGrant: Grant = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      enabledSheets: [],
      sheetDefinitions: {}
    };

    const updatedSettings = {
      ...appSettings,
      grants: [...appSettings.grants, newGrant]
    };

    try {
      await storage.saveSettings(updatedSettings);
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      setAppSettings(updatedSettings);
      setNewProjectName('');
      toast({ title: "Project Created", description: `Added ${newGrant.name} to the registry pulse.` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!appSettings || appSettings.grants.length <= 1) return;
    setIsProcessing(true);
    
    const updatedGrants = appSettings.grants.filter(g => g.id !== id);
    const updatedSettings = {
      ...appSettings,
      grants: updatedGrants,
      activeGrantId: appSettings.activeGrantId === id ? updatedGrants[0].id : appSettings.activeGrantId
    };

    try {
      await storage.saveSettings(updatedSettings);
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      setAppSettings(updatedSettings);
      toast({ title: "Project Removed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const startRename = (grant: Grant) => {
    setEditingProjectId(grant.id);
    setEditNameValue(grant.name);
  };

  const commitRename = async () => {
    if (!editingProjectId || !appSettings) return;
    const updatedGrants = appSettings.grants.map(g => 
      g.id === editingProjectId ? { ...g, name: editNameValue } : g
    );
    const updatedSettings = { ...appSettings, grants: updatedGrants };
    
    setAppSettings(updatedSettings);
    await storage.saveSettings(updatedSettings);
    if (isOnline) await FirestoreService.updateSettings(updatedSettings);
    setEditingProjectId(null);
  };

  if (!appSettings) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 border-none bg-black text-white shadow-3xl overflow-hidden flex flex-col rounded-l-[2rem]">
        {/* Header Pulse */}
        <div className="p-8 pb-6 bg-black border-b border-white/5">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Settings</SheetTitle>
              <SheetDescription className="text-xs font-bold text-white/40 uppercase tracking-widest">
                Manage application settings and preferences.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl">
                <X className="h-6 w-6" />
              </Button>
            </SheetClose>
          </SheetHeader>
        </div>

        {/* Action Row: New Project */}
        <div className="px-8 py-6 bg-black border-b border-white/5">
          <div className="flex gap-3">
            <Input 
              placeholder="New project name..." 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="h-12 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm focus-visible:ring-primary/20 text-white"
            />
            <Button 
              onClick={handleAddProject}
              disabled={isProcessing || !newProjectName.trim()}
              className="h-12 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </div>
        </div>

        {/* Project List Surface */}
        <ScrollArea className="flex-1 bg-black px-8 py-6">
          <div className="space-y-4 pb-20">
            {appSettings.grants.map((grant) => {
              const isActive = appSettings.activeGrantId === grant.id;
              const isEditing = editingProjectId === grant.id;

              return (
                <div key={grant.id} className={cn(
                  "rounded-2xl border transition-all duration-500 overflow-hidden",
                  isActive ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-transparent border-white/5"
                )}>
                  {/* Project Row */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <ChevronsUpDown className="h-4 w-4 text-white/20 shrink-0" />
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input 
                            value={editNameValue} 
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                            autoFocus
                            className="h-8 bg-black/40 border-primary/40 text-sm font-black uppercase"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black uppercase text-white tracking-tight">{grant.name}</span>
                          {isActive && (
                            <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">Active</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      {!isActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setActiveGrantId(grant.id)}
                          className="h-9 px-4 rounded-xl border-white/10 font-black text-[10px] uppercase tracking-widest bg-black/40 hover:bg-white/5"
                        >
                          Set Active
                        </Button>
                      )}
                      <button 
                        onClick={() => startRename(grant)}
                        className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                      >
                        Rename
                      </button>
                      <button 
                        onClick={() => handleDeleteProject(grant.id)}
                        className="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded Sheet Section (Only for active or if you want it persistent) */}
                  {isActive && (
                    <div className="px-6 pb-6 pt-2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Sheet Definitions</h4>
                        <div className="space-y-2">
                          {Object.keys(grant.sheetDefinitions).length > 0 ? (
                            Object.keys(grant.sheetDefinitions).map(sheetName => (
                              <div key={sheetName} className="flex items-center justify-between p-4 bg-black border border-white/5 rounded-xl group hover:border-white/20 transition-all">
                                <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                <div className="flex items-center gap-4 text-white/20">
                                  <button className="hover:text-white transition-colors"><Eye className="h-4 w-4" /></button>
                                  <button className="hover:text-white transition-colors"><Users className="h-4 w-4" /></button>
                                  <button className="hover:text-white transition-colors"><Wrench className="h-4 w-4" /></button>
                                  <button className="hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-xl opacity-20">
                              <p className="text-[10px] font-black uppercase tracking-widest">No Definitions Configured</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sheet Action Buttons */}
                      <div className="grid grid-cols-3 gap-3">
                        <Button variant="outline" className="h-12 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/60">
                          <PlusCircle className="h-3.5 w-3.5" /> Add Manually
                        </Button>
                        <Button variant="outline" className="h-12 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/60">
                          <FileUp className="h-3.5 w-3.5" /> Import Template
                        </Button>
                        <Button variant="outline" className="h-12 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/60">
                          <ScanSearch className="h-3.5 w-3.5" /> Scan & Import Data
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Pulse */}
        <div className="p-8 bg-black border-t border-white/5">
          <SheetFooter className="flex-row justify-start">
            <SheetClose asChild>
              <Button variant="ghost" className="h-12 px-10 rounded-xl bg-white/[0.05] text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/10">
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
