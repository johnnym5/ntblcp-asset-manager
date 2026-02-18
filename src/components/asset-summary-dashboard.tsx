'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileWarning, History, BarChart2, CalendarClock, ChevronsUpDown, PlusCircle, AlertTriangle, CheckCircle2, PieChart } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from '@/contexts/auth-context';
import { NIGERIAN_STATE_CAPITALS, SPECIAL_LOCATIONS, ZONAL_STORES } from '@/lib/constants';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from './ui/progress';

const StatCard = ({ title, value, description, icon, onAction, actionLabel, isActive }: { title: string, value: string | number, description: string, icon: React.ReactNode, onAction?: () => void, actionLabel?: string, isActive?: boolean }) => {
    const cardContent = (
        <Card className={cn("transition-all duration-300 w-64 shrink-0 overflow-hidden", isActive ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" : "hover:bg-muted/50 hover:border-primary/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-full", isActive ? "bg-primary/20" : "bg-muted")}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5rem]">
                    {description}
                </p>
                {onAction && (
                     <div className={cn("text-xs font-bold mt-2 transition-colors", isActive ? "text-primary" : "text-primary/70")}>
                        {actionLabel || "View Details"}
                     </div>
                )}
            </CardContent>
        </Card>
    );

    if (onAction) {
        return <button onClick={onAction} className="text-left outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">{cardContent}</button>;
    }
    return cardContent;
};

export function AssetSummaryDashboard() {
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter, appSettings, dateFilter, setDateFilter, globalStateFilter, conditionFilter, setConditionFilter, activeGrantId } = useAppState();
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveTab] = useState<'stats' | 'progress'>('stats');
    
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
        } else if (!isAdmin && userProfile?.states) {
            // For non-admins, filter based on their assigned state (usually index 0)
            const targetState = userProfile.states[0];
            const lowerCaseFilter = targetState.toLowerCase().trim();
            const capitalCity = NIGERIAN_STATE_CAPITALS[targetState]?.toLowerCase().trim();
            return activeAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                const matchesState = assetLocation.startsWith(lowerCaseFilter);
                const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
                return matchesState || matchesCapital;
            });
        }
        return activeAssets;
    }, [assets, offlineAssets, dataSource, globalStateFilter, isAdmin, userProfile]);


    const categoryStats = useMemo(() => {
        if (!appSettings || !appSettings.grants) return [];
        const activeGrant = appSettings.grants.find(g => g.id === activeGrantId);
        const sheetDefinitions = activeGrant?.sheetDefinitions || {};

        const categories = Object.keys(sheetDefinitions).filter(cat => !sheetDefinitions[cat].isHidden);
        
        return categories.map(cat => {
            const catAssets = summaryAssets.filter(a => a.category === cat);
            const verified = catAssets.filter(a => a.verifiedStatus === 'Verified').length;
            const total = catAssets.length;
            const percentage = total > 0 ? (verified / total) * 100 : 0;
            return { name: cat, verified, total, percentage };
        }).sort((a, b) => b.total - a.total);
    }, [summaryAssets, appSettings, activeGrantId]);

    const summary = useMemo(() => {
        const vehicleCategories = ['Vehicles-TB (IHVN)', 'MOTORCYCLES-C19RM'];

        return {
          withoutSerial: summaryAssets.filter(a => !a.sn && !a.serialNumber).length,
          withoutAssetId: summaryAssets.filter(a => !a.assetIdCode?.trim()).length,
          newThisWeek: summaryAssets.filter(a => a.lastModified && !a.previousState && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
          modifiedToday: summaryAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length,
          modifiedThisWeek: summaryAssets.filter(a => a.lastModified && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
          withoutLocation: summaryAssets.filter(a => !a.location?.trim()).length,
          withoutCondition: summaryAssets.filter(a => !a.condition?.trim()).length,
          withoutLga: summaryAssets.filter(a => !a.lga?.trim()).length,
          withoutAssignee: summaryAssets.filter(a => !a.assignee?.trim()).length,
          withoutEngineNo: summaryAssets.filter(a => a.category && vehicleCategories.includes(a.category) && !a.engineNo).length,
          withoutChasisNo: summaryAssets.filter(a => a.category && vehicleCategories.includes(a.category) && !a.chasisNo).length,
          withoutModelNumber: summaryAssets.filter(a => !a.modelNumber?.trim()).length,
          unusable: summaryAssets.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen'].includes(a.condition)).length,
          badCondition: summaryAssets.filter(a => a.condition && ['Bad condition', 'Used but in poor condition', 'F2: Major repairs required-poor condition'].includes(a.condition)).length,
          needsRepair: summaryAssets.filter(a => a.condition === 'Used but requires occasional repair').length,
        };
    }, [summaryAssets]);
    
    const handleFilterClick = (field: keyof Asset | '') => {
        setDateFilter(null);
        setConditionFilter([]);
        if (missingFieldFilter === field) {
            setMissingFieldFilter('');
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
            className="w-full"
        >
            <div className='flex items-center justify-between p-4 rounded-xl bg-card/80 border shadow-lg backdrop-blur-md mb-2'>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">Analytics Dashboard</h3>
                        <p className="text-xs text-muted-foreground">Real-time pulse of {globalStateFilter === 'All' ? 'global' : globalStateFilter} assets</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex bg-muted p-1 rounded-lg mr-2">
                        <Button 
                            variant={activeView === 'stats' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 text-xs px-3 rounded-md"
                            onClick={() => setActiveTab('stats')}
                        >
                            Key Stats
                        </Button>
                        <Button 
                            variant={activeView === 'progress' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 text-xs px-3 rounded-md"
                            onClick={() => setActiveTab('progress')}
                        >
                            Verification
                        </Button>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            
            <CollapsibleContent className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {activeView === 'stats' ? (
                    <ScrollArea className="w-full pb-4">
                        <div className="flex gap-4 p-1">
                            {/* Priority Alerts */}
                            {summary.unusable > 0 && (
                                <StatCard
                                    title="Unusable"
                                    value={summary.unusable}
                                    description="Stolen, burnt, or unsalvageable assets requiring removal."
                                    icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                                    onAction={() => handleConditionFilterClick(conditionGroups.unusable)}
                                    actionLabel="Review Assets"
                                    isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.unusable.sort())}
                                />
                            )}
                            
                            {/* Data Integrity */}
                            <StatCard
                                title="Missing Asset ID"
                                value={summary.withoutAssetId}
                                description="Assets missing unique identification codes."
                                icon={<FileWarning className="h-4 w-4 text-orange-500" />}
                                onAction={() => handleFilterClick('assetIdCode')}
                                actionLabel="Fix Data"
                                isActive={missingFieldFilter === 'assetIdCode'}
                            />
                            <StatCard
                                title="Missing Location"
                                value={summary.withoutLocation}
                                description="Assets with undefined physical locations."
                                icon={<FileWarning className="h-4 w-4 text-orange-500" />}
                                onAction={() => handleFilterClick('location')}
                                actionLabel="Assign Locations"
                                isActive={missingFieldFilter === 'location'}
                            />
                            
                            {/* Activity Stats */}
                            <StatCard
                                title="Modified Today"
                                value={summary.modifiedToday}
                                description="Asset records created or updated in the last 24 hours."
                                icon={<CalendarClock className="h-4 w-4 text-primary" />}
                                onAction={() => handleDateFilterClick('today')}
                                actionLabel="View Activity"
                                isActive={dateFilter === 'today'}
                            />
                            <StatCard
                                title="New This Week"
                                value={summary.newThisWeek}
                                description="Brand new asset records added to the system this week."
                                icon={<PlusCircle className="h-4 w-4 text-green-500" />}
                                onAction={() => handleDateFilterClick('new-week')}
                                actionLabel="View New Items"
                                isActive={dateFilter === 'new-week'}
                            />
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                                    Verification Progress by Category
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {categoryStats.slice(0, 6).map(cat => (
                                        <div key={cat.name} className="space-y-1">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="truncate max-w-[200px]">{cat.name}</span>
                                                <span className="text-muted-foreground">{cat.verified} / {cat.total} ({cat.percentage.toFixed(0)}%)</span>
                                            </div>
                                            <Progress value={cat.percentage} className="h-2" />
                                        </div>
                                    ))}
                                    {categoryStats.length > 6 && (
                                        <p className="text-center text-[10px] text-muted-foreground italic">+ {categoryStats.length - 6} more categories</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
