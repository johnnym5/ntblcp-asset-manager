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
    const cardContent = (
        <Card className={cn("transition-colors", isActive ? "bg-primary/10 border-primary" : "hover:bg-muted/50")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground h-8">
                    {description}
                </p>
                {actionLabel && (
                     <div className="text-xs text-primary font-semibold mt-2">{actionLabel}</div>
                )}
            </CardContent>
        </Card>
    );

    if (onAction) {
        return <button onClick={onAction} className="text-left w-full h-full">{cardContent}</button>;
    }
    return cardContent;
};

export function AssetSummaryDashboard() {
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter, appSettings } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    
    const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

    const summary = useMemo(() => {
        const visibleAssets = activeAssets.filter(a => !appSettings?.sheetDefinitions[a.category]?.isHidden);

        const withoutSerial = visibleAssets.filter(a => !a.sn && !a.serialNumber).length;
        const withoutAssetId = visibleAssets.filter(a => !a.assetIdCode).length;
        const modifiedToday = visibleAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length;
        const modifiedThisWeek = visibleAssets.filter(a => a.lastModified && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length;

        const criticalInfoFields: (keyof Asset)[] = ['description', 'category', 'location', 'condition'];
        const missingInfo = visibleAssets.filter(asset => {
            return criticalInfoFields.some(field => !asset[field] || String(asset[field]).trim() === '');
        }).length;

        return { withoutSerial, withoutAssetId, modifiedToday, modifiedThisWeek, missingInfo };
    }, [activeAssets, appSettings]);
    
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
            className="mb-4"
        >
            <div className='flex items-center justify-between p-4 rounded-lg bg-card/80 border shadow-lg backdrop-blur-lg'>
                <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" /> Asset Overview
                </h3>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="p-4 pt-0 mt-4">
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
