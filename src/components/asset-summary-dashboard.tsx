'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    FileWarning, 
    BarChart2, 
    CalendarClock, 
    ChevronsUpDown, 
    PlusCircle, 
    AlertTriangle, 
    CheckCircle2, 
    ClipboardCheck,
    AlertCircle,
    Hash,
    MessageSquare,
    Activity,
    Wrench,
    Tag
} from 'lucide-react';
import type { Asset } from '@/lib/types';
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { useAppState } from '@/contexts/app-state-context';
import { cn, assetMatchesGlobalFilter } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
        dateFilter, 
        setDateFilter, 
        globalStateFilters, 
        conditionFilter, 
        setConditionFilter, 
        activeGrantId, 
        setSelectedStatuses,
        selectedStatuses
    } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    
    const summaryAssets = useMemo(() => {
        const source = dataSource === 'cloud' ? assets : offlineAssets;
        let filtered = source.filter(a => a.grantId === activeGrantId);
        if (!globalStateFilters.includes('All')) {
            filtered = filtered.filter(a => globalStateFilters.some(s => assetMatchesGlobalFilter(a, s)));
        }
        return filtered;
    }, [assets, offlineAssets, dataSource, globalStateFilters, activeGrantId]);

    const summary = useMemo(() => {
        const total = summaryAssets.length;
        const verified = summaryAssets.filter(a => a.verifiedStatus === 'Verified').length;
        return {
          total,
          verified,
          percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
          unverified: total - verified,
          unusable: summaryAssets.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'].includes(a.condition)).length,
          needsRepair: summaryAssets.filter(a => a.condition && ['Bad condition', 'Used but in poor condition'].includes(a.condition)).length,
          missingId: summaryAssets.filter(a => !a.assetIdCode?.trim()).length,
          modifiedToday: summaryAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length,
          discrepancy: summaryAssets.filter(a => a.verifiedStatus === 'Discrepancy').length,
        };
    }, [summaryAssets]);

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
                            <p className="text-xs text-muted-foreground">Scoping {summary.total} records in current context.</p>
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
            
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex overflow-x-auto pb-4 pt-2 px-1 gap-4 custom-scrollbar-x">
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
                        onAction={() => setConditionFilter(c => c.length > 0 ? [] : ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'])}
                        isActive={conditionFilter.length > 0}
                    />
                    <StatCard
                        title="Audit Exceptions"
                        value={summary.discrepancy}
                        description="Records with field data conflicts."
                        icon={<FileWarning className="h-4 w-4 text-destructive" />}
                        onAction={() => setSelectedStatuses(s => s.includes('Discrepancy') ? [] : ['Discrepancy'])}
                        isActive={selectedStatuses.includes('Discrepancy')}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
