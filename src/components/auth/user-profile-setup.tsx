
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { anonymousSignIn, signInWithGoogle } from '@/lib/auth';

export default function UserProfileSetup() {
  const [isLoading, setIsLoading] = useState<null | 'google' | 'guest'>(null);
  const { user } = useAuth(); // We just need to know if a user exists

  const handleGuestLogin = async () => {
    setIsLoading('guest');
    try {
      await anonymousSignIn();
      // onAuthStateChanged in AuthProvider will handle the rest
    } catch (error) {
      console.error("Guest login failed:", error);
      setIsLoading(null);
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading('google');
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Google sign in failed:", error);
      setIsLoading(null);
    }
  };

  // Don't render anything if user is already logged in, the page will redirect.
  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LoginForm />
               <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={!!isLoading}>
                {isLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 173.5 56.7l-76.3 64.5C307.4 99.8 280.7 88 248 88c-73.2 0-133.1 59.2-133.1 131.9s59.9 131.9 133.1 131.9c51.5 0 92.2-28.7 108.3-43.9l-65.7-54.6H248v-89.9h234.9c4.8 25.6 7.1 53.4 7.1 82.9z"></path></svg>}
                Google
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
            </CardContent>
          </Card>
        </TabsContent>
        <div className="mt-4 text-center text-sm">
          Or
        </div>
        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={handleGuestLogin}
          disabled={!!isLoading}
        >
          {isLoading === 'guest' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue as Guest (Read-Only)
        </Button>
      </Tabs>
    </div>
  );
}
