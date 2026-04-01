'use client';

/**
 * @fileOverview DashboardWorkstation - The Unified Inventory Overview.
 * Phase 165: Renamed to Inventory Dashboard.
 */

import React, { useMemo, useState } from 'react';
import { 
  Globe,
  CheckCircle2,
  FolderKanban,
  ChevronDown,
  History as HistoryIcon,
  Database,
  Search,
  ArrowUpDown,
  Filter,
  Map as MapIcon,
  Package,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { cn } from '@/lib/utils';

export function DashboardWorkstation() {
  const { 
    assets, 
    searchTerm, 
    setSearchTerm,
  } = useAppState();
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      
      {/* 1. Global Search */}
      <div className="px-1">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-all" />
          <Input 
            placeholder="Search serials, descriptions, or locations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-12 pr-24 rounded-xl bg-white/[0.03] border-white/5 text-sm font-medium focus-visible:ring-primary/20 text-white placeholder:text-white/20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <button className="text-white/40 hover:text-white transition-colors"><ArrowUpDown className="h-4 w-4" /></button>
            <button className="text-white/40 hover:text-white transition-colors"><Filter className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* 2. Inventory Pulse Bar */}
      <AssetSummaryDashboard />

      {/* 3. Categories & Inventories Registry */}
      <RegistryWorkstation />

    </div>
  );
}
