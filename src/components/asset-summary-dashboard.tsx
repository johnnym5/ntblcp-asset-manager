'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    FileWarning, 
    History, 
    BarChart2, 
    CalendarClock, 
    ChevronsUpDown, 
    PlusCircle, 
    AlertTriangle, 
    CheckCircle2, 
    PieChart, 
    Sparkles, 
    User, 
    Search, 
    Tag, 
    MapPin, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight,
    ClipboardCheck,
    AlertCircle,
    Hash,
    MessageSquare,
    Activity,
    Wrench
} from 'lucide-react';
import type { Asset } from '@/lib/types';
import { isToday, isThisWeek, parseISO, formatDistanceToNow } from 'date-fns';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from '@/contexts/auth-context';
import { NIGERIAN_STATE_CAPITALS, SPECIAL_LOCATIONS, ZONAL_STORES } from '@/lib/constants';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from './ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './ui/badge';

const StatCard = ({ title, value, description, icon, onAction, actionLabel, isActive }: { title: string, value: string | number, description: string, icon: React.ReactNode, onAction?: () => void, actionLabel?: string, isActive?: boolean }) => {
    const cardContent = (
        <Card className={cn("transition-all duration-300 w-64 shrink-0 overflow-hidden", isActive ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" : "hover:bg-muted/50 hover:border-primary/30 shadow-sm")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-full", isActive ? "bg-primary/20" : "bg-muted")}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 min-h-[2.5rem] leading-tight whitespace-normal">
                    {description}
                </p>
                {onAction && (
                     <div className={cn("text-[10px] font-bold mt-2 transition-colors uppercase tracking-widest", isActive ? "text-primary" : "text-primary/70")}>
                        {actionLabel || "View Details"}
                     </div>
                )}
            </CardContent>
        </Card>
    );

    if (onAction) {
        return <button onClick={onAction} className="text-left outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl shrink-0">{cardContent}</button>;
    }
    return cardContent;
};

interface Insight {
    text: string;
    icon: React.ReactNode;
    color: string;
    subtext?: string;
    asset?: Asset;
}

