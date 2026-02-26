
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
import { NIGERIAN_STATES, NIGERIAN_ZONES, ZONAL_STORES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Packer, Document, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun, ShadingType, Bullet, AlignmentType } from 'docx';
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

const defaultActivities = [
  "Physical verification of all assets in the state.",
  "On-the-spot-assessment of the assets condition.",
  "Proper documentation of the verified assets.",
  "Proper documentation of the unverified assets.",
  "Syncing of all the data into the server."
].join('\n');

const defaultObservations = "";


export function TravelReportDialog({ isOpen, onOpenChange }: TravelReportDialogProps) {
  const { userProfile } = useAuth();
  const { assets, offlineAssets, dataSource, globalStateFilter, activeGrantId } = useAppState();
  
  const [reportState, setReportState] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [activities, setActivities] = useState(defaultActivities);
  const [approvedBy, setApprovedBy] = useState('');
  
  const [observations, setObservations] = useState(defaultObservations);
  const [challenges, setChallenges] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReportState(globalStateFilter || userProfile?.states[0] || '');
      setTravelDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      setObjectives('To conduct physical verification of assets in the state.');
      setActivities(defaultActivities);
      setObservations(defaultObservations);
      setApprovedBy('');
      setChallenges('');
      setRecommendations('');
    }
  }, [isOpen, userProfile, globalStateFilter]);

  const activeAssets = useMemo(() => {
    return dataSource === 'cloud' ? assets : offlineAssets;
  }, [dataSource, assets, offlineAssets]);

  const reportAssets = useMemo(() => {
    if (!reportState || !activeGrantId) return [];
    
    // 1. Project Restriction: Filter only by active grant
    let projectAssets = activeAssets.filter(asset => asset.grantId === activeGrantId);

    // 2. User/Regional Restriction: Non-admins only see authorized states
    if (userProfile && !userProfile.isAdmin) {
        projectAssets = projectAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            return userProfile.states.some(state => {
                const lowerState = state.toLowerCase().trim();
                const capitalCity = NIGERIAN_STATE_CAPITALS[state]?.toLowerCase().trim();
                return assetLocation.startsWith(lowerState) || (capitalCity && assetLocation.startsWith(capitalCity));
            });
        });
    }

    if (reportState === 'All Locations') return projectAssets;
    
    const isZonalStore = ZONAL_STORES.map(z => z.toLowerCase()).includes(reportState.toLowerCase());

    if (isZonalStore) {
        const lowerCaseZone = reportState.toLowerCase();
        return projectAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            return assetLocation.includes(lowerCaseZone) && assetLocation.includes("zonal store");
        });
    }

    const lowerCaseFilter = reportState.toLowerCase().trim();
    const capitalCity = NIGERIAN_STATE_CAPITALS[reportState]?.toLowerCase().trim();
    
    return projectAssets.filter(asset => {
      const assetLocation = (asset.location || "").toLowerCase().trim();
      const matchesState = assetLocation.startsWith(lowerCaseFilter);
      const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
      return matchesState || matchesCapital || (SPECIAL_LOCATIONS.includes(reportState) && assetLocation.includes(lowerCaseFilter));
    });
  }, [activeAssets, reportState, activeGrantId, userProfile]);

  const verifiedAssets = reportAssets.filter(asset => asset.verifiedStatus === 'Verified');
  const unverifiedAssetsCount = reportAssets.length - verifiedAssets.length;
  const assetsWithRemarks = reportAssets.filter(asset => asset.remarks && asset.remarks.trim() !== '');

  const generateWordDocument = () => {
    const createBulletedParagraphs = (text: string) => {
        return text.split('\n').filter(line => line.trim() !== '').map(line => {
            return new Paragraph({
                text: line.startsWith('- ') ? line.substring(2) : line,
                bullet: { level: 0 },
                style: "default-bullet-style",
            });
        });
    };
    
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
    
    const summaryParagraph = reportState === 'All Locations' 
    ? new Paragraph({
        children: [
            new TextRun("This is a compilation of all assets in all locations. Out of a total of "),
            new TextRun({ text: `${reportAssets.length} assets`, bold: true }),
            new TextRun(", "),
            new TextRun({ text: `${verifiedAssets.length} were verified`, bold: true, color: "008000" }), // Green
            new TextRun(" and "),
            new TextRun({ text: `${unverifiedAssetsCount} were unverified.`, bold: true, color: "FF0000" }), // Red
        ],
      })
    : new Paragraph({
        children: [
            new TextRun("On my asset verification visit to "),
            new TextRun({ text: reportState, bold: true }),
            new TextRun(", out of a total of "),
            new TextRun({ text: `${reportAssets.length} assets`, bold: true }),
            new TextRun(", "),
            new TextRun({ text: `${verifiedAssets.length} were verified`, bold: true, color: "008000" }), // Green
            new TextRun(" and "),
            new TextRun({ text: `${unverifiedAssetsCount} were unverified.`, bold: true, color: "FF0000" }), // Red
        ],
    });

    const verifiedAssetsByCategory = verifiedAssets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const categorySummaryText = Object.entries(verifiedAssetsByCategory)
        .map(([category, count]) => `${count} ${category.replace(/-C19RM/g, '').replace(/_|-/g, ' ')}`)
        .join(', ');

    const detailedSummaryParagraph = new Paragraph({
        children: [
            new TextRun("Out of the "),
            new TextRun({ text: `${verifiedAssets.length} verified assets`, bold: true, color: "008000" }),
            new TextRun(", I verified: "),
            new TextRun({ text: categorySummaryText || 'none', bold: true }),
            new TextRun("."),
        ],
    });

    const doc = new Document({
        styles: {
            paragraphStyles: [{
                id: "default-bullet-style",
                name: "Default Bullet Style",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    size: 22, // 11pt
                },
                paragraph: {
                    indent: { left: 720, hanging: 360 }, // 0.5 inch indent, 0.25 inch hanging
                },
            }]
        },
        sections: [{
            children: [
                new Paragraph({ text: "ASSETBASE", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "ASSET VERIFICATION TRAVEL REPORT", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
                new Paragraph(" "),
                new Paragraph({ text: `DATE OF TRAVEL:\t\t${travelDate}` }),
                new Paragraph({ text: `STATE VISITED:\t\t${reportState}` }),
                new Paragraph({ text: `NAME OF OFFICER ON THE TRAVEL:\t${userProfile?.displayName}` }),
                new Paragraph(" "),
                new Paragraph({ text: "SUMMARY OF VERIFICATION:", heading: HeadingLevel.HEADING_3 }),
                summaryParagraph,
                new Paragraph(" "),
                detailedSummaryParagraph,
                new Paragraph(" "),
                new Paragraph({ text: "OBJECTIVES:", heading: HeadingLevel.HEADING_3 }),
                ...createBulletedParagraphs(objectives),
                new Paragraph(" "),
                new Paragraph({ text: "ACTIVITIES DONE:", heading: HeadingLevel.HEADING_3 }),
                ...createBulletedParagraphs(activities),
                new Paragraph(" "),
                new Paragraph({ text: "OBSERVATIONS:", heading: HeadingLevel.HEADING_3 }),
                 ...createBulletedParagraphs(observations),
                 new Paragraph(" "),
                new Paragraph({ text: "CHALLENGES:", heading: HeadingLevel.HEADING_3 }),
                 ...createBulletedParagraphs(challenges),
                 new Paragraph(" "),
                new Paragraph({ text: "RECOMMENDATIONS:", heading: HeadingLevel.HEADING_3 }),
                 ...createBulletedParagraphs(recommendations),
                 new Paragraph(" "),
                new Paragraph({ text: "ASSETS WITH REMARKS:", heading: HeadingLevel.HEADING_3 }),
                remarksRows.length > 0 ? remarksTable : new Paragraph("No assets with remarks were found for this location."),
                new Paragraph(" "),
                new Paragraph(" "),
                new Paragraph({ text: `Prepared by: ${userProfile?.displayName}` }),
                 new Paragraph(" "),
                new Paragraph({ text: `Approved by: ${approvedBy}` }),
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
            Fill in the details below to generate a Word document report for your trip. This report only includes data from the active project.
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
                                    <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                                    <SelectContent>
                                          <SelectItem value="All Locations">All Locations</SelectItem>
                                          <SelectSeparator />
                                          <SelectGroup>
                                              <SelectLabel>Special Locations</SelectLabel>
                                              {SPECIAL_LOCATIONS.map((loc) => (
                                                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                              ))}
                                          </SelectGroup>
                                          <SelectSeparator />
                                          <SelectGroup>
                                              <SelectLabel>Zonal Stores</SelectLabel>
                                              {ZONAL_STORES.map((zone) => (
                                                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                                              ))}
                                          </SelectGroup>
                                          <SelectSeparator />
                                          <SelectGroup>
                                              <SelectLabel>States</SelectLabel>
                                              {NIGERIAN_STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                          </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (userProfile?.states && userProfile.states.length > 1 ? (
                             <div className="space-y-1.5">
                                <Label htmlFor="reportState">State for Report</Label>
                                <Select onValueChange={setReportState} value={reportState}>
                                    <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                                    <SelectContent>
                                        {userProfile.states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                             <div className="space-y-1.5">
                                <Label htmlFor="reportState">State Visited</Label>
                                <Input id="reportState" value={reportState} readOnly disabled />
                            </div>
                        ))}
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="travelDate">Date of Travel (e.g., 2nd-4th December 2024)</Label>
                        <Input id="travelDate" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
                    </div>

                    <p className="p-4 bg-muted rounded-md text-sm">
                        {reportState === 'All Locations'
                        ? <>A compilation of all assets in all locations. Out of <span className="font-bold">{reportAssets.length}</span> total assets in the active project, <span className="font-bold text-green-600">{verifiedAssets.length}</span> were verified and <span className="font-bold text-red-600">{unverifiedAssetsCount}</span> were unverified.</>
                        : <>On my asset verification visit to <span className="font-bold">{reportState}</span>, out of a total of <span className="font-bold">{reportAssets.length}</span> assets in the active project, <span className="font-bold text-green-600">{verifiedAssets.length}</span> were verified and <span className="font-bold text-red-600">{unverifiedAssetsCount}</span> were unverified.</>
                        }
                    </p>
                    <ReportInput label="Objectives" id="objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
                    <ReportInput label="Activities Done" id="activities" value={activities} onChange={(e) => setActivities(e.target.value)} />
                </div>

                <div className="space-y-4">
                    <ReportInput label="Observations" id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    <ReportInput label="Challenges" id="challenges" value={challenges} onChange={(e) => setChallenges(e.target.value)} />
                    <ReportInput label="Recommendations" id="recommendations" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                    
                    <div className="space-y-1.5">
                        <Label htmlFor="approvedBy" className="font-semibold">Approved By</Label>
                        <Input id="approvedBy" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
                    </div>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={generateWordDocument} disabled={reportAssets.length === 0}>Export to Word</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
