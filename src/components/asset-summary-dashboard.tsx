
'use client';

/**
 * @fileOverview Inventory Intelligence Pulse - High-Fidelity Dashboard Metrics.
 * Phase 98: Redesigned to strictly match provided high-fidelity design.
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
    Map
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
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
                "text-left outline-none rounded-3xl shrink-0 transition-all duration-500 w-full sm:w-72 h-full border-2 p-8 relative group active:scale-95",
                isActive ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10 scale-[1.02]" : "bg-card border-border/40 hover:border-primary/20 shadow-xl",
                variant === "danger" && !isActive && "border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40",
                variant === "warning" && !isActive && "border-orange-500/20 hover:bg-orange-500/5 hover:border-orange-500/40",
                variant === "success" && !isActive && "border-green-500/20 hover:bg-green-500/5 hover:border-green-500/40"
            )}
        >
            <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "p-3 rounded-2xl transition-all shadow-inner", 
                  isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  {icon}
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-20 transition-opacity">
                  <MousePointer2 className="h-4 w-4" />
                </div>
            </div>
            
            <div className="space-y-1">
              <div className={cn(
                "text-5xl font-black tracking-tighter leading-none", 
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
        dataSource, 
        setMissingFieldFilter, 
        missingFieldFilter, 
        globalStateFilter, 
        activeGrantId, 
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
            const loc = a.location || 'Unknown Registry';
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
            const year = a.yearBucket || 'Base Register';
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
                <div className='flex items-center justify-between p-8 rounded-[2.5rem] bg-card border-2 shadow-2xl backdrop-blur-md mb-6 cursor-pointer hover:bg-muted/30 transition-all group'>
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                            <TrendingUp className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tight text-foreground uppercase leading-none">Inventory Intelligence Pulse</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                                Real-time performance metrics for {summary.total} registry records.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Global Health</span>
                            <span className="text-xl font-black text-primary leading-none">{summary.percentage}%</span>
                        </div>
                        <Badge variant="outline" className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary shadow-sm">
                            {summary.verified}/{summary.total} Verified
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all">
                            <ChevronsUpDown className={cn("h-6 w-6 transition-transform duration-500", isOpen && "rotate-180")} />
                        </Button>
                    </div>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
                <div className="flex overflow-x-auto pb-6 pt-2 px-1 gap-6 custom-scrollbar">
                    <StatCard
                        title="Registry Coverage"
                        value={`${summary.percentage}%`}
                        description="Physical match rate across the active project register."
                        icon={<ShieldCheck className="h-6 w-6" />}
                        onAction={() => setSelectedStatuses(s => s.includes('VERIFIED') ? [] : ['VERIFIED'])}
                        isActive={selectedStatuses.includes('VERIFIED')}
                        variant="success"
                    />
                    <StatCard
                        title="Unverified Queue"
                        value={summary.unverified}
                        description="Records pending physical field assessment."
                        icon={<Activity className="h-6 w-6" />}
                        onAction={() => setSelectedStatuses(s => s.includes('UNVERIFIED') ? [] : ['UNVERIFIED'])}
                        isActive={selectedStatuses.includes('UNVERIFIED')}
                    />
                    <StatCard
                        title="High-Risk Exceptions"
                        value={summary.unusableCount}
                        description="Stolen, burnt, or unsalvageable asset pulses."
                        icon={<AlertCircle className="h-6 w-6" />}
                        onAction={() => setSelectedConditions(['Stolen', 'Burnt', 'Unsalvageable'])}
                        isActive={selectedConditions.length > 0}
                        variant="danger"
                    />
                    <StatCard
                        title="Legacy Exceptions"
                        value={summary.missingHierarchy}
                        description="Assets missing hierarchical provenance metadata."
                        icon={<ShieldAlert className="h-6 w-6" />}
                        onAction={() => setMissingFieldFilter(prev => prev === 'section' ? '' : 'section')}
                        isActive={missingFieldFilter === 'section'}
                        variant="warning"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8">
                    {/* REGIONAL PERFORMANCE COMPARISON */}
                    <Card className="lg:col-span-8 bg-muted/10 border-2 border-dashed border-border/40 rounded-[3rem] overflow-hidden shadow-none">
                        <CardHeader className="p-8 bg-muted/20 border-b border-dashed flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                <Map className="h-4 w-4 text-primary" /> Regional Performance Matrix
                            </CardTitle>
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary bg-primary/5 px-4 h-7 rounded-full">Showing {summary.comparisonHub.length} Regions</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[350px]">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow className="border-b-dashed">
                                            <TableHead className="font-black uppercase text-[10px] py-4 pl-10 tracking-widest">State / Location</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] py-4 tracking-widest">Total</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] py-4 tracking-widest">Verified</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] py-4 pr-10 text-right tracking-widest">Coverage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.comparisonHub.map((state) => (
                                            <TableRow key={state.name} className="group border-b-dashed last:border-0 hover:bg-primary/[0.02] transition-colors">
                                                <TableCell className="py-5 pl-10 font-black text-sm uppercase tracking-tight">{state.name}</TableCell>
                                                <TableCell className="py-5 text-xs font-mono font-bold opacity-60">{state.total}</TableCell>
                                                <TableCell className="py-5 text-xs font-mono font-bold text-green-600">{state.verified}</TableCell>
                                                <TableCell className="py-5 pr-10 text-right">
                                                    <div className="flex items-center justify-end gap-4">
                                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block shadow-inner">
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

                    <div className="lg:col-span-4 space-y-8">
                        {/* TEMPORAL BREAKDOWN */}
                        <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[2.5rem] overflow-hidden shadow-none">
                            <CardHeader className="p-6 bg-muted/20 border-b border-dashed">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                    <History className="h-4 w-4 text-primary" /> Temporal Pulse
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <ScrollArea className="h-[200px] pr-4">
                                    <div className="space-y-6">
                                        {summary.yearBuckets.map(([year, stats]) => {
                                            const percentage = Math.round((stats.verified / stats.total) * 100);
                                            return (
                                                <div key={year} className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                                                        <span className="opacity-60">{year} Register</span>
                                                        <span className="text-primary">{percentage}%</span>
                                                    </div>
                                                    <Progress value={percentage} className="h-1.5" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* CONDITION MIX */}
                        <Card className="bg-muted/10 border-2 border-dashed border-border/40 rounded-[2.5rem] overflow-hidden shadow-none">
                            <CardHeader className="p-6 bg-muted/20 border-b border-dashed">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                                    <PieChart className="h-4 w-4 text-primary" /> Asset Health Spread
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="space-y-4">
                                    {summary.conditionStats.slice(0, 5).map(([label, count]) => {
                                        const percentage = Math.round((count / summary.total) * 100);
                                        return (
                                            <div key={label} className="flex items-center justify-between text-[10px] font-black uppercase">
                                                <span className="truncate max-w-[140px] opacity-60 tracking-tight">{label}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="tabular-nums font-mono">{count}</span>
                                                    <Badge className="h-5 px-2 text-[8px] font-black bg-primary/10 text-primary border-none rounded-md">{percentage}%</Badge>
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
