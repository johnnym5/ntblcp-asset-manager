'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    BarChart2, 
    ClipboardCheck, 
    Activity, 
    Tag, 
    AlertCircle, 
    FileWarning 
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn, assetMatchesGlobalFilter } from '@/lib/utils';

const StatCard = ({ title, value, description, icon, onAction, isActive }: { title: string, value: string | number, description: string, icon: React.ReactNode, onAction?: () => void, isActive?: boolean }) => (
    <Card className={cn("transition-all duration-300 shadow-sm", isActive ? "bg-primary/10 border-primary" : "hover:bg-muted/50")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
            <div className="p-2 rounded-full bg-muted">{icon}</div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-black">{value}</div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{description}</p>
        </CardContent>
    </Card>
);

export function AssetSummaryDashboard() {
    const { assets, offlineAssets, dataSource, activeGrantId, globalStateFilters } = useAppState();
    
    const summary = useMemo(() => {
        const active = dataSource === 'cloud' ? assets : offlineAssets;
        const scoped = active.filter(a => a.grantId === activeGrantId && assetMatchesGlobalFilter(a, globalStateFilters));
        
        const total = scoped.length;
        const verified = scoped.filter(a => a.verifiedStatus === 'Verified').length;
        
        return {
            total,
            coverage: total > 0 ? Math.round((verified / total) * 100) : 0,
            pending: total - verified,
            noTag: scoped.filter(a => !a.assetIdCode).length,
            critical: scoped.filter(a => a.condition && ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition)).length,
            discrepancy: scoped.filter(a => a.verifiedStatus === 'Discrepancy').length
        };
    }, [assets, offlineAssets, dataSource, activeGrantId, globalStateFilters]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-card border rounded-xl shadow-sm">
                <BarChart2 className="h-5 w-5 text-primary" />
                <div>
                    <h3 className="text-lg font-bold tracking-tight">Inventory Pulse</h3>
                    <p className="text-xs text-muted-foreground">Scoping {summary.total} records in current context.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Verification" value={`${summary.coverage}%`} description="Overall progress" icon={<ClipboardCheck className="text-green-500" />} />
                <StatCard title="Pending" value={summary.pending} description="Awaiting action" icon={<Activity className="text-primary" />} />
                <StatCard title="Untagged" value={summary.noTag} description="Missing ID codes" icon={<Tag className="text-orange-500" />} />
                <StatCard title="Critical" value={summary.critical} description="Loss or damage" icon={<AlertCircle className="text-destructive" />} />
                <StatCard title="Exceptions" value={summary.discrepancy} description="Field conflicts" icon={<FileWarning className="text-destructive" />} />
            </div>
        </div>
    );
}
