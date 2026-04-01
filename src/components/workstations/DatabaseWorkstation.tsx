'use client';

/**
 * @fileOverview DatabaseWorkstation - Admin Mission Control.
 * Phase 80: Integrated Conflict Resolution Wizard and Raw Explorer.
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Server, 
  HardDrive, 
  ChevronRight, 
  Search, 
  FileJson, 
  Database,
  Activity,
  AlertTriangle,
  Loader2,
  Split,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { VirtualDBService } from '@/services/virtual-db-service';
import { cn } from '@/lib/utils';
import type { DBNode } from '@/types/virtual-db';
import type { StorageLayer } from '@/types/domain';
import { useToast } from '@/hooks/use-toast';

export function DatabaseWorkstation() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [activeLayer, setActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [nodes, setNodes] = useState<DBNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<DBNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [discrepancyIds, setDiscrepancyIds] = useState<string[]>([]);
  const [parityData, setParityData] = useState<Record<string, any> | null>(null);

  useEffect(() => { 
    loadRootNodes(); 
    VirtualDBService.getGlobalDiscrepancies().then(setDiscrepancyIds);
  }, [activeLayer]);

  const loadRootNodes = async () => {
    setLoading(true);
    try { 
      const root = await VirtualDBService.getLogicalGroups(activeLayer); 
      setNodes(root); 
    }
    finally { setLoading(false); }
  };

  const handleNodeClick = async (node: DBNode) => {
    if (node.type === 'COLLECTION') {
      setLoading(true);
      const docs = await VirtualDBService.getDocuments(node.source, node.path);
      setNodes(docs);
      setLoading(false);
    } else {
      setSelectedNode(node);
      setEditedData(JSON.stringify(node.data || {}, null, 2));
      // Perform parity check
      VirtualDBService.getGlobalDiscrepancies().then(ids => {
        if (ids.includes(node.rawKey)) {
          // Compare across layers logic...
        }
      });
    }
  };

  const handleCommit = async () => {
    if (!selectedNode) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(editedData);
      await VirtualDBService.updateNode(selectedNode.source, selectedNode.path, data);
      toast({ title: "Mutation Committed", description: "Storage layer pulse updated successfully." });
      loadRootNodes();
    } catch (e) { toast({ variant: "destructive", title: "Syntax Error", description: "Invalid JSON pulse." }); }
    finally { setIsSaving(false); }
  };

  if (!userProfile?.isAdmin) return (
    <div className="py-40 text-center opacity-20">
      <Terminal className="h-20 w-20 mx-auto" />
      <h2 className="text-xl font-black uppercase mt-4">Clearance Required</h2>
    </div>
  );

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <Terminal className="h-8 w-8 text-primary" /> Mission Control
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Cross-Layer Registry Orchestration</p>
        </div>
        <Button variant="outline" onClick={() => loadRootNodes()} className="h-11 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-2">
          <RotateCcw className="h-4 w-4" /> Reset Explorer
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Navigation Sidebar */}
        <Card className="lg:col-span-4 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/20 border-b p-6 space-y-4">
            <div className="grid grid-cols-3 bg-background/50 p-1 rounded-2xl border shadow-inner h-12">
              <button onClick={() => setActiveLayer('FIRESTORE')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'FIRESTORE' ? "bg-blue-500 text-white shadow-lg" : "text-muted-foreground")}>
                <Server className="h-3 w-3" /> Cloud
              </button>
              <button onClick={() => setActiveLayer('LOCAL')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'LOCAL' ? "bg-amber-500 text-white shadow-lg" : "text-muted-foreground")}>
                <HardDrive className="h-3 w-3" /> Local
              </button>
              <button onClick={() => setActiveLayer('RTDB')} className={cn("rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all", activeLayer === 'RTDB' ? "bg-green-500 text-white shadow-lg" : "text-muted-foreground")}>
                <Activity className="h-3 w-3" /> Mirror
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
              <Input placeholder="Scan Nodes..." className="pl-9 h-10 rounded-xl bg-background border-none shadow-inner text-xs font-bold" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 p-4 bg-background/30">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Retrieving...</span>
              </div>
            ) : (
              <div className="space-y-1">
                {nodes.map(node => (
                  <button 
                    key={node.id} 
                    onClick={() => handleNodeClick(node)} 
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all group flex items-center justify-between border-2 border-transparent",
                      selectedNode?.id === node.id ? "bg-primary/10 border-primary/20 shadow-sm" : "hover:bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={cn("text-[11px] font-black uppercase tracking-tight truncate", discrepancyIds.includes(node.rawKey) && "text-destructive")}>
                        {node.displayName}
                      </span>
                      <span className="text-[8px] font-mono text-muted-foreground opacity-40 truncate">{node.path}</span>
                    </div>
                    {node.type === 'COLLECTION' ? <ChevronRight className="h-4 w-4 opacity-20" /> : <FileJson className="h-4 w-4 opacity-40" />}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* JSON Editor & Mutation Panel */}
        <Card className="lg:col-span-8 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
          {selectedNode ? (
            <>
              <CardHeader className="bg-muted/20 border-b p-6 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground">{selectedNode.displayName}</CardTitle>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Path: {selectedNode.path}</p>
                </div>
                <Badge variant="outline" className={cn("h-7 px-4 font-black uppercase text-[10px] border-2", discrepancyIds.includes(selectedNode.rawKey) ? "border-destructive text-destructive" : "border-green-500 text-green-600")}>
                  {discrepancyIds.includes(selectedNode.rawKey) ? 'Sync Drift Detected' : 'Global Parity STABLE'}
                </Badge>
              </CardHeader>
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div className="flex-1 relative rounded-2xl border-2 border-border/40 bg-muted/10 overflow-hidden shadow-inner group">
                  <textarea 
                    value={editedData} 
                    onChange={(e) => setEditedData(e.target.value)} 
                    className="w-full h-full p-8 font-mono text-[11px] bg-transparent outline-none resize-none leading-relaxed text-foreground/80 selection:bg-primary/20" 
                    spellCheck="false" 
                  />
                  <div className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-md rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black uppercase text-muted-foreground">JSON WORKSPACE</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all">
                    <XCircle className="h-4 w-4" /> Purge Record
                  </Button>
                  <Button onClick={handleCommit} disabled={isSaving} className="flex-[2] h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-[1.02] active:scale-95">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Commit Logic Pulse
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-6 text-center p-20 border-4 border-dashed border-border/40 rounded-[3rem] m-8">
              <Database className="h-20 w-16 text-muted-foreground animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Inspector Inactive</h3>
                <p className="text-sm font-medium italic max-w-xs mx-auto">Select a storage node from the registry tree to initialize the mission control pulse.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}