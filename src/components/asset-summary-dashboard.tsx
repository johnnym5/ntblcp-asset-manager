'use client';

/**
 * @fileOverview Inventory Dashboard - Compact Data Summary.
 * Phase 1100: Switched to filteredAssets for reactive metrics.
 * Phase 1101: Expanded to 10 Asset Overview and Insight pulses.
 */

import React, { useMemo, useState } from 'react';
import { 
    Zap, 
    ArrowRight, 
    Boxes, 
    FolderOpen, 
    SearchCode, 
    ShieldCheck,
    ChevronDown,
    RefreshCw,
    Activity,
    MousePointer2,
    TrendingUp,
    ShieldAlert,
    Database,
    Cloud,
    Fingerprint,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

interface QuickStartTileProps {
    label: string;
    description: string;
    icon: any;
    color: string;
    onClick: () => void;
    count?: number | string;
    isDestructive?: boolean;
}

const QuickStartTile = ({ label, description, icon: Icon, color, onClick, count, isDestructive }: QuickStartTileProps) => (
    <button 
        onClick={onClick}
        className={cn(
            "p-4 rounded-[1.25rem] border bg-white/[0.02] border-white/5 text-left transition-all group relative overflow-hidden active:scale-95 h-full",
            isDestructive ? "hover:border-destructive/40 hover:bg-destructive/[0.02]" : "hover:border-primary/40 hover:bg-primary/[0.02]"
        )}
    >
        <div className="flex justify-between items-start mb-4">
            <div className={cn("p-2 rounded-lg transition-colors", color)}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            {count !== undefined && (
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                    isDestructive ? "bg-destructive text-white" : "bg-primary text-black"
                )}>
                    {count}
                </div>
            )}
        </div>
        <div className="space-y-0.5">
            <h4 className="text-[11px] font-black uppercase text-white tracking-tight">{label}</h4>
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter leading-tight italic">{description}</p>
        </div>
    </button>
);

const ReadinessPulse = ({ label, count, subLabel, onClick, isDestructive, variant = "default" }: any) => (
    <div className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all group gap-3 h-full",
        isDestructive ? "bg-red-600/5 border-red-600/10 hover:border-red-600/40" : 
        variant === "blue" ? "bg-blue-600/5 border-blue-600/10 hover:border-blue-600/40" :
        "bg-white/[0.02] border-white/5 hover:border-primary/20"
    )}>
        <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={cn("text-xl font-black tracking-tighter leading-none", 
                    isDestructive ? "text-red-600" : 
                    variant === "blue" ? "text-blue-500" :
                    "text-white"
                )}>{count}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", 
                    isDestructive ? "text-red-500" : 
                    variant === "blue" ? "text-blue-400" :
                    "text-primary"
                )}>{label}</span>
            </div>
            <p className="text-[8px] font-medium text-white/40 leading-relaxed italic truncate">{subLabel}</p>
        </div>
        {onClick && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClick} 
                className="h-7 px-2 rounded-md text-[8px] font-black uppercase tracking-widest border border-white/5 text-white/40 shrink-0"
            >
                View
            </Button>
        )}
    </div>
);

