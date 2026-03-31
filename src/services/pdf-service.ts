
'use client';

/**
 * @fileOverview Professional Technical PDF Service.
 * Orchestrates high-fidelity profile exports and archival exception reports.
 * Phase 56: Implemented Evidence Embedding & Multi-Table Exception Pulse.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Asset } from '@/types/domain';

export const PdfService = {
  /**
   * Generates a high-fidelity single-page profile for an asset.
   * Optimized for field-file attachment.
   */
  async exportTechnicalProfile(asset: Asset) {
    const doc = new jsPDF();
    const primaryColor = [46, 49, 146]; // Assetain Navy

    // 1. Branding Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ASSETAIN REGISTRY', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('TECHNICAL ASSET PROFILE Dossier v5.6', 15, 30);
    
    doc.setFontSize(8);
    doc.text(`EXTRACTED: ${new Date().toLocaleString()}`, 150, 15);
    doc.text(`SYSTEM ID: ${asset.id}`, 150, 20);

    // 2. Main Identity Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(asset.description.toUpperCase(), 15, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Category: ${asset.category}`, 15, 62);
    doc.text(`Project Scope: ${asset.grantId}`, 15, 67);

    // 3. Technical Grid
    autoTable(doc, {
      startY: 75,
      head: [['TECHNICAL PARAMETER', 'FIELD PULSE VALUE']],
      body: [
        ['Tag ID Code', asset.assetIdCode || 'UNTAGGED'],
        ['Manufacturer Serial', asset.serialNumber || 'N/A'],
        ['Location Scope', asset.location || 'GLOBAL'],
        ['Assigned Custodian', asset.custodian || 'UNASSIGNED'],
        ['Condition State', asset.condition || 'UNASSESSED'],
        ['Verification Status', asset.status],
        ['Source Row', String(asset.importMetadata?.rowNumber || 'MANUAL')],
        ['Last Pulse Auditor', asset.lastModifiedBy]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 }
    });

    // 4. Visual Evidence Pulse
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    if (asset.photoUrl || asset.photoDataUri) {
      doc.setFont('helvetica', 'bold');
      doc.text('VERIFIED VISUAL EVIDENCE', 15, finalY + 15);
      
      try {
        const imgUrl = asset.photoUrl || asset.photoDataUri;
        if (imgUrl) {
          doc.addImage(imgUrl, 'JPEG', 15, finalY + 20, 80, 60);
          doc.rect(15, finalY + 20, 80, 60, 'S'); // Outline
        }
      } catch (e) {
        doc.setFont('helvetica', 'italic');
        doc.text('[Media rendering unavailable in this pulse]', 15, finalY + 25);
      }
    }

    // 5. Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This document is a deterministic extract from the Assetain high-availability registry.', 105, 285, { align: 'center' });

    doc.save(`Asset-Profile-${asset.assetIdCode || asset.id.split('-')[0]}.pdf`);
  },

  /**
   * Generates a compilation report of all high-risk discrepancies.
   */
  async exportExceptionReport(assets: Asset[], location: string) {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const primaryColor = [220, 38, 38]; // Destructive Red for Exceptions

    const exceptions = assets.filter(a => 
      a.status === 'DISCREPANCY' || 
      ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition)
    );

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRY EXCEPTION AUDIT', 15, 15);
    
    doc.setFontSize(10);
    doc.text(`REGION: ${location.toUpperCase()} | TARGET RECORDS: ${exceptions.length}`, 15, 22);

    autoTable(doc, {
      startY: 40,
      head: [['ID CODE', 'DESCRIPTION', 'LOCATION', 'CONDITION', 'AUDITOR REMARKS', 'STATUS']],
      body: exceptions.map(a => [
        a.assetIdCode || 'N/A',
        a.description,
        a.location,
        a.condition,
        (a.metadata?.remarks as string) || 'Zero Remarks',
        a.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`Registry-Exceptions-${location.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};
