
'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { AuthorizedUser } from '@/lib/types';
import { useAppState } from '@/contexts/app-state-context';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export default function UserProfileSetup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const { login } = useAuth();
  const { appSettings } = useAppState();
  
  useEffect(() => {
    setError(null);
    const lowerCaseUsername = username.trim().toLowerCase();
    
    const user = appSettings.authorizedUsers.find(u => u.loginName === lowerCaseUsername);
    setFoundUser(user || null);

    if (user) {
        if (user.states.length === 1) {
            setSelectedState(user.states[0]);
        } else {
            setSelectedState('');
        }
    } else {
        setSelectedState('');
    }
  }, [username, appSettings.authorizedUsers]);

  const handleLogin = () => {
    if (!foundUser) {
      setError('User not found. Please enter a valid name.');
      return;
    }

    if (foundUser.isGuest) {
      login({
        displayName: foundUser.displayName,
        state: selectedState,
      });
      return;
    }

    if (foundUser.password !== password) {
      setError('Incorrect password. Please try again.');
      return;
    }

    if (foundUser.states.length > 1 && !selectedState) {
        setError('Please select your assigned location.');
        return;
    }
    
    login({
        displayName: foundUser.displayName,
        state: selectedState,
        password: foundUser.password,
    });
  };
  
  const canLogin = foundUser && (selectedState || foundUser?.isGuest) && (password || foundUser?.isGuest);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Enter your name and password to access the asset register.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {!foundUser?.isGuest && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}
          
          {foundUser && foundUser.states.length > 1 && (
             <div className="space-y-2">
              <Label htmlFor="state">Select Your Location</Label>
              <Select onValueChange={setSelectedState} value={selectedState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {foundUser.states.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin} disabled={!canLogin}>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
