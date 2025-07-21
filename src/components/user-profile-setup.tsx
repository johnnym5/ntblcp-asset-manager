
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
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AUTHORIZED_USERS, type AuthorizedUser } from '@/lib/authorized-users';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { NIGERIAN_STATES } from '@/lib/constants';

export default function UserProfileSetup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AuthorizedUser | null>(null);
  const { login } = useAuth();
  
  const isGuestMode = !foundUser && username.length > 0;

  useEffect(() => {
    setError(null);
    const user = AUTHORIZED_USERS.find(u => u.loginName === username.trim().toLowerCase());
    setFoundUser(user || null);

    if (user && user.states.length === 1) {
      setSelectedState(user.states[0]);
    } else {
      setSelectedState('');
    }
  }, [username]);

  const handleLogin = () => {
    const lowerUsername = username.toLowerCase().trim();
    const lowerPassword = password.toLowerCase().trim();
    
    // Admin login
    if (lowerUsername === 'admin' && lowerPassword === 'admin') {
      login({ displayName: 'Admin', state: 'All', role: 'admin' });
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
    if (!selectedState) {
      setError('Please select a state to view as a guest.');
      return;
    }
    login({
        displayName: username.trim() || 'Guest',
        state: selectedState,
        role: 'guest'
    });
  };
  
  const canLogin = username && (selectedState || (foundUser && foundUser.states.length === 1)) || (username.toLowerCase().trim() === 'admin' && password);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Enter your details to access the asset register.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              placeholder="Enter your name or 'admin'"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {username.toLowerCase().trim() === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
