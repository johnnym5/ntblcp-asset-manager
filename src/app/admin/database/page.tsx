'use client';

/**
 * @fileOverview Super Admin Database Mission Control.
 * Phase 51: Launched Conflict Resolution Wizard & Cross-Layer Copy/Move logic.
 */

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  Monitor, 
  Database, 
  Server, 
  HardDrive, 
  ChevronRight, 
  Search, 
  FileJson, 
  RefreshCw, 
  Trash2,
  Copy,
  Save,
  ShieldAlert,
  Loader2,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  ScanSearch,
  History,
  Cloud,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Zap,
  Bomb,
  Hammer,
  ShieldHalf,
  ArrowRightLeft,
  ArrowUpRight,
  Split
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';
import type { DBNode, DisplayMode } from '@/types/virtual-db';
import type { StorageLayer } from '@/types/domain';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DatabaseExplorerPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [activeLayer, setActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('MIXED');
  const [nodes, setNodes] = useState<DBNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<DBNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  
  const [parityData, setParityData] = useState<Record<StorageLayer, any> | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [discrepancyIds, setDiscrepancyIds] = useState<string[]>([]);

  // Advanced Deletion State
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [layerToPurge, setLayerToPurge] = useState<StorageLayer | null>(null);

  // Conflict Resolution State
  const [isConflictView, setIsConflictView] = useState(false);

  useEffect(() => {
    loadRootNodes();
    runGlobalScan();
  }, [activeLayer, isConflictView]);

  const loadRootNodes = async () => {
    setLoading(true);
    try {
      if (isConflictView) {
        const assets = await VirtualDBService.getDocuments(activeLayer, 'assets');
        setNodes(assets.filter(n => discrepancyIds.includes(n.rawKey)));
      } else {
        const root = await VirtualDBService.getLogicalGroups(activeLayer);
        setNodes(root);
      }
    } finally {
      setLoading(false);
    }
  };

  const runGlobalScan = async () => {
    const ids = await VirtualDBService.getGlobalDiscrepancies();
    setDiscrepancyIds(ids);
  };

  const loadParity = async (path: string) => {
    setIsComparing(true);
    try {
      const data = await VirtualDBService.compareNodeAcrossLayers(path);
      setParityData(data);
    } finally {
      setIsComparing(false);
    }
  };

  const toggleExpand = async (node: DBNode) => {
    if (node.type !== 'COLLECTION') {
      setSelectedNode(node);
      setEditedData(JSON.stringify(node.data, null, 2));
      loadParity(node.path);
      return;
    }

    const isExpanded = expandedPaths.has(node.path);
    const newExpanded = new Set(expandedPaths);

    if (isExpanded) {
      newExpanded.delete(node.path);
    } else {
      newExpanded.add(node.path);
      setLoading(true);
      const children = await VirtualDBService.getDocuments(node.source, node.path);
      setNodes(prev => {
        const idx = prev.findIndex(n => n.id === node.id);
        const next = [...prev];
        next.splice(idx + 1, 0, ...children);
        return next;
      });
      setLoading(false);
    }
    setExpandedPaths(newExpanded);
  };

  const handleCommit = async () => {
    if (!selectedNode) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(editedData);
      await VirtualDBService.updateNode(selectedNode.source, selectedNode.path, data);
      toast({ title: "Mutation Committed", description: `Updated ${selectedNode.displayName} pulse.` });
      loadRootNodes();
    } catch (e) {
      toast({ variant: "destructive", title: "Syntax Error", description: "Invalid JSON schema." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReconcile = async (from: StorageLayer, to: StorageLayer) => {
    if (!selectedNode) return;
    setIsSaving(true);
    try {
      await VirtualDBService.copyNode(selectedNode.path, from, to);
      toast({ title: "Parity Established", description: `Synchronized ${from} to ${to}.` });
      loadParity(selectedNode.path);
      runGlobalScan();
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async (layer: StorageLayer) => {
    if (!parityData || !selectedNode) return;
    const authoritativeData = parityData[layer];
    if (!authoritativeData) return;

    setIsSaving(true);
    try {
      await VirtualDBService.resolveConflict(selectedNode.path, authoritativeData);
      toast({ title: "Conflict Resolved", description: `Record parity established using ${layer} pulse.` });
      runGlobalScan();
      loadParity(selectedNode.path);
    } catch (e) {
      toast({ variant: "destructive", title: "Resolution Failure" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeLayer = async () => {
    if (!layerToPurge) return;
    setIsSaving(true);
    try {
      await VirtualDBService.purgeLayer(layerToPurge);
      toast({ title: "Layer Purged", description: `Deterministic wipe of ${layerToPurge} complete.` });
      loadRootNodes();
      setSelectedNode(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Failure", description: "Storage layer is currently locked." });
    } finally {
      setIsSaving(false);
      setIsPurgeDialogOpen(false);
    }
  };

  const getSourceColor = (layer: StorageLayer) => {
    switch (layer) {
      case 'FIRESTORE': return 'text-blue-500';
      case 'RTDB': return 'text-green-500';
      case 'LOCAL': return 'text-amber-500';
      default: return 'text-primary';
    }
  };

  if (!userProfile?.isAdmin) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
          <ShieldAlert className="h-20 w-20" />
          <h2 className="text-xl font-black uppercase tracking-widest">Clearance Required</h2>
        </div>
      </AppLayout>
    );
  }

  const forensics = selectedNode?.data?.previousState;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              Mission Control
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              High-Availability Multi-Layer Registry Orchestration
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner">
              <Button variant={displayMode === 'FRIENDLY' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDisplayMode('FRIENDLY')} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest">Friendly</Button>
              <Button variant={displayMode === 'MIXED' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDisplayMode('MIXED')} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest">Mixed</Button>
              <Button variant={displayMode === 'TECHNICAL' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDisplayMode('TECHNICAL')} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest">Technical</Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setIsConflictView(!isConflictView); setSelectedNode(null); }}
              className={cn("h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 border-2 transition-all", isConflictView ? "bg-destructive text-white border-destructive" : "text-destructive border-destructive/20 hover:bg-destructive/5")}
            >
              <Split className="h-3.5 w-3.5" /> {isConflictView ? 'Exit Conflict Mode' : 'Resolve Conflicts'}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Tree Explorer */}
          <Card className="lg:col-span-3 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/20 border-b p-6 space-y-4">
              <div className="grid grid-cols-3 bg-background/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner h-12">
                <button onClick={() => setActiveLayer('FIRESTORE')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'FIRESTORE' ? "bg-blue-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><Server className="h-3 w-3" /> Cloud</button>
                <button onClick={() => setActiveLayer('RTDB')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'RTDB' ? "bg-green-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><Activity className="h-3 w-3" /> Mirror</button>
                <button onClick={() => setActiveLayer('LOCAL')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'LOCAL' ? "bg-amber-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><HardDrive className="h-3 w-3" /> Local</button>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                <Input placeholder="Scan Nodes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl bg-background border-none shadow-inner text-xs font-bold" />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4 bg-background/30">
              <div className="space-y-1">
                {loading ? (
                  <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-[10px] font-black uppercase">Retrieving...</span>
                  </div>
                ) : nodes.map((node) => {
                  const isConflict = discrepancyIds.includes(node.rawKey);
                  return (
                    <button key={node.id} onClick={() => toggleExpand(node)} className={cn("w-full text-left px-4 py-3 rounded-xl transition-all group flex items-center justify-between border-2 border-transparent hover:bg-primary/5", selectedNode?.id === node.id ? "bg-primary/10 border-primary/20 shadow-sm" : "")}>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-black uppercase tracking-tight truncate", isConflict && "text-destructive")}>{displayMode === 'TECHNICAL' ? node.rawKey : node.displayName}</span>
                          {isConflict && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                        </div>
                        {displayMode !== 'FRIENDLY' && <span className="text-[8px] font-mono text-muted-foreground opacity-60 truncate">{node.path}</span>}
                      </div>
                      {node.type === 'COLLECTION' ? (
                        <ChevronRight className={cn("h-3 w-3 opacity-20 transition-transform", expandedPaths.has(node.path) && "rotate-90")} />
                      ) : (
                        <FileJson className={cn("h-3 w-3 opacity-40", getSourceColor(node.source))} />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Context & Parity Panel */}
          <Card className="lg:col-span-5 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/20 border-b p-6">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedNode.displayName}</h3>
                    <Badge className={cn("font-black uppercase text-[8px] px-3 h-6", getSourceColor(selectedNode.source))}>{selectedNode.source}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-background/50 border-2 border-dashed border-border/40 space-y-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Registry Parity</span>
                      <p className={cn("text-[10px] font-bold uppercase", discrepancyIds.includes(selectedNode.rawKey) ? "text-destructive" : "text-green-600")}>
                        {discrepancyIds.includes(selectedNode.rawKey) ? 'Discrepancy' : 'Synchronized'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/50 border-2 border-dashed border-border/40 space-y-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Last Pulse</span>
                      <p className="text-[10px] font-bold uppercase truncate">{selectedNode.lastUpdated || 'Never'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center opacity-20 space-y-2">
                  <Layers className="h-10 w-10 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Pulse Selection</p>
                </div>
              )}
            </CardHeader>
            <ScrollArea className="flex-1 bg-background/30">
              <div className="p-6">
                <Tabs defaultValue={isConflictView ? "wizard" : "parity"}>
                  <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
                    <TabsTrigger value="parity" className="text-[10px] font-black uppercase">Parity Pulse</TabsTrigger>
                    {isConflictView && <TabsTrigger value="wizard" className="text-[10px] font-black uppercase">Resolution Wizard</TabsTrigger>}
                    <TabsTrigger value="forensics" className="text-[10px] font-black uppercase">Forensic Diff</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="parity">
                    {isComparing ? (
                      <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-[10px] font-black uppercase">Auditing Layers...</span>
                      </div>
                    ) : parityData ? (
                      <div className="space-y-6">
                        {['FIRESTORE', 'RTDB', 'LOCAL'].map((layer) => {
                          const data = parityData[layer as StorageLayer];
                          return (
                            <div key={layer} className="p-5 rounded-2xl border-2 border-border/40 bg-card/50 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-xl bg-opacity-10", layer === 'FIRESTORE' ? "bg-blue-500 text-blue-500" : layer === 'RTDB' ? "bg-green-500 text-green-500" : "bg-amber-500 text-amber-500")}>
                                  <Database className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase">{layer} State</span>
                                  <span className="text-[8px] font-bold opacity-40">{data ? 'RECORD DETECTED' : 'VOID'}</span>
                                </div>
                              </div>
                              {data && <Button variant="outline" size="sm" onClick={() => setEditedData(JSON.stringify(data, null, 2))} className="h-8 text-[8px] font-black uppercase">View Pulse</Button>}
                            </div>
                          );
                        })}
                        <div className="p-6 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Authority Reconciler</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => handleReconcile('LOCAL', 'FIRESTORE')} className="h-10 text-[8px] font-black uppercase gap-2"><Cloud className="h-3 w-3" /> Local &gt; Cloud</Button>
                            <Button variant="outline" onClick={() => handleReconcile('FIRESTORE', 'LOCAL')} className="h-10 text-[8px] font-black uppercase gap-2"><HardDrive className="h-3 w-3" /> Cloud &gt; Local</Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="wizard">
                    {parityData && (
                      <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-destructive/5 border-2 border-dashed border-destructive/20 space-y-2">
                          <div className="flex items-center gap-3">
                            <Split className="h-5 w-5 text-destructive" />
                            <h4 className="text-sm font-black uppercase">Resolution Wizard</h4>
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground italic">Pick an authoritative storage pulse to resolve the sync drift for this record.</p>
                        </div>
                        
                        <div className="space-y-3">
                          {['FIRESTORE', 'RTDB', 'LOCAL'].map((layer) => (
                            <button
                              key={`resolve-${layer}`}
                              onClick={() => handleResolve(layer as StorageLayer)}
                              disabled={!parityData[layer as StorageLayer]}
                              className="w-full p-5 rounded-2xl border-2 border-border/40 hover:border-primary/40 bg-card flex items-center justify-between group transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors", getSourceColor(layer as StorageLayer))}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase">Enforce {layer} Pulse</span>
                              </div>
                              <ArrowUpRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="forensics">
                    {forensics ? (
                      <div className="space-y-6">
                        <div className="p-6 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20">
                          <div className="flex items-center gap-3 mb-4">
                            <ScanSearch className="h-5 w-5 text-orange-600" />
                            <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Audit Buffer Detected</h4>
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                            Compare the current pulse with its previous stable version. Use the reversion pulse to roll back unintended changes.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase opacity-40">Previous State</span>
                            <div className="p-4 rounded-xl bg-muted/20 border-2 border-border/40 font-mono text-[9px] overflow-hidden truncate">
                              {JSON.stringify(forensics).substring(0, 100)}...
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase opacity-40">Active State</span>
                            <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20 font-mono text-[9px] overflow-hidden truncate">
                              {JSON.stringify(selectedNode?.data).substring(0, 100)}...
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => VirtualDBService.restoreNode(selectedNode!.source, selectedNode!.path)} className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-blue-600 border-blue-200">
                          <RotateCcw className="h-4 w-4" /> Restore Previous Pulse
                        </Button>
                      </div>
                    ) : (
                      <div className="py-20 text-center opacity-20 space-y-4">
                        <ScanSearch className="h-16 w-16 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Historical Buffer Found</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </Card>

          {/* Record Mutator Panel */}
          <Card className="lg:col-span-4 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            {selectedNode ? (
              <>
                <CardHeader className="bg-muted/20 border-b p-6">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Record Mutator</span>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1 bg-background/30">
                  <div className="p-6 h-full flex flex-col gap-6">
                    <div className="flex-1 relative rounded-2xl border-2 border-border/40 bg-muted/10 overflow-hidden min-h-[300px]">
                      <textarea value={editedData} onChange={(e) => setEditedData(e.target.value)} className="w-full h-full p-6 font-mono text-[10px] bg-transparent outline-none resize-none" spellCheck="false" />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="h-12 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2"><Copy className="h-3.5 w-3.5" /> Clone</Button>
                        <Button variant="outline" className="h-12 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 text-destructive border-destructive/20"><Trash2 className="h-3.5 w-3.5" /> Purge</Button>
                      </div>
                      <Button onClick={handleCommit} disabled={isSaving} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commit Mutation
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-20 space-y-6">
                <Database className="h-16 w-14" />
                <h3 className="text-xl font-black uppercase tracking-[0.2em]">Inspector Inactive</h3>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 shadow-2xl p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Wipe Layer Pulse?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed italic">
                You are about to perform a deterministic wipe of the <strong>{layerToPurge}</strong> registry. This action is immutable and will clear all logical groups in this source. Recovery is only possible via a Reconstruct Pulse from a peer layer.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Abort Purge</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePurgeLayer}
              disabled={isSaving}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/20 bg-destructive text-white m-0"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}
              Commit Wipe Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
