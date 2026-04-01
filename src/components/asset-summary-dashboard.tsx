'use client';

/**
 * @fileOverview Inventory Intelligence Pulse - High-Fidelity Dashboard Metrics.
 * Phase 108: Mobile-optimized snap-scroll and vertical matrices.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Activity,
    AlertCircle,
    ChevronsUpDown,
    ShieldAlert,
    ShieldCheck,
    TrendingUp,
    MousePointer2,
    Database,
    Zap,
    History,
    PieChart,
    Map,
    ChevronDown
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
                "text-left outline-none rounded-3xl shrink-0 transition-all duration-500 w-[280px] sm:w-72 border-2 p-6 sm:p-8 relative group active:scale-95 snap-center",
                isActive ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10" : "bg-card border-border/40 hover:border-primary/20 shadow-xl",
                variant === "danger" && !isActive && "border-destructive/20 hover:bg-destructive/5",
                variant === "warning" && !isActive && "border-orange-500/20 hover:bg-orange-500/5",
                variant === "success" && !isActive && "border-green-500/20 hover:bg-green-500/5"
            )}
        >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className={cn(
                  "p-2.5 sm:p-3 rounded-2xl transition-all shadow-inner", 
                  isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                )}>
                  {icon}
                </div>
                <Badge variant="outline" className="opacity-0 group-hover:opacity-40 transition-opacity text-[8px] uppercase tracking-tighter">Toggle Filter</Badge>
            </div>
            
            <div className="space-y-1">
              <div className={cn(
                "text-4xl sm:text-5xl font-black tracking-tighter leading-none", 
                variant === "danger" ? "text-destructive" : variant === "warning" ? "text-orange-600" : "text-foreground"
              )}>
                {value}
              </div>
              <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 pt-2">{title}</h4>
            </div>

            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mt-3 sm:mt-4 leading-relaxed italic opacity-70">
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
    const [isOpen, setIsOpen] = useState(true);
    
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

        const criticalConditions = ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'];
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
                <div className='flex items-center justify-between p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-card border-2 shadow-2xl backdrop-blur-md mb-6 cursor-pointer hover:bg-muted/30 transition-all group mx-1 sm:mx-0'>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-foreground uppercase leading-none">Intelligence Pulse</h3>
                            <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                                {summary.total} Records Synced
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Health</span>
                            <span className="text-xl font-black text-primary leading-none">{summary.percentage}%</span>
                        </div>
                        <Badge variant="outline" className="h-8 sm:h-10 px-3 sm:px-6 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary shadow-sm">
                            {summary.percentage}% Health
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-muted/50 hover:bg-primary/10 transition-all">
                            <ChevronDown className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500", isOpen && "rotate-180")} />
                        </Button>
                    </div>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
                <ScrollArea className="w-full">
                    <div className="flex pb-6 pt-2 px-1 gap-4 sm:gap-6 snap-x">
                        <StatCard
                            title="Registry Coverage"
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
                            title="Data Gaps"
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pb-8 px-1 sm:px-0">
                    {/* REGIONAL PERFORMANCE COMPARISON */}
                    <Card className="lg:col-span-8 bg-muted/10 border-2 border-dashed border-border/40 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-none">
                        <CardHeader className="p-6 sm:p-8 bg-muted/20 border-b border-dashed flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                <Map className="h-4 w-4 text-primary" /> Regional Matrix
                            </CardTitle>
                            <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-3 h-6 rounded-full">Global Scope</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[350px]">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow className="border-b-dashed">
                                            <TableHead className="font-black uppercase text-[9px] py-4 pl-6 sm:pl-10 tracking-widest">Region</TableHead>
                                            <TableHead className="font-black uppercase text-[9px] py-4 tracking-widest hidden xs:table-cell">Total</TableHead>
                                            <TableHead className="font-black uppercase text-[9px] py-4 tracking-widest text-right pr-6 sm:pr-10">Health</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.comparisonHub.map((state) => (
                                            <TableRow key={state.name} className="group border-b-dashed last:border-0 hover:bg-primary/[0.02] transition-colors">
                                                <TableCell className="py-4 pl-6 sm:pl-10 font-black text-xs sm:text-sm uppercase tracking-tight">{state.name}</TableCell>
                                                <TableCell className="py-4 text-xs font-mono font-bold opacity-60 hidden xs:table-cell">{state.total}</TableCell>
                                                <TableCell className="py-4 pr-6 sm:pr-10 text-right">
                                                    <div className="flex items-center justify-end gap-4">
                                                        <div className="w-16 sm:w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block shadow-inner">
                                                            <div className="h-full bg-primary" style={{ width: `${state.percentage}%` }} />
                                                        </div>
                                                        <span className="font-black text-[10px] sm:text-[11px] tabular-nums text-primary tracking-widest">{state.percentage}%</span>
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
                        <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-none">
                            <CardHeader className="p-5 sm:p-6 bg-muted/20 border-b border-dashed">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                    <History className="h-4 w-4 text-primary" /> Temporal Pulse
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <ScrollArea className="h-[180px] pr-4">
                                    <div className="space-y-5">
                                        {summary.yearBuckets.map(([year, stats]) => {
                                            const percentage = Math.round((stats.verified / stats.total) * 100);
                                            return (
                                                <div key={year} className="space-y-2">
                                                    <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-tight">
                                                        <span className="opacity-60">{year} Scope</span>
                                                        <span className="text-primary">{percentage}%</span>
                                                    </div>
                                                    <Progress value={percentage} className="h-1" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* CONDITION MIX */}
                        <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-none">
                            <CardHeader className="p-5 sm:p-6 bg-muted/20 border-b border-dashed">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                    <PieChart className="h-4 w-4 text-primary" /> Asset Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <div className="space-y-4">
                                    {summary.conditionStats.slice(0, 4).map(([label, count]) => {
                                        const percentage = Math.round((count / summary.total) * 100);
                                        return (
                                            <div key={label} className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase">
                                                <span className="truncate max-w-[120px] opacity-60 tracking-tight">{label}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="tabular-nums font-mono">{count}</span>
                                                    <Badge className="h-5 px-2 text-[7px] sm:text-[8px] font-black bg-primary/10 text-primary border-none rounded-md">{percentage}%</Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
