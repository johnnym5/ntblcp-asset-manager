'use client';

/**
 * @fileOverview Visual Evidence Gallery - High-Fidelity Asset Media Workspace.
 * Phase 39: Aggregated view of capturing technical evidence across the project.
 */

import React, { useMemo, useState } from 'react';
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
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { transformAssetToRecord } from '@/lib/registry-utils';
import type { Asset } from '@/types/domain';

export default function GalleryPage() {
  const { assets, settingsLoaded } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const mediaAssets = useMemo(() => {
    return assets.filter(a => !!a.photoDataUri);
  }, [assets]);

  const filteredMedia = useMemo(() => {
    if (!searchTerm) return mediaAssets;
    const term = searchTerm.toLowerCase();
    return mediaAssets.filter(a => 
      a.description.toLowerCase().includes(term) || 
      a.location.toLowerCase().includes(term) ||
      a.assetIdCode?.toLowerCase().includes(term)
    );
  }, [mediaAssets, searchTerm]);

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
              Visual Audit Aggregation & Technical Proof Pulse
            </p>
          </div>
          <Badge variant="outline" className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary shadow-sm">
            {filteredMedia.length} Visual Pulses Discovered
          </Badge>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 px-2">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by ID, Description or Location..." 
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
        {filteredMedia.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-2">
            <AnimatePresence mode="popLayout">
              {filteredMedia.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Card 
                    className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden border-2 border-border/40 hover:border-primary/40 shadow-lg cursor-pointer bg-card transition-all"
                    onClick={() => handleInspect(asset.id)}
                  >
                    <img 
                      src={asset.photoDataUri} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={asset.description}
                      data-ai-hint="asset technical evidence"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 backdrop-blur-md font-black uppercase text-[8px] tracking-widest border-none h-6">
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
          <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8 px-2 border-4 border-dashed rounded-[4rem]">
            <ImageIcon className="h-32 w-32" />
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-widest">Evidence Silent</h3>
              <p className="text-sm font-medium italic">No visual pulses detected in the current query scope.</p>
            </div>
          </div>
        )}
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
