
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
import { AUTHORIZED_USERS, type AuthorizedUser } from '@/lib/authorized-users';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { NIGERIAN_STATES } from '@/lib/constants';

export default function UserProfileSetup() {
  const [username, setUsername] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const { login } = useAuth();
  
  const isGuestMode = !foundUser && username.length > 0 && username.toLowerCase().trim() !== 'admin';

  useEffect(() => {
    setError(null);
    const lowerCaseUsername = username.trim().toLowerCase();
    
    if (lowerCaseUsername === 'admin') {
      const adminUser = AUTHORIZED_USERS.find(u => u.loginName === 'admin');
      setFoundUser(adminUser || null);
      if (adminUser) {
        setSelectedState(adminUser.states[0]); // 'All'
      }
      return;
    }

    const user = AUTHORIZED_USERS.find(u => u.loginName === lowerCaseUsername);
    setFoundUser(user || null);

    if (user && user.states.length === 1) {
      setSelectedState(user.states[0]);
    } else {
      setSelectedState('');
    }
  }, [username]);

  const handleLogin = () => {
    const lowerUsername = username.toLowerCase().trim();
    
    // Admin login
    if (lowerUsername === 'admin' && foundUser) {
      login({
        displayName: foundUser.displayName,
        state: foundUser.states[0],
        role: 'admin',
      });
      return;
    }

    // Authorized user login
    if (foundUser) {
      if (!selectedState) {
        setError('Please select your assigned location.');
        return;
      }
      login({
        displayName: foundUser.displayName,
        state: selectedState,
        role: foundUser.isAdmin ? 'admin' : 'user',
      });
      return;
    }
    
    // Guest login
    if (isGuestMode) {
      if (!selectedState) {
        setError('Please select a state to view as a guest.');
        return;
      }
      login({
          displayName: username.trim() || 'Guest',
          state: selectedState,
          role: 'guest'
      });
      return;
    }
    
    setError("Please enter your name to continue.");
  };
  
  const canLogin = username && (foundUser || isGuestMode) && selectedState;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Enter your name to access the asset register.</CardDescription>
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

          {isGuestMode && (
             <div className="space-y-2">
              <Label htmlFor="state-guest">Select State to View</Label>
              <Select onValueChange={setSelectedState} value={selectedState}>
                <SelectTrigger id="state-guest">
                  <SelectValue placeholder="Select a state..." />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((state) => (
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

           {isGuestMode && (
             <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Guest Mode</AlertTitle>
                <AlertDescription>You will have read-only access.</AlertDescription>
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
