'use client';

/**
 * @fileOverview Inventory Dashboard - High-Fidelity Analytics Grid.
 * Phase 500: Implemented interactive drill-down pulses for all metric nodes.
 */

import React, { useMemo, useState } from 'react';
import { 
    BarChart2,
    ShieldCheck,
    Zap,
    Tag,
    Hash,
    AlertCircle,
    Wrench,
    FileWarning,
    MessageSquare,
    Clock,
    PlusCircle,
    ChevronDown,
    RefreshCw,
    MousePointer2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type DashboardView = 'stats' | 'insights';

interface StatCardProps {
    label: string;
    value: string | number;
    description: string;
    icon: any;
    iconColor: string;
    onClick: () => void;
    isCritical?: boolean;
    unseenCount?: number;
}

const StatCard = ({ label, value, description, icon: Icon, iconColor, onClick, isCritical, unseenCount }: StatCardProps) => (
    <Card 
        onClick={onClick}
        className={cn(
            "bg-white/[0.02] border-white/5 rounded-2xl p-6 transition-all group cursor-pointer hover:bg-white/[0.04] relative overflow-hidden",
            isCritical ? "hover:border-destructive/40" : "hover:border-primary/40"
        )}
    >
        {unseenCount && unseenCount > 0 ? (
          <div className="absolute top-0 right-0 p-2">
            <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
          </div>
        ) : null}
        
        <div className="flex justify-between items-start mb-4">
            <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                isCritical ? "text-destructive" : "text-white/40"
            )}>
                {label}
            </span>
            <div className={cn("p-2 rounded-lg bg-opacity-10 shadow-inner", iconColor.replace('text-', 'bg-'))}>
                <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-3xl font-black tracking-tighter text-white">
                {value}
            </div>
            <p className="text-[10px] font-medium text-white/30 leading-relaxed italic line-clamp-2">
                {description}
            </p>
        </div>
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Explore Drill-down</span>
            <MousePointer2 className="h-3 w-3 text-primary opacity-40" />
        </div>
    </Card>
);

export function AssetSummaryDashboard() {
    const { 
        assets, 
        refreshRegistry, 
        isSyncing, 
        setActiveView,
        setSearchTerm,
        setMissingFieldFilter,
        setSelectedStatuses,
        setSelectedConditions
    } = useAppState();
    
    const [view, setView] = useState<DashboardView>('stats');

    const metrics = useMemo(() => {
        const total = assets.length;
        const verified = assets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        return {
            coverage: `${coverage}%`,
            coverageDesc: `Verified ${verified} of ${total} assets in scope.`,
            
            pending: assets.filter(a => a.status === 'UNVERIFIED').length,
            pendingDesc: "Assets awaiting physical field assessment.",
            
            missingId: assets.filter(a => !a.assetIdCode).length,
            missingIdDesc: "Records missing unique Tag IDs.",
            
            missingSerial: assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length,
            missingSerialDesc: "Items missing manufacturer serials.",
            
            critical: assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable', 'Writeoff'].includes(a.condition || '')).length,
            criticalDesc: "Assets reported as stolen or destroyed.",
            
            maintenance: assets.filter(a => ['Bad condition', 'F2: Major repairs required-poor condition'].includes(a.condition || '')).length,
            maintenanceDesc: "Assets requiring technical attention.",
            
            exceptions: assets.filter(a => a.status === 'DISCREPANCY').length,
            exceptionsDesc: "Records with verified audit discrepancies.",
            
            feedback: assets.filter(a => a.remarks && a.remarks.trim().length > 0).length,
            feedbackDesc: "Assets containing officer field notes.",
            
            modified: assets.filter(a => {
                const d = new Date(a.lastModified).getTime();
                return now - d < oneDay;
            }).length,
            modifiedDesc: "Records updated in the last 24 hours.",
            
            newInFlow: assets.filter(a => {
                const d = new Date(a.importMetadata?.importedAt || 0).getTime();
                return now - d < oneWeek;
            }).length,
            newInFlowDesc: "New records added to the system this week."
        };
    }, [assets]);

    const navigateTo = (filter: () => void) => {
        filter();
        setActiveView('REGISTRY');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                        <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-black tracking-tight text-white uppercase leading-none">Intelligence Dashboard</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                            Real-time interactive registry telemetry
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setView('stats')} 
                            className={cn(
                                "px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                view === 'stats' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Quick Stats
                        </button>
                        <button 
                            onClick={() => setView('insights')} 
                            className={cn(
                                "px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                view === 'insights' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Drill-down
                        </button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refreshRegistry} className="rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-primary">
                        <ChevronDown className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard 
                    label="Audit Coverage" 
                    value={metrics.coverage} 
                    description={metrics.coverageDesc} 
                    icon={ShieldCheck} 
                    iconColor="text-green-500"
                    onClick={() => navigateTo(() => setSelectedStatuses(['VERIFIED']))}
                />
                <StatCard 
                    label="Assessments" 
                    value={metrics.pending} 
                    description={metrics.pendingDesc} 
                    icon={Zap} 
                    iconColor="text-primary"
                    onClick={() => navigateTo(() => setSelectedStatuses(['UNVERIFIED']))}
                />
                <StatCard 
                    label="Missing Tags" 
                    value={metrics.missingId} 
                    description={metrics.missingIdDesc} 
                    icon={Tag} 
                    iconColor="text-orange-500"
                    onClick={() => navigateTo(() => setMissingFieldFilter('assetIdCode'))}
                />
                <StatCard 
                    label="Serial Gaps" 
                    value={metrics.missingSerial} 
                    description={metrics.missingSerialDesc} 
                    icon={Hash} 
                    iconColor="text-blue-500"
                    onClick={() => navigateTo(() => setMissingFieldFilter('serialNumber'))}
                />
                <StatCard 
                    label="Loss Pulses" 
                    value={metrics.critical} 
                    description={metrics.criticalDesc} 
                    icon={AlertCircle} 
                    iconColor="text-destructive"
                    isCritical
                    onClick={() => navigateTo(() => setSelectedConditions(['Stolen', 'Burnt', 'Unsalvageable']))}
                />
                <StatCard 
                    label="Maintenance" 
                    value={metrics.maintenance} 
                    description={metrics.maintenanceDesc} 
                    icon={Wrench} 
                    iconColor="text-orange-600"
                    onClick={() => navigateTo(() => setSelectedConditions(['Bad condition']))}
                />
                <StatCard 
                    label="Discrepancies" 
                    value={metrics.exceptions} 
                    description={metrics.exceptionsDesc} 
                    icon={FileWarning} 
                    iconColor="text-destructive"
                    isCritical
                    onClick={() => navigateTo(() => setSelectedStatuses(['DISCREPANCY']))}
                />
                <StatCard 
                    label="Field Logs" 
                    value={metrics.feedback} 
                    description={metrics.feedbackDesc} 
                    icon={MessageSquare} 
                    iconColor="text-teal-500"
                    onClick={() => navigateTo(() => setSearchTerm('remark'))}
                />
                <StatCard 
                    label="Daily Pulse" 
                    value={metrics.modified} 
                    description={metrics.modifiedDesc} 
                    icon={Clock} 
                    iconColor="text-primary"
                    onClick={() => navigateTo(() => setSearchTerm('today'))}
                />
                <StatCard 
                    label="New Arrivals" 
                    value={metrics.newInFlow} 
                    description={metrics.newInFlowDesc} 
                    icon={PlusCircle} 
                    iconColor="text-green-600"
                    onClick={() => navigateTo(() => setSearchTerm('new'))}
                />
            </div>
        </div>
    );
}