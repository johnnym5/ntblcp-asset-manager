
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
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { anonymousSignIn } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function UserProfileSetup() {
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const { user } = useAuth(); // We just need to know if a user exists

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await anonymousSignIn();
      // onAuthStateChanged in AuthProvider will handle the rest
    } catch (error) {
      console.error("Guest login failed:", error);
    } finally {
      setIsGuestLoading(false);
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
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to get started. New accounts have guest permissions by default.
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
          disabled={isGuestLoading}
        >
          {isGuestLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue as Guest
        </Button>
      </Tabs>
    </div>
  );
}
