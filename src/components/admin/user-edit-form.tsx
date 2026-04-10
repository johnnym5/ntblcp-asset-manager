'use client';

/**
 * @fileOverview UserEditForm - Personnel Identity Configuration.
 * Terminology: Passcode.
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AuthorizedUser } from '@/types/domain';
import { NIGERIAN_STATES, NIGERIAN_ZONES, ZONAL_STORES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check, MapPin, ShieldCheck, User, Mail, PlusCircle, FileEdit, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name required.'),
  loginName: z.string().min(2, 'Login name required.').transform(v => v.toLowerCase().trim()),
  email: z.string().email('Valid email address required.'),
  states: z.array(z.string()).min(1, 'Select at least one state.'),
  isAdmin: z.boolean(),
  isZonalAdmin: z.boolean().optional(),
  assignedZone: z.string().optional(),
  isGuest: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  canAddAssets: z.boolean(),
  canEditAssets: z.boolean(),
  role: z.enum(['ADMIN', 'MANAGER', 'VERIFIER', 'VIEWER', 'SUPERADMIN']).default('VERIFIER'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passcodes don't match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserEditFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AuthorizedUser | null;
  onSave: (userToSave: Partial<AuthorizedUser>, originalLoginName?: string) => Promise<void>;
}

export function UserEditForm({ isOpen, onOpenChange, user, onSave }: UserEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { 
        displayName: '', 
        loginName: '', 
        email: '',
        states: [], 
        isAdmin: false, 
        isZonalAdmin: false, 
        assignedZone: '', 
        isGuest: false, 
        password: '', 
        confirmPassword: '', 
        canAddAssets: false,
        canEditAssets: false,
        role: 'VERIFIER'
    },
  });
  
  const isAdmin = form.watch('isAdmin');
  const isZonalAdmin = form.watch('isZonalAdmin');
  const assignedZone = form.watch('assignedZone');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({ 
            ...user, 
            email: user.email || '',
            password: user.password || '', 
            confirmPassword: user.password || '',
            role: user.role || 'VERIFIER'
        });
      } else {
        form.reset({ 
            displayName: '', 
            loginName: '', 
            email: '',
            states: [], 
            isAdmin: false, 
            isZonalAdmin: false, 
            assignedZone: '', 
            isGuest: false, 
            password: '', 
            confirmPassword: '', 
            canAddAssets: false, 
            canEditAssets: false,
            role: 'VERIFIER'
        });
      }
    }
  }, [isOpen, user, form]);

  useEffect(() => {
    if (isAdmin) form.setValue('states', ['All']);
    else if (isZonalAdmin && assignedZone) {
        const zoneStates = NIGERIAN_ZONES[assignedZone as keyof typeof NIGERIAN_ZONES] || [];
        form.setValue('states', zoneStates);
    }
  }, [isAdmin, isZonalAdmin, assignedZone, form]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSaving(true);
    const { confirmPassword, ...userToSave } = data;
    
    // Explicitly derive role if not manually set correctly via switches
    let derivedRole = data.role;
    if (data.isAdmin) derivedRole = 'ADMIN';
    else if (data.isZonalAdmin) derivedRole = 'MANAGER';

    await onSave({ ...userToSave, role: derivedRole } as AuthorizedUser, user?.loginName);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0 border-primary/10 shadow-2xl bg-background">
        <DialogHeader className="p-8 bg-muted/20 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight leading-none text-foreground">
            <User className="h-6 w-6 text-primary"/> {user ? 'Edit Identity' : 'New Personnel'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 mt-1">
            Define system roles and authorized regional scopes.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-8 space-y-8">
                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Identity Hub</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="displayName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Full Name</FormLabel>
                                <FormControl><Input placeholder="Auditor Name" {...field} className="h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-primary/20" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="loginName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Login ID (Username)</FormLabel>
                                <FormControl><Input placeholder="username" {...field} className="h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-primary/20" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" /> Email Link</FormLabel>
                            <FormControl><Input placeholder="user@example.com" type="email" {...field} className="h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-primary/20" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Security Pulse</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">System Passcode</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-primary/20" /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Confirm Passcode</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-primary/20" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Capabilities</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="canAddAssets" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <PlusCircle className="h-3.5 w-3.5 text-primary" />
                                        <FormLabel className="font-black text-[10px] uppercase">Allow Entry</FormLabel>
                                    </div>
                                    <FormDescription className="text-[8px] font-bold uppercase opacity-40">Create new registry records.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="canEditAssets" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <FileEdit className="h-3.5 w-3.5 text-primary" />
                                        <FormLabel className="font-black text-[10px] uppercase">Allow Mutation</FormLabel>
                                    </div>
                                    <FormDescription className="text-[8px] font-bold uppercase opacity-40">Modify existing item attributes.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                            </FormItem>
                        )}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Governance Tiers</Label>
                    <div className="grid grid-cols-1 gap-3">
                        <FormField control={form.control} name="isAdmin" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 rounded-2xl border transition-all hover:bg-primary/[0.02] group">
                                <div className="space-y-0.5">
                                    <FormLabel className="font-black text-sm uppercase text-foreground group-hover:text-primary transition-colors">Super Administrator</FormLabel>
                                    <FormDescription className="text-[10px] font-bold uppercase opacity-40">Unrestricted global project access and user management.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isZonalAdmin', false); }}/></FormControl>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="isZonalAdmin" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 rounded-2xl border transition-all hover:bg-primary/[0.02] group">
                                <div className="space-y-0.5">
                                    <FormLabel className="font-black text-sm uppercase text-foreground group-hover:text-primary transition-colors">Zonal Administrator</FormLabel>
                                    <FormDescription className="text-[10px] font-bold uppercase opacity-40">Manages regional states within a geopolitical zone.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isAdmin', false); }}/></FormControl>
                            </FormItem>
                        )}/>
                    </div>

                    {isZonalAdmin && (
                        <FormField control={form.control} name="assignedZone" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Assigned Geopolitical Zone</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-12 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
                                        <SelectValue placeholder="Select Zone..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border">{ZONAL_STORES.map(z => <SelectItem key={z} value={z} className="rounded-lg text-[10px] font-black uppercase">{z}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                    )}
                </div>

                {!isAdmin && !isZonalAdmin && (
                    <FormField control={form.control} name="states" render={({ field }) => (
                        <FormItem className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2"><MapPin className="h-3 w-3" /> Regional Scope</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-14 justify-between rounded-xl border-2 border-border/40 bg-muted/10 hover:border-primary/40 transition-all">
                                        <div className="flex items-center gap-3">
                                            {field.value?.length > 0 ? (
                                                <Badge className="bg-primary text-black font-black text-[9px] h-6 px-3">{field.value.length} STATES</Badge>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-muted-foreground opacity-40">Select authorized states...</span>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 opacity-20" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-3xl border-primary/10 overflow-hidden" align="start">
                                    <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Select Regional Jurisdiction</h4>
                                        <Badge variant="outline" className="text-[8px] font-mono opacity-40">37 NODES</Badge>
                                    </div>
                                    <ScrollArea className="h-72 bg-background">
                                        <div className="p-3 grid grid-cols-2 gap-1">
                                            {NIGERIAN_STATES.map(s => (
                                                <div key={s} className="flex items-center gap-3 p-2.5 hover:bg-primary/5 rounded-xl cursor-pointer transition-colors group" onClick={() => {
                                                    const cur = field.value || [];
                                                    field.onChange(cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
                                                }}>
                                                    <Checkbox checked={field.value?.includes(s)} className="rounded-md h-5 w-5 border-2"/>
                                                    <span className="text-[11px] font-black uppercase group-hover:text-primary transition-colors">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                            <div className="flex flex-wrap gap-1.5 mt-4">
                                {field.value?.map(s => (
                                    <Badge key={s} variant="secondary" className="rounded-lg text-[8px] font-black uppercase tracking-tighter bg-muted border border-border/40 text-foreground/60">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                        </FormItem>
                    )}/>
                )}
            </form>
            </Form>
        </ScrollArea>
        <DialogFooter className="p-8 bg-muted/20 border-t gap-3 shrink-0">
            <DialogClose asChild><Button variant="ghost" className="font-black uppercase text-[10px] px-8 rounded-xl">Discard</Button></DialogClose>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSaving} className="h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 px-10 rounded-[1.5rem] bg-primary text-black transition-transform active:scale-95">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-3"/> : <ShieldCheck className="h-4 w-4 mr-3"/>}
                Commit Identity Pulse
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
