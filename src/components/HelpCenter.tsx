'use client';

/**
 * @fileOverview HelpCenter - High-Fidelity Pop-up Guidance.
 * Converted from Sheet to Dialog for workstation focus.
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
  X
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

const GLOSSARY = [
  { term: "Registry", definition: "The central structured database of all assets." },
  { term: "Discrepancy", definition: "A mismatch detected between physical assessment and recorded data." },
  { term: "Synchronize", definition: "The process of matching local changes with the cloud server." },
  { term: "Regional Scope", definition: "The specific geographical area (State or Zone) an auditor is authorized to view." },
  { term: "Asset Hub", definition: "The primary workspace for browsing and managing folders." }
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
  },
  {
    id: 'sync',
    title: 'Pending Changes',
    icon: Cloud,
    whatItDoes: "Manage changes waiting to be broadcast to the cloud database.",
    whenToUse: "Check this when you have been working offline or want to review your sync queue.",
    howToUse: [
      "View the list of pending updates grouped by type.",
      "The system handles sync sequential integrity automatically.",
      "You can manually retry failed sync pulses if needed."
    ],
    tips: [
      "A green indicator in the header means you are connected.",
      "Zero data loss is guaranteed by our local-first persistence."
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
  const [showGlossary, setShowGlossary] = useState(false);

  const filteredTopics = TOPICS.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.whatItDoes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdvanced = appSettings?.uxMode === 'advanced';

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
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70 mt-1">
              Operational Guidance & Troubleshooting
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search help topics..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-10">
            {selectedTopic ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <Button variant="ghost" onClick={() => setSelectedTopic(null)} className="p-0 h-auto font-black uppercase text-[10px] text-primary hover:bg-transparent transition-all">
                  <ChevronRight className="h-3 w-3 rotate-180 mr-2" /> Back to Support Topics
                </Button>
                
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                      <selectedTopic.icon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight">{selectedTopic.title}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Purpose</h4>
                        <p className="text-sm font-medium text-foreground italic leading-relaxed">{selectedTopic.whatItDoes}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Usage Context</h4>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{selectedTopic.whenToUse}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Instructions</h4>
                      <div className="space-y-2">
                        {selectedTopic.howToUse.map((step, i) => (
                          <div key={i} className="flex gap-3 text-xs font-bold p-4 rounded-2xl bg-muted/20">
                            <span className="text-primary opacity-40">{i+1}</span>
                            <span className="leading-tight uppercase">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60 px-1">Learning Paths</h4>
                  <div className="space-y-3">
                    {filteredTopics.map(topic => (
                      <button 
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        className="w-full text-left p-6 rounded-[2rem] border-2 border-border/40 hover:border-primary/20 bg-card transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                            <topic.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <span className="text-sm font-black uppercase text-white tracking-tight">{topic.title}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                      <Keyboard className="h-3.5 w-3.5" /> Rapid Controls
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['⌘K Search', 'D Dashboard', 'R Hub', 'S Sync'].map(key => (
                        <div key={key} className="p-4 rounded-xl bg-muted/20 border border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-white/40">{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Glossary</h4>
                    <div className="space-y-2">
                      {GLOSSARY.slice(0, 3).map(g => (
                        <div key={g.term} className="p-4 rounded-xl bg-[#0A0A0A] border border-white/5">
                          <h5 className="text-[10px] font-black uppercase text-primary mb-1">{g.term}</h5>
                          <p className="text-[9px] font-medium text-white/40 italic">{g.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/10 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            System Guide v5.0.4
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}