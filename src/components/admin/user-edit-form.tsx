
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  loginName: z.string().min(2, 'Login name must be at least 2 characters.').transform(v => v.toLowerCase().trim()),
  states: z.array(z.string()).min(1, 'At least one state must be selected.'),
  isAdmin: z.boolean(),
  isGuest: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserEditFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AuthorizedUser | null;
  onSave: (user: AuthorizedUser) => Promise<void>;
}

export function UserEditForm({ isOpen, onOpenChange, user, onSave }: UserEditFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      loginName: '',
      states: [],
      isAdmin: false,
      isGuest: false,
    },
  });
  
  const isEditing = !!user;

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          displayName: user.displayName,
          loginName: user.loginName,
          states: user.states,
          isAdmin: user.isAdmin,
          isGuest: user.isGuest || false,
        });
      } else {
        form.reset({
          displayName: '',
          loginName: '',
          states: [],
          isAdmin: false,
          isGuest: false,
        });
      }
    }
  }, [isOpen, user, form]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSaving(true);
    const userToSave: AuthorizedUser = {
      ...data,
      password: user?.password || '0000',
      passwordChanged: user?.passwordChanged || false,
    };
    await onSave(userToSave);
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
                    <Input placeholder="john doe" {...field} disabled={isEditing} />
                  </FormControl>
                   <FormDescription>
                    This is the unique, lowercase name the user will enter to log in. Cannot be changed after creation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value && field.value.length > 0 ? `${field.value.length} selected` : "Select states"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search states..." />
                            <CommandList>
                                <CommandEmpty>No state found.</CommandEmpty>
                                <CommandGroup>
                                    {NIGERIAN_STATES.map((state) => (
                                    <CommandItem
                                        value={state}
                                        key={state}
                                        onSelect={() => {
                                            const selectedStates = field.value || [];
                                            const isSelected = selectedStates.includes(state);
                                            form.setValue(
                                                "states",
                                                isSelected ? selectedStates.filter(s => s !== state) : [...selectedStates, state]
                                            );
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            (field.value || []).includes(state)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        {state}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-1">
                        {(field.value || []).map(state => <Badge key={state} variant="secondary">{state}</Badge>)}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
