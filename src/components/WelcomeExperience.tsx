'use client';

/**
 * @fileOverview WelcomeExperience - High-Fidelity Onboarding Workflow.
 * Guides new users through the app's purpose and superior data structure.
 * Phase 750: Integrated Initial Download Pulse for new accounts.
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
  LayoutGrid, 
  Smartphone, 
  ArrowRight,
  CheckCircle2,
  FileUp,
  Search,
  ShieldCheck,
  Cloud,
  Settings,
  Download,
  Loader2,
  Database
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
    title: "Work anywhere, anytime",
    description: "You can continue working even without internet. Your changes are saved locally and synced when you're back online.",
    icon: Cloud,
    benefits: [
      "100% offline functionality",
      "Automatic background syncing",
      "Conflict resolution triggers",
      "Pending sync visibility"
    ]
  },
  {
    title: "Initialize Your Register",
    description: "Your account is active. To begin, the system will download the latest assets assigned to your regional scope from the central cloud database.",
    icon: Download,
    isSyncStep: true,
    benefits: [
      "Fetch latest assigned records",
      "Sync regional governance rules",
      "Load project sheet definitions",
      "Validate local storage parity"
    ]
  },
  {
    title: "Ready to Start",
    description: "You can change how records appear, how imports behave, and how help is shown in the settings panel.",
    icon: Settings,
    benefits: [
      "Customize field visibility",
      "Define regional authorized scopes",
      "Manage system access levels",
      "Export formatted reports"
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
        <div className="flex flex-col h-[580px]">
          {/* Header Pulse */}
          <div className="p-10 pb-6 bg-primary/5 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                <Zap className="h-6 w-6 text-white fill-current" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-black tracking-tighter uppercase leading-none">Assetain</DialogTitle>
                <DialogDescription className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1">Tour Pulse {currentStep + 1} of {STEPS.length}</DialogDescription>
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
          <div className="flex-1 p-10 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                  <div className="p-8 bg-primary/10 rounded-[2.5rem] shrink-0 shadow-inner relative">
                    <step.icon className={cn("h-14 w-14 text-primary", isSyncing && "animate-pulse")} />
                    {isSyncing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tight uppercase text-foreground leading-tight">{step.title}</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {step.isSyncStep && hasDownloaded ? (
                    <div className="col-span-2 p-6 rounded-3xl bg-green-500/10 border-2 border-green-500/20 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                      <div className="p-3 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20">
                        <CheckCircle2 className="h-8 w-8 text-black" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black uppercase text-green-600">Register Initialized</p>
                        <p className="text-[10px] font-bold text-green-600/60 uppercase mt-1">{assets.length} Records Downloaded for {userProfile?.state}</p>
                      </div>
                    </div>
                  ) : (
                    step.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-tight opacity-70 leading-tight">{benefit}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Control */}
          <div className="p-10 pt-0 flex items-center justify-between">
            <Button variant="ghost" onClick={onComplete} className="font-bold text-xs uppercase opacity-40 hover:opacity-100 h-12 rounded-xl">
              Skip Tour
            </Button>
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={isSyncing} className="h-14 px-6 rounded-2xl font-black uppercase text-xs border-2">
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={isSyncing}
                className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 transition-transform hover:scale-105 active:scale-95"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing Pulse...
                  </>
                ) : step.isSyncStep && !hasDownloaded ? (
                  <>
                    <Database className="h-4 w-4" />
                    Download Registry
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  'Start Working'
                ) : (
                  <>
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
