"use client";

/**
 * @fileOverview SettingsSheet - High-Fidelity Project & Sheet Orchestrator.
 * Phase 155: Achieved 100% screenshot parity for the Projects & Sheets UI.
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
  RefreshCw,
  Search
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
      toast({ title: "Project Created", description: `Added ${newGrant.name} to the registry.` });
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
              <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">Settings</SheetTitle>
              <SheetDescription className="text-sm font-medium text-white/40 mt-1">
                Manage application settings and preferences.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="h-6 w-6" />
              </Button>
            </SheetClose>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-black">
          <div className="p-8 space-y-10 pb-32">
            
            {/* 1. Manage Projects Header */}
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase text-white tracking-tight leading-none px-1">Manage Projects</h3>
              
              <div className="flex gap-3">
                <Input 
                  placeholder="New project name..." 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-14 bg-white/[0.03] border-white/10 rounded-xl font-medium text-sm focus-visible:ring-primary/20 text-white placeholder:text-white/20"
                />
                <Button 
                  onClick={handleAddProject}
                  disabled={isProcessing || !newProjectName.trim()}
                  className="h-14 px-8 rounded-xl bg-primary text-black font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  <PlusCircle className="h-4 w-4" /> Add Project
                </Button>
              </div>
            </div>

            {/* 2. Project List Surface */}
            <div className="space-y-4">
              {appSettings.grants.map((grant) => {
                const isActive = appSettings.activeGrantId === grant.id;
                const isEditing = editingProjectId === grant.id;

                return (
                  <div key={grant.id} className={cn(
                    "rounded-2xl border transition-all duration-500 overflow-hidden",
                    isActive ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-transparent border-white/5"
                  )}>
                    {/* Project Main Row */}
                    <div className="p-6 flex items-center justify-between group">
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
                              className="h-9 bg-black/40 border-primary/40 text-sm font-black uppercase rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black uppercase text-white tracking-tight">{grant.name}</span>
                            {isActive && (
                              <Badge className="bg-primary text-black font-black uppercase text-[9px] h-6 px-3 rounded-full shadow-lg shadow-primary/10">Active</Badge>
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
                            className="h-9 px-5 rounded-xl border-white/10 font-black text-[10px] uppercase tracking-widest bg-black/40 hover:bg-white/5 text-white transition-all"
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
                          className="text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Active Expanded Section: Sheet Definitions */}
                    {isActive && (
                      <div className="px-6 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500 border-t border-white/5 bg-white/[0.01]">
                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 px-1">Sheet Definitions</h4>
                          <div className="space-y-2.5">
                            {Object.keys(grant.sheetDefinitions).length > 0 ? (
                              Object.keys(grant.sheetDefinitions).map(sheetName => (
                                <div key={sheetName} className="flex items-center justify-between p-5 bg-black border border-white/5 rounded-2xl group/sheet hover:border-white/20 transition-all shadow-inner">
                                  <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                  <div className="flex items-center gap-5 text-white/20">
                                    <button className="hover:text-white transition-colors"><Eye className="h-4 w-4" /></button>
                                    <button className="hover:text-white transition-colors"><Users className="h-4 w-4" /></button>
                                    <button className="hover:text-white transition-colors"><Wrench className="h-4 w-4" /></button>
                                    <button className="hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                <p className="text-[10px] font-black uppercase tracking-widest">No Definitions Configured</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sheet Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                            <PlusCircle className="h-4 w-4" /> Add Manually
                          </Button>
                          <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                            <FileUp className="h-4 w-4" /> Import Template
                          </Button>
                          <Button variant="outline" className="h-14 rounded-2xl bg-white/[0.02] border-white/10 font-black uppercase text-[10px] tracking-widest gap-2.5 hover:bg-white/5 text-white/60 transition-all active:scale-95">
                            <ScanSearch className="h-4 w-4" /> Scan & Import Data
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Pulse */}
        <div className="p-10 bg-black border-t border-white/5">
          <SheetFooter className="flex-row justify-start">
            <SheetClose asChild>
              <Button variant="ghost" className="h-14 px-12 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[11px] tracking-[0.25em] hover:bg-white/10 transition-all active:scale-95">
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
