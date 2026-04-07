'use client';

/**
 * @fileOverview Inventory Dashboard - Compact Data Summary.
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
    TrendingUp
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

const ReadinessPulse = ({ label, count, subLabel, onClick, isDestructive }: any) => (
    <div className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all group gap-3",
        isDestructive ? "bg-red-600/5 border-red-600/10 hover:border-red-600/40" : "bg-white/[0.02] border-white/5 hover:border-primary/20"
    )}>
        <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={cn("text-xl font-black tracking-tighter", isDestructive ? "text-red-600" : "text-white")}>{count}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", isDestructive ? "text-red-500" : "text-primary")}>{label}</span>
            </div>
            <p className="text-[8px] font-medium text-white/40 leading-relaxed italic truncate">{subLabel}</p>
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClick} 
            className="h-7 px-2 rounded-md text-[8px] font-black uppercase tracking-widest border border-white/5 text-white/40"
        >
            View
        </Button>
    </div>
);

export function AssetSummaryDashboard() {
    const { 
        assets, 
        manualDownload, 
        isSyncing, 
        isOnline,
        setActiveView,
        setSearchTerm,
        setSelectedStatuses,
        setSelectedCategory,
        setSelectedLocations,
        setMissingFieldFilter
    } = useAppState();
    
    const [view, setView] = useState<'stats' | 'insights'>('stats');

    const metrics = useMemo(() => {
        const total = assets.length;
        const verified = assets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;
        
        return {
            coverage,
            total,
            verified,
            pending: assets.filter(a => a.status === 'UNVERIFIED').length,
            missingId: assets.filter(a => !a.assetIdCode).length,
            critical: assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '')).length,
            exceptions: assets.filter(a => a.status === 'DISCREPANCY').length,
            folders: new Set(assets.map(a => a.category)).size,
            anomalies: assets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length
        };
    }, [assets]);

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
                            <QuickStartTile label="Categories" description="Folder Tree" icon={FolderOpen} color="bg-blue-600" count={metrics.folders} onClick={() => setActiveView('GROUPS')} />
                            <QuickStartTile label="Data Errors" description="Quality Issues" icon={SearchCode} color="bg-red-600" count={metrics.anomalies} isDestructive={metrics.anomalies > 0} onClick={() => setActiveView('ANOMALIES')} />
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="readiness" className="border-none">
                                <AccordionTrigger className="hover:no-underline p-0 py-2">
                                    <div className="flex items-center justify-between w-full pr-2">
                                        <div className="flex items-center gap-2 px-1">
                                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Verification Progress</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[7px] font-black border-white/10 uppercase px-2 py-0.5">VIEW ALL</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <ReadinessPulse label="Coverage" count={`${metrics.coverage}%`} subLabel={`${metrics.verified} items verified`} onClick={() => setActiveView('VERIFY')} />
                                        <ReadinessPulse label="Pending" count={metrics.pending} subLabel="Waiting verification" onClick={() => setActiveView('VERIFY')} />
                                        <ReadinessPulse label="Critical" count={metrics.critical} isDestructive={metrics.critical > 0} subLabel="Losses/Damage" onClick={() => setActiveView('ALERTS')} />
                                        <ReadinessPulse label="Errors" count={metrics.anomalies} subLabel="Data gaps" onClick={() => setActiveView('ANOMALIES')} />
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
                                    {Object.entries(assets.reduce((acc, a) => {
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
                                    {Object.entries(assets.reduce((acc, a) => {
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
