
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SheetDefinition } from '@/lib/types';

interface SheetDefinitionFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (sheet: SheetDefinition) => void;
  sheet: SheetDefinition | null;
}

export function SheetDefinitionForm({ isOpen, onOpenChange, onSave, sheet }: SheetDefinitionFormProps) {
  const [name, setName] = useState('');
  const [headers, setHeaders] = useState('');

  useEffect(() => {
    if (sheet) {
      setName(sheet.name);
      setHeaders(sheet.headers.join(', '));
    } else {
      setName('');
      setHeaders('');
    }
  }, [sheet, isOpen]);

  const handleSave = () => {
    const headersArray = headers.split(',').map(h => h.trim()).filter(h => h);
    onSave({ name, headers: headersArray });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sheet ? 'Edit Sheet Definition' : 'Add New Sheet Definition'}</DialogTitle>
          <DialogDescription>
            Define the sheet name and the exact headers to look for during import.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-name">Sheet Name</Label>
            <Input id="sheet-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sheet-headers">Headers (comma-separated)</Label>
            <Textarea
              id="sheet-headers"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder="S/N, Asset Description, Serial Number, Location..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!name || !headers}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
