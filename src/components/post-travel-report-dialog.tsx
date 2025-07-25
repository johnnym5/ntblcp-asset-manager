
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

  const generateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Please allow popups to view the report.');
      return;
    }
    
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
      <html>
        <head>
          <title>Post-Travel Verification Report - ${stateVisited}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #000; margin: 0; padding: 0; background-color: #fff; }
            @media print {
              body { -webkit-print-color-adjust: exact; color-adjust: exact; }
              .no-print { display: none; }
            }
            .container { max-width: 800px; margin: 20px auto; padding: 20px; }
            h1, h2 { text-align: center; margin: 0; padding: 0; color: #000080; }
            h1 { font-size: 16px; margin-bottom: 5px; font-weight: bold; }
            h2 { font-size: 14px; text-decoration: underline; margin-bottom: 20px; font-weight: bold; }
            .report-section { margin-bottom: 16px; }
            .report-section h3 { font-size: 13px; text-decoration: underline; margin-bottom: 8px; font-weight: bold; }
            p, li { font-size: 12px; }
            ul { margin: 0; padding-left: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .print-btn { display: block; width: 100px; margin: 20px auto; padding: 10px; text-align: center; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            .trip-details p { margin: 2px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="no-print print-btn" onclick="window.print()">Print Report</button>
            <h1>NATIONAL TUBERCULOSIS, LEPROSY & BURULI – ULCER CONTROL PROGRAMME (NTBLCP)</h1>
            <h2>TRAVEL REPORT</h2>
            
            <div class="trip-details report-section">
                <p>DATE OF TRAVEL: ${travelDate}</p>
                <p>STATE VISITED: ${stateVisited}</p>
                <p>NAME OF OFFICER ON THE TRAVEL: ${officerName}</p>
            </div>

            <div class="report-section">
                <h3>OBJECTIVES OF THE TRAVEL:</h3>
                <ul>
                    <li>Ascertain the veracity of the Fixed Asset Register</li>
                    <li>Ascertain the condition of the Assets</li>
                    <li>Identify which Assets qualify to be classified as salvageable</li>
                    <li>Recommend appropriate maintenance practices</li>
                    <li>Training of asset focal persons on asset management, register updates, and maintenance schedules</li>
                </ul>
            </div>
            
            <div class="report-section">
                <h3>ACTIVITIES DONE:</h3>
                <ul>
                    <li>Physical sighting of assets in the asset register; verified tag numbers</li>
                    <li>Updated working conditions of assets</li>
                    <li>Discussed challenges and action plans with stakeholders</li>
                </ul>
            </div>

            <div class="report-section">
              <h3>OBSERVATIONS:</h3>
              ${formatList(observations)}
            </div>

            <div class="report-section">
              <h3>CHALLENGES:</h3>
              ${formatList(challenges)}
            </div>

            <div class="report-section">
              <h3>RECOMMENDATIONS:</h3>
              ${formatList(recommendations)}
            </div>

            <div class="report-section">
                <h3>ASSET SUMMARY:</h3>
                <ul>
                    <li><strong>Total Assets in ${stateVisited}:</strong> ${totalAssets}</li>
                    <li><strong>Verified Assets:</strong> ${verifiedAssets}</li>
                    <li><strong>Unverified Assets:</strong> ${unverifiedAssets}</li>
                    <li><strong>Comments:</strong> ${assetsWithRemarks.length}</li>
                </ul>
            </div>

            ${assetsWithRemarks.length > 0 ? `
            <div class="report-section">
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
            </div>
            ` : ''}

          </div>
        </body>
      </html>
    `;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
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
            Fill in the details below to generate a formatted printable report for your trip.
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
