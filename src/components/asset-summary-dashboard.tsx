
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileWarning, History, BarChart2, CalendarClock, ChevronsUpDown, PlusCircle, AlertTriangle } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from '@/contexts/auth-context';
import { NIGERIAN_STATE_CAPITALS, SPECIAL_LOCATIONS, ZONAL_STORES } from '@/lib/constants';

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
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter, appSettings, dateFilter, setDateFilter, globalStateFilter, conditionFilter, setConditionFilter } = useAppState();
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
        if (!appSettings) return { withoutSerial: 0, withoutAssetId: 0, newThisWeek: 0, modifiedToday: 0, modifiedThisWeek: 0, withoutLocation: 0, withoutCondition: 0, withoutLga: 0, withoutAssignee: 0, withoutModelNumber: 0, withoutEngineNo: 0, withoutChasisNo: 0, unusable: 0, badCondition: 0, needsRepair: 0 };
        
        const visibleAssets = summaryAssets.filter(a => !appSettings?.sheetDefinitions[a.category]?.isHidden);
        const vehicleCategories = ['Vehicles-TB (IHVN)', 'MOTORCYCLES-C19RM'];

        return {
          withoutSerial: visibleAssets.filter(a => !a.sn && !a.serialNumber).length,
          withoutAssetId: visibleAssets.filter(a => !a.assetIdCode?.trim()).length,
          newThisWeek: visibleAssets.filter(a => a.lastModified && !a.previousState && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
          modifiedToday: visibleAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length,
          modifiedThisWeek: visibleAssets.filter(a => a.lastModified && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
          withoutLocation: visibleAssets.filter(a => !a.location?.trim()).length,
          withoutCondition: visibleAssets.filter(a => !a.condition?.trim()).length,
          withoutLga: visibleAssets.filter(a => !a.lga?.trim()).length,
          withoutAssignee: visibleAssets.filter(a => !a.assignee?.trim()).length,
          withoutEngineNo: visibleAssets.filter(a => vehicleCategories.includes(a.category) && !a.engineNo).length,
          withoutChasisNo: visibleAssets.filter(a => vehicleCategories.includes(a.category) && !a.chasisNo).length,
          withoutModelNumber: visibleAssets.filter(a => !a.modelNumber?.trim()).length,
          unusable: visibleAssets.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen'].includes(a.condition)).length,
          badCondition: visibleAssets.filter(a => a.condition && ['Bad condition', 'Used but in poor condition', 'F2: Major repairs required-poor condition'].includes(a.condition)).length,
          needsRepair: visibleAssets.filter(a => a.condition === 'Used but requires occasional repair').length,
        };
    }, [summaryAssets, appSettings]);
    
    const handleFilterClick = (field: keyof Asset | '') => {
        setDateFilter(null);
        setConditionFilter([]);
        if (missingFieldFilter === field) {
            setMissingFieldFilter(''); // Toggle off if active
        } else {
            setMissingFieldFilter(field);
        }
    };

    const handleDateFilterClick = (filter: 'today' | 'week' | 'new-week') => {
        setMissingFieldFilter('');
        setConditionFilter([]);
        if (dateFilter === filter) {
            setDateFilter(null);
        } else {
            setDateFilter(filter);
        }
    };

    const handleConditionFilterClick = (conditions: string[]) => {
        setMissingFieldFilter('');
        setDateFilter(null);
        if (JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditions.sort())) {
            setConditionFilter([]);
        } else {
            setConditionFilter(conditions);
        }
    };

    const conditionGroups = {
        unusable: ['Unsalvageable', 'Burnt', 'Stolen'],
        badCondition: ['Bad condition', 'Used but in poor condition', 'F2: Major repairs required-poor condition'],
        needsRepair: ['Used but requires occasional repair'],
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
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {/* New Condition Cards */}
                    {summary.unusable > 0 && (
                        <StatCard
                            title="Unusable Assets"
                            value={summary.unusable}
                            description="Stolen, burnt, or unsalvageable."
                            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                            onAction={() => handleConditionFilterClick(conditionGroups.unusable)}
                            actionLabel={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.unusable.sort()) ? "Clear Filter" : "View Assets"}
                            isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.unusable.sort())}
                        />
                    )}
                    {summary.badCondition > 0 && (
                         <StatCard
                            title="Bad Condition"
                            value={summary.badCondition}
                            description="Assets in poor condition or needing major repair."
                            icon={<FileWarning className="h-4 w-4 text-yellow-500" />}
                            onAction={() => handleConditionFilterClick(conditionGroups.badCondition)}
                            actionLabel={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.badCondition.sort()) ? "Clear Filter" : "View Assets"}
                            isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.badCondition.sort())}
                        />
                    )}
                     {summary.needsRepair > 0 && (
                         <StatCard
                            title="Needs Repair"
                            value={summary.needsRepair}
                            description="Assets that require occasional repair."
                            icon={<FileWarning className="h-4 w-4 text-orange-500" />}
                            onAction={() => handleConditionFilterClick(conditionGroups.needsRepair)}
                            actionLabel={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.needsRepair.sort()) ? "Clear Filter" : "View Assets"}
                            isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.needsRepair.sort())}
                        />
                    )}
                    
                    {/* Existing Cards */}
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
                        title="Missing Location"
                        value={summary.withoutLocation}
                        description="Assets missing a location."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('location')}
                        actionLabel={missingFieldFilter === 'location' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'location'}
                    />
                     <StatCard
                        title="Missing Condition"
                        value={summary.withoutCondition}
                        description="Assets missing a condition."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('condition')}
                        actionLabel={missingFieldFilter === 'condition' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'condition'}
                    />
                     <StatCard
                        title="Missing LGA"
                        value={summary.withoutLga}
                        description="Assets missing an LGA."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('lga')}
                        actionLabel={missingFieldFilter === 'lga' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'lga'}
                    />
                     <StatCard
                        title="Missing Assignee"
                        value={summary.withoutAssignee}
                        description="Assets missing an assignee."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('assignee')}
                        actionLabel={missingFieldFilter === 'assignee' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'assignee'}
                    />
                     {summary.withoutEngineNo > 0 && (
                        <StatCard
                            title="Missing Engine No."
                            value={summary.withoutEngineNo}
                            description="Vehicles & Motorcycles missing an engine number."
                            icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                            onAction={() => handleFilterClick('engineNo')}
                            actionLabel={missingFieldFilter === 'engineNo' ? "Clear Filter" : "View Assets"}
                            isActive={missingFieldFilter === 'engineNo'}
                        />
                     )}
                     {summary.withoutChasisNo > 0 && (
                        <StatCard
                            title="Missing Chasis No."
                            value={summary.withoutChasisNo}
                            description="Vehicles & Motorcycles missing a chasis number."
                            icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                            onAction={() => handleFilterClick('chasisNo')}
                            actionLabel={missingFieldFilter === 'chasisNo' ? "Clear Filter" : "View Assets"}
                            isActive={missingFieldFilter === 'chasisNo'}
                        />
                     )}
                     <StatCard
                        title="Missing Model"
                        value={summary.withoutModelNumber}
                        description="Assets missing a model number."
                        icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                        onAction={() => handleFilterClick('modelNumber')}
                        actionLabel={missingFieldFilter === 'modelNumber' ? "Clear Filter" : "View Assets"}
                        isActive={missingFieldFilter === 'modelNumber'}
                    />
                     {summary.newThisWeek > 0 && (
                        <StatCard
                            title="New This Week"
                            value={summary.newThisWeek}
                            description="Assets added in the last 7 days."
                            icon={<PlusCircle className="h-4 w-4 text-muted-foreground" />}
                            onAction={() => handleDateFilterClick('new-week')}
                            actionLabel={dateFilter === 'new-week' ? "Clear Filter" : "View Assets"}
                            isActive={dateFilter === 'new-week'}
                        />
                    )}
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
