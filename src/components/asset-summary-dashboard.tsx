'use client';

/**
 * @fileOverview Inventory Pulse - Wide High-Fidelity Telemetry Bar.
 * Phase 240: Overhauled to match the high-fidelity "Insights" dashboard pulse.
 */

import React, { useMemo, useState } from 'react';
import { 
    BarChart2,
    ChevronDown,
    Activity,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    ShieldAlert,
    Clock,
    Zap
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { motion, AnimatePresence } from 'framer-motion';

type DashboardTab = 'stats' | 'insights';

export function AssetSummaryDashboard() {
    const { assets, refreshRegistry, isSyncing } = useAppState();
    const [activeTab, setActiveTab] = useState<DashboardTab>('insights');
    const [insightIndex, setInsightIndex] = useState(0);

    // --- Data Heuristics ---
    const insights = useMemo(() => {
        const categories = Array.from(new Set(assets.map(a => a.category || 'Uncategorized')));
        const results = categories.map(cat => {
            const catAssets = assets.filter(a => a.category === cat);
            const total = catAssets.length;
            const verified = catAssets.filter(a => a.status === 'VERIFIED').length;
            const percent = total > 0 ? Math.round((verified / total) * 100) : 0;
            const remaining = total - verified;
            return { name: cat, percent, remaining, total };
        });

        // Focus on low verification first
        return results.sort((a, b) => a.percent - b.percent);
    }, [assets]);

    const activeInsight = insights[insightIndex] || { name: 'Registry', percent: 0, remaining: 0, total: 0 };

    const handleNext = () => setInsightIndex((prev) => (prev + 1) % insights.length);
    const handlePrev = () => setInsightIndex((prev) => (prev - 1 + insights.length) % insights.length);

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
                            Real-time status of the global assets
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
                {/* Decoration Pulse Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
                
                {/* Manual Sync Pulse Icon */}
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
                                key={`insight-${activeInsight.name}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="inline-flex p-6 bg-primary/5 rounded-[2.5rem] shadow-inner relative">
                                    <div className="absolute inset-0 bg-primary/5 animate-ping rounded-full scale-75" />
                                    <TrendingDown className="h-10 w-10 text-primary relative z-10" />
                                </div>
                                
                                <div className="space-y-3">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase leading-none max-w-2xl mx-auto">
                                        Focus Area: The <span className="text-primary">"{activeInsight.name}"</span> category is only {activeInsight.percent}% verified.
                                    </h2>
                                    <p className="text-xs md:text-sm font-medium italic text-white/40 tracking-wide">
                                        {activeInsight.remaining} items remaining in this inventory list.
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
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Registry</span>
                                    <p className="text-5xl font-black text-white">{assets.length}</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-green-500/60 tracking-widest">Verified Pulses</span>
                                    <p className="text-5xl font-black text-green-500">{assets.filter(a => a.status === 'VERIFIED').length}</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-red-500/60 tracking-widest">Discrepancies</span>
                                    <p className="text-5xl font-black text-red-500">{assets.filter(a => a.status === 'DISCREPANCY').length}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pagination Pulse Controls */}
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