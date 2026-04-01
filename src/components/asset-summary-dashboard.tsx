'use client';

/**
 * @fileOverview Inventory Pulse - Mobile-Adaptive Telemetry.
 * Phase 250: Stacked stats on mobile and reduced padding for smaller viewports.
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
import { useIsMobile } from '@/hooks/use-mobile';

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
    
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<DashboardTab>('insights');
    const [insightIndex, setInsightIndex] = useState(0);

    // --- High-Fidelity Insight Generation Engine ---
    const insights = useMemo((): InsightPulse[] => {
        const pulses: InsightPulse[] = [];

        // 1. Critical Discrepancy Pulse
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
                    setActiveView('inventory');
                }
            });
        }

        // 2. Data Integrity Pulse
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
                    setActiveView('inventory');
                }
            });
        }

        // 3. Category Focus Pulse
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
                description: `${focusCat.total - Math.round(focusCat.total * (focusCat.percent/100))} items remaining.`,
                icon: TrendingDown,
                color: 'text-primary',
                action: () => {
                    setSearchTerm(focusCat.name);
                    setActiveView('inventory');
                }
            });
        }

        if (pulses.length === 0) {
            pulses.push({
                id: 'pulse-perfect',
                title: <>Registry Pulse: <span className="text-green-500">Stable</span></>,
                description: "All assets are physically verified and data integrity is at 100%.",
                icon: Zap,
                color: 'text-green-500',
                action: () => setActiveView('inventory')
            });
        }

        return pulses;
    }, [assets, setActiveView, setSearchTerm, setMissingFieldFilter]);

    const activeInsight = insights[insightIndex];

    const handleNext = () => setInsightIndex((prev) => (prev + 1) % insights.length);
    const handlePrev = () => setInsightIndex((prev) => (prev - 1 + insights.length) % insights.length);

    useEffect(() => {
        const interval = setInterval(handleNext, 8000);
        return () => clearInterval(interval);
    }, [insights.length]);

    return (
        <div className="space-y-4">
            {/* 1. Header Bar */}
            <div className='flex flex-row items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md relative overflow-hidden'>
                <div className="flex items-center gap-3 md:gap-5 z-10">
                    <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl shadow-inner">
                        <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-sm md:text-base font-black tracking-tight text-white uppercase leading-none">Inventory Pulse</h3>
                        <p className="text-[8px] md:text-[10px] font-medium text-white/40 uppercase tracking-widest leading-none">
                            Real-time registry telemetry
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 z-10">
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('stats')} 
                            className={cn(
                                "px-3 md:px-5 py-1.5 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all", 
                                activeTab === 'stats' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Stats
                        </button>
                        <button 
                            onClick={() => setActiveTab('insights')} 
                            className={cn(
                                "px-3 md:px-5 py-1.5 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all", 
                                activeTab === 'insights' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Insights
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Content Area */}
            <Card className="bg-[#050505] border-2 border-dashed border-primary/10 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group/card shadow-3xl min-h-[300px] md:min-h-[340px] flex flex-col justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
                
                <button 
                    onClick={refreshRegistry}
                    className="absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/20 transition-all z-20"
                >
                    <RefreshCw className={cn("h-3 w-3 md:h-4 md:w-4 text-white/40", isSyncing && "animate-spin")} />
                </button>

                <CardContent className="p-6 md:p-12 text-center space-y-6 md:space-y-10 relative z-10">
                    <AnimatePresence mode="wait">
                        {activeTab === 'insights' ? (
                            <motion.div 
                                key={activeInsight.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6 md:space-y-8 cursor-pointer group/pulse"
                                onClick={activeInsight.action}
                            >
                                <div className="inline-flex p-4 md:p-6 bg-white/5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-inner relative group-hover/pulse:scale-110 transition-transform duration-500">
                                    <activeInsight.icon className={cn("h-8 w-8 md:h-10 md:w-10 relative z-10", activeInsight.color)} />
                                </div>
                                
                                <div className="space-y-2 md:space-y-3 px-2">
                                    <h2 className="text-xl md:text-4xl font-black tracking-tight text-white uppercase leading-tight max-w-2xl mx-auto group-hover/pulse:text-primary transition-colors">
                                        {activeInsight.title}
                                    </h2>
                                    <p className="text-[10px] md:text-sm font-medium italic text-white/40 tracking-wide">
                                        {activeInsight.description}
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="stats-grid"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto"
                            >
                                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-1 md:space-y-2">
                                    <span className="text-[8px] md:text-[10px] font-black uppercase text-white/40 tracking-widest">Total Registry</span>
                                    <p className="text-3xl md:text-5xl font-black text-white">{assets.length}</p>
                                </div>
                                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-1 md:space-y-2">
                                    <span className="text-[8px] md:text-[10px] font-black uppercase text-green-500/60 tracking-widest">Verified Pulses</span>
                                    <p className="text-3xl md:text-5xl font-black text-green-500">{assets.filter(a => a.status === 'VERIFIED').length}</p>
                                </div>
                                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-1 md:space-y-2">
                                    <span className="text-[8px] md:text-[10px] font-black uppercase text-red-500/60 tracking-widest">Exceptions</span>
                                    <p className="text-3xl md:text-5xl font-black text-red-500">{assets.filter(a => a.status === 'DISCREPANCY').length}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {activeTab === 'insights' && insights.length > 1 && (
                        <div className="flex items-center justify-center gap-6 md:gap-10 pt-2">
                            <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/5 text-white/20 transition-all"><ChevronLeft className="h-5 w-5 md:h-6 md:w-6" /></button>
                            <div className="flex gap-1.5 md:gap-2">
                                {insights.map((_, i) => (
                                    <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === insightIndex ? "w-6 md:w-10 bg-primary" : "w-1.5 bg-white/10")} />
                                ))}
                            </div>
                            <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/5 text-white/20 transition-all"><ChevronRight className="h-5 w-5 md:h-6 md:w-6" /></button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}