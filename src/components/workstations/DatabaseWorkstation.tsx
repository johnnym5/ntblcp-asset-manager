'use client';

/**
 * @fileOverview DatabaseWorkstation - Granular Database Explorer & Management.
 * Phase 200: Implemented high-density document explorer with CRUD and Multi-select.
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
  ArrowRightLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
    return nodes.filter(n => n.displayName.toLowerCase().includes(term) || n.rawKey.toLowerCase().includes(term));
  }, [nodes, searchTerm]);

  const handleEdit = (node: DBNode) => {
    setEditingNode(node);
    setJsonValue(JSON.stringify(node.data || {}, null, 2));
  };

  const handleCreate = () => {
    setIsCreating(true);
    setJsonValue(JSON.stringify({ id: crypto.randomUUID() }, null, 2));
  };

  const handleSaveNode = async () => {
    setIsProcessing(true);
    try {
      const parsedData = JSON.parse(jsonValue);
      const path = editingNode ? editingNode.path : `${activeCollection}/${parsedData.id || crypto.randomUUID()}`;
      
      await VirtualDBService.updateNode(activeLayer, path, parsedData);
      toast({ title: "Document Synchronized", description: "Node state updated in chosen layer." });
      setEditingNode(null);
      setIsCreating(false);
      await refreshRegistry();
    } catch (e) {
      toast({ variant: "destructive", title: "JSON Logic Failure", description: "Invalid pulse structure detected." });
    } finally {
      setIsProcessing(false);
    }
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
    if (checked) setSelectedIds(new Set(filteredNodes.map(n => n.id)));
    else setSelectedIds(new Set());
  };

  if (userProfile?.role !== 'SUPERADMIN') return null;

  return (
    <div className={cn("space-y-8 animate-in fade-in duration-700", !isEmbedded && "max-w-6xl mx-auto pb-40")}>
      
      {/* 1. Controller Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        {!isEmbedded && (
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Terminal className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">Database Explorer</h2>
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Granular Cross-Layer Management & CRUD</p>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
          {(['FIRESTORE', 'RTDB', 'LOCAL'] as StorageLayer[]).map(layer => (
            <button 
              key={layer}
              onClick={() => { setActiveLayer(layer); setSelectedIds(new Set()); }}
              className={cn(
                "px-6 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                activeLayer === layer ? "bg-primary text-black" : "text-white/40 hover:text-white"
              )}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Collection & Search Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-1">
        <aside className="lg:col-span-3 space-y-4">
          <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">Target Cluster</Label>
          <div className="space-y-1.5">
            {['assets', 'audit_logs', 'error_logs', 'config/settings'].map(col => (
              <button 
                key={col}
                onClick={() => { setActiveCollection(col); setSelectedIds(new Set()); }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                  activeCollection === col ? "bg-primary/5 border-primary/20 text-primary" : "bg-[#0A0A0A] border-white/5 text-white/40 hover:border-white/20"
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-tight truncate">{col.replace('_', ' ')}</span>
                <ChevronRight className={cn("h-3 w-3 opacity-20 transition-transform", activeCollection === col && "opacity-100 translate-x-1")} />
              </button>
            ))}
          </div>
        </aside>

        <Card className="lg:col-span-9 bg-[#050505] border-2 border-white/5 rounded-[2.5rem] overflow-hidden shadow-3xl">
          <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Scan IDs or Display Names..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))}
                className="h-11 pl-11 bg-black border-none rounded-xl text-xs font-medium placeholder:text-white/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="h-7 px-3 border-white/10 text-white/40 font-mono text-[8px] uppercase tracking-widest">{filteredNodes.length} Documents</Badge>
              <Button onClick={handleCreate} size="sm" className="h-9 px-4 rounded-lg bg-primary text-black font-black uppercase text-[9px] gap-2"><Plus className="h-3 w-3" /> Create</Button>
            </div>
          </div>

          <ScrollArea className="h-[550px] bg-black">
            <div className="p-0">
              <Table className="relative">
                <TableHeader className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-8">
                      <Checkbox 
                        checked={selectedIds.size === filteredNodes.length && filteredNodes.length > 0} 
                        onCheckedChange={toggleAll}
                        className="h-5 w-5 rounded-lg border-2 border-white/10"
                      />
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/20 py-4">ID Reference</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/20 py-4">Display Identity</TableHead>
                    <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest text-white/20 py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-40" /></TableCell></TableRow>
                  ) : filteredNodes.length > 0 ? (
                    filteredNodes.map(node => (
                      <TableRow key={node.id} className="group hover:bg-white/[0.02] border-b border-white/5 last:border-0 transition-colors">
                        <TableCell className="pl-8">
                          <Checkbox 
                            checked={selectedIds.has(node.id)} 
                            onCheckedChange={() => toggleSelect(node.id)}
                            className="h-5 w-5 rounded-lg border-2 border-white/10 data-[state=checked]:bg-primary"
                          />
                        </TableCell>
                        <TableCell className="py-4 font-mono text-[9px] text-white/40 truncate max-w-[120px]">{node.rawKey}</TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black uppercase text-white truncate max-w-[200px]">{node.displayName}</span>
                            {node.lastUpdated && <span className="text-[7px] font-bold text-white/20 uppercase">Modified: {new Date(node.lastUpdated).toLocaleString()}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pr-8 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(node)} className="h-8 w-8 rounded-lg text-primary opacity-40 hover:opacity-100 hover:bg-primary/10 transition-all"><Edit3 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setNodeToDelete(node)} className="h-8 w-8 rounded-lg text-destructive/40 hover:opacity-100 hover:bg-destructive/10 transition-all"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center opacity-20"><Database className="h-12 w-12 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Cluster Silent</p></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* 3. Global Maintenance Controls */}
      <div className="px-1 space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">Operational Pulse Reset</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-14 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[9px] tracking-widest gap-3 shadow-xl">
            <Smartphone className="h-4 w-4" /> Purge Local
          </Button>
          <Button variant="outline" className="h-14 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[9px] tracking-widest gap-3 shadow-xl">
            <Activity className="h-4 w-4" /> Wipe Mirror
          </Button>
          <Button variant="outline" className="h-14 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl font-black uppercase text-[9px] tracking-widest gap-3 shadow-xl">
            <Cloud className="h-4 w-4" /> Reset Cloud
          </Button>
          <Button className="h-14 bg-destructive text-white rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-3xl shadow-destructive/30 hover:bg-destructive/90 transition-transform active:scale-95">
            <Bomb className="h-4 w-4" /> Nuclear Global Reset
          </Button>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 40 }} 
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-3 flex items-center gap-8 shadow-3xl backdrop-blur-3xl"
          >
            <div className="flex items-center gap-3 pl-3">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">{selectedIds.size}</div>
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Nodes Selected</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Button onClick={handleBatchDelete} className="h-11 px-8 rounded-xl font-black uppercase text-[10px] gap-2 bg-destructive text-white hover:bg-destructive/90 shadow-xl shadow-destructive/20">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Purge Selection
              </Button>
              <Button variant="outline" className="h-11 px-8 rounded-xl font-black uppercase text-[10px] gap-2 border-white/10 text-white hover:bg-white/5">
                <ArrowRightLeft className="h-4 w-4" /> Reconcile Layer
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="p-2 text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Dialog */}
      <Dialog open={!!editingNode || isCreating} onOpenChange={() => { setEditingNode(null); setIsCreating(false); }}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-primary/10 shadow-3xl p-0 overflow-hidden bg-black text-white">
          <div className="p-8 bg-white/[0.02] border-b border-white/5">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">{isCreating ? 'Initialize Node' : 'Registry Synchronizer'}</DialogTitle>
                  <DialogDescription className="text-[9px] font-black uppercase text-white/40 tracking-widest">Technical Data Pulse Editor</DialogDescription>
                </div>
                <Badge variant="outline" className="h-8 px-4 font-black uppercase border-primary/20 text-primary bg-primary/5">{activeLayer}</Badge>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 pl-1 flex items-center gap-2">
                <FileJson className="h-3 w-3" /> Raw JSON Schema
              </Label>
              <Textarea 
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                className="min-h-[400px] font-mono text-[11px] leading-relaxed bg-[#050505] border-2 border-white/5 focus:border-primary/40 rounded-2xl p-6 custom-scrollbar resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-8 bg-white/[0.02] border-t border-white/5 flex flex-row items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => { setEditingNode(null); setIsCreating(false); }} className="font-black uppercase text-[10px] tracking-widest rounded-xl px-10 text-white/40 hover:text-white">Abort Pulse</Button>
            <Button 
              onClick={handleSaveNode} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-black transition-all hover:scale-105 active:scale-95"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldCheck className="h-4 w-4 mr-3" />} Commit Modification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={() => setNodeToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Trash2 className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Purge Node Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/40">
              This will permanently destroy the record <strong>{nodeToDelete?.rawKey}</strong> from the {activeLayer} storage cluster. This pulse is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 text-white">Abort</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => nodeToDelete && handleDelete(nodeToDelete)} 
              disabled={isProcessing}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-destructive/30 bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Check className="h-5 w-5 mr-3" />} Commit Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
