'use client';

/**
 * @fileOverview Inventory Pulse - Wide High-Fidelity Telemetry Bar.
 * Phase 165: Hardened naming scheme sub-labels.
 */

import React, { useMemo, useState } from 'react';
import { 
    BarChart2,
    ChevronDown,
    Activity,
    ChevronsUpDown
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function AssetSummaryDashboard() {
    const { assets } = useAppState();
    const [activeTab, setActiveTab] = useState<'stats' | 'insights'>('stats');

    return (
        <div className='flex flex-col sm:flex-row items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-md mb-6 hover:bg-white/[0.05] transition-all group relative overflow-hidden'>
            <div className="flex items-center gap-5 z-10">
                <div className="p-3 bg-primary/10 rounded-xl shadow-inner">
                    <BarChart2 className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-base font-black tracking-tight text-white uppercase leading-none">Inventory Pulse</h3>
                    <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest leading-none">
                        Real-time status of the Asset Register
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6 mt-4 sm:mt-0 z-10">
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
                        Registry Insights
                    </button>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <ChevronsUpDown className="h-4 w-4 text-white/20" />
                </div>
            </div>
        </div>
    );
}
