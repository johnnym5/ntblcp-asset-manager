'use client';

/**
 * @fileOverview Inventory Dashboard - High-Fidelity Analytics Grid.
 * Phase 1100: Reorganized Quick Start tiles to match Folders and Anomalies.
 */

import React, { useMemo, useState } from 'react';
import { 
    BarChart2,
    ShieldCheck,
    Zap,
    Tag,
    Hash,
    AlertCircle,
    Wrench,
    FileWarning,
    MessageSquare,
    Clock,
    PlusCircle,
    ChevronDown,
    RefreshCw,
    MousePointer2,
    MapPin,
    Boxes,
    ChevronRight,
    Activity,
    FolderOpen,
    SearchCode,
    ClipboardCheck,
    FileUp,
    ArrowRight
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

type DashboardView = 'stats' | 'insights';

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
            "p-6 rounded-[2rem] border-2 bg-white/[0.02] border-white/5 text-left transition-all group relative overflow-hidden active:scale-95",
            isDestructive ? "hover:border-destructive/40 hover:bg-destructive/[0.02]" : "hover:border-primary/40 hover:bg-primary/[0.02]"
        )}
    >
        <div className="flex justify-between items-start mb-6">
            <div className={cn("p-3 rounded-2xl transition-colors", color)}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            {count !== undefined && (
                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    isDestructive ? "bg-destructive text-white" : "bg-primary text-black"
                )}>
                    {count}
                </div>
            )}
        </div>
        <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white tracking-tight">{label}</h4>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter leading-tight italic">{description}</p>
        </div>
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity">
            <ArrowRight className="h-4 w-4 text-white" />
        </div>
    </button>
);

export function AssetSummaryDashboard() {
    const { 
        assets, 
        refreshRegistry, 
        isSyncing, 
        setActiveView,
        setSearchTerm,
        setSelectedStatuses,
        setSelectedCategory,
        setSelectedLocations
    } = useAppState();
    
    const [view, setView] = useState<DashboardView>('stats');

    const metrics = useMemo(() => {
        const total = assets.length;
        const verified = assets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;
        const anomalyCount = assets.filter(a => a.discrepancies?.some(d => d.status === 'PENDING')).length;

        return {
            coverage,
            total,
            verified,
            pending: total - verified,
            anomalies: anomalyCount,
            folders: new Set(assets.map(a => a.category)).size
        };
    }, [assets]);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="space-y-10">
            {/* Header Terminal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-primary/10 rounded-2xl shadow-inner">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-xl font-black tracking-tight text-white uppercase leading-none">Quick Start Pulse</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                            Immediate operational triggers for current registry
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setView('stats')} 
                            className={cn(
                                "px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                view === 'stats' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Quick Actions
                        </button>
                        <button 
                            onClick={() => setView('insights')} 
                            className={cn(
                                "px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                view === 'insights' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Drill-down
                        </button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refreshRegistry} className="rounded-xl h-12 w-12 bg-white/5 border border-white/5 text-white/40 hover:text-primary">
                        <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'stats' ? (
                    <motion.div 
                        key="quick-start"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        <QuickStartTile 
                            label="Browse Registry" 
                            description="Full Category Inventory" 
                            icon={Boxes} 
                            color="bg-primary shadow-primary/20"
                            count={metrics.total}
                            onClick={() => setActiveView('REGISTRY')}
                        />
                        <QuickStartTile 
                            label="Registry Folders" 
                            description="Structural Data Tree" 
                            icon={FolderOpen} 
                            color="bg-blue-600 shadow-blue-600/20"
                            count={metrics.folders}
                            onClick={() => scrollTo('folders-section')}
                        />
                        <QuickStartTile 
                            label="Resolve Anomalies" 
                            description="Pattern Fidelity Review" 
                            icon={SearchCode} 
                            color="bg-red-600 shadow-red-600/20"
                            count={metrics.anomalies}
                            isDestructive={metrics.anomalies > 0}
                            onClick={() => scrollTo('anomalies-section')}
                        />
                        <QuickStartTile 
                            label="Field Verify" 
                            description="Start Physical Audit" 
                            icon={ClipboardCheck} 
                            color="bg-green-600 shadow-green-600/20"
                            count={`${metrics.coverage}%`}
                            onClick={() => setActiveView('VERIFY')}
                        />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="insights"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-8 shadow-3xl">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-primary/10 rounded-xl"><Boxes className="h-4 w-4 text-primary" /></div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Category Integrity Pulse</h4>
                            </div>
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-2">
                                    {Object.entries(assets.reduce((acc, a) => {
                                        const cat = a.category || 'Uncategorized';
                                        if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
                                        acc[cat].total++;
                                        if (a.status === 'VERIFIED') acc[cat].verified++;
                                        return acc;
                                    }, {} as any)).sort((a: any, b: any) => b[1].total - a[1].total).map(([cat, data]: any) => {
                                        const percent = Math.round((data.verified / data.total) * 100);
                                        return (
                                            <div 
                                                key={cat} 
                                                onClick={() => { setSelectedCategory(cat); setActiveView('REGISTRY'); }}
                                                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between"
                                            >
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between pr-4">
                                                        <span className="text-[11px] font-black uppercase text-white/80">{cat}</span>
                                                        <span className="text-[9px] font-mono font-bold text-primary">{data.verified} / {data.total}</span>
                                                    </div>
                                                    <Progress value={percent} className="h-1 bg-white/5" />
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-primary transition-all ml-4" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </Card>

                        <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-8 shadow-3xl">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-primary/10 rounded-xl"><MapPin className="h-4 w-4 text-primary" /></div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Regional Activity</h4>
                            </div>
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-2">
                                    {Object.entries(assets.reduce((acc, a) => {
                                        const loc = a.location || 'Unknown';
                                        if (!acc[loc]) acc[loc] = { total: 0, verified: 0 };
                                        acc[loc].total++;
                                        if (a.status === 'VERIFIED') acc[loc].verified++;
                                        return acc;
                                    }, {} as any)).sort((a: any, b: any) => b[1].total - a[1].total).slice(0, 10).map(([loc, data]: any) => {
                                        const percent = Math.round((data.verified / data.total) * 100);
                                        return (
                                            <div 
                                                key={loc} 
                                                onClick={() => { setSelectedLocations([loc]); setActiveView('REGISTRY'); }}
                                                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-[10px] text-white/20 group-hover:text-primary transition-colors">
                                                        {loc.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-black uppercase text-white/80">{loc}</span>
                                                            <span className="text-[9px] font-black uppercase text-white/40">{percent}% COMPLETE</span>
                                                        </div>
                                                        <Progress value={percent} className="h-1 bg-white/5" />
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-primary transition-all ml-4" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
