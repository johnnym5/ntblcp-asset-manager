
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { loginWithEmail, signUpWithEmail, signInWithGoogle, anonymousSignIn } from '@/lib/auth';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, UserPlus } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const signUpSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const { user } = useAuth();
  
  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  
  if (user) {
    router.push('/assets');
    return null;
  }

  const onSignInSubmit = async (values: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    try {
      await loginWithEmail(values.email, values.password);
      router.push('/assets');
    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please check your credentials and try again.';
      } else {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    try {
      await signUpWithEmail(values.email, values.password, values.displayName);
      router.push('/assets');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/assets');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign In Failed',
        description: 'Could not sign in with Google. Please try again.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsGuestLoading(true);
    try {
      await anonymousSignIn();
      router.push('/assets');
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Guest Sign In Failed',
        description: 'Could not sign in as guest. Please try again.',
      });
    } finally {
      setIsGuestLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">NTBLCP Asset Manager</CardTitle>
            <CardDescription>Sign in to access your asset dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sign-in" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">
                  <User className="mr-2" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="sign-up">
                  <UserPlus className="mr-2" /> Sign Up
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sign-in">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4">
                    <FormField control={signInForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="m@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signInForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="sign-up">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                    <FormField control={signUpForm.control} name="displayName" render={({ field }) => (
                       <FormItem>
                         <FormLabel>Full Name</FormLabel>
                         <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                         <FormMessage />
                       </FormItem>
                    )} />
                    <FormField control={signUpForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="m@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signUpForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 174.3 57.9l-67.4 64.4C309.1 98.2 281.7 88 248 88c-73.2 0-132.3 59.2-132.3 131.8s59.1 131.8 132.3 131.8c76.3 0 114.7-53.7 122.3-81.8H248v-69h239.5c2.3 12.7 3.5 25.8 3.5 39.8z"></path></svg>
                }
                Google
              </Button>
              <Button variant="outline" onClick={handleGuestSignIn} disabled={isGuestLoading}>
                 {isGuestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4"/> }
                Guest
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
