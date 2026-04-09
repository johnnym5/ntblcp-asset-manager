'use client';

/**
 * @fileOverview Inventory Pulse Dashboard - High-Fidelity Metric Hub.
 * Implements exactly 10 business-critical asset anchors with detailed descriptions.
 * Phase 1505: Locked Pending Action card to Verification Mode and updated navigation.
 */

import React, { useMemo } from 'react';
import { 
    Zap, 
    Boxes, 
    SearchCode, 
    ShieldCheck,
    Activity,
    ShieldAlert,
    Database,
    Fingerprint,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Clock,
    MessageSquare,
    PlusCircle,
    Wrench,
    TrendingUp,
    FileWarning
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface PulseCardProps {
    label: string;
    description: string;
    count: string | number;
    icon: any;
    color: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'warning' | 'success' | 'blue';
    progress?: number;
    showProgress?: boolean;
}

const PulseCard = ({ label, description, count, icon: Icon, color, onClick, variant = 'default', progress, showProgress }: PulseCardProps) => (
    <Card className={cn(
        "rounded-[2rem] border-2 transition-all group relative overflow-hidden flex flex-col h-full",
        variant === 'destructive' ? "bg-red-500/5 border-red-500/10 hover:border-red-500/30" :
        variant === 'warning' ? "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30" :
        variant === 'success' ? "bg-green-500/5 border-green-500/10 hover:border-green-500/30" :
        variant === 'blue' ? "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30" :
        "bg-card border-border/40 hover:border-primary/30"
    )}>
        <CardHeader className="p-6 pb-2 flex flex-row items-start justify-between space-y-0">
            <div className={cn("p-3 rounded-2xl shadow-inner transition-colors", color)}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-right flex flex-col items-end">
                <span className={cn(
                    "text-3xl font-black tracking-tighter leading-none",
                    variant === 'destructive' ? "text-red-600" : 
                    variant === 'warning' ? "text-amber-600" :
                    variant === 'success' ? "text-green-600" :
                    variant === 'blue' ? "text-blue-600" :
                    "text-foreground"
                )}>
                    {count}
                </span>
                {showProgress && progress !== undefined && (
                    <span className="text-[10px] font-black text-primary mt-1">{progress}%</span>
                )}
            </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
                <h4 className="text-[11px] font-black uppercase text-foreground tracking-widest">{label}</h4>
                <p className="text-[9px] font-medium text-muted-foreground leading-relaxed italic line-clamp-2">
                    {description}
                </p>
            </div>
            
            <div className="mt-6 space-y-4">
                {showProgress && progress !== undefined && (
                    <Progress value={progress} className="h-1 bg-muted" />
                )}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClick}
                    className="w-full h-9 rounded-xl font-black uppercase text-[9px] tracking-widest border border-border group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all"
                >
                    View Details
                </Button>
            </div>
        </CardContent>
    </Card>
);

