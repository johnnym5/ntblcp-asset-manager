'use client';

/**
 * @fileOverview Inventory & Intelligence Center - High-Fidelity Unified Telemetry.
 * Phase 128: Renamed Map to MapIcon to resolve constructor conflict.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Activity,
    AlertCircle,
    ChevronsUpDown,
    ShieldCheck,
    TrendingUp,
    Map as MapIcon,
    ChevronDown,
    Layers,
    ShieldAlert,
    Zap
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const StatCard = ({ title, value, description, icon, onAction, isActive, variant = "default" }: { 
    title: string, 
    value: string | number, 
    description: string, 
    icon: React.ReactNode, 
    onAction?: () => void, 
    isActive?: boolean,
    variant?: "default" | "warning" | "danger" | "success"
}) => {
    return (
        <button 
            onClick={onAction} 
            className={cn(
                "text-left outline-none rounded-3xl shrink-0 transition-all duration-500 w-[280px] sm:w-auto sm:flex-1 border-2 p-6 sm:p-8 relative group active:scale-95 snap-center min-w-[260px]",
                isActive ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10" : "bg-card border-border/40 hover:border-primary/20 shadow-xl",
                variant === "danger" && !isActive && "border-destructive/20 hover:bg-destructive/5",
                variant === "warning" && !isActive && "border-orange-500/20 hover:bg-orange-500/5",
                variant === "success" && !isActive && "border-green-500/20 hover:bg-green-500/5"
            )}
        >
            <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "p-3 rounded-2xl transition-all shadow-inner", 
                  isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                )}>
                  {icon}
                </div>
                <Badge variant="outline" className="opacity-0 group-hover:opacity-40 transition-opacity text-[8px] uppercase tracking-tighter">Toggle Logic</Badge>
            </div>
            
            <div className="space-y-1">
              <div className={cn(
                "text-4xl sm:text-5xl font-black tracking-tighter leading-none", 
                variant === "danger" ? "text-destructive" : variant === "warning" ? "text-orange-600" : "text-foreground"
              )}>
                {value}
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 pt-2">{title}</h4>
            </div>

            <p className="text-[11px] font-medium text-muted-foreground mt-4 leading-relaxed italic opacity-70">
              {description}
            </p>
        </button>
    );
};

export function AssetSummaryDashboard() {
    const { 
        assets, 
        setMissingFieldFilter, 
        missingFieldFilter, 
        selectedStatuses,
        setSelectedStatuses,
        selectedConditions,
        setSelectedConditions
    } = useAppState();
    
    const [isOpen, setIsOpen] = useState(false);
    const [pulseView, setPulseView] = useState<'stats' | 'insights'>('stats');
    
    const summary = useMemo(() => {
        const source = assets;
        const total = source.length;
        const verified = source.filter(a => a.status === 'VERIFIED').length;
        
        const stateStats = source.reduce((acc, a) => {
            const loc = a.location || 'Global';
            if (!acc[loc]) acc[loc] = { total: 0, verified: 0 };
            acc[loc].total++;
            if (a.status === 'VERIFIED') acc[loc].verified++;
            return acc;
        }, {} as Record<string, { total: number, verified: number }>);

        const conditionStats = source.reduce((acc, a) => {
            const cond = a.condition || 'Unassessed';
            acc[cond] = (acc[cond] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const yearBuckets = source.reduce((acc, a) => {
            const year = a.yearBucket || 'Legacy';
            if (!acc[year]) acc[year] = { total: 0, verified: 0 };
            acc[year].total++;
            if (a.status === 'VERIFIED') acc[year].verified++;
            return acc;
        }, {} as Record<string | number, { total: number, verified: number }>);

        const criticalConditions = ['Stolen', 'Burnt', 'Unsalvageable', 'Writeoff'];
        const unusable = source.filter(a => a.condition && criticalConditions.includes(a.condition));
        const missingHierarchy = source.filter(a => !a.section || a.section === 'General').length;

        const comparisonHub = Object.entries(stateStats)
            .map(([name, stats]) => ({ name, percentage: Math.round((stats.verified / stats.total) * 100), ...stats }))
            .sort((a, b) => b.total - a.total);

        return {
          total,
          verified,
          percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
          unverified: total - verified,
          unusableCount: unusable.length,
          missingHierarchy,
          yearBuckets: Object.entries(yearBuckets).sort((a, b) => String(b[0]).localeCompare(String(a[0]))),
          comparisonHub,
          conditionStats: Object.entries(conditionStats).sort((a, b) => b[1] - a[1]),
        };
    }, [assets]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                <div className='flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-[#0A0A0A] border-none shadow-3xl backdrop-blur-md mb-6 cursor-pointer hover:bg-[#111] transition-all group relative overflow-hidden'>
                    {/* Background Accent Pulse */}
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity className="h-32 w-32 text-primary" />
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 z-10">
                        <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase leading-none">Inventory & Intelligence Pulse</h3>
                            <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                                Registry Health Telemetry & {summary.total} Records Synced
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 mt-6 sm:mt-0 z-10 w-full sm:w-auto">
                        <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/5 flex-1 sm:flex-none">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setPulseView('stats'); }} 
                                className={cn("flex-1 sm:flex-none px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all", pulseView === 'stats' ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white")}
                            >
                                Stats
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setPulseView('insights'); }} 
                                className={cn("flex-1 sm:flex-none px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all", pulseView === 'insights' ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white")}
                            >
                                Insights
                            </button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-primary/10 text-white transition-all">
                            <ChevronDown className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500", isOpen && "rotate-180")} />
                        </Button>
                    </div>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
                <ScrollArea className="w-full">
                    <div className="flex pb-6 pt-2 gap-4 sm:gap-6 snap-x">
                        <StatCard
                            title="Audit Coverage"
                            value={`${summary.percentage}%`}
                            description="Physical match rate across scope."
                            icon={<ShieldCheck className="h-6 w-6" />}
                            onAction={() => setSelectedStatuses(s => s.includes('VERIFIED') ? [] : ['VERIFIED'])}
                            isActive={selectedStatuses.includes('VERIFIED')}
                            variant="success"
                        />
                        <StatCard
                            title="Pending Audit"
                            value={summary.unverified}
                            description="Records awaiting field assessment."
                            icon={<Activity className="h-6 w-6" />}
                            onAction={() => setSelectedStatuses(s => s.includes('UNVERIFIED') ? [] : ['UNVERIFIED'])}
                            isActive={selectedStatuses.includes('UNVERIFIED')}
                        />
                        <StatCard
                            title="Risk Alerts"
                            value={summary.unusableCount}
                            description="Critical discrepancies discovered."
                            icon={<AlertCircle className="h-6 w-6" />}
                            onAction={() => setSelectedConditions(['Stolen', 'Burnt', 'Unsalvageable'])}
                            isActive={selectedConditions.length > 0}
                            variant="danger"
                        />
                        <StatCard
                            title="Legacy Gaps"
                            value={summary.missingHierarchy}
                            description="Missing hierarchical provenance."
                            icon={<ShieldAlert className="h-6 w-6" />}
                            onAction={() => setMissingFieldFilter(prev => prev === 'section' ? '' : 'section')}
                            isActive={missingFieldFilter === 'section'}
                            variant="warning"
                        />
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {pulseView === 'stats' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pb-8">
                        {/* REGIONAL PERFORMANCE COMPARISON */}
                        <Card className="lg:col-span-8 bg-muted/10 border-2 border-dashed border-border/40 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-none">
                            <CardHeader className="p-6 sm:p-8 bg-muted/20 border-b border-dashed flex flex-row items-center justify-between">
                                <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                    <MapIcon className="h-4 w-4 text-primary" /> Regional Matrix
                                </CardTitle>
                                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-3 h-6 rounded-full">GLOBAL SCOPE</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[350px]">
                                    <Table>
                                        <TableHeader className="bg-muted/10">
                                            <TableRow className="border-b-dashed">
                                                <TableHead className="font-black uppercase text-[9px] py-4 pl-10 tracking-widest">Region</TableHead>
                                                <TableHead className="font-black uppercase text-[9px] py-4 tracking-widest hidden sm:table-cell">Total</TableHead>
                                                <TableHead className="font-black uppercase text-[9px] py-4 tracking-widest text-right pr-10">Health</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {summary.comparisonHub.map((state) => (
                                                <TableRow key={state.name} className="group border-b-dashed last:border-0 hover:bg-primary/[0.02] transition-colors">
                                                    <TableCell className="py-4 pl-10 font-black text-sm uppercase tracking-tight">{state.name}</TableCell>
                                                    <TableCell className="py-4 text-xs font-mono font-bold opacity-60 hidden sm:table-cell">{state.total}</TableCell>
                                                    <TableCell className="py-4 pr-10 text-right">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden md:block shadow-inner">
                                                                <div className="h-full bg-primary" style={{ width: `${state.percentage}%` }} />
                                                            </div>
                                                            <span className="font-black text-[11px] tabular-nums text-primary tracking-widest">{state.percentage}%</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-8">
                            {/* TEMPORAL BREAKDOWN */}
                            <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-none">
                                <CardHeader className="p-6 bg-muted/20 border-b border-dashed">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                        <TrendingUp className="h-4 w-4 text-primary" /> Temporal Pulse
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="space-y-5">
                                        {summary.yearBuckets.slice(0, 4).map(([year, stats]) => {
                                            const percentage = Math.round((stats.verified / stats.total) * 100);
                                            return (
                                                <div key={year} className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <span className="opacity-60">{year} Scope</span>
                                                        <span className="text-primary">{percentage}%</span>
                                                    </div>
                                                    <Progress value={percentage} className="h-1" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-none flex-1">
                                <CardHeader className="p-6 bg-muted/20 border-b border-dashed">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                        <Layers className="h-4 w-4 text-primary" /> Structure Pulse
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 flex flex-col justify-center items-center text-center space-y-4">
                                    <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                                        <ShieldCheck className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black tracking-tighter text-foreground">STABLE</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Logic Fidelity Protocol</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="pb-8">
                        <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center gap-6">
                            <div className="p-6 bg-primary/10 rounded-[2rem]">
                                <Zap className="h-12 w-12 text-primary fill-current" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black uppercase tracking-tight text-foreground">Intelligence Insights</h4>
                                <p className="text-sm font-medium text-muted-foreground italic max-w-lg mx-auto">
                                    Strategic registry observations: Higher-than-average verification velocity in North-Central. Duplicate serial pulse detected in PDX category.
                                </p>
                            </div>
                            <Badge className="bg-primary text-black font-black uppercase px-6 h-8 text-[10px] tracking-widest">SYSTEM_OPTIMIZED</Badge>
                        </Card>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}