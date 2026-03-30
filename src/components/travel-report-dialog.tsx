"use client";

/**
 * @fileOverview TravelReportDialog - High-Fidelity Word Document Generator.
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
import { NIGERIAN_STATE_CAPITALS, SPECIAL_LOCATIONS } from '@/lib/constants';
import { ScrollArea } from './ui/scroll-area';
import { PlaneTakeoff, Info, FileText, Check, Loader2 } from 'lucide-react';
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

  // Generate statistics for the executive summary
  const stats = useMemo(() => {
    const verified = assets.filter(a => a.status === 'VERIFIED');
    const stolen = assets.filter(a => a.condition === 'Stolen').length;
    const bad = assets.filter(a => ['Bad condition', 'Unsalvageable', 'Burnt'].includes(a.condition || '')).length;
    return {
        total: assets.length,
        verifiedCount: verified.length,
        unverifiedCount: assets.length - verified.length,
        stolen,
        bad,
        percentage: assets.length > 0 ? Math.round((verified.length / assets.length) * 100) : 0
    };
  }, [assets]);

  useEffect(() => {
    if (isOpen) {
      const initialState = userProfile?.state || 'Global';
      setReportState(initialState);
      setTravelDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      setObjectives(`To conduct mandatory physical asset verification and condition assessment for the ${activeProject} registry in ${initialState}.`);
      setActivities(defaultActivities);
      
      // Smart Suggestion Logic: Auto-draft observations based on registry data
      let obs = `Conducted physical audit of ${stats.total} registry records. Currently achieved ${stats.percentage}% verification coverage.`;
      if (stats.stolen > 0) obs += `\n- ALERT: Detected ${stats.stolen} stolen items requiring immediate security reporting.`;
      if (stats.bad > 0) obs += `\n- Detected ${stats.bad} assets in critical or unsalvageable condition.`;
      setObservations(obs);

      setChallenges("Internet connectivity in remote LGAs was intermittent.\nDifficulty accessing locked storage rooms in certain facilities.");
      setRecommendations("Immediate replacement of obsolete IT equipment identified during assessment.\nStrengthen security protocols in LGAs with reported asset losses.");
    }
  }, [isOpen, userProfile, stats, activeProject]);

  const generateWordDocument = async () => {
    setIsGenerating(true);
    try {
        const { Packer, Document, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun, AlignmentType } = await import('docx');
        const { saveAs } = await import('file-saver');

        const cellStyles = { borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }};

        const createBulletedParagraphs = (text: string) => {
            return text.split('\n').filter(line => line.trim() !== '').map(line => {
                return new Paragraph({
                    text: line.startsWith('- ') ? line.substring(2) : line,
                    bullet: { level: 0 },
                    style: "default-bullet-style",
                });
            });
        };
        
        // Exceptions table header
        const tableHeader = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ID CODE", bold: true })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION", bold: true })]})], ...cellStyles }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "OBSERVATION", bold: true })]})], ...cellStyles }),
            ],
        });

        // Get assets with critical remarks or conditions
        const exceptions = assets.filter(a => (a.metadata?.remarks && String(a.metadata.remarks).trim() !== '') || a.status === 'DISCREPANCY');
        const remarksRows = exceptions.map((asset) => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(asset.assetIdCode || 'N/A')], ...cellStyles }),
                new TableCell({ children: [new Paragraph(asset.description || asset.name)], ...cellStyles }),
                new TableCell({ children: [new Paragraph(String(asset.metadata?.remarks || 'Integrity Discrepancy'))], ...cellStyles }),
            ],
        }));

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
                    new Paragraph({ text: "ASSETAIN REGISTRY PULSE", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: "ASSET VERIFICATION TRAVEL REPORT", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
                    new Paragraph(" "),
                    new Paragraph({ text: `DATE OF TRAVEL:\t\t${travelDate}` }),
                    new Paragraph({ text: `LOCATION VISITED:\t\t${reportState}` }),
                    new Paragraph({ text: `OFFICER IN CHARGE:\t${userProfile?.displayName}` }),
                    new Paragraph(" "),
                    new Paragraph({ text: "VERIFICATION EXECUTIVE SUMMARY:", heading: HeadingLevel.HEADING_3 }),
                    new Paragraph({
                        children: [
                            new TextRun("Mandatory physical audit conducted for "),
                            new TextRun({ text: activeProject, bold: true }),
                            new TextRun(" in "),
                            new TextRun({ text: reportState, bold: true }),
                            new TextRun(". Out of a register total of "),
                            new TextRun({ text: `${stats.total} assets`, bold: true }),
                            new TextRun(", "),
                            new TextRun({ text: `${stats.verifiedCount} were physically verified`, bold: true, color: "008000" }),
                            new TextRun(" and "),
                            new TextRun({ text: `${stats.unverifiedCount} remain in the unverified queue.`, bold: true, color: "FF0000" }),
                        ],
                    }),
                    new Paragraph(" "),
                    new Paragraph({ text: "OBJECTIVES:", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(objectives),
                    new Paragraph(" "),
                    new Paragraph({ text: "ACTIVITIES PERFORMED:", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(activities),
                    new Paragraph(" "),
                    new Paragraph({ text: "KEY OBSERVATIONS:", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(observations),
                    new Paragraph(" "),
                    new Paragraph({ text: "CHALLENGES & BOTTLENECKS:", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(challenges),
                    new Paragraph(" "),
                    new Paragraph({ text: "MANAGEMENT RECOMMENDATIONS:", heading: HeadingLevel.HEADING_3 }),
                    ...createBulletedParagraphs(recommendations),
                    new Paragraph(" "),
                    new Paragraph({ text: "ASSET REGISTRY EXCEPTIONS:", heading: HeadingLevel.HEADING_3 }),
                    remarksRows.length > 0 
                        ? new Table({ rows: [tableHeader, ...remarksRows], width: { size: 100, type: WidthType.PERCENTAGE } }) 
                        : new Paragraph("Zero registry exceptions with remarks noted."),
                    new Paragraph(" "),
                    new Paragraph({ text: `Authored by: ${userProfile?.displayName}` }),
                    new Paragraph({ text: `Approved by: ${approvedBy || '____________________'}` }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Assetain-Report-${reportState.replace(/\s+/g, '_')}.docx`);
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
                        <PlaneTakeoff className="text-primary h-8 w-8" /> Executive Travel Report
                    </DialogTitle>
                    <Badge variant="outline" className="h-8 px-4 rounded-xl font-black text-[10px] uppercase border-primary/20 text-primary">
                        Registry Coverage: {stats.percentage}%
                    </Badge>
                </div>
                <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                    Automated generator for formal field verification findings.
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
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Target Scope</Label>
                            <Input value={reportState} readOnly disabled className="rounded-xl bg-muted/30 border-none font-bold text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Audit Period / Date</Label>
                        <Input value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="rounded-xl font-bold text-xs border-2" />
                    </div>
                    <ReportInput label="Audit Objectives" id="objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
                    <ReportInput label="Field Activities" id="activities" value={activities} onChange={(e) => setActivities(e.target.value)} />
                </div>
                <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" /> Live Registry Pulse
                        </h4>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Verified</span>
                                <span className="text-xl font-black">{stats.verifiedCount} / {stats.total}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Exceptions</span>
                                <span className="text-xl font-black text-destructive">{stats.stolen + stats.bad}</span>
                            </div>
                        </div>
                    </div>
                    <ReportInput label="Key Findings & Observations" id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    <ReportInput label="Field Bottlenecks" id="challenges" value={challenges} onChange={(e) => setChallenges(e.target.value)} />
                    <ReportInput label="Proposed Recommendations" id="recommendations" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">Approving Manager</Label>
                        <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Enter manager name..." className="rounded-xl border-2 font-bold text-xs" />
                    </div>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold rounded-xl px-8">Discard Draft</Button>
          <Button onClick={generateWordDocument} disabled={isGenerating || stats.total === 0} className="h-12 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 min-w-[240px]">
            {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Export Word Document (.docx)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
