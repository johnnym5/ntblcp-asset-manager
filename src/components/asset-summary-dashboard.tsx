
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
import { useAuth } from '@/contexts/auth-context';
import { NIGERIAN_ZONES, ZONAL_STORES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from '@/lib/constants';

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
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter, appSettings, dateFilter, setDateFilter, globalStateFilter } = useAppState();
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    
    const isAdmin = userProfile?.isAdmin;

    const summaryAssets = useMemo(() => {
        const activeAssets = dataSource === 'cloud' ? assets : offlineAssets;
        if (isAdmin && globalStateFilter && globalStateFilter !== 'All') {
            const isZone = ZONAL_STORES.includes(globalStateFilter);

            if (isZone) {
                const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
                return activeAssets.filter(asset => {
                    const assetLocation = (asset.location || "").toLowerCase().trim();
                    return assetLocation.includes(lowerCaseFilter) && assetLocation.includes("zonal store");
                });
            }
            
            if (SPECIAL_LOCATIONS.includes(globalStateFilter)) {
                const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
                return activeAssets.filter(asset => (asset.location || "").toLowerCase().trim().includes(lowerCaseFilter));
            }

            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            const capitalCity = NIGERIAN_STATE_CAPITALS[globalStateFilter]?.toLowerCase().trim();
            return activeAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                const matchesState = assetLocation.startsWith(lowerCaseFilter);
                const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
                return matchesState || matchesCapital;
            });
        } else if (!isAdmin && userProfile?.state) {
            const lowerCaseFilter = userProfile.state.toLowerCase().trim();
            const capitalCity = NIGERIAN_STATE_CAPITALS[userProfile.state]?.toLowerCase().trim();
            return activeAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                const matchesState = assetLocation.startsWith(lowerCaseFilter);
                const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
                return matchesState || matchesCapital;
            });
        }
        return activeAssets;
    }, [assets, offlineAssets, dataSource, globalStateFilter, isAdmin, userProfile?.state]);


    const summary = useMemo(() => {
        if (!appSettings) return { withoutSerial: 0, withoutAssetId: 0, modifiedToday: 0, modifiedThisWeek: 0, missingInfo: 0 };
        
        const visibleAssets = summaryAssets.filter(a => !appSettings?.sheetDefinitions[a.category]?.isHidden);

        const withoutSerial = visibleAssets.filter(a => !a.sn && !a.serialNumber).length;
        const withoutAssetId = visibleAssets.filter(a => !a.assetIdCode).length;
        const modifiedToday = visibleAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length;
        const modifiedThisWeek = visibleAssets.filter(a => a.lastModified && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length;

        const criticalInfoFields: (keyof Asset)[] = ['description', 'category', 'location', 'condition'];
        const missingInfo = visibleAssets.filter(asset => {
            return criticalInfoFields.some(field => !asset[field] || String(asset[field]).trim() === '');
        }).length;

        return { withoutSerial, withoutAssetId, modifiedToday, modifiedThisWeek, missingInfo };
    }, [summaryAssets, appSettings]);
    
    const handleFilterClick = (field: string) => {
        if (missingFieldFilter === field) {
            setMissingFieldFilter(''); // Toggle off if active
        } else {
            setMissingFieldFilter(field);
        }
    };

    const handleDateFilterClick = (filter: 'today' | 'week') => {
        if (dateFilter === filter) {
            setDateFilter(null);
        } else {
            setDateFilter(filter);
        }
    };

    if (!appSettings) return null;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <div className='flex items-center justify-between p-4 rounded-lg bg-card/80 border shadow-sm'>
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
                        onAction={() => handleFilterClick('any_critical')}
                        actionLabel={missingFieldFilter === 'any_critical' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'any_critical'}
                    />
                    <StatCard
                        title="Modified Today"
                        value={summary.modifiedToday}
                        description="Assets created or updated today."
                        icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleDateFilterClick('today')}
                        actionLabel={dateFilter === 'today' ? "Clear Filter" : "View Assets"}
                        isActive={dateFilter === 'today'}
                    />
                    <StatCard
                        title="Modified This Week"
                        value={summary.modifiedThisWeek}
                        description="Assets created or updated in the last 7 days."
                        icon={<History className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleDateFilterClick('week')}
                        actionLabel={dateFilter === 'week' ? "Clear Filter" : "View Assets"}
                        isActive={dateFilter === 'week'}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
