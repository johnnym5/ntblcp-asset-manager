
"use client";

import React from 'react';
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
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { saveAs } from 'file-saver';
import * as HTMLtoDOCX from 'html-to-docx';

interface AssetVerificationReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AssetVerificationReportDialog({ isOpen, onOpenChange }: AssetVerificationReportDialogProps) {
  const { assets, offlineAssets, isOnline, globalStateFilter } = useAppState();
  const { userProfile } = useAuth();

  const generateReport = async () => {
    if (!userProfile) return;

    const sourceAssets = isOnline ? assets : offlineAssets;
    
    // Filter assets based on the user's state or the global admin filter
    const userState = globalStateFilter || userProfile.state;
    const userAssets = sourceAssets.filter(asset => 
      (asset.location || '').toLowerCase().includes(userState.toLowerCase())
    );

    const totalAssets = userAssets.length;
    const verifiedAssets = userAssets.filter(a => a.verifiedStatus === 'Verified').length;
    const unverifiedAssets = totalAssets - verifiedAssets;
    const assetsWithRemarks = userAssets.filter(a => a.remarks && a.remarks.trim() !== '');

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Verification Report</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
            h1, h2, h3 { text-align: center; }
            h1 { font-size: 16pt; text-decoration: underline; margin-bottom: 20px; }
            h2 { font-size: 14pt; margin-bottom: 15px; }
            p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11pt; }
            th, td { border: 1px solid black; padding: 5px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Asset Verification Report</h1>
          
          <h2>Activity Details</h2>
          <p><strong>Activity Name:</strong> Asset Verification</p>
          <p><strong>Officer Name:</strong> ${userProfile.displayName}</p>
          <p><strong>Location/State:</strong> ${userState}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h2>Verification Summary</h2>
          <p><strong>Total Assets for ${userState}:</strong> ${totalAssets}</p>
          <p><strong>Assets Verified:</strong> ${verifiedAssets}</p>
          <p><strong>Assets Unverified/With Discrepancy:</strong> ${unverifiedAssets}</p>
          
          ${assetsWithRemarks.length > 0 ? `
            <h2>Assets with Remarks/Comments</h2>
            <table>
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Asset Description</th>
                  <th>Asset ID</th>
                  <th>Condition</th>
                  <th>Remark/Comment</th>
                </tr>
              </thead>
              <tbody>
                ${assetsWithRemarks.map((asset, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${asset.description || ''}</td>
                    <td>${asset.assetIdCode || 'N/A'}</td>
                    <td>${asset.condition || 'N/A'}</td>
                    <td>${asset.remarks || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No assets with specific remarks were found.</p>'}
        </body>
      </html>
    `;

    const fileBuffer = await HTMLtoDOCX.asBlob(reportHtml);
    const fileName = `Asset-Verification-Report-${userState.replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.docx`;
    
    saveAs(fileBuffer, fileName);

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Asset Verification Report</DialogTitle>
          <DialogDescription>
            This will generate a Word document summarizing the verification status of assets for your current location.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm"><strong>Report For:</strong> {userProfile?.displayName}</p>
          <p className="text-sm"><strong>Location:</strong> {globalStateFilter || userProfile?.state}</p>
          <p className="text-sm"><strong>Data Source:</strong> {isOnline ? 'Cloud Database' : 'Offline Storage'}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={generateReport}>
            Generate and Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