export function AssetSummaryDashboard() {
    const { 
        assets, 
        offlineAssets, 
        dataSource, 
        setMissingFieldFilter, 
        missingFieldFilter, 
        appSettings, 
        dateFilter, 
        setDateFilter, 
        globalStateFilter, 
        conditionFilter, 
        setConditionFilter, 
        activeGrantId, 
        setAssetToView,
        setSelectedStatuses,
        selectedStatuses
    } = useAppState();
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveTab] = useState<'stats' | 'progress'>('stats');
    const [insightIndex, setInsightIndex] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const summaryAssets = useMemo(() => {
        const activeAssets = dataSource === 'cloud' ? assets : offlineAssets;
        if (globalStateFilter && globalStateFilter !== 'All') {
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
        }
        return activeAssets;
    }, [assets, offlineAssets, dataSource, globalStateFilter]);


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

    const insightsPool = useMemo(() => {
        const pool: Insight[] = [];

        // 1. Random Recently Modified Asset
        const recentlyModified = [...summaryAssets]
            .filter(a => a.lastModified)
            .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
            .slice(0, 10);
        
        if (recentlyModified.length > 0) {
            const randomAsset = recentlyModified[Math.floor(Math.random() * recentlyModified.length)];
            pool.push({
                text: `"${randomAsset.description || 'Record'}" was recently updated.`,
                icon: <History className="h-5 w-5" />,
                color: "text-green-500",
                subtext: `Modified by ${randomAsset.lastModifiedBy || 'System'} ${formatDistanceToNow(new Date(randomAsset.lastModified!), { addSuffix: true })}.`,
                asset: randomAsset
            });
        }

        // 2. Random Asset Missing ID
        const missingIds = summaryAssets.filter(a => !a.assetIdCode);
        if (missingIds.length > 0) {
            const randomAsset = missingIds[Math.floor(Math.random() * missingIds.length)];
            pool.push({
                text: `"${randomAsset.description || 'Asset'}" is missing its Asset ID Code.`,
                icon: <Tag className="h-5 w-5" />,
                color: "text-orange-500",
                subtext: `Data Quality: Assets without tags are harder to audit in ${randomAsset.location || 'the field'}.`,
                asset: randomAsset
            });
        }

        // 3. Random Asset Missing Assignee
        const noAssignees = summaryAssets.filter(a => !a.assignee);
        if (noAssignees.length > 0) {
            const randomAsset = noAssignees[Math.floor(Math.random() * noAssignees.length)];
            pool.push({
                text: `Ownership Gap: "${randomAsset.description || 'Asset'}" has no recorded user.`,
                icon: <User className="h-5 w-5" />,
                color: "text-blue-500",
                subtext: `Current Location: ${randomAsset.location || 'Unknown'}. Click to view details.`,
                asset: randomAsset
            });
        }

        // 4. Random Bad Condition Asset
        const badConditions = summaryAssets.filter(a => a.condition && a.condition.toLowerCase().includes('bad'));
        if (badConditions.length > 0) {
            const randomAsset = badConditions[Math.floor(Math.random() * badConditions.length)];
            pool.push({
                text: `Maintenance Alert: "${randomAsset.description}" is in bad condition.`,
                icon: <AlertTriangle className="h-5 w-5" />,
                color: "text-destructive",
                subtext: `Reported Condition: ${randomAsset.condition}. Needs immediate assessment.`,
                asset: randomAsset
            });
        }

        // 5. Verification Progress
        const pending = summaryAssets.filter(a => a.verifiedStatus !== 'Verified').length;
        if (pending > 0) {
            pool.push({
                text: `Verification Pulse: ${pending} assets in ${globalStateFilter === 'All' ? 'the project' : globalStateFilter} are pending verification.`,
                icon: <PieChart className="h-5 w-5" />,
                color: "text-primary",
                subtext: "Action: Use the 'Unverified' filter to clear the queue."
            });
        }

        // 6. Category Insight
        const laggingCategories = categoryStats.filter(c => c.percentage < 100);
        if (laggingCategories.length > 0) {
            const randomCat = laggingCategories[Math.floor(Math.random() * laggingCategories.length)];
            pool.push({
                text: `Focus Area: The "${randomCat.name}" category is only ${randomCat.percentage.toFixed(0)}% verified.`,
                icon: <BarChart2 className="h-5 w-5" />,
                color: "text-purple-500",
                subtext: `${randomCat.total - randomCat.verified} items remaining in this inventory list.`
            });
        }

        if (pool.length === 0) {
            pool.push({
                text: "Your asset database is in perfect shape! No critical issues detected.",
                icon: <Sparkles className="h-5 w-5" />,
                color: "text-green-500"
            });
        }

        return pool;
    }, [summaryAssets, categoryStats, globalStateFilter, refreshKey]);

    useEffect(() => {
        if (activeView === 'progress' && insightsPool.length > 1) {
            const timer = setInterval(() => {
                setInsightIndex(prev => (prev + 1) % insightsPool.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [activeView, insightsPool.length, refreshKey]);

    const summary = useMemo(() => {
        const total = summaryAssets.length;
        const verified = summaryAssets.filter(a => a.verifiedStatus === 'Verified').length;
        return {
          total,
          verified,
          unverified: total - verified,
          unusable: summaryAssets.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'].includes(a.condition)).length,
          needsRepair: summaryAssets.filter(a => a.condition && ['Bad condition', 'F2: Major repairs required-poor condition', 'Used but in poor condition'].includes(a.condition)).length,
          withoutAssetId: summaryAssets.filter(a => !a.assetIdCode?.trim()).length,
          withoutSerial: summaryAssets.filter(a => !a.serialNumber?.trim()).length,
          withDiscrepancy: summaryAssets.filter(a => a.verifiedStatus === 'Discrepancy').length,
          modifiedToday: summaryAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length,
          newThisWeek: summaryAssets.filter(a => a.lastModified && !a.previousState && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
          withRemarks: summaryAssets.filter(a => a.remarks?.trim()).length,
        };
    }, [summaryAssets]);
    
    const handleFilterClick = (field: keyof Asset | '') => {
        resetAllFilters();
        if (missingFieldFilter === field) {
            setMissingFieldFilter('');
        } else {
            setMissingFieldFilter(field);
        }
    };

    const handleDateFilterClick = (filter: 'today' | 'week' | 'new-week') => {
        resetAllFilters();
        if (dateFilter === filter) {
            setDateFilter(null);
        } else {
            setDateFilter(filter);
        }
    };

    const handleConditionFilterClick = (conditions: string[]) => {
        resetAllFilters();
        if (JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditions.sort())) {
            setConditionFilter([]);
        } else {
            setConditionFilter(conditions);
        }
    };

    const handleStatusFilterClick = (status: 'Verified' | 'Unverified' | 'Discrepancy') => {
        resetAllFilters();
        if (selectedStatuses.includes(status)) {
            setSelectedStatuses([]);
        } else {
            setSelectedStatuses([status]);
        }
    };

    const resetAllFilters = () => {
        setMissingFieldFilter('');
        setDateFilter(null);
        setConditionFilter([]);
        setSelectedStatuses([]);
    }

    const handleInsightClick = (insight: Insight) => {
        if (insight.asset) {
            setAssetToView(insight.asset);
        }
    };

    const handleNextInsight = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setInsightIndex(prev => (prev + 1) % insightsPool.length);
    };

    const handlePrevInsight = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setInsightIndex(prev => (prev - 1 + insightsPool.length) % insightsPool.length);
    };

    const handleRefreshInsights = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRefreshKey(prev => prev + 1);
        setInsightIndex(0);
    };

    const conditionGroups = {
        unusable: ['Unsalvageable', 'Burnt', 'Stolen', 'Writeoff'],
        repair: ['Bad condition', 'F2: Major repairs required-poor condition', 'Used but in poor condition'],
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
                        <h3 className="text-lg font-bold tracking-tight">Inventory Pulse</h3>
                        <p className="text-xs text-muted-foreground">Real-time status of {globalStateFilter === 'All' ? 'global' : globalStateFilter} assets</p>
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
                            Asset Insights
                        </Button>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            
            <CollapsibleContent className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                {activeView === 'stats' ? (
                    <div className="relative group">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex w-max gap-4 p-4">
                                {/* 1. Verification Progress */}
                                <StatCard
                                    title="Verification Coverage"
                                    value={`${summary.total > 0 ? Math.round((summary.verified / summary.total) * 100) : 0}%`}
                                    description={`Showing ${summary.verified} verified items out of ${summary.total} assets in this scope.`}
                                    icon={<ClipboardCheck className="h-4 w-4 text-green-500" />}
                                    onAction={() => handleStatusFilterClick('Verified')}
                                    isActive={selectedStatuses.includes('Verified')}
                                />

                                {/* 2. Pending Action */}
                                <StatCard
                                    title="Pending Action"
                                    value={summary.unverified}
                                    description="Assets currently marked as unverified and requiring field inspection."
                                    icon={<Activity className="h-4 w-4 text-primary" />}
                                    onAction={() => handleStatusFilterClick('Unverified')}
                                    isActive={selectedStatuses.includes('Unverified')}
                                />

                                {/* 3. Missing ID (Data Quality) */}
                                <StatCard
                                    title="Missing Asset ID"
                                    value={summary.withoutAssetId}
                                    description="Assets lacking a unique tag or system ID code. Crucial for audits."
                                    icon={<Tag className="h-4 w-4 text-orange-500" />}
                                    onAction={() => handleFilterClick('assetIdCode')}
                                    isActive={missingFieldFilter === 'assetIdCode'}
                                />

                                {/* 4. Missing Serial (Data Quality) */}
                                <StatCard
                                    title="Missing Serials"
                                    value={summary.withoutSerial}
                                    description="Items missing manufacturer serial numbers. Risk for identification."
                                    icon={<Hash className="h-4 w-4 text-blue-500" />}
                                    onAction={() => handleFilterClick('serialNumber')}
                                    isActive={missingFieldFilter === 'serialNumber'}
                                />

                                {/* 5. Critical Health */}
                                <StatCard
                                    title="Critical Condition"
                                    value={summary.unusable}
                                    description="Assets reported as stolen, burnt, or unsalvageable."
                                    icon={<AlertCircle className="h-4 w-4 text-destructive" />}
                                    onAction={() => handleConditionFilterClick(conditionGroups.unusable)}
                                    isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.unusable.sort())}
                                />

                                {/* 6. Needs Maintenance */}
                                <StatCard
                                    title="Maintenance Alert"
                                    value={summary.needsRepair}
                                    description="Assets in poor or bad condition requiring technical assessment."
                                    icon={<Wrench className="h-4 w-4 text-orange-600" />}
                                    onAction={() => handleConditionFilterClick(conditionGroups.repair)}
                                    isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.repair.sort())}
                                />

                                {/* 7. Discrepancies */}
                                <StatCard
                                    title="Audit Exceptions"
                                    value={summary.withDiscrepancy}
                                    description="Records where field data conflicts with previous system information."
                                    icon={<FileWarning className="h-4 w-4 text-destructive" />}
                                    onAction={() => handleStatusFilterClick('Discrepancy')}
                                    isActive={selectedStatuses.includes('Discrepancy')}
                                />

                                {/* 8. Field Remarks */}
                                <StatCard
                                    title="Field Feedback"
                                    value={summary.withRemarks}
                                    description="Assets containing specific comments or remarks from field officers."
                                    icon={<MessageSquare className="h-4 w-4 text-teal-500" />}
                                    onAction={() => handleFilterClick('remarks')}
                                    isActive={missingFieldFilter === 'remarks'}
                                />

                                {/* 9. Modified Today */}
                                <StatCard
                                    title="Modified Today"
                                    value={summary.modifiedToday}
                                    description="Updates or creations performed in the last 24 hours."
                                    icon={<CalendarClock className="h-4 w-4 text-primary" />}
                                    onAction={() => handleDateFilterClick('today')}
                                    isActive={dateFilter === 'today'}
                                />

                                {/* 10. Fresh Records */}
                                <StatCard
                                    title="New In-Flow"
                                    value={summary.newThisWeek}
                                    description="Fresh records newly registered in the system this week."
                                    icon={<PlusCircle className="h-4 w-4 text-green-500" />}
                                    onAction={() => handleDateFilterClick('new-week')}
                                    isActive={dateFilter === 'new-week'}
                                />
                            </div>
                            <ScrollBar orientation="horizontal" className="opacity-100" />
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[180px] flex flex-col justify-center bg-primary/5 border-dashed border-primary/20 relative group/insight">
                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover/insight:opacity-100 transition-opacity">
                                <Button variant="outline" size="icon" className="h-8 w-8 bg-background/80" onClick={handleRefreshInsights}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardContent className="pt-8">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`${refreshKey}-${insightIndex}`}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className={cn("flex flex-col items-center text-center gap-4 cursor-pointer px-12", insightsPool[insightIndex].asset && "hover:opacity-80")}
                                        onClick={() => handleInsightClick(insightsPool[insightIndex])}
                                    >
                                        <div className={cn("p-4 rounded-full bg-background shadow-lg border", insightsPool[insightIndex].color)}>
                                            {insightsPool[insightIndex].icon}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-bold tracking-tight">
                                                {insightsPool[insightIndex].text}
                                            </h4>
                                            {insightsPool[insightIndex].subtext && (
                                                <p className="text-sm text-muted-foreground italic">
                                                    {insightsPool[insightIndex].subtext}
                                                </p>
                                            )}
                                            {insightsPool[insightIndex].asset && (
                                                <div className="flex items-center justify-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                                        <MapPin className="h-2 w-2 mr-1"/> {insightsPool[insightIndex].asset.location}
                                                    </Badge>
                                                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Click to Inspect</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                
                                <div className="flex items-center justify-center gap-4 mt-8">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={handlePrevInsight}>
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <div className="flex justify-center gap-1.5">
                                        {insightsPool.map((_, i) => (
                                            <button 
                                                key={i} 
                                                onClick={(e) => { e.stopPropagation(); setInsightIndex(i); }}
                                                className={cn("h-1.5 rounded-full transition-all", i === insightIndex ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30")}
                                            />
                                        ))}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={handleNextInsight}>
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
