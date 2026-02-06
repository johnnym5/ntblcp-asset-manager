'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
import { NIGERIAN_STATES } from '@/lib/constants';
import { Boxes, Loader2, AlertCircle } from 'lucide-react';
import type { AuthorizedUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const signupFormSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
  state: z.string().min(1, 'Please select your primary state.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { appSettings, setAppSettings } = useAppState();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      state: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsSaving(true);
    setFormError(null);

    const { authorizedUsers } = appSettings;

    const emailExists = authorizedUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (emailExists) {
      form.setError('email', { message: 'This email address is already in use.' });
      setIsSaving(false);
      return;
    }
    
    const loginNameExists = authorizedUsers.some(u => u.loginName === data.displayName.toLowerCase().trim());
    if (loginNameExists) {
      form.setError('displayName', { message: 'This display name is already taken. Please choose another.' });
      setIsSaving(false);
      return;
    }
    
    const newUser: AuthorizedUser = {
        loginName: data.displayName.toLowerCase().trim(),
        displayName: data.displayName.trim(),
        email: data.email.trim(),
        password: data.password,
        states: [data.state],
        isAdmin: false,
        isGuest: false,
        canAddAssets: true,
        canEditAssets: true,
    };

    const newUsers = [...authorizedUsers, newUser];

    try {
      await updateSettings({ authorizedUsers: newUsers });
      setAppSettings(prev => ({ ...prev, authorizedUsers: newUsers }));
      
      toast({
        title: 'Account Created!',
        description: 'You can now sign in with your new credentials.',
      });
      
      router.push('/');

    } catch (e) {
      setFormError('Failed to create account. Please try again later.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
         <div className="text-center">
            <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
                <Boxes className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Create an Account</h1>
            <p className="text-muted-foreground">Enter your details below to register.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
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
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your assigned state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NIGERIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/" className="underline font-medium text-primary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
