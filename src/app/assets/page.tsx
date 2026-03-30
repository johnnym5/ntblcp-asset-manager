
'use client';

import React, { useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Boxes } from 'lucide-react';
import { RegistryTable } from '@/modules/registry/components/RegistryTable';
import type { Asset } from '@/types/domain';

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm } = useAppState();

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      (a.name || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term) ||
      (a.serialNumber || '').toLowerCase().includes(term) ||
      (a.assetIdCode || '').toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search registry by ID, serial, or name..." 
              className="pl-10 h-12 rounded-2xl bg-card border-none shadow-sm font-medium text-sm focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm hover:bg-primary/5 transition-all">
              <Filter className="h-4 w-4 text-primary" /> Filter Engine
            </Button>
            <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
              <Plus className="h-4 w-4" /> New Registration
            </Button>
          </div>
        </div>

        {filteredAssets.length > 0 ? (
          <RegistryTable 
            assets={filteredAssets} 
            onInspect={(asset) => console.log("Inspecting:", asset)} 
          />
        ) : (
          <div className="flex-1 bg-card/50 rounded-3xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20">
            <div className="flex flex-col items-center gap-4 opacity-20">
              <div className="p-6 bg-muted rounded-full">
                <Boxes className="h-16 w-16" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-widest">Registry Silent</h3>
                <p className="text-sm font-medium max-w-xs">No asset pulses match the current query or the store is empty.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
