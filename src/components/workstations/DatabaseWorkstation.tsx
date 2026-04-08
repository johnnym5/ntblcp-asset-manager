'use client';

/**
 * @fileOverview DatabaseWorkstation - Granular Registry Orchestration.
 * Overhauled from raw JSON editing to a structured Management Workstation.
 * Phase 300: Implemented Properties/Logic view modes and high-density explorer UI.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Monitor,
  Terminal,
  Activity,
  ShieldAlert,
  Smartphone,
  Search,
  X,
  ChevronRight,
  Plus,
  Edit3,
  FileJson,
  Layers,
  Cloud,
  Check,
  ChevronDown,
  ArrowRightLeft,
  ShieldCheck,
  Bomb,
  Settings,
  Code,
  ListTree,
  Tag,
  Clock,
  Eye,
  ArrowRight,
  Zap,
  Cpu,
  Hammer,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn, sanitizeSearch } from '@/lib/utils';
import type { StorageLayer, DBNode } from '@/types/virtual-db';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DatabaseWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { assets, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Explorer State
  const [activeLayer, setActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [activeCollection, setActiveCollection] = useState('assets');
  const [nodes, setNodes] = useState<DBNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // CRUD State
  const [editingNode, setEditingNode] = useState<DBNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<DBNode | null>(null);
  const [editorTab, setEditorTab] = useState<'PROPERTIES' | 'LOGIC'>('PROPERTIES');

  useEffect(() => {
    loadNodes();
  }, [activeLayer, activeCollection, assets]);

  const loadNodes = async () => {
    setLoading(true);
    try {
      const data = await VirtualDBService.getDocuments(activeLayer, activeCollection);
      setNodes(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(n => 
      n.displayName.toLowerCase().includes(term) || 
      n.rawKey.toLowerCase().includes(term) ||
      (n.data && JSON.stringify(n.data).toLowerCase().includes(term))
    );
  }, [nodes, searchTerm]);

  const handleEdit = (node: DBNode) => {
    setEditingNode(node);
    setJsonValue(JSON.stringify(node.data || {}, null, 2));
    setEditorTab('PROPERTIES');
  };

  const handleCreate = () => {
    setIsCreating(true);
    setJsonValue(JSON.stringify({ id: crypto.randomUUID() }, null, 2));
    setEditorTab('LOGIC');
  };

  const handleSaveNode = async () => {
    setIsProcessing(true);
    try {
      const parsedData = JSON.parse(jsonValue);
      const path = editingNode ? editingNode.path : `${activeCollection}/${parsedData.id || crypto.randomUUID()}`;
      
      await VirtualDBService.updateNode(activeLayer, path, parsedData);
      toast({ title: "Node Synchronized", description: "Storage state updated successfully." });
      setEditingNode(null);
      setIsCreating(false);
      await refreshRegistry();
    } catch (e) {
      toast({ variant: "destructive", title: "Logic Pulse Failed", description: "The JSON structure is invalid." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProp = (key: string, value: any) => {
    try {
      const current = JSON.parse(jsonValue);
      current[key] = value;
      setJsonValue(JSON.stringify(current, null, 2));
    } catch (e) {}
  };

  const handleDelete = async (node: DBNode) => {
    setIsProcessing(true);
    try {
      await VirtualDBService.deleteNode(activeLayer, node.path);
      toast({ title: "Node Purged", description: "Record destroyed deterministically." });
      setNodeToDelete(null);
      await refreshRegistry();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const node = nodes.find(n => n.id === id);
        if (node) await VirtualDBService.deleteNode(activeLayer, node.path);
      }
      toast({ title: "Batch Purge Complete", description: `Destroyed ${selectedIds.size} records.` });
      setSelectedIds(new Set());
      await refreshRegistry();
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredNodes.map(n => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  if (userProfile?.role !== 'SUPERADMIN') return null;

  const nodeData = useMemo(() => {
    try { return JSON.parse(jsonValue); } catch (e) { return {}; }
  }, [jsonValue]);

  return (
    <div className={cn("space-y-10 animate-in fade-in duration-700", !isEmbedded && "max-w-7xl mx-auto pb-40")}>
      
      {/* 1. Controller Pulse */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        {!isEmbedded && (
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/5 shadow-inner">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase text-foreground tracking-tight leading-none">Database Explorer</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-60">Granular Cross-Layer Management</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border shadow-inner backdrop-blur-xl">
          {(['FIRESTORE', 'RTDB', 'LOCAL'] as StorageLayer[]).map(layer => (
            <button 
              key={layer}
              onClick={() => { setActiveLayer(layer); setSelectedIds(new Set()); }}
              className={cn(
                "px-8 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm",
                activeLayer === layer ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Workstation Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-1">
        
        {/* Collection Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Cluster Map</h4>
            <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">v5.0.4</Badge>
          </div>
          <div className="space-y-2">
            {[
              { id: 'assets', label: 'Asset Registry', icon: Database },
              { id: 'audit_logs', label: 'Activity Ledger', icon: Activity },
              { id: 'error_logs', label: 'Resilience Audit', icon: ShieldAlert },
              { id: 'config/settings', label: 'Governance Settings', icon: Settings }
            ].map(col => (
              <button 
                key={col.id}
                onClick={() => { setActiveCollection(col.id); setSelectedIds(new Set()); }}
                className={cn(
                  "w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all group relative overflow-hidden",
                  activeCollection === col.id ? "bg-primary/5 border-primary shadow-xl text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={cn("p-2.5 rounded-xl transition-colors", activeCollection === col.id ? "bg-primary/10" : "bg-muted")}>
                    <col.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-tight">{col.label}</span>
                </div>
                <ChevronRight className={cn("h-4 w-4 opacity-20 transition-all", activeCollection === col.id && "opacity-100 translate-x-1")} />
              </button>
            ))}
          </div>

          <Card className="rounded-[2rem] border-2 border-dashed border-border bg-muted/10 p-6 text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto"><Cpu className="h-6 w-6 text-primary" /></div>
            <div className="space-y-1">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">Node Monitoring</h5>
              <p className="text-[9px] font-medium text-muted-foreground italic leading-relaxed">System observing {activeLayer} layer logic pulse.</p>
            </div>
          </Card>
        </aside>

        {/* Document Explorer */}
        <Card className="lg:col-span-9 bg-card border-2 border-border shadow-3xl rounded-[2.5rem] overflow-hidden flex flex-col h-[750px]">
          <div className="p-8 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Scan identities or data contents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                className="h-14 pl-14 bg-background border-none rounded-2xl text-sm font-medium shadow-inner placeholder:text-muted-foreground/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-muted text-foreground h-8 px-4 rounded-xl font-mono text-[10px] border-border">{filteredNodes.length} NODES</Badge>
              <Button onClick={handleCreate} className="h-14 px-8 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2.5 shadow-xl shadow-primary/20 transition-transform active:scale-95">
                <Plus className="h-4 w-4" /> Create Node
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-0">
              <Table>
                <TableHeader className="bg-muted/30 border-b sticky top-0 z-20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-8">
                      <Checkbox 
                        checked={selectedIds.size === filteredNodes.length && filteredNodes.length > 0} 
                        onCheckedChange={(c) => toggleAll(!!c)}
                        className="h-5 w-5 rounded-lg border-2 border-border"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Technical Identification</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Logical State</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Pulse Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-[500px] text-center"><div className="flex flex-col items-center gap-4 opacity-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest">Replaying Cluster Pulse...</p></div></TableCell></TableRow>
                  ) : filteredNodes.length > 0 ? (
                    filteredNodes.map(node => (
                      <TableRow key={node.id} className="group hover:bg-primary/[0.02] border-b last:border-0 transition-colors">
                        <TableCell className="px-8">
                          <Checkbox 
                            checked={selectedIds.has(node.id)} 
                            onCheckedChange={() => toggleSelect(node.id)}
                            className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary"
                          />
                        </TableCell>
                        <TableCell className="py-6 px-6">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-[10px] text-primary font-black uppercase tracking-tight">{node.rawKey}</span>
                            <div className="flex items-center gap-2 opacity-40">
                              <Tag className="h-2.5 w-2.5" />
                              <span className="text-[8px] font-black uppercase tracking-widest">Path: {node.path}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-6">
                          <div className="flex flex-col gap-1.5 min-w-[200px]">
                            <span className="text-sm font-black uppercase text-foreground leading-none truncate max-w-[280px]">{node.displayName}</span>
                            {node.lastUpdated && (
                              <div className="flex items-center gap-2 text-muted-foreground/60">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-[8px] font-bold uppercase">{new Date(node.lastUpdated).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-6 pr-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(node)} className="h-10 w-10 rounded-xl bg-muted/50 text-primary opacity-40 hover:opacity-100 hover:bg-primary/10 transition-all"><Edit3 className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[8px] font-black uppercase">Edit Node</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button variant="ghost" size="icon" onClick={() => setNodeToDelete(node)} className="h-10 w-10 rounded-xl bg-muted/50 text-destructive/40 hover:opacity-100 hover:bg-destructive/10 transition-all"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-[500px] text-center opacity-20"><Database className="h-20 w-16 mx-auto mb-6 text-muted-foreground" /><h3 className="text-2xl font-black uppercase tracking-widest">Cluster Silent</h3><p className="text-xs font-medium italic">No nodes matching current criteria.</p></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {/* Table Footer Actions */}
          {selectedIds.size > 0 && (
            <div className="p-6 bg-primary/[0.02] border-t border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-black font-black text-xs shadow-lg">{selectedIds.size}</div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Documents Selected for Batch Pulse</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedIds(new Set())} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">Deselect All</Button>
                <Button onClick={handleBatchDelete} className="h-12 px-10 rounded-xl bg-destructive text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 gap-3">
                  <Trash2 className="h-4 w-4" /> Purge Selection
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Global Maintenance Protocol */}
      <div className="px-1 space-y-8 mt-12 border-t pt-12 border-dashed">
        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-4 px-1">
          <ShieldAlert className="h-6 w-6 text-destructive" /> Security & Infrastructure Pulses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
            <div className="p-3 bg-muted rounded-xl w-fit"><Smartphone className="h-6 w-6 text-muted-foreground" /></div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase">Purge Local</h4>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Clear all asset records and staging queues on this device only.</p>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">Initialize Purge</Button>
          </Card>

          <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
            <div className="p-3 bg-muted rounded-xl w-fit"><Activity className="h-6 w-6 text-muted-foreground" /></div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase">Wipe Mirror</h4>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Destroy all hot-standby records in the Realtime Database shadow.</p>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">Initialize Wipe</Button>
          </Card>

          <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
            <div className="p-3 bg-muted rounded-xl w-fit"><Cloud className="h-6 w-6 text-muted-foreground" /></div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase">Reset Cloud</h4>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Permanently clear the authoritative assets collection in Firestore.</p>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">Initialize Reset</Button>
          </Card>

          <Card className="bg-destructive/5 border-2 border-destructive/20 p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Bomb className="h-20 w-20 text-destructive" /></div>
            <div className="p-3 bg-destructive/10 rounded-xl w-fit"><Hammer className="h-6 w-6 text-destructive" /></div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-destructive">Nuclear Reset</h4>
              <p className="text-[10px] font-medium text-destructive/60 italic leading-relaxed">Destroy all data across Cloud, Mirror, and Local storage tiers instantly.</p>
            </div>
            <Button className="w-full h-12 rounded-xl bg-destructive text-white font-black uppercase text-[9px] tracking-widest shadow-2xl transition-transform active:scale-95">Execute Global Purge</Button>
          </Card>
        </div>
      </div>

      {/* High-Fidelity Editor Dialog */}
      <Dialog open={!!editingNode || isCreating} onOpenChange={() => { setEditingNode(null); setIsCreating(false); }}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-background border-none rounded-[2.5rem] shadow-3xl flex flex-col">
          
          {/* Editor Header */}
          <div className="p-8 border-b bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-primary/10 rounded-2xl shadow-inner"><Monitor className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">{isCreating ? 'Initialize Document' : 'Registry Synchronizer'}</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                      Technical Data Pulse Editor & Parity Bridge
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="h-8 px-4 font-black uppercase border-primary/20 text-primary bg-primary/5">{activeLayer}</Badge>
                  <span className="font-mono text-[8px] opacity-40 uppercase tracking-widest">{activeCollection}</span>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Interaction Mode Selection */}
          <div className="px-8 py-4 bg-muted/5 border-b border-dashed border-border shrink-0">
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border w-fit">
              <button 
                onClick={() => setEditorTab('PROPERTIES')}
                className={cn(
                  "px-6 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all",
                  editorTab === 'PROPERTIES' ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2"><ListTree className="h-3 w-3" /> Properties View</div>
              </button>
              <button 
                onClick={() => setEditorTab('LOGIC')}
                className={cn(
                  "px-6 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all",
                  editorTab === 'LOGIC' ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2"><Code className="h-3 w-3" /> Logic View (Raw)</div>
              </button>
            </div>
          </div>

          {/* Scrollable Content Pane */}
          <ScrollArea className="flex-1 bg-background">
            <div className="p-8 pb-32">
              <AnimatePresence mode="wait">
                {editorTab === 'PROPERTIES' ? (
                  <motion.div 
                    key="props"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-10"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-1">
                        <Zap className="h-4 w-4 text-primary" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Data pulse attributes</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {Object.entries(nodeData).map(([key, value]) => {
                          const isObject = typeof value === 'object' && value !== null;
                          return (
                            <div key={key} className="space-y-2 group/prop">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground group-hover/prop:text-primary transition-colors tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                {isObject && <Badge variant="outline" className="text-[7px] font-mono opacity-40">NESTED_SCHEMA</Badge>}
                              </div>
                              {isObject ? (
                                <div className="p-4 rounded-xl bg-muted/20 border-2 border-dashed border-border/40 font-mono text-[9px] text-muted-foreground break-all leading-relaxed">
                                  {JSON.stringify(value)}
                                </div>
                              ) : (
                                <Input 
                                  value={String(value)}
                                  onChange={(e) => handleUpdateProp(key, e.target.value)}
                                  className="h-12 bg-muted/10 border-2 border-border/40 rounded-xl text-xs font-bold focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all shadow-sm" 
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="logic"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 h-full"
                  >
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Raw logic schema</h4>
                      <Badge variant="outline" className="bg-black text-primary border-primary/20 text-[8px] font-mono uppercase tracking-widest">application/json</Badge>
                    </div>
                    <div className="relative group">
                      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-40 transition-opacity">
                        <Code className="h-10 w-10 text-primary" />
                      </div>
                      <Textarea 
                        value={jsonValue}
                        onChange={(e) => setJsonValue(e.target.value)}
                        className="min-h-[500px] font-mono text-[11px] leading-relaxed bg-[#050505] text-green-500 border-2 border-border/40 focus:border-primary/40 rounded-2xl p-10 custom-scrollbar resize-none shadow-2xl selection:bg-primary/20"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Footer Controls */}
          <div className="p-8 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-4 pb-safe shadow-3xl">
            <div className="flex items-start gap-4 max-w-md">
              <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0"><Info className="h-5 w-5 text-blue-600" /></div>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed italic">
                Modifications are atomic. Committed changes are broadcast immediately to the {activeLayer} cluster.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setEditingNode(null); setIsCreating(false); }} className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground">Abort Protocol</Button>
              <Button 
                onClick={handleSaveNode} 
                disabled={isProcessing}
                className="h-16 px-12 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black transition-all hover:scale-105 active:scale-95 min-w-[260px] gap-3"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Commit Storage Pulse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation Dialog */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={setNodeToDelete}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Trash2 className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive leading-none">Purge Node Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This action will destroy the record <strong>{nodeToDelete?.displayName}</strong> in the {activeLayer} storage cluster. This pulse is irreversible and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted transition-all">Cancel Purge</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => nodeToDelete && handleDelete(nodeToDelete)} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0 transition-transform active:scale-95"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />}
              Execute Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
