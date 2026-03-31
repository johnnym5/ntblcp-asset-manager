'use client';

/**
 * @fileOverview DatabaseWorkstation - SPA Virtual DB explorer.
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
  Split
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  useEffect(() => { loadRootNodes(); }, [activeLayer]);

  const loadRootNodes = async () => {
    setLoading(true);
    try { const root = await VirtualDBService.getLogicalGroups(activeLayer); setNodes(root); }
    finally { setLoading(false); }
  };

  const handleCommit = async () => {
    if (!selectedNode) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(editedData);
      await VirtualDBService.updateNode(selectedNode.source, selectedNode.path, data);
      toast({ title: "Mutation Committed" });
      loadRootNodes();
    } catch (e) { toast({ variant: "destructive", title: "Syntax Error" }); }
    finally { setIsSaving(false); }
  };

  if (!userProfile?.isAdmin) return <div className="py-40 text-center opacity-20"><Terminal className="h-20 w-20 mx-auto" /><h2 className="text-xl font-black uppercase mt-4">Clearance Required</h2></div>;

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
          <Terminal className="h-8 w-8 text-primary" /> Mission Control
        </h2>
        <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Multi-Layer Registry Orchestration</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        <Card className="lg:col-span-4 rounded-[2.5rem] overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/20 border-b p-6 space-y-4">
            <div className="grid grid-cols-3 bg-background/50 p-1 rounded-2xl border shadow-inner">
              <button onClick={() => setActiveLayer('FIRESTORE')} className={cn("rounded-xl h-10 text-[9px] font-black uppercase", activeLayer === 'FIRESTORE' ? "bg-blue-500 text-white" : "text-muted-foreground")}>Cloud</button>
              <button onClick={() => setActiveLayer('RTDB')} className={cn("rounded-xl h-10 text-[9px] font-black uppercase", activeLayer === 'RTDB' ? "bg-green-500 text-white" : "text-muted-foreground")}>Mirror</button>
              <button onClick={() => setActiveLayer('LOCAL')} className={cn("rounded-xl h-10 text-[9px] font-black uppercase", activeLayer === 'LOCAL' ? "bg-amber-500 text-white" : "text-muted-foreground")}>Local</button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div> : 
              nodes.map(node => (
                <button key={node.id} onClick={() => { setSelectedNode(node); setEditedData(JSON.stringify(node.data || {}, null, 2)); }} className={cn("w-full text-left p-4 rounded-xl mb-1 text-[11px] font-black uppercase", selectedNode?.id === node.id ? "bg-primary/10 border-primary/20" : "hover:bg-primary/5")}>
                  {node.displayName}
                </button>
              ))}
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-8 rounded-[2.5rem] overflow-hidden flex flex-col">
          {selectedNode ? (
            <div className="flex-1 flex flex-col p-6 space-y-6">
              <div className="h-full relative rounded-2xl border bg-muted/10 overflow-hidden">
                <textarea value={editedData} onChange={(e) => setEditedData(e.target.value)} className="w-full h-full p-6 font-mono text-[10px] bg-transparent outline-none resize-none" spellCheck="false" />
              </div>
              <Button onClick={handleCommit} disabled={isSaving} className="w-full h-14 rounded-2xl font-black uppercase bg-primary text-white shadow-xl">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />} Commit Mutation
              </Button>
            </div>
          ) : <div className="flex-1 flex flex-col items-center justify-center opacity-20"><Database className="h-16 w-14 mx-auto" /><h3 className="text-xl font-black uppercase mt-4">Inspector Inactive</h3></div>}
        </Card>
      </div>
    </div>
  );
}