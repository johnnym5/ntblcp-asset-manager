'use client';

/**
 * @fileOverview HelpCenter - High-Fidelity Pop-up Guidance.
 * Added Field Dictionary section to explain Asset ID, Chassis vs Serial, etc.
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  BookOpen,
  ChevronRight,
  Database,
  FileUp,
  Cloud,
  ShieldCheck,
  Filter,
  AlertCircle,
  Keyboard,
  Info,
  Layers,
  X,
  Tag,
  Truck,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';
import { Badge } from './ui/badge';

interface HelpTopic {
  id: string;
  title: string;
  icon: any;
  whatItDoes: string;
  whenToUse: string;
  howToUse: string[];
  tips: string[];
}

const DICTIONARY = [
  { 
    term: "Asset ID Tag", 
    definition: "The unique alphanumeric code assigned by the program (NTBLCP) and printed on the physical sticker.", 
    example: "NTBLCP/TB/LAG/001",
    why: "It differs from Description (e.g., 'Toyota Hilux') because the Tag is unique to that specific physical unit, whereas Description describes the type of item."
  },
  { 
    term: "Serial Number", 
    definition: "The manufacturer's unique hardware identifier, usually for electronics.", 
    example: "ABC123456789",
    why: "Consumer electronics (Laptops, UPS) rely on serials. Vehicles do not use this; they use Chassis/Engine numbers instead."
  },
  { 
    term: "Chassis Number (VIN)", 
    definition: "The Vehicle Identification Number stamped onto the car or motorbike frame.", 
    example: "VIN-XXXX-XXXX",
    why: "For vehicles, the Chassis is the primary legal identity. A vehicle record often leaves Serial/Model blank in favor of Chassis/Engine."
  },
  { 
    term: "Engine Number", 
    definition: "The unique identifier stamped on the physical engine block.", 
    example: "E-12345-6789",
    why: "Unlike a Model Number (which describes the product line), the Engine Number is specific to that vehicle's motor."
  }
];

const TOPICS: HelpTopic[] = [
  {
    id: 'registry',
    title: 'Asset Hub',
    icon: Database,
    whatItDoes: "View and manage all your asset folders in one centralized location.",
    whenToUse: "Use the hub to scan your inventory, search for specific items, or check regional coverage.",
    howToUse: [
      "Search by ID, S/N, or description using the search bar.",
      "Switch between Folders and List views for better scanning.",
      "Tap any record to see its full profile and history."
    ],
    tips: [
      "Custom display names can be set in the 'Field Setup' pop-up.",
      "Hidden fields are always accessible in the detail profile."
    ]
  },
  {
    id: 'upload',
    title: 'Import Assets',
    icon: FileUp,
    whatItDoes: "Upload Excel workbooks and turn them into structured records.",
    whenToUse: "Use this when you have new spreadsheets to ingest or legacy registers to migrate.",
    howToUse: [
      "Choose an Excel file from your computer.",
      "Review the detected blocks and folders in the Scanner.",
      "Click 'Add to Registry' to finalize the ingestion."
    ],
    tips: [
      "The system detects document structure automatically using Column A.",
      "Imports are isolated first for safety."
    ]
  }
];

interface HelpCenterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenter({ isOpen, onOpenChange }: HelpCenterProps) {
  const { appSettings } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [showDictionary, setShowDictionary] = useState(false);

  const filteredDictionary = DICTIONARY.filter(d => 
    d.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 border-none rounded-[2.5rem] shadow-3xl bg-background overflow-hidden flex flex-col">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BookOpen className="text-primary h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Support Hub</DialogTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl text-white/40"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex gap-4 mt-2">
              <button onClick={() => setShowDictionary(false)} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", !showDictionary ? "text-primary" : "text-white/20 hover:text-white")}>Tutorials</button>
              <div className="w-px h-3 bg-white/10" />
              <button onClick={() => setShowDictionary(true)} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", showDictionary ? "text-primary" : "text-white/20 hover:text-white")}>Field Dictionary</button>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder={showDictionary ? "Search terminology..." : "Search topics..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-10">
            {showDictionary ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                {filteredDictionary.map(item => (
                  <div key={item.term} className="p-6 rounded-[2rem] border-2 border-border/40 bg-card/50 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl"><Tag className="h-4 w-4 text-primary" /></div>
                      <h4 className="text-lg font-black uppercase tracking-tight">{item.term}</h4>
                    </div>
                    <div className="space-y-3 pl-1">
                      <p className="text-sm font-medium text-foreground italic leading-relaxed">"{item.definition}"</p>
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                        <Zap className="h-3 w-3 fill-current" /> Example: {item.example}
                      </div>
                      <div className="pt-3 border-t border-dashed border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                          <span className="text-foreground">Context:</span> {item.why}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Tutorial Content (Previously existed) */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60 px-1">Operational Guides</h4>
                  {TOPICS.map(topic => (
                    <button key={topic.id} onClick={() => setSelectedTopic(topic)} className="w-full text-left p-6 rounded-[2rem] border-2 border-border/40 hover:border-primary/20 bg-card transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors"><topic.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" /></div>
                        <span className="text-sm font-black uppercase text-white tracking-tight">{topic.title}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/10 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            System Intelligence v5.0.4
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
