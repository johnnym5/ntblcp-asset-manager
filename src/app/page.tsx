'use client';

import React from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { TrendingUp, ShieldCheck, AlertCircle, Activity, ArrowRight, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import UserProfileSetup from '@/components/user-profile-setup';
import Link from 'next/link';

export default function DashboardPage() {
  const { loading, profileSetupComplete } = useAuth();
  const { assets, settingsLoaded } = useAppState();

  // Move useMemo to the top to satisfy the Rules of Hooks
  const stats = React.useMemo(() => {
    const total = assets?.length || 0;
    const verified = assets?.filter(a => a.verifiedStatus === 'Verified').length || 0;
    const discrepancy = assets?.filter(a => a.verifiedStatus === 'Discrepancy').length || 0;
    const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { total, verified, discrepancy, coverage };
  }, [assets]);

  // Conditional returns MUST happen after all hook calls
  if (loading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Global Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter mb-2">{stats.coverage}%</div>
              <Progress value={stats.coverage} className="h-1.5" />
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verified Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter">{stats.verified}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Confirmed Field Pulses</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-orange-500">{stats.total - stats.verified}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Awaiting Inspection</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter text-destructive">{stats.discrepancy}</div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Integrity Failures</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-border/40 shadow-none bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Recent Activity</CardTitle>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Latest modifications across all regions</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/assets" className="text-[10px] font-black uppercase tracking-widest">
                  View All <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-muted rounded-xl">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black">{asset.description}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{asset.location} • {asset.category}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {asset.verifiedStatus || 'UNVERIFIED'}
                    </div>
                  </div>
                ))}
                {assets.length === 0 && (
                  <div className="py-10 text-center opacity-40">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero historical activity detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-border/40 shadow-none bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Verification Pulse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    <span className="text-xs font-bold uppercase tracking-tight">Data Fidelity</span>
                  </div>
                  <span className="text-xs font-black">Stable</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tight">Weekly Delta</span>
                  </div>
                  <span className="text-xs font-black">+12.4%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-tight">Sync Status</span>
                  </div>
                  <span className="text-xs font-black">All Clear</span>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-3xl bg-muted/20 border-2 border-dashed border-border/40 text-center space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ready for Field Audit?</h4>
              <Button className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20" asChild>
                <Link href="/import">Initialize Import Engine</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
