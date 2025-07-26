
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { useAuth } from '@/contexts/auth-context';
import { useReactToPrint } from 'react-to-print';
import type { Asset } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { NIGERIAN_STATES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TravelReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function TravelReportDialog({ isOpen, onOpenChange }: TravelReportDialogProps) {
  const { userProfile } = useAuth();
  const { assets } = useAppState();
  
  const officerName = userProfile?.displayName || '';
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [reportState, setReportState] = useState(userProfile?.state || '');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDestination('');
      setPurpose('');
      setDepartureDate('');
      setReturnDate('');
      setReportState(userProfile?.state || '');
    }
  }, [isOpen, userProfile]);

  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `Travel Report - ${officerName}`,
  });
  
  const reportAssets = useMemo(() => {
    if (!reportState) return [];
    return assets.filter(asset => asset.location?.toLowerCase().includes(reportState.toLowerCase()));
  }, [assets, reportState]);

  const verifiedAssets = reportAssets.filter(asset => asset.verifiedStatus === 'Verified');
  const unverifiedAssetsCount = reportAssets.length - verifiedAssets.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Travel Sign-off Sheet</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a printable report for your trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Input Form */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="officerName">Officer's Name</Label>
                    <Input id="officerName" value={officerName} readOnly disabled />
                </div>
                 {userProfile?.isAdmin && (
                    <div className="space-y-2">
                        <Label htmlFor="reportState">State for Report</Label>
                        <Select onValueChange={setReportState} value={reportState}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a state..." />
                            </SelectTrigger>
                            <SelectContent>
                                {NIGERIAN_STATES.map(state => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of Trip</Label>
                    <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="departureDate">Departure Date</Label>
                        <Input id="departureDate" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="returnDate">Return Date</Label>
                        <Input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Report Preview */}
            <div className="border rounded-lg p-4 bg-muted/30 max-h-[50vh] overflow-y-auto">
                <div ref={reportRef} className="p-4 bg-white text-black printable-area">
                    <h2 className="text-xl font-bold text-center mb-4">TRAVEL SIGN-OFF SHEET</h2>
                    <table className="w-full border-collapse border border-black text-sm mb-4">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 font-semibold">Officer's Name:</td>
                                <td className="border border-black p-2">{officerName}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-semibold">State:</td>
                                <td className="border border-black p-2">{reportState}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-semibold">Destination:</td>
                                <td className="border border-black p-2">{destination}</td>
                            </tr>
                             <tr>
                                <td className="border border-black p-2 font-semibold">Purpose of Trip:</td>
                                <td className="border border-black p-2">{purpose}</td>
                            </tr>
                             <tr>
                                <td className="border border-black p-2 font-semibold">Departure Date:</td>
                                <td className="border border-black p-2">{departureDate}</td>
                            </tr>
                             <tr>
                                <td className="border border-black p-2 font-semibold">Return Date:</td>
                                <td className="border border-black p-2">{returnDate}</td>
                            </tr>
                        </tbody>
                    </table>

                     <h3 className="font-bold mt-4 mb-2 text-center">ASSET VERIFICATION SUMMARY FOR {reportState.toUpperCase()}</h3>
                      <table className="w-full border-collapse border border-black text-sm mb-4">
                          <thead>
                              <tr className="bg-gray-200">
                                  <th className="border border-black p-2">Status</th>
                                  <th className="border border-black p-2">Count</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td className="border border-black p-2">Total Verified</td>
                                  <td className="border border-black p-2">{verifiedAssets.length}</td>
                              </tr>
                               <tr>
                                  <td className="border border-black p-2">Total Unverified/Discrepancy</td>
                                  <td className="border border-black p-2">{unverifiedAssetsCount}</td>
                              </tr>
                              <tr className="bg-gray-100 font-bold">
                                  <td className="border border-black p-2">Total Assets in State</td>
                                  <td className="border border-black p-2">{reportAssets.length}</td>
                              </tr>
                          </tbody>
                      </table>

                    <h3 className="font-bold mt-4 mb-2 text-center">ASSETS CARRIED</h3>
                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">S/N</th>
                                <th className="border border-black p-2">Asset Description</th>
                                <th className="border border-black p-2">Asset ID</th>
                                <th className="border border-black p-2">Serial Number</th>
                            </tr>
                        </thead>
                         <tbody>
                            {verifiedAssets.length > 0 ? (
                                verifiedAssets.slice(0, 10).map((asset, index) => (
                                    <tr key={asset.id}>
                                        <td className="border border-black p-2">{index + 1}</td>
                                        <td className="border border-black p-2">{asset.description}</td>
                                        <td className="border border-black p-2">{asset.assetIdCode}</td>
                                        <td className="border border-black p-2">{asset.serialNumber}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="border border-black p-2 text-center">No verified assets to report.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-8 mt-16">
                        <div className="space-y-2">
                            <div className="border-t border-black pt-1 text-center">Signature</div>
                        </div>
                        <div className="space-y-2">
                            <div className="border-t border-black pt-1 text-center">Date</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePrint}>Print Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
