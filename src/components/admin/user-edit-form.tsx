
'use client';

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
import { ChevronsUpDown, Check, MapPin, ShieldCheck, User, Mail, PlusCircle, FileEdit } from 'lucide-react';
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
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
        canAddAssets: false, // Default false per user request
        canEditAssets: false  // Default false per user request
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
            confirmPassword: user.password || '' 
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
            canEditAssets: false 
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
    await onSave(userToSave as AuthorizedUser, user?.loginName);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0 border-primary/10 shadow-2xl">
        <DialogHeader className="p-8 bg-muted/20 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
            <User className="h-6 w-6 text-primary"/> {user ? 'Edit System Identity' : 'New Registry Identity'}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            Define administrative roles and regional authorized scopes.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-8 space-y-8">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Primary Identification</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="displayName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input placeholder="John Doe" {...field} className="rounded-xl"/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="loginName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Login ID (Unique)</FormLabel>
                                <FormControl><Input placeholder="jdoe" {...field} className="rounded-xl"/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email Address</FormLabel>
                            <FormControl><Input placeholder="j.doe@example.com" type="email" {...field} className="rounded-xl"/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Security & Passphrase</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Access Passphrase</FormLabel><FormControl><Input type="password" {...field} className="rounded-xl"/></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirm Passphrase</FormLabel><FormControl><Input type="password" {...field} className="rounded-xl"/></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Operational Permissions</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="canAddAssets" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <PlusCircle className="h-3.5 w-3.5 text-primary" />
                                        <FormLabel className="font-black text-xs uppercase">Allow Add</FormLabel>
                                    </div>
                                    <FormDescription className="text-[8px] font-bold uppercase opacity-60">Permission to create new records.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="canEditAssets" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <FileEdit className="h-3.5 w-3.5 text-primary" />
                                        <FormLabel className="font-black text-xs uppercase">Allow Update</FormLabel>
                                    </div>
                                    <FormDescription className="text-[8px] font-bold uppercase opacity-60">Permission to modify existing items.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                            </FormItem>
                        )}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Governance & Authorization</Label>
                    <div className="grid grid-cols-1 gap-3">
                        <FormField control={form.control} name="isAdmin" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <FormLabel className="font-black text-sm">Super Administrator</FormLabel>
                                    <FormDescription className="text-[10px] font-bold uppercase opacity-60">Unrestricted global project access and user management.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isZonalAdmin', false); }}/></FormControl>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="isZonalAdmin" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10">
                                <div className="space-y-0.5">
                                    <FormLabel className="font-black text-sm">Zonal Administrator</FormLabel>
                                    <FormDescription className="text-[10px] font-bold uppercase opacity-60">Manages all states within a Nigerian geopolitical zone.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isAdmin', false); }}/></FormControl>
                            </FormItem>
                        )}/>
                    </div>

                    {isZonalAdmin && (
                        <FormField control={form.control} name="assignedZone" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <FormLabel>Assigned Geopolitical Zone</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Zone..." /></SelectTrigger>
                                    <SelectContent className="rounded-xl">{ZONAL_STORES.map(z => <SelectItem key={z} value={z} className="rounded-lg">{z}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                    )}
                </div>

                {!isAdmin && !isZonalAdmin && (
                    <FormField control={form.control} name="states" render={({ field }) => (
                        <FormItem className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Regional Authorized Scope</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-11 justify-between rounded-xl border-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary opacity-60" />
                                            {field.value?.length > 0 ? <span className="font-black text-xs">{field.value.length} States Selected</span> : "Select Authorized States..."}
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-2xl border-primary/10 overflow-hidden" align="start">
                                    <div className="p-4 bg-muted/30 border-b">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Select Regional Jurisdiction</h4>
                                    </div>
                                    <ScrollArea className="h-72">
                                        <div className="p-3 grid grid-cols-2 gap-1">
                                            {NIGERIAN_STATES.map(s => (
                                                <div key={s} className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-xl cursor-pointer transition-colors group" onClick={() => {
                                                    const cur = field.value || [];
                                                    field.onChange(cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
                                                }}>
                                                    <Checkbox checked={field.value?.includes(s)} className="rounded-md h-5 w-5"/>
                                                    <span className="text-xs font-bold group-hover:text-primary transition-colors">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {field.value?.map(s => (
                                    <Badge key={s} variant="secondary" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-primary/5 border-primary/10 text-primary">
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
        <DialogFooter className="p-8 bg-muted/20 border-t gap-3">
            <DialogClose asChild><Button variant="ghost" className="font-bold px-6 rounded-xl">Discard Changes</Button></DialogClose>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSaving} className="h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 px-8 rounded-xl">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <ShieldCheck className="h-4 w-4 mr-2"/>}
                Commit Identity Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
