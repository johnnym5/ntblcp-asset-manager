'use client';

/**
 * @fileOverview HelpCenter - Contextual Guidance & Support Hub.
 * Phase 34: Expanded Glossary and Keyboard Shortcut Guide.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  Command,
  Keyboard,
  Info,
  Layers,
  ArrowRightLeft
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
  { term: "Sync Pulse", definition: "The process of matching local changes with the cloud server." },
  { term: "Regional Scope", definition: "The specific geographical area (State or Zone) an auditor is authorized to view." },
  { term: "Mutation", definition: "Any action that creates, updates, or deletes a record." },
  { term: "Sandbox", definition: "A safe staging area for reviewing imports before they join the main registry." }
];

const TOPICS: HelpTopic[] = [
  {
    id: 'registry',
    title: 'Asset Registry',
    icon: Database,
    whatItDoes: "View and manage all your asset records in one centralized location.",
    whenToUse: "Use the registry to scan your inventory, search for specific items, or check technical specifications.",
    howToUse: [
      "Search by ID, S/N, or description using the search bar.",
      "Switch between Grid and List views for better scanning.",
      "Tap any record to see its full profile and history."
    ],
    tips: [
      "Custom display names can be set in the 'Field Setup' drawer.",
      "Hidden fields are always accessible in the detail view."
    ]
  },
  {
    id: 'upload',
    title: 'Uploading Records',
    icon: FileUp,
    whatItDoes: "Upload existing Excel files and turn them into structured records.",
    whenToUse: "Use this when you have new spreadsheets to ingest or legacy registers to migrate.",
    howToUse: [
      "Choose an Excel file from your computer.",
      "Review the detected headings and sections in the Sandbox.",
      "Click 'Merge to Registry' to finalize the import."
    ],
    tips: [
      "The system detects document hierarchy (sections/subsections) automatically.",
      "Imports are isolated in the Sandbox so you can review them safely."
    ]
  },
  {
    id: 'sync',
    title: 'Pending Sync',
    icon: Cloud,
    whatItDoes: "Manage changes that are waiting to be sent to the cloud database.",
    whenToUse: "Check this when you have been working offline or want to see the status of your background updates.",
    howToUse: [
      "View the list of pending modifications in the sidebar.",
      "The system syncs automatically when your connection returns.",
      "You can manually retry failed sync pulses if needed."
    ],
    tips: [
      "A green cloud indicator means you are connected and up-to-date.",
      "Zero data loss is guaranteed by our local encryption engine."
    ]
  },
  {
    id: 'review',
    title: 'Records to Review',
    icon: ShieldCheck,
    whatItDoes: "Check that records match real-world assets during physical field audits.",
    whenToUse: "Use this screen when conducting on-site inspections or equipment health checks.",
    howToUse: [
      "Scan the tag ID of the physical asset.",
      "Compare the real item to the record on your screen.",
      "Use the quick-action triggers to mark as 'Verified' or 'Discrepancy'."
    ],
    tips: [
      "One-tap verification is optimized for auditors on the move.",
      "Discrepancies are flagged for immediate management review."
    ]
  },
  {
    id: 'filters',
    title: 'Filtering Records',
    icon: Filter,
    whatItDoes: "Show only the records you need by narrowing the list.",
    whenToUse: "Use filters when the list is too long or you want to focus on a specific group.",
    howToUse: [
      "Open the filter panel.",
      "Choose one or more fields (like State or Condition).",
      "Apply the filter to update the view.",
      "Clear individual chips or 'Purge' to see all records again."
    ],
    tips: [
      "You can combine multiple filters for precision queries.",
      "Filter by source sheet color to separate different project batches."
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden flex flex-col">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BookOpen className="text-primary h-6 w-6" />
              </div>
              <SheetTitle className="text-2xl font-black tracking-tight uppercase">Support Hub</SheetTitle>
            </div>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Guidance, Troubleshooting & Feature Insights
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-8 py-6 bg-muted/5 border-b">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search help pulse..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-8 space-y-10">
            {selectedTopic ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button variant="ghost" onClick={() => setSelectedTopic(null)} className="p-0 h-auto font-black uppercase text-[10px] text-primary hover:bg-transparent transition-all hover:translate-x-[-4px]">
                  <ChevronRight className="h-3 w-3 rotate-180 mr-2" /> Back to Support Topics
                </Button>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                      <selectedTopic.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedTopic.title}</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">What this does</h4>
                      <p className="text-sm font-medium text-foreground leading-relaxed italic">{selectedTopic.whatItDoes}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">When to use it</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">{selectedTopic.whenToUse}</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">How to use it</h4>
                      <div className="space-y-2">
                        {selectedTopic.howToUse.map((step, i) => (
                          <div key={i} className="flex gap-3 text-sm font-medium p-3 rounded-xl bg-muted/30 border border-transparent">
                            <span className="text-primary font-black opacity-40">{i+1}</span>
                            <span className="leading-tight">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedTopic.tips.length > 0 && (
                      <div className="p-5 rounded-[1.5rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Pro Tips</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {selectedTopic.tips.map((tip, i) => (
                            <li key={i} className="text-[11px] font-bold text-muted-foreground leading-relaxed">- {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : showGlossary ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button variant="ghost" onClick={() => setShowGlossary(false)} className="p-0 h-auto font-black uppercase text-[10px] text-primary hover:bg-transparent transition-all hover:translate-x-[-4px]">
                  <ChevronRight className="h-3 w-3 rotate-180 mr-2" /> Back to Support Topics
                </Button>
                <div className="space-y-6">
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Glossary of Terms</h3>
                  <div className="space-y-4">
                    {GLOSSARY.map((item, i) => (
                      <div key={i} className="p-5 rounded-2xl border-2 border-border/40 bg-card">
                        <h4 className="text-xs font-black uppercase text-primary mb-1">{item.term}</h4>
                        <p className="text-xs font-medium text-muted-foreground italic leading-relaxed">{item.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isAdvanced && (
                  <div className="space-y-4 animate-in zoom-in-95 duration-500">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                      <Keyboard className="h-3.5 w-3.5" /> Fast Work Shortcuts
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase opacity-60">Dashboard</span>
                        <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">D</Badge>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase opacity-60">Registry</span>
                        <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">R</Badge>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase opacity-60">Search</span>
                        <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">⌘K</Badge>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase opacity-60">Sync Pulse</span>
                        <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">S</Badge>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60 px-1">Knowledge Modules</h4>
                  {filteredTopics.map(topic => (
                    <button 
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className="w-full text-left p-5 rounded-3xl border-2 border-border/40 hover:border-primary/20 bg-card transition-all group flex items-center justify-between shadow-sm active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/10 transition-colors shadow-inner">
                          <topic.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black uppercase tracking-tight">{topic.title}</span>
                          <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-tight line-clamp-1">{topic.whatItDoes}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => setShowGlossary(true)}
                    className="w-full text-left p-5 rounded-3xl border-2 border-dashed border-border/40 hover:border-primary/20 bg-card transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/10 transition-colors">
                        <Info className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase tracking-tight">Glossary of Terms</span>
                        <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-tight">Plain-English Definitions</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/10 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            Registry Intelligence Pulse v5.0.4
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
