'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    BarChart2, 
    ClipboardCheck,
    Activity,
    AlertCircle,
    ChevronsUpDown,
    History,
    Layout,
    ShieldAlert,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';

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
                "text-left outline-none rounded-2xl shrink-0 transition-all duration-500 w-64 h-full border-2 p-5",
                isActive ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10 scale-105" : "bg-card hover:bg-muted/50 shadow-sm border-border/50",
                variant === "danger" && !isActive && "border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40",
                variant === "warning" && !isActive && "border-orange-500/20 hover:bg-orange-500/5 hover:border-orange-500/40",
                variant === "success" && !isActive && "border-green-500/20 hover:bg-green-500/5 hover:border-green-500/40"
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">{title}</span>
                <div className={cn("p-2.5 rounded-xl transition-colors", isActive ? "bg-primary/20" : "bg-muted")}>{icon}</div>
            </div>
            <div className={cn("text-3xl font-black tracking-tighter", variant === "danger" && "text-destructive", variant === "warning" && "text-orange-600", variant === "success" && "text-green-600")}>{value}</div>
            <p className="text-[11px] font-bold text-muted-foreground mt-2 leading-tight line-clamp-2 uppercase tracking-tighter opacity-80">{description}</p>
        </button>
    );
};

export function AssetSummaryDashboard() {
    const { 
        assets, 
        offlineAssets, 
        dataSource, 
        setMissingFieldFilter, 
        missingFieldFilter, 
        globalStateFilters, 
        activeGrantId, 
        setSelectedStatuses,
        selectedStatuses,
        setSelectedConditions,
        selectedConditions
    } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    
    const summary = useMemo(() => {
        const source = dataSource === 'cloud' ? assets : offlineAssets;
        const scoped = source.filter(a => {
            const matchesGrant = !activeGrantId || a.grantId === activeGrantId;
            const matchesRegion = globalStateFilters.length === 0 || globalStateFilters.includes(a.location || '');
            return matchesGrant && matchesRegion;
        });
        
        const total = scoped.length;
        const verified = scoped.filter(a => a.verifiedStatus === 'Verified').length;
        
        const yearBuckets = scoped.reduce((acc, a) => {
            const year = a.yearBucket || 'Base Register';
            if (!acc[year]) acc[year] = { total: 0, verified: 0 };
            acc[year].total++;
            if (a.verifiedStatus === 'Verified') acc[year].verified++;
            return acc;
        }, {} as Record<string | number, { total: number, verified: number }>);

        const majorSections = scoped.reduce((acc, a) => {
            const section = a.majorSection || 'Standard Entry';
            if (!acc[section]) acc[section] = { total: 0, verified: 0 };
            acc[section].total++;
            if (a.verifiedStatus === 'Verified') acc[section].verified++;
            return acc;
        }, {} as Record<string, { total: number, verified: number }>);

        const criticalConditions = ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'];
        const unusable = scoped.filter(a => a.condition && criticalConditions.includes(a.condition));
        const missingContext = scoped.filter(a => !a.majorSection).length;

        return {
          total,
          verified,
          percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
          unverified: total - verified,
          unusableCount: unusable.length,
          missingContext,
          yearBuckets: Object.entries(yearBuckets).sort((a, b) => String(b[0]).localeCompare(String(a[0]))),
          majorSections: Object.entries(majorSections).sort((a,b) => b[1].total - a[1].total),
        };
    }, [assets, offlineAssets, dataSource, activeGrantId, globalStateFilters]);

    const handleToggleConditionFilter = () => {
        const criticalConditions = ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'];
        const isAllSelected = criticalConditions.every(c => selectedConditions.includes(c));
        setSelectedConditions(isAllSelected ? [] : criticalConditions);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                <div className='flex items-center justify-between p-5 rounded-3xl bg-card border-2 shadow-2xl backdrop-blur-md mb-4 cursor-pointer hover:bg-muted/30 transition-all group'>
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                            <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-foreground">Inventory Intelligence Pulse</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                                Aggregating {summary.total} hierarchical registry records.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Global Completion</span>
                            <span className="text-sm font-black text-primary leading-none">{summary.percentage}%</span>
                        </div>
                        <Badge variant="outline" className="h-8 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
                            {summary.verified}/{summary.total} Verified
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all">
                            <ChevronsUpDown className={cn("h-5 w-5 transition-transform duration-500", isOpen && "rotate-180")} />
                        </Button>
                    </div>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex overflow-x-auto pb-4 pt-2 px-1 gap-5 custom-scrollbar">
                    <StatCard
                        title="Verification Coverage"
                        value={`${summary.percentage}%`}
                        description="Registry items successfully matched in the field."
                        icon={<ShieldCheck className="h-5 w-5 text-green-500" />}
                        onAction={() => setSelectedStatuses(s => s.includes('Verified') ? [] : ['Verified'])}
                        isActive={selectedStatuses.includes('Verified')}
                        variant="success"
                    />
                    <StatCard
                        title="Action Required"
                        value={summary.unverified}
                        description="Total assets remaining in the unverified queue."
                        icon={<Activity className="h-5 w-5 text-primary" />}
                        onAction={() => setSelectedStatuses(s => s.includes('Unverified') ? [] : ['Unverified'])}
                        isActive={selectedStatuses.includes('Unverified')}
                    />
                    <StatCard
                        title="Critical Condition"
                        value={summary.unusableCount}
                        description="Stolen, burnt, or unsalvageable registry exceptions."
                        icon={<AlertCircle className="h-5 w-5 text-destructive" />}
                        onAction={handleToggleConditionFilter}
                        isActive={selectedConditions.length > 0 && ['Stolen', 'Burnt'].every(c => selectedConditions.includes(c))}
                        variant="danger"
                    />
                    <StatCard
                        title="Legacy Data Exception"
                        value={summary.missingContext}
                        description="Records missing hierarchical register provenance."
                        icon={<ShieldAlert className="h-5 w-5 text-orange-500" />}
                        onAction={() => setMissingFieldFilter(prev => prev === 'majorSection' ? '' : 'majorSection')}
                        isActive={missingFieldFilter === 'majorSection'}
                        variant="warning"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                    <Card className="bg-muted/10 border-2 border-dashed rounded-3xl overflow-hidden shadow-none">
                        <CardHeader className="py-5 px-6 flex flex-row items-center justify-between space-y-0 bg-muted/20 border-b border-dashed">
                            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                                <History className="h-4 w-4 text-primary" /> Temporal Registry Breakdown
                            </CardTitle>
                            <Badge variant="secondary" className="text-[9px] font-bold">BY ADDITION YEAR</Badge>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {summary.yearBuckets.map(([year, stats]) => {
                                    const percentage = Math.round((stats.verified / stats.total) * 100);
                                    return (
                                        <div key={year} className="space-y-2 p-4 bg-background rounded-2xl border-2 border-border/50 shadow-sm transition-all hover:border-primary/30">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black uppercase text-primary tracking-tighter">{year}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground">{stats.verified}/{stats.total}</span>
                                            </div>
                                            <Progress value={percentage} className="h-1.5" />
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{percentage}% Coverage</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/10 border-2 border-dashed rounded-3xl overflow-hidden shadow-none">
                        <CardHeader className="py-5 px-6 flex flex-row items-center justify-between space-y-0 bg-muted/20 border-b border-dashed">
                            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                                <Layout className="h-4 w-4 text-primary" /> Major Register Contexts
                            </CardTitle>
                            <Badge variant="secondary" className="text-[9px] font-bold">BY DOCUMENT SECTION</Badge>
                        </CardHeader>
                        <CardContent className="p-6 pt-4">
                            <ScrollArea className="h-[160px] pr-4">
                                <div className="space-y-4">
                                    {summary.majorSections.map(([section, stats]) => {
                                        const percentage = Math.round((stats.verified / stats.total) * 100);
                                        return (
                                            <div key={section} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                                    <span className="truncate pr-4 text-foreground">{section}</span>
                                                    <span className={cn(percentage > 80 ? "text-green-600" : "text-primary")}>{percentage}%</span>
                                                </div>
                                                <Progress value={percentage} className={cn("h-1", percentage === 100 && "bg-green-100")} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
