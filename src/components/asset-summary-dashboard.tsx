'use client';

/**
 * @fileOverview Inventory Pulse - Wide High-Fidelity Telemetry Bar.
 * Phase 245: Implemented deep-scan interactive insights for data integrity and specific asset pulses.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
    BarChart2,
    Activity,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    TrendingDown,
    AlertTriangle,
    Database,
    Tag,
    MapPin,
    Zap,
    Fingerprint,
    Search
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

type DashboardTab = 'stats' | 'insights';

interface InsightPulse {
    id: string;
    title: React.ReactNode;
    description: string;
    icon: any;
    color: string;
    action: () => void;
}

export function AssetSummaryDashboard() {
    const { 
        assets, 
        refreshRegistry, 
        isSyncing, 
        setActiveView,
        setSearchTerm,
        setMissingFieldFilter
    } = useAppState();
    
    const [activeTab, setActiveTab] = useState<DashboardTab>('insights');
    const [insightIndex, setInsightIndex] = useState(0);

    // --- High-Fidelity Insight Generation Engine ---
    const insights = useMemo((): InsightPulse[] => {
        const pulses: InsightPulse[] = [];

        // 1. Critical Discrepancy Pulse (Search specific asset)
        const discrepancy = assets.find(a => a.status === 'DISCREPANCY');
        if (discrepancy) {
            pulses.push({
                id: 'pulse-discrepancy',
                title: <>Critical Alert: <span className="text-destructive">"{discrepancy.description}"</span> is discrepant.</>,
                description: `Physical verification mismatch detected in ${discrepancy.location}. Tap to inspect.`,
                icon: AlertTriangle,
                color: 'text-destructive',
                action: () => {
                    setSearchTerm(discrepancy.id.split('-')[0]);
                    setActiveView('inventory' as any);
                }
            });
        }

        // 2. Data Integrity Pulse (Missing Serial)
        const missingSerial = assets.find(a => !a.serialNumber || a.serialNumber === 'N/A');
        if (missingSerial) {
            pulses.push({
                id: 'pulse-serial',
                title: <>Quality Alert: <span className="text-orange-500">Missing Serial</span> detected.</>,
                description: `"${missingSerial.description}" is missing a Manufacturer Serial pulse. Tap to fix.`,
                icon: Fingerprint,
                color: 'text-orange-500',
                action: () => {
                    setMissingFieldFilter('serialNumber');
                    setActiveView('inventory' as any);
                }
            });
        }

        // 3. Category Focus Pulse (Low Progress)
        const categoryGroups = Array.from(new Set(assets.map(a => a.category || 'Registry')));
        const focusCat = categoryGroups
            .map(cat => {
                const catAssets = assets.filter(a => a.category === cat);
                const percent = Math.round((catAssets.filter(a => a.status === 'VERIFIED').length / catAssets.length) * 100);
                return { name: cat, percent, total: catAssets.length };
            })
            .sort((a, b) => a.percent - b.percent)[0];

        if (focusCat) {
            pulses.push({
                id: 'pulse-category',
                title: <>Focus Area: The <span className="text-primary">"{focusCat.name}"</span> category is only {focusCat.percent}% verified.</>,
                description: `${focusCat.total - Math.round(focusCat.total * (focusCat.percent/100))} items remaining in this inventory list.`,
                icon: TrendingDown,
                color: 'text-primary',
                action: () => {
                    setSearchTerm(focusCat.name);
                    setActiveView('inventory' as any);
                }
            });
        }

        // 4. Spatial Pulse (Missing Geotag)
        const missingGeo = assets.find(a => !a.geotag);
        if (missingGeo) {
            pulses.push({
                id: 'pulse-geo',
                title: <>Spatial Gap: <span className="text-blue-500">Unanchored Asset</span> detected.</>,
                description: `"${missingGeo.description}" has no coordinate pulse. Field re-anchoring required.`,
                icon: MapPin,
                color: 'text-blue-500',
                action: () => {
                    setSearchTerm(missingGeo.id.split('-')[0]);
                    setActiveView('inventory' as any);
                }
            });
        }

        // 5. Unassigned Pulse
        const unassigned = assets.find(a => !a.custodian || a.custodian === 'Unassigned');
        if (unassigned) {
            pulses.push({
                id: 'pulse-assignee',
                title: <>Identity Gap: <span className="text-purple-500">Unassigned Item</span> found.</>,
                description: `"${unassigned.description}" has no custodian pulse in the register.`,
                icon: Tag,
                color: 'text-purple-500',
                action: () => {
                    setSearchTerm(unassigned.id.split('-')[0]);
                    setActiveView('inventory' as any);
                }
            });
        }

        // Fallback for empty or perfect registry
        if (pulses.length === 0) {
            pulses.push({
                id: 'pulse-perfect',
                title: <>Registry Pulse: <span className="text-green-500">Stable</span></>,
                description: "All assets are physically verified and data integrity is at 100%.",
                icon: Zap,
                color: 'text-green-500',
                action: () => setActiveView('inventory' as any)
            });
        }

        return pulses;
    }, [assets, setActiveView, setSearchTerm, setMissingFieldFilter]);

    const activeInsight = insights[insightIndex];

    const handleNext = () => setInsightIndex((prev) => (prev + 1) % insights.length);
    const handlePrev = () => setInsightIndex((prev) => (prev - 1 + insights.length) % insights.length);

    // Auto-circle logic
    useEffect(() => {
        const interval = setInterval(handleNext, 8000);
        return () => clearInterval(interval);
    }, [insights.length]);

    return (
        <div className="space-y-4">
            {/* 1. Header Bar */}
            <div className='flex flex-col sm:flex-row items-center justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md mb-2 group relative overflow-hidden'>
                <div className="flex items-center gap-5 z-10">
                    <div className="p-3 bg-primary/10 rounded-xl shadow-inner">
                        <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-base font-black tracking-tight text-white uppercase leading-none">Inventory Pulse</h3>
                        <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest leading-none">
                            Real-time status of global registry
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0 z-10">
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('stats')} 
                            className={cn(
                                "px-5 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                activeTab === 'stats' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white"
                            )}
                        >
                            Key Stats
                        </button>
                        <button 
                            onClick={() => setActiveTab('insights')} 
                            className={cn(
                                "px-5 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                activeTab === 'insights' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white"
                            )}
                        >
                            Asset Insights
                        </button>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-white/20" />
                </div>
            </div>

            {/* 2. Content Area */}
            <Card className="bg-[#050505] border-2 border-dashed border-primary/10 rounded-[2.5rem] relative overflow-hidden group/card shadow-3xl min-h-[340px] flex flex-col justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
                
                <button 
                    onClick={refreshRegistry}
                    className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/20 transition-all group/sync z-20"
                >
                    <RefreshCw className={cn("h-4 w-4 text-white/40 group-hover/sync:text-primary transition-colors", isSyncing && "animate-spin")} />
                </button>

                <CardContent className="p-12 text-center space-y-10 relative z-10">
                    <AnimatePresence mode="wait">
                        {activeTab === 'insights' ? (
                            <motion.div 
                                key={activeInsight.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8 cursor-pointer group/pulse"
                                onClick={activeInsight.action}
                            >
                                <div className="inline-flex p-6 bg-white/5 rounded-[2.5rem] shadow-inner relative group-hover/pulse:scale-110 transition-transform duration-500">
                                    <div className={cn("absolute inset-0 bg-current/5 animate-pulse rounded-full scale-125 opacity-20", activeInsight.color)} />
                                    <activeInsight.icon className={cn("h-10 w-10 relative z-10", activeInsight.color)} />
                                </div>
                                
                                <div className="space-y-3">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase leading-none max-w-2xl mx-auto group-hover/pulse:text-primary transition-colors">
                                        {activeInsight.title}
                                    </h2>
                                    <p className="text-xs md:text-sm font-medium italic text-white/40 tracking-wide flex items-center justify-center gap-2">
                                        {activeInsight.description}
                                        <Search className="h-3 w-3 opacity-0 group-hover/pulse:opacity-100 transition-opacity" />
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="stats-grid"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
                            >
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2 group/stat hover:border-primary/20 transition-all cursor-default">
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest group-hover/stat:text-primary">Total Registry</span>
                                    <p className="text-5xl font-black text-white">{assets.length}</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2 group/stat hover:border-green-500/20 transition-all cursor-default">
                                    <span className="text-[10px] font-black uppercase text-green-500/60 tracking-widest group-hover/stat:text-green-500">Verified Pulses</span>
                                    <p className="text-5xl font-black text-green-500">{assets.filter(a => a.status === 'VERIFIED').length}</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2 group/stat hover:border-red-500/20 transition-all cursor-default">
                                    <span className="text-[10px] font-black uppercase text-red-500/60 tracking-widest group-hover/stat:text-red-500">Discrepancies</span>
                                    <p className="text-5xl font-black text-red-500">{assets.filter(a => a.status === 'DISCREPANCY').length}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pagination Controls */}
                    {activeTab === 'insights' && insights.length > 1 && (
                        <div className="flex items-center justify-center gap-10 pt-4">
                            <button 
                                onClick={handlePrev}
                                className="p-3 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            
                            <div className="flex gap-2">
                                {insights.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-500",
                                            i === insightIndex ? "w-10 bg-primary shadow-[0_0_10px_rgba(212,175,55,0.5)]" : "w-1.5 bg-white/10"
                                        )} 
                                    />
                                ))}
                            </div>

                            <button 
                                onClick={handleNext}
                                className="p-3 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
