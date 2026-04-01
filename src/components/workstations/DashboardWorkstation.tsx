'use client';

/**
 * @fileOverview DashboardWorkstation - The Unified Inventory Overview.
 * Phase 131: Renamed naming scheme to be asset manager friendly.
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
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAppState } from '@/contexts/app-state-context';
import { AssetSummaryDashboard } from '@/components/asset-summary-dashboard';
import { RegistryWorkstation } from './RegistryWorkstation';
import { AssetFilterSheet } from '@/components/asset-filter-sheet';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function DashboardWorkstation() {
  const { 
    assets, 
    isOnline, 
    appSettings, 
    activeGrantId, 
    setActiveGrantId, 
    searchTerm, 
    setSearchTerm,
    headers,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedLocations,
    selectedAssignees,
    selectedStatuses,
    selectedConditions,
    missingFieldFilter,
    setSelectedLocations,
    setSelectedAssignees,
    setSelectedStatuses,
    setSelectedConditions,
    setMissingFieldFilter
  } = useAppState();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const stats = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    const total = assets.length;
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    
    // Temporal Breakdown
    const temporalData: Record<string | number, number> = {};
    assets.forEach(a => {
      const year = a.yearBucket || 'Legacy';
      temporalData[year] = (temporalData[year] || 0) + 1;
    });

    const temporalSummary = Object.entries(temporalData)
      .map(([year, count]) => ({ year, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => String(b.year).localeCompare(String(a.year)));

    return { 
      total, 
      temporalSummary, 
      coverage: total > 0 ? Math.round((verified / total) * 100) : 0
    };
  }, [assets]);

  const activeGrant = appSettings?.grants?.find(g => g.id === activeGrantId);
  const otherGrants = appSettings?.grants?.filter(g => g.id !== activeGrantId) || [];

  // Derived Filter Options with Counts
  const locationOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      const loc = a.location || 'Global';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      if (a.custodian) {
        counts[a.custodian] = (counts[a.custodian] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      if (a.condition) {
        counts[a.condition] = (counts[a.condition] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const statusOptions = [
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Unverified', value: 'UNVERIFIED' },
    { label: 'Discrepancy', value: 'DISCREPANCY' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* 1. Project Context Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none text-foreground">Inventory Dashboard</h2>
            {appSettings?.grants && appSettings.grants.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl border-2 border-primary/10 bg-card gap-2 hover:bg-primary/5 transition-all group">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Select Project</span>
                    <ChevronDown className="h-3 w-3 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl border-2 shadow-2xl p-2 mt-2">
                  <DropdownMenuItem className="rounded-xl h-12 bg-primary/5 text-primary mb-1">
                    <span className="font-black text-[11px] uppercase truncate">{activeGrant?.name}</span>
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {otherGrants.map(grant => (
                    <DropdownMenuItem key={grant.id} onClick={() => setActiveGrantId(grant.id)} className="rounded-xl h-12 cursor-pointer hover:bg-muted">
                      <span className="font-bold text-[11px] uppercase truncate">{grant.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge className="bg-primary/5 border-2 border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest px-4 h-7 rounded-full shadow-sm">
              {activeGrant?.name || 'Active Project Scope'}
            </Badge>
            <Badge variant="outline" className={cn("font-black uppercase text-[9px] tracking-widest px-4 h-7 rounded-full border-2", isOnline ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200")}>
              {isOnline ? <Globe className="mr-2 h-3 w-3 inline" /> : <Database className="mr-2 h-3 w-3 inline" />}
              {isOnline ? 'CLOUD CONNECTED' : 'LOCAL OFFLINE DATA'}
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Global Search & Action Bar */}
      <div className="px-1">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
          <Input 
            placeholder="Search Inventory..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 sm:h-16 pl-14 pr-32 sm:pr-40 rounded-2xl bg-card border-none text-sm font-medium shadow-2xl focus-visible:ring-primary/20 text-foreground"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 text-muted-foreground hover:text-primary rounded-xl" title="Sort Inventory"><ArrowUpDown className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)} className="h-10 w-10 text-muted-foreground hover:text-primary rounded-xl relative" title="Inventory Filters">
              <Filter className="h-5 w-5" />
              {(selectedStatuses.length + selectedConditions.length) > 0 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse shadow-lg" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Interactive Analytics */}
      <AssetSummaryDashboard />

      {/* 4. Global Inventory Register */}
      <div className="p-1 sm:p-2 rounded-[2.5rem] bg-muted/10 border-2 border-dashed border-border/40 min-h-[600px]">
        <RegistryWorkstation />
      </div>

      {/* 5. Temporal Audit Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card className="rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
            <CardHeader className="p-8 bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <HistoryIcon className="h-4 w-4" /> Acquisition Year Breakdown
                  </CardTitle>
                  <p className="text-[9px] font-medium text-muted-foreground italic">Asset distribution by procurement period.</p>
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-black uppercase h-7 px-4 rounded-full">Data Status: Validated</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {stats?.temporalSummary.slice(0, 4).map((item) => (
                  <div key={item.year} className="space-y-4 p-6 rounded-[2rem] bg-background/50 border-2 border-border/40 shadow-inner group hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">{item.year} Register</span>
                      <span className="text-[10px] font-mono text-primary font-bold">{item.percent}%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-foreground">{item.count}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Assets Counted</p>
                    </div>
                    <Progress value={item.percent} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logic Panels */}
      <AssetFilterSheet 
        isOpen={isFilterOpen} 
        onOpenChange={setIsFilterOpen} 
        locationOptions={locationOptions} 
        selectedLocations={selectedLocations} 
        setSelectedLocations={setSelectedLocations} 
        assigneeOptions={assigneeOptions} 
        selectedAssignees={selectedAssignees} 
        setSelectedAssignees={setSelectedAssignees} 
        statusOptions={statusOptions} 
        selectedStatuses={selectedStatuses} 
        setSelectedStatuses={setSelectedStatuses} 
        conditionOptions={conditionOptions} 
        selectedConditions={selectedConditions} 
        setSelectedConditions={setSelectedConditions} 
        missingFieldFilter={missingFieldFilter} 
        setMissingFieldFilter={setMissingFieldFilter} 
      />
      <SortDrawer 
        isOpen={isSortOpen} 
        onOpenChange={setIsSortOpen} 
        headers={headers} 
        sortBy={sortKey} 
        sortDirection={sortDir} 
        onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} 
      />

    </div>
  );
}
