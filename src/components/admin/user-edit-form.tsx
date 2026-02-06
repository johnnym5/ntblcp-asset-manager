
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
import { NIGERIAN_STATES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  loginName: z.string().min(2, 'Login name must be at least 2 characters.').transform(v => v.toLowerCase().trim()),
  states: z.array(z.string()).min(1, 'At least one state must be selected.'),
  isAdmin: z.boolean(),
  isGuest: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  canAddAssets: z.boolean(),
  canEditAssets: z.boolean(),
  canVerifyAssets: z.boolean(),
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
      isGuest: false,
      password: '',
      confirmPassword: '',
      canAddAssets: false,
      canEditAssets: false,
      canVerifyAssets: false,
    },
  });
  
  const isAdminValue = form.watch('isAdmin');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          displayName: user.displayName,
          loginName: user.loginName,
          states: user.states,
          isAdmin: user.isAdmin,
          isGuest: user.isGuest || false,
          password: user.password || '',
          confirmPassword: user.password || '',
          canAddAssets: user.canAddAssets || false,
          canEditAssets: user.canEditAssets || false,
          canVerifyAssets: user.canVerifyAssets || false,
        });
      } else {
        form.reset({
          displayName: '',
          loginName: '',
          states: [],
          isAdmin: false,
          isGuest: false,
          password: '',
          confirmPassword: '',
          canAddAssets: true,
          canEditAssets: true,
          canVerifyAssets: false,
        });
      }
       form.clearErrors();
    }
  }, [isOpen, user, form]);

  useEffect(() => {
    if (isAdminValue) {
      form.setValue('states', ['All']);
    } else {
      if (JSON.stringify(form.getValues('states')) === JSON.stringify(['All'])) {
        form.setValue('states', []);
      }
    }
  }, [isAdminValue, form]);

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
    if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { message: "Passwords do not match." });
        return;
    }

    setIsSaving(true);
    
    const { confirmPassword, ...userToSaveData } = data;
    const userToSave: Partial<AuthorizedUser> = userToSaveData;

    if (!userToSave.password) {
        delete userToSave.password; // Don't send empty password to save function
    }

    await onSave(userToSave, user?.loginName);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            Manage user details and permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Display Name</FormLabel>
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
                    <FormLabel>Login Name</FormLabel>
                    <FormControl>
                        <Input placeholder="jdoe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Min. 6 characters" {...field} />
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
                            <Input type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
             </div>
            <FormField
                control={form.control}
                name="states"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Assigned States</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            disabled={isAdminValue}
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value?.includes('All') ? 'All States (Admin)' : (field.value && field.value.length > 0 ? `${field.value.length} selected` : "Select states")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                           <ScrollArea className="h-[200px]">
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
                    <div className="flex flex-wrap gap-1 pt-1">
                        {(field.value || []).map(state => <Badge key={state} variant="secondary">{state}</Badge>)}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            <Separator />
            
            <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Administrator</FormLabel>
                        <FormDescription>
                        Grants full access to all data and settings.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="isGuest"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Guest Account</FormLabel>
                        <FormDescription>
                        Read-only access with no password required.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="canAddAssets"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Allow Adding Assets</FormLabel>
                        <FormDescription>
                         User can create new asset records.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="canEditAssets"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Allow Editing Assets</FormLabel>
                        <FormDescription>
                         User can modify existing asset records.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="canVerifyAssets"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Allow Verifying Assets</FormLabel>
                        <FormDescription>
                         User can verify assets and update their status.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
             <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    Save Changes
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