export function AssetSummaryDashboard() {
    const { 
        filteredAssets,
        setActiveView,
        appSettings,
        setSearchTerm,
        setSelectedStatuses
    } = useAppState();

    const isVerificationMode = appSettings?.appMode === 'verification';

    const metrics = useMemo(() => {
        const total = filteredAssets.length;
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const verified = filteredAssets.filter(a => a.status === 'VERIFIED').length;
        const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;
        
        const pending = filteredAssets.filter(a => a.status === 'UNVERIFIED').length;
        const missingId = filteredAssets.filter(a => !a.assetIdCode || a.assetIdCode === 'N/A' || a.assetIdCode.trim() === '').length;
        const missingSerial = filteredAssets.filter(a => !a.serialNumber || a.serialNumber === 'N/A' || a.serialNumber.trim() === '').length;
        
        const critical = filteredAssets.filter(a => ['Stolen', 'Burnt', 'Unsalvageable', 'Writeoff'].includes(a.condition || '')).length;
        
        const maintenance = filteredAssets.filter(a => 
            (a.condition || '').toLowerCase().includes('poor') || 
            (a.condition || '').toLowerCase().includes('bad') || 
            (a.condition || '').toLowerCase().includes('repair')
        ).length;

        const exceptions = filteredAssets.filter(a => a.status === 'DISCREPANCY').length;
        const feedback = filteredAssets.filter(a => a.remarks && a.remarks.trim() !== '').length;
        
        const modifiedToday = filteredAssets.filter(a => new Date(a.lastModified) > oneDayAgo).length;
        const newInFlow = filteredAssets.filter(a => {
            const importedAt = a.importMetadata?.importedAt ? new Date(a.importMetadata.importedAt) : new Date(a.lastModified);
            return importedAt > oneWeekAgo;
        }).length;

        return {
            total,
            coverage,
            verified,
            pending,
            missingId,
            missingSerial,
            critical,
            maintenance,
            exceptions,
            feedback,
            modifiedToday,
            newInFlow
        };
    }, [filteredAssets]);

    const navigateTo = (view: any, term?: string, status?: string) => {
        if (term) setSearchTerm(term);
        if (status) setSelectedStatuses([status]);
        setActiveView(view);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1 px-1">
                <h3 className="text-2xl font-black uppercase text-foreground tracking-tight leading-none">Inventory Pulse</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Real-time status of global assets</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {/* 1. Verification Coverage */}
                {isVerificationMode && (
                    <PulseCard 
                        label="Verification Coverage"
                        description={`Showing ${metrics.verified} verified items out of ${metrics.total} assets in this scope.`}
                        count={`${metrics.coverage}%`}
                        progress={metrics.coverage}
                        showProgress
                        icon={TrendingUp}
                        color="bg-primary"
                        onClick={() => navigateTo('REGISTRY')}
                        variant="success"
                    />
                )}

                {/* 2. Pending Action - Locked to Verification Mode */}
                {isVerificationMode && (
                    <PulseCard 
                        label="Pending Action"
                        description="Assets currently marked as unverified and requiring field inspection."
                        count={metrics.pending}
                        icon={Activity}
                        color="bg-blue-600"
                        onClick={() => navigateTo('REGISTRY', undefined, 'UNVERIFIED')}
                        variant="blue"
                    />
                )}

                {/* 3. Missing Asset ID */}
                <PulseCard 
                    label="Missing Asset ID"
                    description="Assets lacking a unique tag or system ID code. Crucial for audits."
                    count={metrics.missingId}
                    icon={Fingerprint}
                    color="bg-orange-600"
                    onClick={() => navigateTo('REGISTRY', 'MISSING_ID')}
                    variant="warning"
                />

                {/* 4. Missing Serials */}
                <PulseCard 
                    label="Missing Serials"
                    description="Items missing manufacturer serial numbers. Risk for identification."
                    count={metrics.missingSerial}
                    icon={SearchCode}
                    color="bg-orange-600"
                    onClick={() => navigateTo('REGISTRY', 'MISSING_SERIAL')}
                    variant="warning"
                />

                {/* 5. Critical Condition */}
                <PulseCard 
                    label="Critical Condition"
                    description="Assets reported as stolen, burnt, or unsalvageable."
                    count={metrics.critical}
                    icon={AlertCircle}
                    color="bg-red-600"
                    onClick={() => navigateTo('ALERTS')}
                    variant="destructive"
                />

                {/* 6. Maintenance Alert */}
                <PulseCard 
                    label="Maintenance Alert"
                    description="Assets in poor or bad condition requiring technical assessment."
                    count={metrics.maintenance}
                    icon={Wrench}
                    color="bg-amber-600"
                    onClick={() => navigateTo('REGISTRY', 'CONDITION_BAD')}
                    variant="warning"
                />

                {/* 7. Audit Exceptions */}
                <PulseCard 
                    label="Audit Exceptions"
                    description="Records where field data conflicts with previous system information."
                    count={metrics.exceptions}
                    icon={FileWarning}
                    color="bg-red-600"
                    onClick={() => navigateTo('ANOMALIES')}
                    variant="destructive"
                />

                {/* 8. Field Feedback */}
                <PulseCard 
                    label="Field Feedback"
                    description="Assets containing specific comments or remarks from field officers."
                    count={metrics.feedback}
                    icon={MessageSquare}
                    color="bg-blue-600"
                    onClick={() => navigateTo('REPORTS')}
                    variant="blue"
                />

                {/* 9. Modified Today */}
                <PulseCard 
                    label="Modified Today"
                    description="Updates or creations performed in the last 24 hours."
                    count={metrics.modifiedToday}
                    icon={Clock}
                    color="bg-green-600"
                    onClick={() => navigateTo('AUDIT_LOG')}
                    variant="success"
                />

                {/* 10. New In-Flow */}
                <PulseCard 
                    label="New In-Flow"
                    description="Fresh records newly registered in the system this week."
                    count={metrics.newInFlow}
                    icon={PlusCircle}
                    color="bg-primary"
                    onClick={() => navigateTo('REGISTRY')}
                />
            </div>
        </div>
    );
}
