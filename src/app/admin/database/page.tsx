'use client';

/**
 * @fileOverview Database Command Center.
 * High-fidelity virtual control room for Super Admins to manage Firestore, RTDB, and Local data.
 */

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  Monitor, 
  Database, 
  Server, 
  HardDrive, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Code, 
  FileJson, 
  RefreshCw, 
  ArrowRightLeft,
  Trash2,
  Copy,
  Save,
  ShieldAlert,
  Loader2,
  Info,
  Terminal,
  Activity,
  History
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
import type { DBNode } from '@/types/virtual-db';
import type { StorageLayer } from '@/types/domain';
import { useToast } from '@/hooks/use-toast';

export default function DatabaseCommandPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [activeLayer, setActiveLayer] = useState<StorageLayer>('FIRESTORE');
  const [nodes, setNodes] = useState<DBNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<DBNode | null>(null);
  const [isTechnicalMode, setIsTechnicalMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleNodeClick = async (node: DBNode) => {
    if (node.type === 'COLLECTION') {
      setLoading(true);
      const docs = await VirtualDBService.getDocuments(node.source, node.path);
      setNodes(prev => {
        // Simple tree expansion logic
        const idx = prev.findIndex(n => n.id === node.id);
        const next = [...prev];
        next.splice(idx + 1, 0, ...docs);
        return next;
      });
      setLoading(false);
    } else {
      setSelectedNode(node);
      setEditedData(JSON.stringify(node.data, null, 2));
    }
  };

  const handleCommit = async () => {
    if (!selectedNode) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(editedData);
      await VirtualDBService.updateNode(selectedNode.source, selectedNode.path, data);
      toast({ title: "Mutation Committed", description: "Storage layer updated deterministicly." });
      loadRootNodes();
    } catch (e) {
      toast({ variant: "destructive", title: "Syntax Error", description: "Pulse contains invalid JSON schema." });
    } finally {
      setIsSaving(false);
    }
  };

  if (!userProfile?.isAdmin) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center opacity-20">
          <ShieldAlert className="h-20 w-20" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6 animate-in fade-in duration-700">
        {/* Header Pulse */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              Control Room
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Live Cross-Layer Database Orchestration & Mutation Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsTechnicalMode(!isTechnicalMode)}
              className={cn("h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 transition-all", isTechnicalMode ? "bg-primary text-primary-foreground border-primary" : "bg-card")}
            >
              <Code className="h-4 w-4" /> Technical Pulse {isTechnicalMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Database Cockpit */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Sidebar Explorer */}
          <Card className="lg:col-span-4 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/20 border-b p-6">
              <Tabs value={activeLayer} onValueChange={(v) => setActiveLayer(v as StorageLayer)} className="w-full">
                <TabsList className="grid grid-cols-3 bg-background/50 p-1 rounded-xl h-12">
                  <TabsTrigger value="FIRESTORE" className="rounded-lg text-[9px] font-black uppercase gap-2"><Server className="h-3 w-3" /> Cloud</TabsTrigger>
                  <TabsTrigger value="RTDB" className="rounded-lg text-[9px] font-black uppercase gap-2"><Activity className="h-3 w-3" /> Shadow</TabsTrigger>
                  <TabsTrigger value="LOCAL" className="rounded-lg text-[9px] font-black uppercase gap-2"><HardDrive className="h-3 w-3" /> Local</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-4 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
                <Input 
                  placeholder="Scan Nodes..." 
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
                    <span className="text-[10px] font-black uppercase">Replaying Storage...</span>
                  </div>
                ) : nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all group flex items-center justify-between border-2 border-transparent hover:bg-primary/5",
                      selectedNode?.id === node.id ? "bg-primary/10 border-primary/20 shadow-sm" : ""
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-black uppercase tracking-tight truncate">
                        {isTechnicalMode ? node.rawKey : node.displayName}
                      </span>
                      {isTechnicalMode && <span className="text-[8px] font-mono text-muted-foreground opacity-60 truncate">{node.path}</span>}
                    </div>
                    {node.type === 'COLLECTION' ? <ChevronRight className="h-3 w-3 opacity-20" /> : <FileJson className="h-3 w-3 text-primary opacity-40" />}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Main Inspector */}
          <Card className="lg:col-span-8 rounded-[2.5rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden flex flex-col">
            {selectedNode ? (
              <>
                <CardHeader className="bg-muted/20 border-b p-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 px-3 text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary">{selectedNode.source}</Badge>
                        <CardTitle className="text-2xl font-black uppercase tracking-tight">{selectedNode.displayName}</CardTitle>
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">PATH: {selectedNode.path}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10"><RefreshCw className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <div className="flex-1 flex flex-col p-8 gap-6 bg-background/30 overflow-hidden">
                  <div className="flex-1 relative rounded-3xl border-2 border-border/40 bg-muted/10 overflow-hidden group hover:border-primary/20 transition-all shadow-inner">
                    <textarea 
                      value={editedData}
                      onChange={(e) => setEditedData(e.target.value)}
                      className="w-full h-full p-8 font-mono text-xs bg-transparent outline-none resize-none selection:bg-primary/20"
                      spellCheck="false"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-2 py-1 rounded">JSON PULSE</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-6 rounded-3xl bg-blue-500/5 border-2 border-dashed border-blue-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl mt-1"><Info className="h-4 w-4 text-blue-600" /></div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-blue-600">Mutation Safeguard</p>
                        <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                          You are performing a live mutation on the {activeLayer} layer. This action is deterministic and will be broadcast to all regional viewports upon commit.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleCommit}
                      disabled={isSaving}
                      className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-105 active:scale-95"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Commit Pulse
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20 space-y-6">
                <div className="p-16 bg-muted rounded-[4rem] shadow-inner">
                  <Database className="h-24 w-20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Select Pulse Node</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest max-w-xs mx-auto">Explore the storage hierarchy to begin live data orchestration.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
