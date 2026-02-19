
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileWarning, History, BarChart2, CalendarClock, ChevronsUpDown, PlusCircle, AlertTriangle, CheckCircle2, PieChart, Sparkles, User, Search, Tag, MapPin } from 'lucide-react';
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

interface Insight {
    text: string;
    icon: React.ReactNode;
    color: string;
    subtext?: string;
    asset?: Asset;
}

export function AssetSummaryDashboard() {
    const { assets, offlineAssets, dataSource, setMissingFieldFilter, missingFieldFilter, appSettings, dateFilter, setDateFilter, globalStateFilter, conditionFilter, setConditionFilter, activeGrantId, setAssetToView } = useAppState();
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveTab] = useState<'stats' | 'progress'>('stats');
    const [insightIndex, setInsightIndex] = useState(0);
    
    const isAdmin = userProfile?.isAdmin;

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
    }, [summaryAssets, categoryStats, globalStateFilter]);

    useEffect(() => {
        if (activeView === 'progress' && insightsPool.length > 1) {
            const timer = setInterval(() => {
                setInsightIndex(prev => (prev + 1) % insightsPool.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [activeView, insightsPool.length]);

    const summary = useMemo(() => {
        return {
          unusable: summaryAssets.filter(a => a.condition && ['Unsalvageable', 'Burnt', 'Stolen'].includes(a.condition)).length,
          withoutAssetId: summaryAssets.filter(a => !a.assetIdCode?.trim()).length,
          modifiedToday: summaryAssets.filter(a => a.lastModified && isToday(parseISO(a.lastModified))).length,
          newThisWeek: summaryAssets.filter(a => a.lastModified && !a.previousState && isThisWeek(parseISO(a.lastModified), { weekStartsOn: 1 })).length,
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

    const handleInsightClick = (insight: Insight) => {
        if (insight.asset) {
            setAssetToView(insight.asset);
        }
    };

    const conditionGroups = {
        unusable: ['Unsalvageable', 'Burnt', 'Stolen'],
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
            
            <CollapsibleContent className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {activeView === 'stats' ? (
                    <ScrollArea className="w-full pb-4">
                        <div className="flex gap-4 p-1">
                            {summary.unusable > 0 && (
                                <StatCard
                                    title="Unusable"
                                    value={summary.unusable}
                                    description="Assets reported as stolen, burnt, or unsalvageable."
                                    icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                                    onAction={() => handleConditionFilterClick(conditionGroups.unusable)}
                                    isActive={JSON.stringify(conditionFilter.sort()) === JSON.stringify(conditionGroups.unusable.sort())}
                                />
                            )}
                            <StatCard
                                title="Missing ID"
                                value={summary.withoutAssetId}
                                description="Assets lacking a unique ID or tag number."
                                icon={<FileWarning className="h-4 w-4 text-orange-500" />}
                                onAction={() => handleFilterClick('assetIdCode')}
                                isActive={missingFieldFilter === 'assetIdCode'}
                            />
                            <StatCard
                                title="Modified Today"
                                value={summary.modifiedToday}
                                description="Updates or creations in the last 24 hours."
                                icon={<CalendarClock className="h-4 w-4 text-primary" />}
                                onAction={() => handleDateFilterClick('today')}
                                isActive={dateFilter === 'today'}
                            />
                            <StatCard
                                title="New This Week"
                                value={summary.newThisWeek}
                                description="Fresh records added to the system this week."
                                icon={<PlusCircle className="h-4 w-4 text-green-500" />}
                                onAction={() => handleDateFilterClick('new-week')}
                                isActive={dateFilter === 'new-week'}
                            />
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[160px] flex flex-col justify-center bg-primary/5 border-dashed border-primary/20">
                            <CardContent className="pt-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={insightIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4 }}
                                        className={cn("flex flex-col items-center text-center gap-4 cursor-pointer", insightsPool[insightIndex].asset && "hover:opacity-80")}
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
                                <div className="flex justify-center gap-1 mt-6">
                                    {insightsPool.map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={cn("h-1 rounded-full transition-all", i === insightIndex ? "w-8 bg-primary" : "w-2 bg-muted")}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
