'use client';

/**
 * @fileOverview AssetGroupsWorkstation - Post-Import Intelligence Hub.
 * Phase 100: Hierarchical browsing and smart classification drill-down.
 */

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { 
  LayoutGrid, 
  Boxes, 
  ChevronRight, 
  Search, 
  Filter, 
  Database,
  ArrowLeft,
  Activity,
  History,
  Tag,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClassificationEngine } from '@/lib/classification-engine';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import { Progress } from '@/components/ui/progress';

export function AssetGroupsWorkstation() {
  const { assets, setSearchTerm, setActiveView } = useAppState();
  
  // Drill-down state
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  // 1. Run Intelligence Pulse
  const classifiedAssets = useMemo(() => {
    return assets.map(a => ({
      ...a,
      classification: ClassificationEngine.classify(a)
    }));
  }, [assets]);

  const tree = useMemo(() => ClassificationEngine.getGroupTree(classifiedAssets), [classifiedAssets]);

  const sortedGroups = useMemo(() => {
    return Object.entries(tree)
      .map(([name, data]) => ({ name, ...data }))
      .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [tree, groupSearch]);

  // Filters for drill-down
  const drillDownAssets = useMemo(() => {
    let list = classifiedAssets;
    if (selectedGroup) list = list.filter(a => a.classification?.group === selectedGroup);
    if (selectedSubgroup) list = list.filter(a => a.classification?.subgroup === selectedSubgroup);
    return list;
  }, [classifiedAssets, selectedGroup, selectedSubgroup]);

  const handleNavigateToRegistry = (filter: string) => {
    setSearchTerm(filter);
    setActiveView('REGISTRY');
  };

  const GroupCard = ({ name, count, subgroups, conditions }: any) => {
    const coverage = 100; // Conceptual
    return (
      <Card 
        onClick={() => setSelectedGroup(name)}
        className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-3xl"
      >
        <CardHeader className="p-8 pb-4 bg-white/[0.01] border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl"><Boxes className="h-6 w-6 text-primary" /></div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-black uppercase text-white tracking-tight">{name}</h3>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{Object.keys(subgroups).length} Technical Subgroups</p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:bg-primary/10 transition-all">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-8 space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-5xl font-black tracking-tighter text-white">{count}</p>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em]">Aggregated Pulses</p>
            </div>
            <div className="flex gap-2">
              {conditions['Critical'] && <Badge className="bg-red-600 text-white font-black text-[8px] h-5 px-2">CRITICAL: {conditions['Critical']}</Badge>}
              {conditions['Loss'] && <Badge className="bg-orange-600 text-white font-black text-[8px] h-5 px-2">LOSS: {conditions['Loss']}</Badge>}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
              <span className="text-white/40">Audit Coverage</span>
              <span className="text-primary">{coverage}%</span>
            </div>
            <Progress value={coverage} className="h-1 bg-white/5" />
          </div>
        </CardContent>
        <CardFooter className="px-8 pb-8 pt-0">
          <div className="flex flex-wrap gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
            {Object.keys(subgroups).slice(0, 3).map(sg => (
              <Badge key={sg} variant="secondary" className="bg-white/5 text-[8px] font-black uppercase tracking-tighter border-white/5">{sg}</Badge>
            ))}
            {Object.keys(subgroups).length > 3 && <span className="text-[8px] font-bold text-white/20">+{Object.keys(subgroups).length - 3} More</span>}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-40">
      
      {/* Header Orchestration */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          {selectedGroup ? (
            <button 
              onClick={() => { setSelectedGroup(null); setSelectedSubgroup(null); }}
              className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white border border-white/5 transition-all shadow-xl tactile-pulse"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/5">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="space-y-0.5">
            <h2 className="text-3xl font-black uppercase text-white tracking-tight leading-none">
              {selectedGroup ? (selectedSubgroup || selectedGroup) : 'Asset Groups'}
            </h2>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">
              {selectedGroup ? 'HIERARCHICAL RECONCILIATION' : 'INTELLIGENT CLASSIFICATION PULSE'}
            </p>
          </div>
        </div>

        {!selectedGroup && (
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search categorized groups..." 
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="h-12 pl-11 rounded-xl bg-white/[0.03] border-white/10 text-sm focus-visible:ring-primary/20 text-white placeholder:text-white/20"
            />
          </div>
        )}
      </div>

      {/* Main Surface */}
      <div className="min-h-screen">
        {!selectedGroup ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {sortedGroups.map(group => (
              <GroupCard key={group.name} {...group} />
            ))}
            
            {/* Year Buckets Quick Filter */}
            <Card className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl group hover:border-primary/40 transition-all">
              <div className="space-y-2">
                <div className="p-3 bg-primary/10 rounded-2xl w-fit"><TrendingUp className="h-6 w-6 text-primary" /></div>
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Year Addition Pulses</h3>
                <p className="text-[10px] font-medium text-white/40 italic">Sorted by procurement batch.</p>
              </div>
              <div className="space-y-2 mt-8">
                {[2023, 2024, 2025].map(year => (
                  <button 
                    key={year} 
                    onClick={() => handleNavigateToRegistry(String(year))}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-primary/20 transition-all group/btn"
                  >
                    <span className="text-[11px] font-black text-white/60 group-hover/btn:text-white transition-colors">{year} Additions</span>
                    <ArrowUpRight className="h-3 w-3 text-primary opacity-0 group-hover/btn:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </Card>

            {/* Transfer Groups Quick Filter */}
            <Card className="bg-blue-500/5 border-2 border-dashed border-blue-500/20 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl group hover:border-blue-500/40 transition-all">
              <div className="space-y-2">
                <div className="p-3 bg-blue-500/10 rounded-2xl w-fit"><ArrowRightLeft className="h-6 w-6 text-blue-500" /></div>
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Transferred Assets</h3>
                <p className="text-[10px] font-medium text-white/40 italic">Isolated partner registers.</p>
              </div>
              <div className="space-y-2 mt-8">
                {['LSMOH', 'IHVN', 'FHI360'].map(source => (
                  <button 
                    key={source}
                    onClick={() => handleNavigateToRegistry(source)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/20 transition-all group/btn"
                  >
                    <span className="text-[11px] font-black text-white/60 group-hover/btn:text-white transition-colors">{source} Registry</span>
                    <ArrowUpRight className="h-3 w-3 text-blue-500 opacity-0 group-hover/btn:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-1">
            {/* Drill-down Sidebar */}
            <div className="lg:col-span-3 space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 px-1">Technical Subgroups</h4>
                <div className="space-y-2">
                  {Object.entries(tree[selectedGroup].subgroups).map(([sg, count]) => (
                    <button 
                      key={sg} 
                      onClick={() => setSelectedSubgroup(sg === selectedSubgroup ? null : sg)}
                      className={cn(
                        "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group",
                        selectedSubgroup === sg ? "bg-primary border-primary text-black" : "bg-[#0A0A0A] border-white/5 hover:border-white/20"
                      )}
                    >
                      <span className="text-xs font-black uppercase tracking-tight">{sg}</span>
                      <div className={cn(
                        "h-6 px-2 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold",
                        selectedSubgroup === sg ? "bg-black/20 text-black" : "bg-white/5 text-white/40"
                      )}>{count}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Group Analytics</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(tree[selectedGroup].conditions).map(([cond, count]) => (
                    <div key={cond} className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{cond} Pulse</span>
                      <Badge variant="outline" className="h-5 text-[9px] font-black border-white/5">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drill-down Result Grid */}
            <div className="lg:col-span-9 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Active Classification Pulse</span>
                </div>
                <Button 
                  onClick={() => handleNavigateToRegistry(selectedSubgroup || selectedGroup)}
                  className="h-10 px-6 rounded-xl bg-white/5 text-white font-black uppercase text-[9px] tracking-widest hover:bg-white/10"
                >
                  Open in Main Registry
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-25rem)] border-2 border-white/5 rounded-[2.5rem] bg-[#050505] p-8 shadow-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {drillDownAssets.map(asset => (
                    <Card key={asset.id} className="bg-black/40 border-white/10 rounded-2xl p-6 group hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-white/5 text-white/40 border-none font-black text-[8px] h-5">{asset.classification?.brand || 'Generic'}</Badge>
                        <Badge variant="outline" className={cn(
                          "h-5 text-[8px] font-black border-none",
                          asset.status === 'VERIFIED' ? "text-green-500" : "text-orange-500"
                        )}>{asset.status}</Badge>
                      </div>
                      <h5 className="text-sm font-black uppercase text-white truncate group-hover:text-primary transition-colors">{asset.description}</h5>
                      <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-white/20 uppercase">
                        <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> {asset.assetIdCode || 'NO_TAG'}</span>
                        <span className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> {asset.classification?.subgroup}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
