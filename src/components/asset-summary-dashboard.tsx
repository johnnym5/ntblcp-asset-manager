'use client';

/**
 * @fileOverview Inventory Pulse - High-Fidelity Sliding Cascade.
 * Phase 1605: Category-Aware Technical ID gaps (excluding vehicles from serial/model).
 * Phase 1606: Fixed missing icon imports.
 */

import React, { useMemo, useState } from 'react';
import { 
    Fingerprint,
    Tag,
    SearchCode,
    Info,
    Truck,
    Activity,
    ShieldCheck,
    Wrench,
    AlertCircle,
    Box,
    Trash2,
    MessageSquare,
    ClipboardCheck,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    CheckCircle2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface PulseData {
    id: string;
    label: string;
    description: string;
    count: number;
    icon: any;
    color: string;
    token: string;
    variant: 'default' | 'destructive' | 'warning' | 'success' | 'blue';
    visible?: boolean;
}

export function AssetSummaryDashboard() {
    const { 
        filteredAssets,
        setActiveView,
        appSettings,
        setSearchTerm
    } = useAppState();

    const [scrollIndex, setScrollIndex] = useState(0);
    const mode = appSettings?.appMode || 'management';

    const pulses = useMemo((): PulseData[] => {
        const assets = filteredAssets;

        const isVehicle = (a: any) => {
            const cat = (a.category || '').toLowerCase();
            return cat.includes('motor') || cat.includes('vehicle');
        };

        const list: PulseData[] = [
            // 1. Technical ID Gaps
            {
                id: 'missing-id',
                label: 'Asset ID Gaps',
                description: 'Assets lacking a unique system tag or barcode ID.',
                count: assets.filter(a => !a.assetIdCode || a.assetIdCode === 'N/A' || a.assetIdCode.trim() === '').length,
                icon: Fingerprint,
                color: 'bg-orange-600',
                token: 'MISSING_ID',
                variant: 'warning'
            },
            {
                id: 'missing-sn',
                label: 'S/N Gaps',
                description: 'Assets without a primary short serial number.',
                count: assets.filter(a => !a.sn || a.sn === 'N/A' || a.sn.trim() === '').length,
                icon: Tag,
                color: 'bg-orange-500',
                token: 'MISSING_SN',
                variant: 'warning'
            },
            {
                id: 'missing-serial',
                label: 'Serial No Gaps',
                description: 'Non-vehicle items missing manufacturer serials.',
                count: assets.filter(a => !isVehicle(a) && (!a.serialNumber || a.serialNumber === 'N/A' || a.serialNumber.trim() === '')).length,
                icon: SearchCode,
                color: 'bg-orange-400',
                token: 'MISSING_SERIAL',
                variant: 'warning'
            },
            {
                id: 'missing-model',
                label: 'Model No Gaps',
                description: 'Equipment items missing specific model identification.',
                count: assets.filter(a => !isVehicle(a) && (!a.modelNumber || a.modelNumber === 'N/A' || a.modelNumber.trim() === '')).length,
                icon: Info,
                color: 'bg-amber-500',
                token: 'MISSING_MODEL',
                variant: 'warning'
            },
            // 2. Vehicle Specifics
            {
                id: 'missing-chassis',
                label: 'Chassis No Gaps',
                description: 'Vehicles/Motorbikes missing structural chassis pulses.',
                count: assets.filter(a => isVehicle(a) && (!a.chassisNo || a.chassisNo === 'N/A')).length,
                icon: Truck,
                color: 'bg-red-500',
                token: 'MISSING_CHASSIS',
                variant: 'destructive'
            },
            {
                id: 'missing-engine',
                label: 'Engine No Gaps',
                description: 'Vehicles/Motorbikes missing engine ID pulses.',
                count: assets.filter(a => isVehicle(a) && (!a.engineNo || a.engineNo === 'N/A')).length,
                icon: Activity,
                color: 'bg-red-600',
                token: 'MISSING_ENGINE',
                variant: 'destructive'
            },
            // 3. Condition Groups
            {
                id: 'cond-good',
                label: 'Optimal Assets',
                description: 'Assets verified in new or good condition.',
                count: assets.filter(a => a.conditionGroup === 'Good').length,
                icon: ShieldCheck,
                color: 'bg-green-600',
                token: 'CONDITION_GOOD',
                variant: 'success'
            },
            {
                id: 'cond-bad',
                label: 'Critical Condition',
                description: 'Assets in poor condition requiring repair or replacement.',
                count: assets.filter(a => ['Bad condition', 'Poor', 'Burnt', 'Stolen', 'Unsalvageable', 'F2: Major repairs required-poor condition'].includes(a.condition || '')).length,
                icon: Wrench,
                color: 'bg-orange-600',
                token: 'CONDITION_BAD',
                variant: 'warning'
            },
            {
                id: 'cond-stolen',
                label: 'Stolen Pulses',
                description: 'Confirmed physical losses from regional sites.',
                count: assets.filter(a => a.condition === 'Stolen').length,
                icon: AlertCircle,
                color: 'bg-red-700',
                token: 'CONDITION_STOLEN',
                variant: 'destructive'
            },
            {
                id: 'cond-obsolete',
                label: 'Obsolete Registry',
                description: 'Assets that have reached the end of operational life.',
                count: assets.filter(a => a.condition === 'Obsolete').length,
                icon: Box,
                color: 'bg-muted-foreground',
                token: 'CONDITION_OBSOLETE',
                variant: 'default'
            },
            {
                id: 'cond-unsalvageable',
                label: 'Unsalvageable',
                description: 'Burnt or destroyed items ready for write-off.',
                count: assets.filter(a => ['Unsalvageable', 'Burnt', 'Writeoff'].includes(a.condition || '')).length,
                icon: Trash2,
                color: 'bg-red-900',
                token: 'CONDITION_UNSALVAGEABLE',
                variant: 'destructive'
            },
            // 4. Operational Pulses
            {
                id: 'with-remarks',
                label: 'Field Remarks',
                description: 'Records containing specific auditor observations.',
                count: assets.filter(a => !!a.remarks && a.remarks.trim() !== '').length,
                icon: MessageSquare,
                color: 'bg-blue-600',
                token: 'WITH_REMARKS',
                variant: 'blue'
            },
            {
                id: 'pending-verify',
                label: 'Pending Assessment',
                description: 'Assets awaiting field verification pulse.',
                count: assets.filter(a => a.status === 'UNVERIFIED').length,
                icon: ClipboardCheck,
                color: 'bg-blue-500',
                token: 'STATUS_UNVERIFIED',
                variant: 'blue',
                visible: mode === 'verification'
            }
        ];

        return list.filter(p => p.visible !== false);
    }, [filteredAssets, mode]);

    const navigateTo = (token: string) => {
        setSearchTerm(token);
        setActiveView('REGISTRY');
    };

    const nextPulse = () => {
        if (scrollIndex < pulses.length - 1) setScrollIndex(i => i + 1);
    };

    const prevPulse = () => {
        if (scrollIndex > 0) setScrollIndex(i => i - 1);
    };

    const activePulse = pulses[scrollIndex];
    if (!activePulse) return null;

    const isNominal = activePulse.count === 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase text-foreground tracking-tight leading-none">Inventory Pulse</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Sliding Diagnostic Cascade</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={prevPulse} disabled={scrollIndex === 0} className="h-10 w-10 rounded-full border border-border shadow-sm active:scale-95 transition-all"><ChevronLeft className="h-5 w-5" /></Button>
                    <div className="px-4 py-1.5 rounded-full bg-muted/50 border border-border shadow-inner">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">{scrollIndex + 1} / {pulses.length}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={nextPulse} disabled={scrollIndex === pulses.length - 1} className="h-10 w-10 rounded-full border border-border shadow-sm active:scale-95 transition-all"><ChevronRight className="h-5 w-5" /></Button>
                </div>
            </div>

            <div className="relative h-[280px]">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activePulse.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full"
                    >
                        <Card className={cn(
                            "h-full rounded-[3rem] border-2 transition-all p-10 flex flex-col justify-between relative overflow-hidden",
                            isNominal ? "bg-green-500/[0.03] border-green-500/20" :
                            activePulse.variant === 'destructive' ? "bg-red-500/[0.03] border-red-500/20" :
                            activePulse.variant === 'warning' ? "bg-amber-500/[0.03] border-amber-500/20" :
                            activePulse.variant === 'success' ? "bg-green-500/[0.03] border-green-500/20" :
                            activePulse.variant === 'blue' ? "bg-blue-500/[0.03] border-blue-500/20" :
                            "bg-card border-border/40"
                        )}>
                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                {React.createElement(activePulse.icon, { className: "h-40 w-40" })}
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "p-5 rounded-[1.5rem] shadow-inner transition-colors", 
                                        isNominal ? "bg-green-600" : activePulse.color
                                    )}>
                                        {React.createElement(isNominal ? CheckCircle2 : activePulse.icon, { className: "h-8 w-8 text-white" })}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-3xl font-black uppercase text-foreground tracking-tighter leading-none">{activePulse.label}</h4>
                                        <p className="text-xs font-medium text-muted-foreground italic max-w-sm">{activePulse.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-6xl font-black tracking-tighter leading-none transition-colors",
                                        isNominal ? "text-green-600" :
                                        activePulse.variant === 'destructive' ? "text-red-600" :
                                        activePulse.variant === 'warning' ? "text-amber-600" :
                                        activePulse.variant === 'success' ? "text-green-600" :
                                        activePulse.variant === 'blue' ? "text-blue-600" :
                                        "text-foreground"
                                    )}>
                                        {activePulse.count}
                                    </span>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground opacity-40 mt-2">Active Pulses</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-10 border-t border-dashed border-border/40 relative z-10">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={cn(
                                        "h-8 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest",
                                        isNominal ? "border-green-500/20 bg-green-500/5 text-green-600" : "border-border/40 bg-muted/20"
                                    )}>
                                        {isNominal ? 'FIDELITY NOMINAL' : `DIAGNOSTIC PULSE: ${activePulse.token}`}
                                    </Badge>
                                </div>
                                <Button 
                                    onClick={() => navigateTo(activePulse.token)}
                                    disabled={isNominal}
                                    className={cn(
                                        "h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 gap-3",
                                        isNominal ? "bg-muted text-muted-foreground opacity-40 cursor-not-allowed" :
                                        activePulse.variant === 'destructive' ? "bg-red-600 text-white shadow-red-600/20" :
                                        activePulse.variant === 'warning' ? "bg-amber-600 text-white shadow-amber-600/20" :
                                        activePulse.variant === 'success' ? "bg-green-600 text-white shadow-green-600/20" :
                                        activePulse.variant === 'blue' ? "bg-blue-600 text-white shadow-blue-600/20" :
                                        "bg-primary text-black shadow-primary/20"
                                    )}
                                >
                                    {isNominal ? 'Audit Complete' : 'Inspect Sub-Registry'} 
                                    {!isNominal && <ArrowRight className="h-4 w-4" />}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
