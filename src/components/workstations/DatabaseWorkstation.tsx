'use client';

/**
 * @fileOverview Database Center - Granular Data Management.
 * Phase 1914: Simplified terminology (Database Center, Records, Clear Data).
 * Phase 1915: Hardened loadNodes with useCallback for build stability.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
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
  Info,
  RotateCcw
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Maintenance Protocol State
  const [isPurgeLocalOpen, setIsPurgeLocalOpen] = useState(false);
  const [isWipeMirrorOpen, setIsWipeMirrorOpen] = useState(false);
  const [isResetCloudOpen, setIsResetCloudOpen] = useState(false);
  const [isNuclearOpen, setIsNuclearOpen] = useState(false);

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VirtualDBService.getDocuments(activeLayer, activeCollection);
      setNodes(data);
    } finally {
      setLoading(false);
    }
  }, [activeLayer, activeCollection]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes, assets]);

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
      toast({ title: "Update Saved", description: "Record state updated successfully." });
      setEditingNode(null);
      setIsCreating(false);
      await refreshRegistry();
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed", description: "The data structure is invalid." });
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
      toast({ title: "Record Deleted", description: "The item has been removed." });
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
      toast({ title: "Batch Delete Complete", description: `Removed ${selectedIds.size} records.` });
      setSelectedIds(new Set());
      await refreshRegistry();
    } finally {
      setIsProcessing(false);
    }
  };

  // Maintenance Handlers
  const handleLocalPurge = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeLayer('LOCAL');
      toast({ title: "Local Data Cleared", description: "Device cache and staging queues deleted." });
      await refreshRegistry();
      setIsPurgeLocalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMirrorWipe = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeLayer('RTDB');
      toast({ title: "Standby Mirror Cleared", description: "The backup shadow data was purged." });
      await refreshRegistry();
      setIsWipeMirrorOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloudReset = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeLayer('FIRESTORE');
      toast({ title: "Cloud Data Reset", description: "All online records were deleted." });
      await refreshRegistry();
      setIsResetCloudOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGlobalNuclearReset = async () => {
    setIsProcessing(true);
    try {
      await VirtualDBService.purgeGlobalRegistry();
      toast({ title: "System Reset Complete", description: "All data cleared from all storage layers." });
      await refreshRegistry();
      setIsNuclearOpen(false);
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

  const nodeData = useMemo(() => {
    try { return JSON.parse(jsonValue); } catch (e) { return {}; }
  }, [jsonValue]);

  if (userProfile?.role !== 'SUPERADMIN') return null;

  return (
    <div className={cn("space-y-10 animate-in fade-in duration-700", !isEmbedded && "max-w-7xl mx-auto pb-40")}>
      
      {/* 1. Header Control */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        {!isEmbedded && (
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/5 shadow-inner">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase text-foreground tracking-tight leading-none">Database Hub</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-60">Advanced Record Management</p>
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

      {/* 2. Main Center Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-1">
        
        {/* Collection Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Cluster Map</h4>
            <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">v5.0.4</Badge>
          </div>
          <div className="space-y-2">
            {[
              { id: 'assets', label: 'Asset List', icon: Database },
              { id: 'audit_logs', label: 'Activity History', icon: Activity },
              { id: 'error_logs', label: 'System Health', icon: ShieldAlert },
              { id: 'config/settings', label: 'App Settings', icon: Settings }
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
              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">Monitoring Active</h5>
              <p className="text-[9px] font-medium text-muted-foreground italic leading-relaxed">System observing {activeLayer} storage node.</p>
            </div>
          </Card>
        </aside>

        {/* Explorer Hub */}
        <Card className="lg:col-span-9 bg-card border-2 border-border shadow-3xl rounded-[2.5rem] overflow-hidden flex flex-col h-[750px]">
          <div className="p-8 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search record IDs or data..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                className="h-14 pl-14 bg-background border-none rounded-2xl text-sm font-medium shadow-inner placeholder:text-muted-foreground/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-muted text-foreground h-8 px-4 rounded-xl font-mono text-[10px] border-border">{filteredNodes.length} RECORDS</Badge>
              <Button onClick={handleCreate} className="h-14 px-8 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2.5 shadow-xl shadow-primary/20 transition-transform active:scale-95">
                <Plus className="h-4 w-4" /> New Record
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
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Record Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Current State</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-5 px-6">Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-[500px] text-center"><div className="flex flex-col items-center gap-4 opacity-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest">Scanning Storage...</p></div></TableCell></TableRow>
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
                                <TooltipContent className="text-[8px] font-black uppercase">Edit Data</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button variant="ghost" size="icon" onClick={() => setNodeToDelete(node)} className="h-10 w-10 rounded-xl bg-muted/50 text-destructive/40 hover:opacity-100 hover:bg-destructive/10 transition-all"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-[500px] text-center opacity-20"><Database className="h-20 w-16 mx-auto mb-6 text-muted-foreground" /><h3 className="text-2xl font-black uppercase tracking-widest">Empty</h3><p className="text-xs font-medium italic">No records found matching your search.</p></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          {selectedIds.size > 0 && (
            <div className="p-6 bg-primary/[0.02] border-t border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-black font-black text-xs shadow-lg">{selectedIds.size}</div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Selected for Batch Deletion</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedIds(new Set())} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">Clear Selection</Button>
                <Button onClick={handleBatchDelete} className="h-12 px-10 rounded-xl bg-destructive text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 gap-3">
                  <Trash2 className="h-4 w-4" /> Delete Permanently
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Global Maintenance Zone */}
      <div className="px-1 mt-12 border-t pt-12 border-dashed">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="maintenance" className="border-none">
            <AccordionTrigger className="hover:no-underline py-6 px-6 bg-muted/20 rounded-[2rem] border-2 border-border/40 group data-[state=open]:rounded-b-none data-[state=open]:border-b-0 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-2xl group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground leading-none">Maintenance Center</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1.5 opacity-60">System Cleaning Protocols</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-muted/10 border-2 border-t-0 border-border/40 rounded-b-[2rem] p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
                  <div className="p-3 bg-muted rounded-xl w-fit"><Smartphone className="h-6 w-6 text-muted-foreground" /></div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase">Local Data</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Clear all records saved on this device only.</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsPurgeLocalOpen(true)} className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">
                    Clear Local Data
                  </Button>
                </Card>

                <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
                  <div className="p-3 bg-muted rounded-xl w-fit"><Activity className="h-6 w-6 text-muted-foreground" /></div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase">Standby Mirror</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Wipe the backup shadow database (RTDB).</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsWipeMirrorOpen(true)} className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">
                    Clear Mirror
                  </Button>
                </Card>

                <Card className="bg-card border-2 border-border p-6 space-y-6 group hover:border-primary/20 transition-all">
                  <div className="p-3 bg-muted rounded-xl w-fit"><Cloud className="h-6 w-6 text-muted-foreground" /></div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase">Online Storage</h4>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">Permanently clear all online records from Firestore.</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsResetCloudOpen(true)} className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-black uppercase text-[9px] tracking-widest border-2 border-destructive/10">
                    Clear Online Data
                  </Button>
                </Card>

                <Card className="bg-destructive/5 border-2 border-destructive/20 p-6 space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Bomb className="h-20 w-20 text-destructive" /></div>
                  <div className="p-3 bg-destructive/10 rounded-xl w-fit"><Hammer className="h-6 w-6 text-destructive" /></div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-destructive">Global Reset</h4>
                    <p className="text-[10px] font-medium text-destructive/60 italic leading-relaxed">Clear ALL data everywhere instantly.</p>
                  </div>
                  <Button onClick={() => setIsNuclearOpen(true)} className="w-full h-12 rounded-xl bg-destructive text-white font-black uppercase text-[9px] tracking-widest shadow-2xl transition-transform active:scale-95">
                    Execute Full Reset
                  </Button>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Record Editor Dialog */}
      <Dialog open={!!editingNode || isCreating} onOpenChange={(open) => { if (!open) { setEditingNode(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-background border-none rounded-[2.5rem] shadow-3xl flex flex-col">
          
          <div className="p-8 border-b bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-primary/10 rounded-2xl shadow-inner"><Monitor className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">{isCreating ? 'New Record' : 'Record Synchronizer'}</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                      Edit data directly in the {activeLayer} cluster.
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
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Record Attributes</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {Object.entries(nodeData).map(([key, value]) => {
                          const isObject = typeof value === 'object' && value !== null;
                          return (
                            <div key={key} className="space-y-2 group/prop">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground group-hover/prop:text-primary transition-colors tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                {isObject && <Badge variant="outline" className="text-[7px] font-mono opacity-40">NESTED_DATA</Badge>}
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
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Raw Data (JSON)</h4>
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

          <div className="p-8 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-4 pb-safe shadow-3xl">
            <div className="flex items-start gap-4 max-w-md">
              <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0"><Info className="h-5 w-5 text-blue-600" /></div>
              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                Updates are immediate. Committed changes will be broadcast to the {activeLayer} cluster.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setEditingNode(null); setIsCreating(false); }} className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground">Discard</Button>
              <Button 
                onClick={handleSaveNode} 
                disabled={isProcessing}
                className="h-16 px-12 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black transition-all hover:scale-105 active:scale-95 min-w-[260px] gap-3"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Commit Record Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      
      {/* Local Purge */}
      <AlertDialog open={isPurgeLocalOpen} onOpenChange={setIsPurgeLocalOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Smartphone className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Clear Local Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This will delete all asset records and staging data <strong>on this device only</strong>. Online storage is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLocalPurge} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs shadow-xl bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />} Confirm Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mirror Wipe */}
      <AlertDialog open={isWipeMirrorOpen} onOpenChange={setIsWipeMirrorOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Activity className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Wipe Standby Mirror?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This will clear all records in the backup shadow database (RTDB). Standard online and local data will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMirrorWipe} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs shadow-xl bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />} Confirm Wipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cloud Reset */}
      <AlertDialog open={isResetCloudOpen} onOpenChange={setIsResetCloudOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Cloud className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Reset Online Storage?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This will permanently delete all asset records from the online storage. <strong>This affects all users globally and cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCloudReset} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs shadow-xl bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />} Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nuclear Reset */}
      <AlertDialog open={isNuclearOpen} onOpenChange={setIsNuclearOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-black text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-12 w-12 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight text-center">FULL SYSTEM RESET</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60 text-center">
              You are about to delete EVERY record in the entire system (Online, Backup, and Local). This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 text-white">Abort</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleGlobalNuclearReset} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />} Confirm Full Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node Delete Confirmation */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-background">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Trash2 className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive leading-none">Delete Record Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              This will delete <strong>{nodeToDelete?.displayName}</strong> from the {activeLayer} storage cluster. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => nodeToDelete && handleDelete(nodeToDelete)} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0 transition-transform active:scale-95"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
