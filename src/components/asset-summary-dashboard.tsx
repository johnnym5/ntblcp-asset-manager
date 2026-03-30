'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    FileWarning, 
    BarChart2, 
    ClipboardCheck,
    Activity,
    Tag,
    AlertCircle,
    ChevronsUpDown,
    Calendar,
    History
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn, assetMatchesGlobalFilter } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

const StatCard = ({ title, value, description, icon, onAction, isActive }: { title: string, value: string | number, description: string, icon: React.ReactNode, onAction?: () => void, isActive?: boolean }) => {
    return (
        <button 
            onClick={onAction} 
            className={cn(
                "text-left outline-none rounded-xl shrink-0 transition-all duration-300 w-64 h-full border p-4",
                isActive ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" : "bg-card hover:bg-muted/50 shadow-sm"
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</span>
                <div className={cn("p-2 rounded-full", isActive ? "bg-primary/20" : "bg-muted")}>{icon}</div>
            </div>
            <div className="text-2xl font-black tracking-tight">{value}</div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight line-clamp-2">{description}</p>
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
        globalStateFilter, 
        activeGrantId, 
        setSelectedStatuses,
        selectedStatuses
    } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    
    const summary = useMemo(() => {
        const source = dataSource === 'cloud' ? assets : offlineAssets;
        const scoped = source.filter(a => {
            const matchesGrant = !activeGrantId || a.grantId === activeGrantId;
            const matchesGlobal = globalStateFilter === 'All' || a.location === globalStateFilter;
            return matchesGrant && matchesGlobal;
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

        return {
          total,
          verified,
          percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
          unverified: total - verified,
          unusable: scoped.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'].includes(a.condition)).length,
          missingId: scoped.filter(a => !a.assetIdCode?.trim()).length,
          discrepancy: scoped.filter(a => a.verifiedStatus === 'Discrepancy').length,
          yearBuckets: Object.entries(yearBuckets).sort((a, b) => String(b[0]).localeCompare(String(a[0]))),
        };
    }, [assets, offlineAssets, dataSource, activeGrantId, globalStateFilter]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                <div className='flex items-center justify-between p-4 rounded-2xl bg-card/80 border shadow-lg backdrop-blur-md mb-2 cursor-pointer hover:bg-card/100 transition-all group'>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <BarChart2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">Inventory Pulse</h3>
                            <p className="text-xs text-muted-foreground">Scoping {summary.total} hierarchical records.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 font-black uppercase text-[10px] tracking-widest">{summary.percentage}% Verified</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                <div className="flex overflow-x-auto pb-2 pt-2 px-1 gap-4 custom-scrollbar">
                    <StatCard
                        title="Verification Coverage"
                        value={`${summary.percentage}%`}
                        description={`Showing ${summary.verified} verified items in this scope.`}
                        icon={<ClipboardCheck className="h-4 w-4 text-green-500" />}
                        onAction={() => setSelectedStatuses(s => s.includes('Verified') ? [] : ['Verified'])}
                        isActive={selectedStatuses.includes('Verified')}
                    />
                    <StatCard
                        title="Pending Action"
                        value={summary.unverified}
                        description="Assets currently marked as unverified."
                        icon={<Activity className="h-4 w-4 text-primary" />}
                        onAction={() => setSelectedStatuses(s => s.includes('Unverified') ? [] : ['Unverified'])}
                        isActive={selectedStatuses.includes('Unverified')}
                    />
                    <StatCard
                        title="Missing Asset ID"
                        value={summary.missingId}
                        description="Assets lacking a unique tag or system ID code."
                        icon={<Tag className="h-4 w-4 text-orange-500" />}
                        onAction={() => setMissingFieldFilter(f => f === 'assetIdCode' ? '' : 'assetIdCode')}
                        isActive={missingFieldFilter === 'assetIdCode'}
                    />
                    <StatCard
                        title="Critical Condition"
                        value={summary.unusable}
                        description="Assets reported as stolen, burnt, or unsalvageable."
                        icon={<AlertCircle className="h-4 w-4 text-destructive" />}
                        isActive={false}
                    />
                </div>

                <Card className="bg-muted/5 border-dashed">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <History className="h-3 w-3 text-primary" /> Temporal breakdown (by Addition Year)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {summary.yearBuckets.map(([year, stats]) => {
                                const percentage = Math.round((stats.verified / stats.total) * 100);
                                return (
                                    <div key={year} className="space-y-1.5 p-3 bg-background rounded-xl border border-border/50 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold uppercase text-primary">{year}</span>
                                            <Badge variant="outline" className="text-[9px] h-4">{stats.verified}/{stats.total}</Badge>
                                        </div>
                                        <Progress value={percentage} className="h-1" />
                                        <p className="text-[9px] text-muted-foreground font-medium">{percentage}% Coverage</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
}
