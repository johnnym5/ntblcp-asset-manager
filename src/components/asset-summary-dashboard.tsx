'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileWarning, History, BarChart2, CalendarClock, AlertCircle, ChevronsUpDown } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const StatCard = ({ title, value, description, icon, onAction, actionLabel, isActive }: { title: string, value: string | number, description: string, icon: React.ReactNode, onAction?: () => void, actionLabel?: string, isActive?: boolean }) => {
    return (
        <Card className={cn("transition-colors", isActive ? "bg-primary/10 border-primary" : "")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground h-10">
                    {description}
                </p>
                {onAction && actionLabel && (
                     <Button variant="link" size="sm" className="p-0 h-auto mt-2" onClick={onAction}>{actionLabel}</Button>
                )}
            </CardContent>
        </Card>
    )
};

export function AssetSummaryDashboard() {
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    
    const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

    const summary = useMemo(() => {
        const withoutSerial = activeAssets.filter(a => !a.sn && !a.serialNumber).length;
        const withoutAssetId = activeAssets.filter(a => !a.assetIdCode).length;
        const modifiedToday = activeAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length;
        const modifiedThisWeek = activeAssets.filter(a => a.lastModified && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length;

        const criticalInfoFields: (keyof Asset)[] = ['description', 'category', 'location', 'condition'];
        const missingInfo = activeAssets.filter(asset => {
            return criticalInfoFields.some(field => !asset[field] || String(asset[field]).trim() === '');
        }).length;

        return { withoutSerial, withoutAssetId, modifiedToday, modifiedThisWeek, missingInfo };
    }, [activeAssets]);
    
    const handleFilterClick = (field: keyof Asset | '') => {
        if (missingFieldFilter === field) {
            setMissingFieldFilter(''); // Toggle off if active
        } else {
            setMissingFieldFilter(field);
        }
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="mb-6 border rounded-lg bg-card/60 shadow-xl backdrop-blur-lg"
        >
            <CollapsibleTrigger asChild>
                <div className='flex items-center justify-between p-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" /> Asset Overview
                    </h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <StatCard
                        title="Missing S/N"
                        value={summary.withoutSerial}
                        description="Assets without a serial number."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('serialNumber')}
                        actionLabel={missingFieldFilter === 'serialNumber' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'serialNumber'}
                    />
                    <StatCard
                        title="Missing Asset ID"
                        value={summary.withoutAssetId}
                        description="Assets missing an Asset ID code."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('assetIdCode')}
                        actionLabel={missingFieldFilter === 'assetIdCode' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'assetIdCode'}
                    />
                    <StatCard
                        title="Incomplete Records"
                        value={summary.missingInfo}
                        description="Assets missing description, category, location, or condition."
                        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Modified Today"
                        value={summary.modifiedToday}
                        description="Assets created or updated today."
                        icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Modified This Week"
                        value={summary.modifiedThisWeek}
                        description="Assets created or updated in the last 7 days."
                        icon={<History className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
