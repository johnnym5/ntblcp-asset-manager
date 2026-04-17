'use client';

/**
 * @fileOverview High-Density Pagination Controls.
 * Phase 15: Added selectable page sizes (25, 50, 100, All).
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Hash, Layers } from 'lucide-react';
import { Badge } from './ui/badge';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number | 'all';
  setItemsPerPage: (value: number | 'all') => void;
  totalItems: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  setItemsPerPage,
  totalItems,
}: PaginationControlsProps) {
  const startItem = itemsPerPage === 'all' ? 1 : totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = itemsPerPage === 'all' ? totalItems : Math.min(currentPage * (itemsPerPage as number), totalItems);

  const handleItemsPerPageChange = (value: string) => {
    if (value === 'all') {
      setItemsPerPage('all');
    } else {
      setItemsPerPage(Number(value));
    }
    onPageChange(1); // Reset to first page
  };

  return (
    <div className="flex flex-col sm:flex-row flex-1 items-center justify-between gap-6 py-2 px-1">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 whitespace-nowrap">Density</span>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[85px] h-9 rounded-xl bg-white/5 border-white/10 font-black text-[10px] uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/10 rounded-xl">
              <SelectItem value="25" className="text-[10px] font-black uppercase">25 Rows</SelectItem>
              <SelectItem value="50" className="text-[10px] font-black uppercase">50 Rows</SelectItem>
              <SelectItem value="100" className="text-[10px] font-black uppercase">100 Rows</SelectItem>
              <SelectItem value="all" className="text-[10px] font-black uppercase">Show All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] font-mono font-black text-primary">{startItem}-{endItem}</span>
            <span className="text-[8px] font-black uppercase text-white/20 tracking-tighter">of</span>
            <span className="text-[10px] font-mono font-black text-white/60">{totalItems}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || itemsPerPage === 'all'}
          className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 hover:bg-white/5 disabled:opacity-10 transition-all"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        
        <div className="flex items-center gap-1 px-4 h-10 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[9px] font-black uppercase text-white/40 mr-2">Page</span>
          <span className="text-sm font-black text-primary tabular-nums">{currentPage}</span>
          <span className="text-[9px] font-black uppercase text-white/20 mx-1">/</span>
          <span className="text-[10px] font-black text-white/40 tabular-nums">{itemsPerPage === 'all' ? 1 : totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || itemsPerPage === 'all'}
          className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 hover:bg-white/5 disabled:opacity-10 transition-all"
        >
          Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
