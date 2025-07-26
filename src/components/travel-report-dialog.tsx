
"use client";

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
import { NIGERIAN_STATES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Packer, Document, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import type { Asset } from '@/lib/types';


interface TravelReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ReportInput = ({ label, id, value, onChange }: { label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id} className="font-semibold">{label}</Label>
        <Textarea id={id} value={value} onChange={onChange} className="min-h-[100px] text-sm" />
    </div>
);


export function TravelReportDialog({ isOpen, onOpenChange }: TravelReportDialogProps) {
  const { userProfile } = useAuth();
  const { assets, offlineAssets, dataSource } = useAppState();
  
  const [reportState, setReportState] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [observations, setObservations] = useState('');
  const [challenges, setChallenges] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReportState(userProfile?.state || '');
      setTravelDate('');
      setObservations('');
      setChallenges('');
      setRecommendations('');
    }
  }, [isOpen, userProfile]);

  const activeAssets = useMemo(() => {
    return dataSource === 'cloud' ? assets : offlineAssets;
  }, [dataSource, assets, offlineAssets]);

  const reportAssets = useMemo(() => {
    if (!reportState) return [];
    return activeAssets.filter(asset => asset.location?.toLowerCase().includes(reportState.toLowerCase()));
  }, [activeAssets, reportState]);

  const verifiedAssets = reportAssets.filter(asset => asset.verifiedStatus === 'Verified');
  const unverifiedAssetsCount = reportAssets.length - verifiedAssets.length;
  const assetsWithRemarks = reportAssets.filter(asset => asset.remarks && asset.remarks.trim() !== '');

  const generateWordDocument = () => {
    const tableHeader = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S/N", bold: true })]})], ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Asset ID Code", bold: true })]})], ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Asset Description", bold: true })]})], ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Remark/Comment", bold: true })]})], ...cellStyles }),
        ],
    });

    const remarksRows = assetsWithRemarks.map((asset, index) => new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(String(asset.sn || index + 1))], ...cellStyles }),
            new TableCell({ children: [new Paragraph(asset.assetIdCode || '')], ...cellStyles }),
            new TableCell({ children: [new Paragraph(asset.description || '')], ...cellStyles }),
            new TableCell({ children: [new Paragraph(asset.remarks || '')], ...cellStyles }),
        ],
    }));
    
    const remarksTable = new Table({
        rows: [tableHeader, ...remarksRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "NATIONAL TUBERCULOSIS, LEPROSY & BURULI - ULCER CONTROL PROGRAMME (NTBLCP)", heading: HeadingLevel.HEADING_1, alignment: 'center' }),
                new Paragraph({ text: "TRAVEL REPORT", heading: HeadingLevel.HEADING_2, alignment: 'center' }),
                new Paragraph(" "),
                new Paragraph({ text: `DATE OF TRAVEL:\t\t${travelDate}` }),
                new Paragraph({ text: `STATE VISITED:\t\t${reportState}` }),
                new Paragraph({ text: `NAME OF OFFICER ON THE TRAVEL:\t${userProfile?.displayName}` }),
                new Paragraph(" "),
                new Paragraph({ text: "SUMMARY OF VERIFICATION:", heading: HeadingLevel.HEADING_3 }),
                new Paragraph(`On my asset verification visit to ${reportState}, out of a total of ${reportAssets.length} assets, ${verifiedAssets.length} were verified and ${unverifiedAssetsCount} were unverified.`),
                new Paragraph(" "),
                new Paragraph({ text: "OBSERVATIONS:", heading: HeadingLevel.HEADING_3 }),
                new Paragraph(observations),
                 new Paragraph(" "),
                new Paragraph({ text: "CHALLENGES:", heading: HeadingLevel.HEADING_3 }),
                new Paragraph(challenges),
                 new Paragraph(" "),
                new Paragraph({ text: "RECOMMENDATIONS:", heading: HeadingLevel.HEADING_3 }),
                new Paragraph(recommendations),
                 new Paragraph(" "),
                new Paragraph({ text: "ASSETS WITH REMARKS:", heading: HeadingLevel.HEADING_3 }),
                remarksRows.length > 0 ? remarksTable : new Paragraph("No assets with remarks were found for this location."),
                new Paragraph(" "),
                new Paragraph(" "),
                new Paragraph({ text: `Prepared by: ${userProfile?.displayName}` }),
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `Travel-Report-${reportState}-${userProfile?.displayName}.docx`);
    });
  };

  const cellStyles = { borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }};

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Travel Report Generator</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a Word document report for your trip.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 pr-4">
                {/* Input Form */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label htmlFor="officerName">Officer's Name</Label>
                            <Input id="officerName" value={userProfile?.displayName || ''} readOnly disabled />
                        </div>
                         {userProfile?.isAdmin ? (
                            <div className="space-y-1.5">
                                <Label htmlFor="reportState">State for Report</Label>
                                <Select onValueChange={setReportState} value={reportState}>
                                    <SelectTrigger><SelectValue placeholder="Select a state..." /></SelectTrigger>
                                    <SelectContent>
                                        {NIGERIAN_STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                             <div className="space-y-1.5">
                                <Label htmlFor="reportState">State Visited</Label>
                                <Input id="reportState" value={userProfile?.state || ''} readOnly disabled />
                            </div>
                        )}
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="travelDate">Date of Travel (e.g., 2nd-4th December 2024)</Label>
                        <Input id="travelDate" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
                    </div>

                    <p className="p-4 bg-muted rounded-md text-sm">
                        On my asset verification visit to <span className="font-bold">{reportState}</span>, out of a total of <span className="font-bold">{reportAssets.length}</span> assets, <span className="font-bold text-green-600">{verifiedAssets.length}</span> were verified and <span className="font-bold text-red-600">{unverifiedAssetsCount}</span> were unverified.
                    </p>
                </div>

                <div className="space-y-4">
                    <ReportInput label="Observations" id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    <ReportInput label="Challenges" id="challenges" value={challenges} onChange={(e) => setChallenges(e.target.value)} />
                    <ReportInput label="Recommendations" id="recommendations" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                </div>
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={generateWordDocument}>Export to Word</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
