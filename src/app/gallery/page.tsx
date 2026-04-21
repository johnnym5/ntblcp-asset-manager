'use client';

/**
 * @fileOverview Visual Evidence Gallery - High-Fidelity Asset Media Workspace.
 * Phase 66: Integrated Forensic Signature Audit Tab.
 * Phase 1985: Hardened for build with cn import and correct asset properties.
 */

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { 
  Camera, 
  Search, 
  Filter, 
  LayoutGrid, 
  Maximize2, 
  Eye, 
  Tag, 
  MapPin, 
  Calendar,
  Image as ImageIcon,
  Loader2,
  X,
  PenTool,
  CheckCircle2,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';

export default function GalleryPage() {
  const { assets, settingsLoaded } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("photos");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const mediaAssets = useMemo(() => {
    return assets.filter(a => !!a.photoDataUri || !!a.photoUrl);
  }, [assets]);

  const forensicAssets = useMemo(() => {
    return assets.filter(a => !!a.signatureDataUri || !!a.signatureUrl);
  }, [assets]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 'photos' ? mediaAssets : forensicAssets;
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(a => 
      (a.description || '').toLowerCase().includes(term) || 
      (a.location || '').toLowerCase().includes(term) ||
      (a.assetIdCode || '').toLowerCase().includes(term)
    );
  }, [mediaAssets, forensicAssets, searchTerm, activeTab]);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, []) : undefined;
  }, [selectedAssetId, assets]);

  if (!settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-32">
        {/* Header Pulse */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              Evidence Gallery
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Visual Audit Aggregation & Forensic Anchor Pulse
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
              <TabsList className="bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40 h-auto">
                <TabsTrigger value="photos" className="px-6 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black">
                  <ImageIcon className="h-3 w-3" /> Visual Evidence
                </TabsTrigger>
                <TabsTrigger value="signatures" className="px-6 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-black">
                  <PenTool className="h-3 w-3" /> Forensic Pulse
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 px-2">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={`Search ${activeTab === 'photos' ? 'visual evidence' : 'signature anchors'}...`} 
              className="pl-14 h-16 rounded-[1.5rem] bg-card border-none shadow-xl font-bold text-sm focus-visible:ring-primary/20 transition-all placeholder:opacity-30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-16 px-10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest gap-3 bg-card border-none shadow-xl transition-all hover:bg-primary/5 tactile-pulse">
            <Filter className="h-4 w-4" /> Filter Evidence
          </Button>
        </div>

        {/* Masonry-style Grid */}
        <div className="px-2">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((asset) => (
                  <motion.div
                    key={`${activeTab}-${asset.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Card 
                      className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden border-2 border-border/40 hover:border-primary/40 shadow-lg cursor-pointer bg-white transition-all"
                      onClick={() => handleInspect(asset.id)}
                    >
                      <Image 
                        src={activeTab === 'photos' ? (asset.photoUrl || asset.photoDataUri || '') : (asset.signatureUrl || asset.signatureDataUri || '')} 
                        width={600}
                        height={400}
                        className={cn(
                          "absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110",
                          activeTab === 'photos' ? "object-cover" : "object-contain p-8 mix-blend-multiply opacity-80"
                        )} 
                        alt={asset.description}
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary/90 backdrop-blur-md font-black uppercase text-[8px] tracking-widest border-none h-6 text-black">
                          {asset.assetIdCode || 'PULSE'}
                        </Badge>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                        <h4 className="text-white font-black uppercase text-sm leading-tight line-clamp-2">
                          {asset.description}
                        </h4>
                        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/60">
                          <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {asset.location}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(asset.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                          <Maximize2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8 border-4 border-dashed rounded-[4rem]">
              <div className="p-10 bg-muted rounded-full">
                {activeTab === 'photos' ? <ImageIcon className="h-20 w-20" /> : <PenTool className="h-20 w-20" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-widest">{activeTab === 'photos' ? 'Evidence Silent' : 'Forensics Silent'}</h3>
                <p className="text-sm font-medium italic">No pulse detected in the current query scope.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => (window.location.href = `/assets?edit=${id}`)}
      />
    </AppLayout>
  );
}