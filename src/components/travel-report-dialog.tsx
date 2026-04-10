"use client";

/**
 * @fileOverview TravelReportDialog - High-Fidelity Word Document Generator.
 * Phase 46: Consolidated modes and added automated statistical tables per category.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { ScrollArea } from './ui/scroll-area';
import { PlaneTakeoff, Info, FileText, Check, Loader2, FileWarning } from 'lucide-react';
import { Badge } from './ui/badge';

interface TravelReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ReportInput = ({ label, id, value, onChange, placeholder }: { label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, placeholder?: string }) => (
    <div className="space-y-2">
        <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Info className="h-3 w-3 text-primary" /> {label}
        </Label>
        <Textarea 
            id={id} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            className="min-h-[100px] text-xs font-medium rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:ring-0 shadow-inner p-4 resize-none" 
        />
    </div>
);

const defaultActivities = [
  "Physical verification of all assets in the state registry.",
  "On-the-spot assessment of assets physical and operational condition.",
  "Cross-referencing manufacturer serials with the cloud database.",
  "Verification of asset tag IDs and placement accuracy.",
  "Documentation of unverified or missing assets for management review.",
  "Real-time synchronization of field findings to the cloud workstation."
].join('\n');

export function TravelReportDialog({ isOpen, onOpenChange }: TravelReportDialogProps) {
  const { userProfile } = useAuth();
  const { assets, appSettings } = useAppState();
  
  const [reportState, setReportState] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [activities, setActivities] = useState(defaultActivities);
  const [approvedBy, setApprovedBy] = useState('');
  const [observations, setObservations] = useState('');
  const [challenges, setChallenges] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeProject = useMemo(() => {
    return appSettings?.grants.find(g => g.id === appSettings.activeGrantId)?.name || 'Registry';
  }, [appSettings]);

  const stats = useMemo(() => {
    const verified = assets.filter(a => a.status === 'VERIFIED');
    const total = assets.length;
    
    // Group by category for the automated table
    const categories = Array.from(new Set(assets.map(a => a.category)));
    const breakdown = categories.map(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      const catVerified = catAssets.filter(a => a.status === 'VERIFIED').length;
      const conditions = {
        good: catAssets.filter(a => a.conditionGroup === 'Good').length,
        bad: catAssets.filter(a => a.conditionGroup === 'Bad').length,
        stolen: catAssets.filter(a => a.conditionGroup === 'Stolen').length,
        obsolete: catAssets.filter(a => a.conditionGroup === 'Obsolete').length,
        unsalvageable: catAssets.filter(a => a.conditionGroup === 'Unsalvageable').length
      };
      return {
        name: cat,
        total: catAssets.length,
        verified: catVerified,
        unverified: catAssets.length - catVerified,
        conditions
      };
    });

    return {
        total,
        verifiedCount: verified.length,
        unverifiedCount: total - verified.length,
        percentage: total > 0 ? Math.round((verified.length / total) * 100) : 0,
        breakdown
    };
  }, [assets]);

  useEffect(() => {
    if (isOpen) {
      const initialState = userProfile?.state || 'Global';
      setReportState(initialState);
      setTravelDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      setObjectives(`To conduct mandatory physical asset verification and condition assessment for the ${activeProject} registry in ${initialState}.`);
      setActivities(defaultActivities);
      setObservations(`Conducted physical audit of ${stats.total} registry records. Currently achieved ${stats.percentage}% verification coverage.`);
      setChallenges("Internet connectivity in remote LGAs was intermittent.\nDifficulty accessing locked storage rooms in certain facilities.");
      setRecommendations("Immediate replacement of obsolete equipment identified.\nImprove security protocols in facility stores with reported losses.");
    }
  }, [isOpen, userProfile, stats, activeProject]);

  const generateWordDocument = async () => {
    setIsGenerating(true);
    try {
        const { Packer, Document, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun, AlignmentType, VerticalAlign } = await import('docx');
        const { saveAs } = await import('file-saver');

        const cellStyles = { 
          borders: { 
            top: { style: BorderStyle.SINGLE, size: 1 }, 
            bottom: { style: BorderStyle.SINGLE, size: 1 }, 
            left: { style: BorderStyle.SINGLE, size: 1 }, 
            right: { style: BorderStyle.SINGLE, size: 1 } 
          },
          verticalAlign: VerticalAlign.CENTER
        };

        const createBulletedParagraphs = (text: string) => {
            return text.split('\n').filter(line => line.trim() !== '').map(line => {
                return new Paragraph({
                    text: line.startsWith('- ') ? line.substring(2) : line,
                    bullet: { level: 0 },
                    style: "default-bullet-style",
                });
            });
        };
        
        // 1. STATISTICAL BREAKDOWN TABLE
        const statsHeader = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ASSET FOLDER", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "VERIFIED", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UNVERIFIED", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GOOD", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CRITICAL", bold: true, size: 18 })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STOLEN", bold: true, size: 18 })]})], ...cellStyles }),
            ],
        });

        const statsRows = stats.breakdown.map((row) => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: row.name, style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.total), style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.verified), style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.unverified), style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.conditions.good), style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.conditions.bad + row.conditions.unsalvageable), style: "Normal" })], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ text: String(row.conditions.stolen), style: "Normal" })], ...cellStyles }),
            ],
        }));

        const summaryTable = new Table({
            rows: [statsHeader, ...statsRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });

        const doc = new Document({
            styles: {
                paragraphStyles: [{
                    id: "default-bullet-style",
                    name: "Default Bullet Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22 },
                    paragraph: { indent: { left: 720, hanging: 360 } },
                }]
            },
            sections: [{
                children: [
                    new Paragraph({ text: "ASSETAIN REGISTRY INTELLIGENCE", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: "OFFICIAL ASSET VERIFICATION REPORT", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
                    new Paragraph(" "),
                    new Paragraph({ text: `DATE OF REPORT:\t\t${travelDate}` }),
                    new Paragraph({ text: `REGION VISITED:\t\t${reportState}` }),
                    new Paragraph({ text: `OFFICER IN CHARGE:\t${userProfile?.displayName}` }),
                    new Paragraph(" "),
                    new Paragraph({ text: "1. EXECUTIVE SUMMARY", heading: HeadingLevel.HEADING_3 }),
                    new Paragraph({
                        children: [
                            new TextRun("Mandatory physical audit conducted for "),
                            new TextRun({ text: activeProject, bold: true }),
                            new TextRun(" in "),
                            new TextRun({ text: reportState, bold: true }),
                            new TextRun(". Total registry scope: "),
                            new TextRun({ text: `${stats.total} assets`, bold: true }),
                            new TextRun(". Current coverage: "),
                            new TextRun({ text: `${stats.verifiedCount} verified (${stats.percentage}%)`, bold: true, color: "008000" }),
                            new TextRun(" and "),
                            new TextRun({ text: `${stats.unverifiedCount} pending.`, bold: true, color: "FF0000" }),
                        ],
                    }),
                    new Paragraph(" "),
                    new Paragraph({ text: "2. FOLDER-WISE STATISTICAL BREAKDOWN", heading: HeadingLevel.HEADING_3 }),
                    summaryTable,
                    new Paragraph(" "),
                    new Paragraph({ text: "3. AUDIT OBJECTIVES", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(objectives),
                    new Paragraph(" "),
                    new Paragraph({ text: "4. ACTIVITIES PERFORMED", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(activities),
                    new Paragraph(" "),
                    new Paragraph({ text: "5. KEY FINDINGS & EXCEPTIONS", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(observations),
                    new Paragraph(" "),
                    new Paragraph({ text: "6. CHALLENGES & RECOMMENDATIONS", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(challenges),
                    ...createBulletedParagraphs(recommendations),
                    new Paragraph(" "),
                    new Paragraph(" "),
                    new Paragraph({ text: `Report Authored by: ${userProfile?.displayName}` }),
                    new Paragraph({ text: `Approved by: ${approvedBy || '____________________'}` }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Assetain-Executive-Report-${reportState.replace(/\s+/g, '_')}.docx`);
        onOpenChange(false);
    } catch (e) {
        console.error("Report generation failure", e);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col h-[90vh] overflow-hidden p-0 border-primary/10 rounded-3xl bg-background shadow-2xl">
        <div className="p-8 pb-4 bg-muted/20 border-b">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight">
                        <PlaneTakeoff className="text-primary h-8 w-8" /> Travel Report Builder
                    </DialogTitle>
                    <Badge variant="outline" className="h-9 px-4 rounded-xl font-black text-[10px] uppercase border-primary/20 text-primary">
                        Coverage: {stats.percentage}%
                    </Badge>
                </div>
                <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                    Automated executive summary with per-folder condition analytics.
                </DialogDescription>
            </DialogHeader>
        </div>

        <ScrollArea className="flex-1 bg-background">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Auditor Identity</Label>
                            <Input value={userProfile?.displayName || ''} readOnly disabled className="rounded-xl bg-muted/30 border-none font-bold text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Scope</Label>
                            <Input value={reportState} readOnly disabled className="rounded-xl bg-muted/30 border-none font-bold text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Audit Period</Label>
                        <Input value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="rounded-xl font-bold text-xs border-2" />
                    </div>
                    <ReportInput label="Audit Objectives" id="objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
                    <ReportInput label="Field Activities" id="activities" value={activities} onChange={(e) => setActivities(e.target.value)} />
                </div>
                <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Registry Pulse Snapshot
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Total Folders</span>
                                <span className="text-lg font-black">{stats.breakdown.length}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Verified Records</span>
                                <span className="text-lg font-black text-green-600">{stats.verifiedCount}</span>
                            </div>
                        </div>
                    </div>
                    <ReportInput label="Detailed Observations" id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    <ReportInput label="Challenges & Recommendations" id="recommendations" value={challenges + "\n" + recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Approving Manager</Label>
                        <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Manager name..." className="rounded-xl border-2 font-bold text-xs" />
                    </div>
                </div>
            </div>
        </ScrollArea>

        <div className="p-8 bg-muted/20 border-t flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold rounded-xl px-8">Cancel</Button>
          <Button onClick={generateWordDocument} disabled={isGenerating || stats.total === 0} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 min-w-[280px]">
            {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Generate Executive Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
