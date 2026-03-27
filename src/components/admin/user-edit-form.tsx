'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { NIGERIAN_STATES, NIGERIAN_ZONES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check, ShieldAlert, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').transform(v => v.trim()),
  loginName: z.string().min(2, 'Login name must be at least 2 characters.').transform(v => v.toLowerCase().trim()),
  states: z.array(z.string()).min(1, 'At least one state must be selected.'),
  isAdmin: z.boolean(),
  isZonalAdmin: z.boolean(),
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
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      loginName: '',
      states: [],
      isAdmin: false,
      isZonalAdmin: false,
      assignedZone: '',
      isGuest: false,
      password: '',
      confirmPassword: '',
      canAddAssets: false,
      canEditAssets: false,
    },
  });
  
  const isAdminValue = form.watch('isAdmin');
  const isZonalAdminValue = form.watch('isZonalAdmin');
  const assignedZoneValue = form.watch('assignedZone');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          displayName: user.displayName,
          loginName: user.loginName,
          states: user.states || [],
          isAdmin: user.isAdmin,
          isZonalAdmin: user.isZonalAdmin || false,
          assignedZone: user.assignedZone || '',
          isGuest: user.isGuest || false,
          password: user.password || '',
          confirmPassword: user.password || '',
          canAddAssets: user.canAddAssets || false,
          canEditAssets: user.canEditAssets || false,
        });
      } else {
        form.reset({
          displayName: '',
          loginName: '',
          states: [],
          isAdmin: false,
          isZonalAdmin: false,
          assignedZone: '',
          isGuest: false,
          password: '',
          confirmPassword: '',
          canAddAssets: true,
          canEditAssets: true,
        });
      }
       form.clearErrors();
    }
  }, [isOpen, user, form]);

  useEffect(() => {
    if (isAdminValue) {
      form.setValue('states', ['All']);
      form.setValue('isZonalAdmin', false);
    } else if (!isZonalAdminValue) {
      if (JSON.stringify(form.getValues('states')) === JSON.stringify(['All'])) {
        form.setValue('states', []);
      }
    }
  }, [isAdminValue, isZonalAdminValue, form]);

  useEffect(() => {
    if (isZonalAdminValue && assignedZoneValue) {
        const zoneStates = NIGERIAN_ZONES[assignedZoneValue] || [];
        form.setValue('states', zoneStates);
        form.setValue('isAdmin', false);
    }
  }, [isZonalAdminValue, assignedZoneValue, form]);

  const handleSubmit = async (data: UserFormValues) => {
    form.clearErrors();

    if (!isEditing && (!data.password || data.password.length < 6)) {
        form.setError("password", { message: "Password of at least 6 characters is required for new users." });
        return;
    }
    if (data.password && data.password.length > 0 && data.password.length < 6) {
        form.setError("password", { message: "Password must be at least 6 characters." });
        return;
    }

    setIsSaving(true);
    
    const { confirmPassword, ...userToSaveData } = data;
    const userToSave: Partial<AuthorizedUser> = userToSaveData;

    if (!userToSave.password) {
        delete userToSave.password;
    }

    await onSave(userToSave, user?.loginName);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Edit System User' : 'Register New User'}
          </DialogTitle>
          <DialogDescription>
            Configure user credentials, regional access scopes, and functional permissions.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                          <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="loginName"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Login Identifier</FormLabel>
                      <FormControl>
                          <Input placeholder="jdoe" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                              <Input type="password" placeholder="Min. 6 characters" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                              <Input type="password" placeholder="Re-type password" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Role & Access Level</h4>
                
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-background shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Super Administrator</FormLabel>
                            <FormDescription className="text-[11px]">
                            Full unrestricted access to all states, projects, and global configurations.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isZonalAdmin"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-background shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2"><Map className="h-4 w-4 text-blue-500" /> Zonal Manager</FormLabel>
                            <FormDescription className="text-[11px]">
                            Access to all states within a specific geographic zone.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isAdminValue} />
                        </FormControl>
                        </FormItem>
                    )}
                  />
                </div>

                {isZonalAdminValue && (
                  <div className="p-4 bg-blue-500/5 border border-blue-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                    <FormField
                      control={form.control}
                      name="assignedZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-blue-600 font-black text-[10px] uppercase">Select Zone Assignment</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-blue-200">
                                <SelectValue placeholder="Choose a Zone..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.keys(NIGERIAN_ZONES).map(zone => (
                                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="states"
                  render={({ field }) => (
                      <FormItem className="flex flex-col">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Regional Scoping (States)</FormLabel>
                      <Popover>
                          <PopoverTrigger asChild>
                          <FormControl>
                              <Button
                              disabled={isAdminValue || isZonalAdminValue}
                              variant="outline"
                              role="combobox"
                              className={cn(
                                  "w-full justify-between h-11 rounded-xl shadow-inner bg-muted/20 border-none",
                                  (!field.value || field.value.length === 0) && "text-muted-foreground"
                              )}
                              >
                              {isAdminValue ? 'Global Project Scope (All States)' : (field.value && field.value.length > 0 ? `${field.value.length} States Selected` : "Manual State Selection")}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <ScrollArea className="h-[250px]">
                                <div className="p-1">
                                  {NIGERIAN_STATES.map((state) => {
                                    const isSelected = (field.value || []).includes(state);
                                    return (
                                      <div
                                        key={state}
                                        onClick={() => {
                                          const selectedStates = field.value || [];
                                          const isCurrentlySelected = selectedStates.includes(state);
                                          form.setValue(
                                            "states",
                                            isCurrentlySelected
                                              ? selectedStates.filter(s => s !== state)
                                              : [...selectedStates, state]
                                          );
                                        }}
                                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                      >
                                        <div
                                          className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            isSelected
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50 [&_svg]:invisible"
                                          )}
                                        >
                                          <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {state}
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                          </PopoverContent>
                      </Popover>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                          {(field.value || []).map(state => <Badge key={state} variant="secondary" className="font-bold text-[10px]">{state}</Badge>)}
                      </div>
                      <FormMessage />
                      </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Functional Permissions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="canAddAssets"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 bg-background">
                        <FormLabel className="text-xs">Add Assets</FormLabel>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="canEditAssets"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 bg-background">
                        <FormLabel className="text-xs">Edit Assets</FormLabel>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isGuest"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 bg-background col-span-full">
                        <FormLabel className="text-xs">Guest Account (Read Only)</FormLabel>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <DialogClose asChild>
              <Button variant="ghost" type="button" className="font-bold">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={form.handleSubmit(handleSubmit)} disabled={isSaving} className="px-8 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs h-11">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
