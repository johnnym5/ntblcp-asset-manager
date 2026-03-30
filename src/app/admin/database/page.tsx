'use client';

/**
 * @fileOverview Super Admin Database Mission Control.
 * Advanced three-panel explorer for managing Firestore, RTDB, and Local storage.
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
  Info,
  Terminal,
  Activity,
  History,
  LayoutGrid,
  Clock,
  Layers,
  ArrowRightLeft,
  Settings,
  MoreVertical,
  ChevronDown,
  ExternalLink,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';
import type { DBNode, DisplayMode } from '@/types/virtual-db';
import type { StorageLayer } from '@/types/domain';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatabaseExplorerPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // UI State
  const [activeLayer, setActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('MIXED');
  const [nodes, setNodes] = useState<DBNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<DBNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRootNodes();
  }, [activeLayer]);

  const loadRootNodes = async () => {
    setLoading(true);
    try {
      const root = await VirtualDBService.getLogicalGroups(activeLayer);
      setNodes(root);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (node: DBNode) => {
    if (node.type !== 'COLLECTION') {
      setSelectedNode(node);
      setEditedData(JSON.stringify(node.data, null, 2));
      return;
    }

    const isExpanded = expandedPaths.has(node.path);
    const newExpanded = new Set(expandedPaths);

    if (isExpanded) {
      newExpanded.delete(node.path);
      // Logic to remove children from flat list could be added here
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
      // Refresh logic
    } catch (e) {
      toast({ variant: "destructive", title: "Syntax Error", description: "Invalid JSON schema." });
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    if (!selectedNode) return [];
    const parts = selectedNode.path.split('/');
    return parts.map((p, i) => ({
      label: p,
      path: parts.slice(0, i + 1).join('/')
    }));
  }, [selectedNode]);

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

  const getSourceColor = (layer: StorageLayer) => {
    switch (layer) {
      case 'FIRESTORE': return 'text-blue-500';
      case 'RTDB': return 'text-green-500';
      case 'LOCAL': return 'text-amber-500';
      default: return 'text-primary';
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-700">
        {/* Header Control Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              Mission Control
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              In-App Database Orchestration & Multi-Layer Management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner">
              <Button 
                variant={displayMode === 'FRIENDLY' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDisplayMode('FRIENDLY')}
                className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >Friendly</Button>
              <Button 
                variant={displayMode === 'MIXED' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDisplayMode('MIXED')}
                className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >Mixed</Button>
              <Button 
                variant={displayMode === 'TECHNICAL' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDisplayMode('TECHNICAL')}
                className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >Technical</Button>
            </div>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 border-2">
              <RefreshCw className="h-3.5 w-3.5" /> Re-Sync View
            </Button>
          </div>
        </div>

        {/* Database Cockpit */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          
          {/* Left Panel: Tree & Source Switcher */}
          <Card className="lg:col-span-3 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/20 border-b p-6 space-y-4">
              <div className="grid grid-cols-3 bg-background/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner h-12">
                <button onClick={() => setActiveLayer('FIRESTORE')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'FIRESTORE' ? "bg-blue-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><Server className="h-3 w-3" /> Cloud</button>
                <button onClick={() => setActiveLayer('RTDB')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'RTDB' ? "bg-green-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><Activity className="h-3 w-3" /> Mirror</button>
                <button onClick={() => setActiveLayer('LOCAL')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'LOCAL' ? "bg-amber-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}><HardDrive className="h-3 w-3" /> Local</button>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                <Input 
                  placeholder="Scan Registry Nodes..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-background border-none shadow-inner text-xs font-bold"
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4 bg-background/30">
              <div className="space-y-1">
                {loading ? (
                  <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-[10px] font-black uppercase">Retrieving...</span>
                  </div>
                ) : nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => toggleExpand(node)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all group flex items-center justify-between border-2 border-transparent hover:bg-primary/5",
                      selectedNode?.id === node.id ? "bg-primary/10 border-primary/20 shadow-sm" : ""
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-black uppercase tracking-tight truncate">
                        {displayMode === 'TECHNICAL' ? node.rawKey : node.displayName}
                      </span>
                      {displayMode !== 'FRIENDLY' && (
                        <span className="text-[8px] font-mono text-muted-foreground opacity-60 truncate">
                          {node.path}
                        </span>
                      )}
                    </div>
                    {node.type === 'COLLECTION' ? (
                      <ChevronRight className={cn("h-3 w-3 opacity-20 transition-transform", expandedPaths.has(node.path) && "rotate-90")} />
                    ) : (
                      <FileJson className={cn("h-3 w-3 opacity-40", getSourceColor(node.source))} />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Middle Panel: List & Summary */}
          <Card className="lg:col-span-5 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/20 border-b p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg"><LayoutGrid className="h-4 w-4 text-primary" /></div>
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={b.path}>
                    <button className="text-[9px] font-black uppercase tracking-widest hover:text-primary transition-colors">{b.label}</button>
                    {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-20" />}
                  </React.Fragment>
                ))}
              </div>
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedNode.displayName}</h3>
                    <Badge className={cn("font-black uppercase text-[8px] px-3 h-6", getSourceColor(selectedNode.source))}>{selectedNode.source}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-background/50 border-2 border-dashed space-y-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Status</span>
                      <p className="text-[10px] font-bold uppercase">Synced</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/50 border-2 border-dashed space-y-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Last Pulse</span>
                      <p className="text-[10px] font-bold uppercase">2m ago</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center opacity-20 space-y-2">
                  <Layers className="h-10 w-10 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Selection</p>
                </div>
              )}
            </CardHeader>
            <ScrollArea className="flex-1 bg-background/30">
              <div className="p-6">
                {/* Dynamic list view for collections would go here */}
                <div className="flex flex-col items-center justify-center py-20 opacity-10">
                  <Search className="h-12 w-12 mb-4" />
                  <p className="text-xs font-black uppercase">Sub-records displayed here</p>
                </div>
              </div>
            </ScrollArea>
          </Card>

          {/* Right Panel: Inspector & Editor */}
          <Card className="lg:col-span-4 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            {selectedNode ? (
              <>
                <CardHeader className="bg-muted/20 border-b p-6">
                  <Tabs defaultValue="fields" className="w-full">
                    <TabsList className="grid grid-cols-3 bg-background/50 p-1 rounded-xl h-10 border-2 border-border/40">
                      <TabsTrigger value="fields" className="rounded-lg text-[8px] font-black uppercase">Fields</TabsTrigger>
                      <TabsTrigger value="sync" className="rounded-lg text-[8px] font-black uppercase">Sync</TabsTrigger>
                      <TabsTrigger value="history" className="rounded-lg text-[8px] font-black uppercase">History</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <ScrollArea className="flex-1 bg-background/30">
                  <div className="p-6 h-full flex flex-col gap-6">
                    <div className="flex-1 relative rounded-2xl border-2 border-border/40 bg-muted/10 overflow-hidden group hover:border-primary/20 transition-all shadow-inner min-h-[300px]">
                      <textarea 
                        value={editedData}
                        onChange={(e) => setEditedData(e.target.value)}
                        className="w-full h-full p-6 font-mono text-[10px] bg-transparent outline-none resize-none selection:bg-primary/20"
                        spellCheck="false"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest bg-muted h-5">JSON PULSE</Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Safe Operations</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="h-12 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 border-2"><Copy className="h-3.5 w-3.5" /> Copy to Layer</Button>
                        <Button variant="outline" className="h-12 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 border-2 text-destructive border-destructive/20 hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" /> Purge Pulse</Button>
                      </div>
                      <Button 
                        onClick={handleCommit}
                        disabled={isSaving}
                        className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-[1.02]"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commit Mutation
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-20 space-y-6">
                <div className="p-12 bg-muted rounded-[3rem] shadow-inner">
                  <Database className="h-16 w-14" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-[0.2em]">Select Pulse</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest max-w-xs mx-auto">Inspector activated upon selection.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
