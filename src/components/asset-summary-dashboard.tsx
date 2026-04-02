'use client';

/**
 * @fileOverview Inventory Pulse - High-Fidelity Diagnostic Dashboard.
 * Phase 400: Implemented 10-point metric grid with real-time telemetry.
 * Matches requested "Inventory Pulse" reference design.
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
}

const StatCard = ({ label, value, description, icon: Icon, iconColor, onClick, isCritical }: StatCardProps) => (
    <Card 
        onClick={onClick}
        className={cn(
            "bg-white/[0.02] border-white/5 rounded-2xl p-6 transition-all group cursor-pointer hover:bg-white/[0.04]",
            isCritical ? "hover:border-destructive/40" : "hover:border-primary/40"
        )}
    >
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
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">View Details</span>
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

    // --- High-Fidelity Telemetry Calculation ---
    const telemetry = useMemo(() => {
        const total = assets.length;
        const verified = assets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        return {
            coverage: `${coverage}%`,
            coverageDesc: `Showing ${verified} verified items out of ${total} assets in this scope.`,
            
            pending: assets.filter(a => a.status === 'UNVERIFIED').length,
            pendingDesc: "Assets currently marked as unverified and requiring field inspection.",
            
            missingId: assets.filter(a => !a.assetIdCode).length,
            missingIdDesc: "Assets lacking a unique tag or system ID code. Crucial for audits.",
            
            missingSerial: assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length,
            missingSerialDesc: "Items missing manufacturer serial numbers. Risk for identification.",
            
            critical: assets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable', 'Writeoff'].includes(a.condition || '')).length,
            criticalDesc: "Assets reported as stolen, burnt, or unsalvageable.",
            
            maintenance: assets.filter(a => ['Bad condition', 'F2: Major repairs required-poor condition'].includes(a.condition || '')).length,
            maintenanceDesc: "Assets in poor or bad condition requiring technical assessment.",
            
            exceptions: assets.filter(a => a.status === 'DISCREPANCY').length,
            exceptionsDesc: "Records where field data conflicts with previous system information.",
            
            feedback: assets.filter(a => a.remarks && a.remarks.trim().length > 0).length,
            feedbackDesc: "Assets containing specific comments or remarks from field officers.",
            
            modified: assets.filter(a => {
                const d = new Date(a.lastModified).getTime();
                return now - d < oneDay;
            }).length,
            modifiedDesc: "Updates or creations performed in the last 24 hours.",
            
            newInFlow: assets.filter(a => {
                const d = new Date(a.importMetadata?.importedAt || 0).getTime();
                return now - d < oneWeek;
            }).length,
            newInFlowDesc: "Fresh records newly registered in the system this week."
        };
    }, [assets]);

    const navigateTo = (filter: () => void) => {
        filter();
        setActiveView('REGISTRY');
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                        <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-black tracking-tight text-white uppercase leading-none">Inventory Pulse</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                            Real-time status of global assets
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
                            Key Stats
                        </button>
                        <button 
                            onClick={() => setView('insights')} 
                            className={cn(
                                "px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all", 
                                view === 'insights' ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                            )}
                        >
                            Asset Insights
                        </button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refreshRegistry} className="rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-primary">
                        <ChevronDown className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* 2. Diagnostic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard 
                    label="Verification Coverage" 
                    value={telemetry.coverage} 
                    description={telemetry.coverageDesc} 
                    icon={ShieldCheck} 
                    iconColor="text-green-500"
                    onClick={() => navigateTo(() => setSelectedStatuses(['VERIFIED']))}
                />
                <StatCard 
                    label="Pending Action" 
                    value={telemetry.pending} 
                    description={telemetry.pendingDesc} 
                    icon={Zap} 
                    iconColor="text-primary"
                    onClick={() => navigateTo(() => setSelectedStatuses(['UNVERIFIED']))}
                />
                <StatCard 
                    label="Missing Asset ID" 
                    value={telemetry.missingId} 
                    description={telemetry.missingIdDesc} 
                    icon={Tag} 
                    iconColor="text-orange-500"
                    onClick={() => navigateTo(() => setMissingFieldFilter('assetIdCode'))}
                />
                <StatCard 
                    label="Missing Serials" 
                    value={telemetry.missingSerial} 
                    description={telemetry.missingSerialDesc} 
                    icon={Hash} 
                    iconColor="text-blue-500"
                    onClick={() => navigateTo(() => setMissingFieldFilter('serialNumber'))}
                />
                <StatCard 
                    label="Critical Condition" 
                    value={telemetry.critical} 
                    description={telemetry.criticalDesc} 
                    icon={AlertCircle} 
                    iconColor="text-destructive"
                    isCritical
                    onClick={() => navigateTo(() => setSelectedConditions(['Stolen', 'Burnt', 'Unsalvageable']))}
                />
                <StatCard 
                    label="Maintenance Alert" 
                    value={telemetry.maintenance} 
                    description={telemetry.maintenanceDesc} 
                    icon={Wrench} 
                    iconColor="text-orange-600"
                    onClick={() => navigateTo(() => setSelectedConditions(['Bad condition']))}
                />
                <StatCard 
                    label="Audit Exceptions" 
                    value={telemetry.exceptions} 
                    description={telemetry.exceptionsDesc} 
                    icon={FileWarning} 
                    iconColor="text-destructive"
                    isCritical
                    onClick={() => navigateTo(() => setSelectedStatuses(['DISCREPANCY']))}
                />
                <StatCard 
                    label="Field Feedback" 
                    value={telemetry.feedback} 
                    description={telemetry.feedbackDesc} 
                    icon={MessageSquare} 
                    iconColor="text-teal-500"
                    onClick={() => navigateTo(() => setSearchTerm('remark'))}
                />
                <StatCard 
                    label="Modified Today" 
                    value={telemetry.modified} 
                    description={telemetry.modifiedDesc} 
                    icon={Clock} 
                    iconColor="text-primary"
                    onClick={() => navigateTo(() => setSearchTerm('today'))}
                />
                <StatCard 
                    label="New In-Flow" 
                    value={telemetry.newInFlow} 
                    description={telemetry.newInFlowDesc} 
                    icon={PlusCircle} 
                    iconColor="text-green-600"
                    onClick={() => navigateTo(() => setSearchTerm('new'))}
                />
            </div>
        </div>
    );
}
