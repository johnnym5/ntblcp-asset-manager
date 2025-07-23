
'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
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
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    onPageChange(1); // Reset to first page when changing page size
  };

  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="hidden sm:inline">Rows per page</span>
        <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
          <SelectTrigger className="w-[70px] h-9">
            <SelectValue placeholder={itemsPerPage} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {startItem}-{endItem} of {totalItems}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="mr-2 hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