export function AssetSummaryDashboard() {
    const { 
        filteredAssets,
        setActiveView
    } = useAppState();
    
    const [view, setView] = useState<'stats' | 'insights'>('stats');

    const metrics = useMemo(() => {
        const total = filteredAssets.length;
        const verified = filteredAssets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;
        const pending = filteredAssets.filter(a => a.status === 'UNVERIFIED').length;
        const exceptions = filteredAssets.filter(a => a.status === 'DISCREPANCY').length;
        const critical = filteredAssets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length;
        const groups = new Set(filteredAssets.map(a => a.category)).size;
        const locations = new Set(filteredAssets.map(a => a.location)).size;
        
        // Fidelity: Average of overallFidelityScore
        const totalFidelity = filteredAssets.reduce((sum, a) => sum + (a.overallFidelityScore || 0), 0);
        const fidelity = total > 0 ? Math.round(totalFidelity / total) : 100;
        
        // Parity: % of items marked as 'synced'
        const synced = filteredAssets.filter(a => (a as any).syncStatus === 'synced').length;
        const parity = total > 0 ? Math.round((synced / total) * 100) : 100;

        return {
            total,
            coverage,
            verified,
            pending,
            exceptions,
            critical,
            fidelity,
            parity,
            groups,
            locations,
            anomalies: filteredAssets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length
        };
    }, [filteredAssets]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 rounded-[1.25rem] bg-white/[0.03] border border-white/5 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
                        <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none">Status Overview</h3>
                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Inventory summary index</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setView('stats')} 
                            className={cn("px-4 py-1.5 rounded-md font-black uppercase text-[8px] tracking-widest transition-all", view === 'stats' ? "bg-white/10 text-white" : "text-white/20")}
                        >
                            Summary
                        </button>
                        <button 
                            onClick={() => setView('insights')} 
                            className={cn("px-4 py-1.5 rounded-md font-black uppercase text-[8px] tracking-widest transition-all", view === 'insights' ? "bg-white/10 text-white" : "text-white/20")}
                        >
                            Metrics
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'stats' ? (
                    <motion.div key="stats" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <QuickStartTile label="Browse Assets" description="Inventory View" icon={Boxes} color="bg-primary" count={metrics.total} onClick={() => setActiveView('REGISTRY')} />
                            <QuickStartTile label="Categories" description="Folder Tree" icon={FolderOpen} color="bg-blue-600" count={metrics.groups} onClick={() => setActiveView('GROUPS')} />
                            <QuickStartTile label="Data Errors" description="Quality Issues" icon={SearchCode} color="bg-red-600" count={metrics.anomalies} isDestructive={metrics.anomalies > 0} onClick={() => setActiveView('ANOMALIES')} />
                        </div>

                        <Accordion type="single" collapsible className="w-full" defaultValue="readiness">
                            <AccordionItem value="readiness" className="border-none">
                                <AccordionTrigger className="hover:no-underline p-0 py-2">
                                    <div className="flex items-center justify-between w-full pr-2">
                                        <div className="flex items-center gap-2 px-1">
                                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Asset Overview & Insights</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[7px] font-black border-white/10 uppercase px-2 py-0.5">FULL ANALYSIS</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 pb-4">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {/* Row 1: Primary Anchors */}
                                        <ReadinessPulse label="Nodes" count={metrics.total} subLabel="Total Registry Assets" icon={Database} type="total" />
                                        <ReadinessPulse label="Coverage" count={`${metrics.coverage}%`} subLabel="Physically Verified" icon={TrendingUp} type="verified" />
                                        <ReadinessPulse label="Verified" count={metrics.verified} subLabel="Audit Status: Pass" icon={CheckCircle2} type="verified" />
                                        <ReadinessPulse label="Pending" count={metrics.pending} subLabel="Audit Status: Open" icon={Activity} type="pending" />
                                        <ReadinessPulse label="Alerts" count={metrics.exceptions} isDestructive={metrics.exceptions > 0} subLabel="Discrepancy Flags" icon={AlertCircle} type="exceptions" />
                                        
                                        {/* Row 2: Fidelity & Structural Anchors */}
                                        <ReadinessPulse label="Critical" count={metrics.critical} isDestructive={metrics.critical > 0} subLabel="Losses & Damage" icon={ShieldAlert} type="critical" />
                                        <ReadinessPulse label="Fidelity" count={`${metrics.fidelity}%`} subLabel="Data Integrity Index" icon={Fingerprint} type="fidelity" />
                                        <ReadinessPulse label="Parity" count={`${metrics.parity}%`} variant="blue" subLabel="Cloud Parity Index" icon={Cloud} type="parity" />
                                        <ReadinessPulse label="Groups" count={metrics.groups} subLabel="Unique Folders" icon={FolderOpen} type="groups" />
                                        <ReadinessPulse label="Scopes" count={metrics.locations} subLabel="Regional Scope" icon={MapPin} type="locations" />
                                    </div>
                                    
                                    <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Global Fidelity Pulse</span>
                                            <span className="text-[9px] font-black text-primary uppercase">{metrics.fidelity}%</span>
                                        </div>
                                        <Progress value={metrics.fidelity} className="h-1 bg-white/5" />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </motion.div>
                ) : (
                    <motion.div key="insights" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-xl">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-primary mb-4">Category Status</h4>
                            <ScrollArea className="h-[250px] pr-2">
                                <div className="space-y-1.5">
                                    {Object.entries(filteredAssets.reduce((acc, a) => {
                                        const cat = a.category || 'Other';
                                        if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
                                        acc[cat].total++;
                                        if (a.status === 'VERIFIED') acc[cat].verified++;
                                        return acc;
                                    }, {} as any)).map(([cat, data]: any) => (
                                        <div key={cat} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                <span className="text-white/60 truncate pr-4">{cat}</span>
                                                <span className="text-primary">{Math.round((data.verified/data.total)*100)}%</span>
                                            </div>
                                            <Progress value={(data.verified/data.total)*100} className="h-0.5 bg-white/5" />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                        
                        <Card className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-xl">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-primary mb-4">Regional Status</h4>
                            <ScrollArea className="h-[250px] pr-2">
                                <div className="space-y-1.5">
                                    {Object.entries(filteredAssets.reduce((acc, a) => {
                                        const loc = a.location || 'Unknown';
                                        if (!acc[loc]) acc[loc] = 0;
                                        acc[loc]++;
                                        return acc;
                                    }, {} as any)).sort((a:any, b:any) => b[1] - a[1]).slice(0, 8).map(([loc, count]: any) => (
                                        <div key={loc} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] transition-colors border-b border-white/5">
                                            <span className="text-[10px] font-black uppercase text-white/40">{loc}</span>
                                            <span className="text-[10px] font-mono font-bold text-white">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
