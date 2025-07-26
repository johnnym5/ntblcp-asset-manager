
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Asset } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { NIGERIAN_STATE_CAPITALS } from '@/lib/constants';

interface PostTravelReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allAssets: Asset[];
}

export function PostTravelReportDialog({ isOpen, onOpenChange, allAssets }: PostTravelReportDialogProps) {
  const [officerName, setOfficerName] = useState('');
  const [stateVisited, setStateVisited] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [observations, setObservations] = useState('');
  const [challenges, setChallenges] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const generateReport = async () => {
    // Dynamically import libraries only when the function is called on the client-side.
    const HTMLtoDOCX = (await import('html-to-docx')).default;
    const { saveAs } = await import('file-saver');

    const lowerCaseState = stateVisited.toLowerCase().trim();
    const capitalCity = NIGERIAN_STATE_CAPITALS[stateVisited]?.toLowerCase().trim();

    const stateAssets = allAssets.filter(asset => {
        const assetLocation = (asset.location || "").toLowerCase().trim();
        const matchesState = assetLocation.startsWith(lowerCaseState);
        const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
        return matchesState || matchesCapital;
    });

    const totalAssets = stateAssets.length;
    const verifiedAssets = stateAssets.filter(a => a.verifiedStatus === 'Verified').length;
    const unverifiedAssets = totalAssets - verifiedAssets;
    const assetsWithRemarks = stateAssets.filter(a => a.remarks && a.remarks.trim() !== '');

    const formatList = (text: string) => {
        if (!text.trim()) return '<ul><li>None</li></ul>';
        return `<ul>${text.split('\n').filter(item => item.trim() !== '').map(item => `<li>${item.trim()}</li>`).join('')}</ul>`;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Post-Travel Verification Report - ${stateVisited}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
            h1, h2, h3 { color: #000080; }
            h1 { font-size: 16pt; text-align: center; }
            h2 { font-size: 14pt; text-align: center; text-decoration: underline; }
            h3 { font-size: 13pt; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; font-size: 11pt; }
            th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>NATIONAL TUBERCULOSIS, LEPROSY & BURULI – ULCER CONTROL PROGRAMME (NTBLCP)</h1>
          <h2>TRAVEL REPORT</h2>
          <br/>
          <p><strong>DATE OF TRAVEL:</strong> ${travelDate}</p>
          <p><strong>STATE VISITED:</strong> ${stateVisited}</p>
          <p><strong>NAME OF OFFICER ON THE TRAVEL:</strong> ${officerName}</p>
          
          <h3>OBJECTIVES OF THE TRAVEL:</h3>
          <ul>
              <li>Ascertain the veracity of the Fixed Asset Register</li>
              <li>Ascertain the condition of the Assets</li>
              <li>Identify which Assets qualify to be classified as salvageable</li>
              <li>Recommend appropriate maintenance practices</li>
              <li>Training of asset focal persons on asset management, register updates, and maintenance schedules</li>
          </ul>
          
          <h3>ACTIVITIES DONE:</h3>
          <ul>
              <li>Physical sighting of assets in the asset register; verified tag numbers</li>
              <li>Updated working conditions of assets</li>
              <li>Discussed challenges and action plans with stakeholders</li>
          </ul>

          <h3>OBSERVATIONS:</h3>
          ${formatList(observations)}

          <h3>CHALLENGES:</h3>
          ${formatList(challenges)}

          <h3>RECOMMENDATIONS:</h3>
          ${formatList(recommendations)}

          <h3>ASSET SUMMARY:</h3>
          <ul>
              <li><strong>Total Assets in ${stateVisited}:</strong> ${totalAssets}</li>
              <li><strong>Verified Assets:</strong> ${verifiedAssets}</li>
              <li><strong>Unverified Assets:</strong> ${unverifiedAssets}</li>
              <li><strong>Assets with Comments:</strong> ${assetsWithRemarks.length}</li>
          </ul>

          ${assetsWithRemarks.length > 0 ? `
          <h3>ASSETS WITH REMARKS:</h3>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Asset Description</th>
                <th>Asset ID Code</th>
                <th>Comment/Remark</th>
              </tr>
            </thead>
            <tbody>
              ${assetsWithRemarks.map((asset, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${asset.description || ''}</td>
                  <td>${asset.assetIdCode || 'N/A'}</td>
                  <td>${asset.remarks || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </body>
      </html>
    `;

    const fileBuffer = await HTMLtoDOCX(reportHtml, undefined, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    });

    const fileName = `Post-Travel-Report-${stateVisited}-${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(fileBuffer as Blob, fileName);
    
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form on close
      setOfficerName('');
      setStateVisited('');
      setTravelDate('');
      setObservations('');
      setChallenges('');
      setRecommendations('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Post-Travel Report</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a formatted Word document for your trip.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
            <div className="space-y-4 pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="officerName">Officer Name</Label>
                        <Input id="officerName" value={officerName} onChange={(e) => setOfficerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stateVisited">State Visited</Label>
                        <Input id="stateVisited" value={stateVisited} onChange={(e) => setStateVisited(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="travelDate">Travel Date(s)</Label>
                    <Input id="travelDate" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} placeholder="e.g., 2024-07-25" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="observations">Observations</Label>
                    <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Enter one observation per line..." rows={4} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="challenges">Challenges</Label>
                    <Textarea id="challenges" value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="Enter one challenge per line..." rows={4} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="recommendations">Recommendations</Label>
                    <Textarea id="recommendations" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Enter one recommendation per line..." rows={4} />
                </div>
            </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={generateReport} disabled={!officerName || !stateVisited || !travelDate}>
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
