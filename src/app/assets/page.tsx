'use client';

import React from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, MoreHorizontal, Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm } = useAppState();

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      (a.name || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term) ||
      (a.serialNumber || '').toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search registry by ID, serial, or name..." 
              className="pl-10 h-12 rounded-2xl bg-card border-none shadow-sm font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm">
              <Filter className="h-4 w-4 text-primary" /> Filter Engine
            </Button>
            <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
              <Plus className="h-4 w-4" /> New Registration
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-card/50 rounded-3xl border border-border/40 overflow-hidden shadow-2xl flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identification</th>
                  <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hierarchy</th>
                  <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</th>
                  <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-primary/[0.02] transition-colors group cursor-pointer">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black tracking-tight">{asset.name || asset.description}</span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">SN: {asset.serialNumber || 'UNSET'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-tight">{asset.category}</span>
                          <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[120px]">{asset.section} > {asset.subsection}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary rounded-lg h-6">
                          {asset.location || 'Global'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                          asset.status === 'VERIFIED' ? "text-green-500" : "text-orange-500"
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", asset.status === 'VERIFIED' ? "bg-green-500" : "bg-orange-500 animate-pulse")} />
                          {asset.status}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl opacity-40 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-2 shadow-2xl">
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest py-3 cursor-pointer">Inspect Profile</DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest py-3 cursor-pointer">Edit Data</DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest py-3 cursor-pointer text-destructive focus:text-destructive">Delete Record</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Boxes className="h-12 w-12" />
                        <span className="text-sm font-black uppercase tracking-widest">Registry Empty</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-auto p-6 bg-muted/10 border-t border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Showing {filteredAssets.length} active records
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-none bg-card" disabled>Prev</Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-none bg-card" disabled>Next</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useMemo } from 'react';
