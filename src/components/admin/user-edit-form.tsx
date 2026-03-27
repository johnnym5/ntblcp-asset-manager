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
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedUser } from '@/lib/types';
import { NIGERIAN_STATES, NIGERIAN_ZONES, ZONAL_STORES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check, MapPin, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name required.').transform(v => v.trim()),
  loginName: z.string().min(2, 'Login name required.').transform(v => v.toLowerCase().trim()),
  states: z.array(z.string()).min(1, 'Select at least one state.'),
  isAdmin: z.boolean(),
  isZonalAdmin: z.boolean().optional(),
  assignedZone: z.string().optional(),
  isGuest: z.boolean(),
  password: z.string().optional().transform(v => v?.trim()),
  confirmPassword: z.string().optional().transform(v => v?.trim()),
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
    defaultValues: { displayName: '', loginName: '', states: [], isAdmin: false, isZonalAdmin: false, assignedZone: '', isGuest: false, password: '', confirmPassword: '', canAddAssets: true, canEditAssets: true },
  });
  
  const isAdmin = form.watch('isAdmin');
  const isZonalAdmin = form.watch('isZonalAdmin');
  const assignedZone = form.watch('assignedZone');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({ ...user, password: user.password || '', confirmPassword: user.password || '' });
      } else {
        form.reset({ displayName: '', loginName: '', states: [], isAdmin: false, isZonalAdmin: false, assignedZone: '', isGuest: false, password: '', confirmPassword: '', canAddAssets: true, canEditAssets: true });
      }
    }
  }, [isOpen, user, form]);

  // Role Logic Sync
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
      <DialogContent className="sm:max-w-lg rounded-3xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-muted/20 border-b">
          <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/> {user ? 'Edit Identity' : 'New System Identity'}</DialogTitle>
          <DialogDescription>Define access roles and regional scopes.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="displayName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} className="rounded-xl"/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="loginName" render={({ field }) => (
                        <FormItem><FormLabel>Login ID</FormLabel><FormControl><Input placeholder="jdoe" {...field} className="rounded-xl"/></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Credentials</FormLabel><FormControl><Input type="password" placeholder="Passphrase" {...field} className="rounded-xl"/></FormControl></FormItem>
                    )}/>
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                        <FormItem><FormLabel>Confirm</FormLabel><FormControl><Input type="password" {...field} className="rounded-xl"/></FormControl></FormItem>
                    )}/>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Governance Level</Label>
                    
                    <FormField control={form.control} name="isAdmin" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 rounded-2xl border bg-muted/5">
                            <div className="space-y-0.5"><FormLabel className="font-bold">Super Administrator</FormLabel><FormDescription className="text-[10px]">Unrestricted global project access.</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isZonalAdmin', false); }}/></FormControl>
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="isZonalAdmin" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 rounded-2xl border bg-muted/5">
                            <div className="space-y-0.5"><FormLabel className="font-bold">Zonal Administrator</FormLabel><FormDescription className="text-[10px]">Manages all states in a Nigerian zone.</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); if(v) form.setValue('isAdmin', false); }}/></FormControl>
                        </FormItem>
                    )}/>

                    {isZonalAdmin && (
                        <FormField control={form.control} name="assignedZone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned Geopolitical Zone</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Zone..." /></SelectTrigger>
                                    <SelectContent className="rounded-xl">{ZONAL_STORES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                    )}
                </div>

                {!isAdmin && !isZonalAdmin && (
                    <FormField control={form.control} name="states" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Regional Authorized Scope</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between rounded-xl">
                                        {field.value?.length > 0 ? `${field.value.length} States` : "Select states..."}
                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 rounded-2xl">
                                    <ScrollArea className="h-64">
                                        <div className="p-2 space-y-1">
                                            {NIGERIAN_STATES.map(s => (
                                                <div key={s} className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => {
                                                    const cur = field.value || [];
                                                    field.onChange(cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
                                                }}>
                                                    <Checkbox checked={field.value?.includes(s)} />
                                                    <span className="text-sm">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )}/>
                )}
            </form>
            </Form>
        </ScrollArea>
        <DialogFooter className="p-6 bg-muted/20 border-t gap-2">
            <DialogClose asChild><Button variant="outline" className="rounded-xl">Cancel</Button></DialogClose>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSaving} className="rounded-xl font-bold">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <ShieldCheck className="h-4 w-4 mr-2"/>}
                Initialize Permissions
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
