"use client";

/**
 * @fileOverview SettingsSheet - High-Fidelity Project & Sheet Orchestrator.
 * Phase 157: Finalized functional wiring for project action pulse.
 * Phase 158: Updated Scan button to navigate to Import workstation.
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
import { parseExcelForTemplate } from '@/lib/excel-parser';
import { cn } from '@/lib/utils';
import { ColumnCustomizationSheet } from './column-customization-sheet';
import { ImportScannerDialog } from './single-sheet-import-dialog';
import type { AppSettings, Grant, SheetDefinition } from '@/types/domain';

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
  const { appSettings, setAppSettings, refreshRegistry, isOnline, setActiveGrantId, activeGrantId, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Schema Editor State
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [activeGrantForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleAddSheet = () => {
    const newSheet: SheetDefinition = {
      name: 'New Asset Group',
      headers: ['S/N', 'Description', 'Location'],
      displayFields: [
        { key: 'sn', label: 'S/N', table: true, quickView: true },
        { key: 'description', label: 'Description', table: true, quickView: true },
        { key: 'location', label: 'Location', table: true, quickView: true },
        { key: 'status', label: 'Status', table: true, quickView: true },
      ]
    };
    setSelectedSheetDef(newSheet);
    setActiveGrantIdForSchema(activeGrantId);
    setIsColumnSheetOpen(true);
  };

  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!appSettings || !activeGrantId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const templates = await parseExcelForTemplate(file);
      const activeGrant = appSettings.grants.find(g => g.id === activeGrantId);
      if (!activeGrant) return;

      const nextSheetDefs = { ...activeGrant.sheetDefinitions };
      templates.forEach(t => {
        nextSheetDefs[t.name] = t;
      });

      const updatedGrants = appSettings.grants.map(g => 
        g.id === activeGrantId ? { ...g, sheetDefinitions: nextSheetDefs } : g
      );

      const nextSettings = { ...appSettings, grants: updatedGrants };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);

      toast({ title: 'Templates Imported', description: `${templates.length} group definitions added to ${activeGrant.name}.` });
    } catch (error) {
      toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 border-none bg-black text-white shadow-3xl overflow-hidden flex flex-col rounded-l-[2rem]">
          {/* Header Pulse */}
          <div className="p-8 pb-6 bg-black border-b border-white/5">
            <SheetHeader>
              <div className="space-y-1">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">Settings</SheetTitle>
                <SheetDescription className="text-sm font-medium text-white/40 mt-1">
                  Manage application settings and project registers.
                </SheetDescription>
              </div>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 bg-black">
            <div className="p-8 space-y-10 pb-32">
              
              {/* 1. Manage Projects Header */}
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase text-white tracking-tight leading-none px-1">Manage Projects</h3>
                
                <div className="flex gap-3">
                  <Input 
                    placeholder="New project label..." 
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
                            <Input 
                              value={editNameValue} 
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                              autoFocus
                              className="h-9 bg-black/40 border-primary/40 text-sm font-black uppercase rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black uppercase text-white tracking-tight leading-none">{grant.name}</span>
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
                            onClick={() => { setEditingProjectId(grant.id); setEditNameValue(grant.name); }}
                            className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                          >
                            Rename
                          </button>
                        </div>
                      </div>

                      {/* Active Expanded Section: Sheet Definitions */}
                      {isActive && (
                        <div className="px-6 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500 border-t border-white/5 bg-white/[0.01]">
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 px-1">Group Pulse definitions</h4>
                            <div className="space-y-2.5">
                              {Object.keys(grant.sheetDefinitions || {}).length > 0 ? (
                                Object.keys(grant.sheetDefinitions).map(sheetName => (
                                  <div key={sheetName} className="flex items-center justify-between p-5 bg-black border border-white/5 rounded-2xl group/sheet hover:border-white/20 transition-all shadow-inner">
                                    <span className="text-xs font-black uppercase text-white/80">{sheetName}</span>
                                    <div className="flex items-center gap-5 text-white/20">
                                      <button className="hover:text-white transition-colors"><Eye className="h-4 w-4" /></button>
                                      <button className="hover:text-white transition-colors"><Users className="h-4 w-4" /></button>
                                      <button className="hover:text-primary transition-colors" onClick={() => { setSelectedSheetDef(grant.sheetDefinitions[sheetName]); setActiveGrantIdForSchema(grant.id); setIsColumnSheetOpen(true); }}><Wrench className="h-4 w-4" /></button>
                                      <button className="hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white">No Groups Configured</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Functional Pulse Cluster */}
                          <div className="flex items-center gap-2 mt-6">
                            <Button 
                              variant="outline" 
                              onClick={handleAddSheet}
                              className="flex-1 h-11 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/80 transition-all active:scale-95"
                            >
                              <PlusCircle className="h-3.5 w-3.5" /> Add Manually
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleImportTemplate}
                              className="flex-1 h-11 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/80 transition-all active:scale-95"
                            >
                              <FileUp className="h-3.5 w-3.5" /> Import Template
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => { setActiveView('IMPORT'); onOpenChange(false); }}
                              className="flex-1 h-11 rounded-xl bg-white/[0.02] border-white/10 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-white/5 text-white/80 transition-all active:scale-95"
                            >
                              <ScanSearch className="h-3.5 w-3.5" /> Scan & Import Data
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

          <div className="p-10 bg-black border-t border-white/5">
            <SheetFooter className="flex-row justify-start">
              <SheetClose asChild>
                <Button variant="ghost" className="h-14 px-12 rounded-2xl bg-white/[0.05] text-white font-black uppercase text-[11px] tracking-[0.25em] hover:bg-white/10 transition-all active:scale-95">
                  Dismiss
                </Button>
              </SheetClose>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx,.xls" />
      
      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={originalSheetName}
          onSave={(orig, newDef, all) => {
            const updatedGrants = appSettings.grants.map(grant => {
              if (grant.id === activeGrantForSchema) {
                const newSheetDefs = { ...grant.sheetDefinitions };
                if (all) {
                  Object.keys(newSheetDefs).forEach(k => { newSheetDefs[k] = { ...newDef, name: k }; });
                } else {
                  newSheetDefs[newDef.name] = newDef;
                  if (orig && orig !== newDef.name) delete newSheetDefs[orig];
                }
                return { ...grant, sheetDefinitions: newSheetDefs };
              }
              return grant;
            });
            const nextSettings = { ...appSettings, grants: updatedGrants };
            setAppSettings(nextSettings);
            storage.saveSettings(nextSettings);
            if (isOnline) FirestoreService.updateSettings(nextSettings);
          }}
        />
      )}
    </>
  );
}
