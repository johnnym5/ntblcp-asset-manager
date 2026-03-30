'use client';

/**
 * @fileOverview HelpCenter - Contextual Guidance & Support Drawer.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  HelpCircle, 
  FileText, 
  Database, 
  Cloud, 
  Filter, 
  ArrowUpDown, 
  ShieldCheck,
  ChevronRight,
  Info,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon: any;
  content: string;
}

const TOPICS: HelpTopic[] = [
  {
    id: 'registry',
    title: 'Asset Registry',
    description: 'View and manage all records in one place.',
    icon: Database,
    content: "The Asset Registry is your primary workspace. Use the search bar to find records by ID or S/N. The 'View Mode' toggle allows you to switch between card and row layouts. You can also customize which fields are visible using the 'Field Setup' drawer."
  },
  {
    id: 'upload',
    title: 'Uploading Records',
    description: 'Turn spreadsheets into structured data.',
    icon: FileText,
    content: "The Upload Center uses a deterministic analyzer to process Excel files. Every import is first placed in a 'Sandbox' for your review. This ensures that hierarchical data like sections and subsections are correctly identified before they hit the main registry."
  },
  {
    id: 'sync',
    title: 'Offline & Cloud Sync',
    description: 'Working without internet connectivity.',
    icon: Cloud,
    content: "Assetain is Offline-First. Every change you make is saved locally to your device immediately. When you're back online, the 'Pending Sync' queue automatically replays these changes to the cloud. You can also trigger a manual 'Pulse Reconciliation' from the sidebar."
  },
  {
    id: 'review',
    title: 'Records to Review',
    description: 'Checking physical matches in the field.',
    icon: ShieldCheck,
    content: "Field auditors use the 'Records to Review' screen to perform physical audits. Each card has quick assessment triggers. Once verified, records move out of the queue. Discrepancies are flagged for management review."
  }
];

interface HelpCenterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenter({ isOpen, onOpenChange }: HelpCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  const filteredTopics = TOPICS.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              placeholder="Search help by keyword..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background border-none shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-8 space-y-6">
            {selectedTopic ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button variant="ghost" onClick={() => setSelectedTopic(null)} className="p-0 h-auto font-black uppercase text-[10px] text-primary hover:bg-transparent">
                  <ChevronRight className="h-3 w-3 rotate-180 mr-2" /> Back to Topics
                </Button>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <selectedTopic.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedTopic.title}</h3>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTopic.content}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTopics.map(topic => (
                  <button 
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className="w-full text-left p-5 rounded-3xl border-2 border-border/40 hover:border-primary/20 bg-card transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/10 transition-colors">
                        <topic.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase tracking-tight">{topic.title}</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">{topic.description}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/10 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            Professional Registry Intelligence v5.0.2
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
