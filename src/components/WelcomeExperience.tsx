'use client';

/**
 * @fileOverview WelcomeExperience - Plain English Onboarding.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Cloud,
  Settings,
  Download,
  Loader2,
  Database,
  ShieldCheck,
  LayoutGrid,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';

interface Step {
  title: string;
  description: string;
  icon: any;
  benefits: string[];
  isSyncStep?: boolean;
}

const STEPS: Step[] = [
  {
    title: "Home Hub v5",
    description: "Welcome. Assetain is your central hub for managing Nigerian asset registers.",
    icon: Zap,
    benefits: [
      "Custom Folder Setup",
      "Activity History (Hold bell icon)",
      "Simple Mobile Layout",
      "High-Density Desktop View"
    ]
  },
  {
    title: "Works Offline",
    description: "Your work is saved locally even without internet. Updates are saved to your device first.",
    icon: Cloud,
    benefits: [
      "Smart Sync Control",
      "Manual Save (Hold sync icon)",
      "Zero Data Loss",
      "Assigned State View"
    ]
  },
  {
    title: "Get Your List",
    description: "While we download your asset list, review the new tools available for this project.",
    icon: Database,
    isSyncStep: true,
    benefits: [
      "Approval Workflow",
      "Automatic Header Setup",
      "Error Detection",
      "Location Mapping"
    ]
  },
  {
    title: "Ready To Start",
    description: "Your session is ready. Access extra tools by holding the 'Update Status' badge on the dashboard.",
    icon: ShieldCheck,
    benefits: [
      "Edit Field Labels",
      "Manage Local Stores",
      "Automatic Word Reports",
      "Data Quality Checks"
    ]
  }
];

interface WelcomeExperienceProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WelcomeExperience({ isOpen, onComplete }: WelcomeExperienceProps) {
  const { manualDownload, isSyncing, assets } = useAppState();
  const { userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleNext = async () => {
    const step = STEPS[currentStep];
    if (step.isSyncStep && !hasDownloaded) {
      await manualDownload();
      setHasDownloaded(true);
      return;
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = STEPS[currentStep];
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onComplete()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-background">
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div className="p-10 pb-6 bg-primary/5 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                <Zap className="h-6 w-6 text-black fill-current" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-black tracking-tighter uppercase leading-none">Initialize Hub</DialogTitle>
                <DialogDescription className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1.5">Step {currentStep + 1} of {STEPS.length}</DialogDescription>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === currentStep ? "w-8 bg-primary" : "w-1.5 bg-primary/20")} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-10 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) handleNext();
                  else if (swipe > swipeConfidenceThreshold) handlePrev();
                }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                  <div className="p-8 bg-muted/30 rounded-[2.5rem] shrink-0 shadow-inner relative">
                    <step.icon className={cn("h-14 w-14 text-primary", isSyncing && "animate-pulse")} />
                    {isSyncing && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" /></div>}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase text-foreground leading-tight">{step.title}</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">{step.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {step.isSyncStep && hasDownloaded ? (
                    <div className="col-span-2 p-6 rounded-3xl bg-green-500/10 border-2 border-green-500/20 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                      <div className="p-3 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20"><CheckCircle2 className="h-8 w-8 text-black" /></div>
                      <div className="text-center">
                        <p className="text-sm font-black uppercase text-green-600">Assets Loaded</p>
                        <p className="text-[10px] font-bold text-green-600/60 uppercase mt-1">{assets.length} Records found for {userProfile?.state}</p>
                      </div>
                    </div>
                  ) : (
                    step.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-tight opacity-70 leading-tight">{benefit}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-10 pt-0 flex items-center justify-between">
            <Button variant="ghost" onClick={onComplete} className="font-bold text-xs uppercase opacity-40 hover:opacity-100 h-12 rounded-xl">Skip</Button>
            <div className="flex items-center gap-3">
              {currentStep > 0 && <Button variant="outline" onClick={handlePrev} disabled={isSyncing} className="h-14 px-6 rounded-2xl font-black uppercase text-xs border-2">Back</Button>}
              <Button onClick={handleNext} disabled={isSyncing} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3">
                {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Fetching Data...</> : step.isSyncStep && !hasDownloaded ? <><Database className="h-4 w-4" /> Download Records</> : currentStep === STEPS.length - 1 ? 'Start Using App' : <>Next Step <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
