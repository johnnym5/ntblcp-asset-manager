'use client';

/**
 * @fileOverview WelcomeExperience - High-Fidelity Onboarding Workflow.
 * Guides new users through the app's purpose and superior data structure.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ShieldCheck, 
  Database, 
  CloudOff, 
  FileText, 
  Search, 
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  BarChart3,
  Smartphone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
  icon: any;
  benefits: string[];
}

const STEPS: Step[] = [
  {
    title: "Welcome to Assetain",
    description: "Assetain is a professional alternative to messy Excel files and manual registers. We've built a structured environment to help you manage regional assets with absolute confidence.",
    icon: Zap,
    benefits: [
      "Zero data loss with Offline-First sync",
      "Strict data structure (No more typing errors)",
      "High-speed searching and filtering",
      "Full audit trail for every change"
    ]
  },
  {
    title: "The Structured Advantage",
    description: "Unlike a flat spreadsheet, Assetain understands the hierarchy of your data. We preserve the document, section, and subsection context of every record.",
    icon: LayoutGrid,
    benefits: [
      "Segment by State, LGA, or Facility",
      "Custom table layouts for different assets",
      "Visual color-coding by data source",
      "Preserved source metadata (Row & Sheet info)"
    ]
  },
  {
    title: "Verified in the Field",
    description: "Our mobile-first design is optimized for auditors on the move. Verify assets with a single tap, even when you have no internet connectivity.",
    icon: Smartphone,
    benefits: [
      "One-tap verification status",
      "Visual proof (Photo evidence) support",
      "Automatic sync when internet returns",
      "Conflict-protected data entry"
    ]
  }
];

interface WelcomeExperienceProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WelcomeExperience({ isOpen, onComplete }: WelcomeExperienceProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onComplete()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-background">
        <div className="flex flex-col h-[550px]">
          {/* Header Pulse */}
          <div className="p-10 pb-6 bg-primary/5 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                <Zap className="h-6 w-6 text-white fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter uppercase leading-none">Assetain</span>
                <span className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1">Onboarding Pulse</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === currentStep ? "w-8 bg-primary" : "w-1.5 bg-primary/20"
                  )} 
                />
              ))}
            </div>
          </div>

          {/* Content Surface */}
          <div className="flex-1 p-10 flex flex-col justify-center text-center sm:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="p-6 bg-primary/10 rounded-[2rem] shrink-0">
                    <step.icon className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight uppercase text-foreground">{step.title}</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {step.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-tight opacity-70">{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Control */}
          <div className="p-10 pt-0 flex items-center justify-between">
            <Button variant="ghost" onClick={onComplete} className="font-bold text-xs uppercase opacity-40 hover:opacity-100">
              Skip Guide
            </Button>
            <Button 
              onClick={handleNext} 
              className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 transition-transform hover:scale-105 active:scale-95"
            >
              {currentStep === STEPS.length - 1 ? 'Start Working' : 'Next Insight'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
