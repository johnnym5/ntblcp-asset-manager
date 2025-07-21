
'use client';

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { setupRecaptcha, sendVerificationCode, confirmVerificationCode } from '@/lib/auth';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Please enter a valid phone number in E.164 format (e.g., +2348012345678).'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Verification code must be 6 digits.'),
});

export function PhoneLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appVerifier, setAppVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '' },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    try {
      if (!appVerifier) {
        const verifier = setupRecaptcha('recaptcha-container');
        setAppVerifier(verifier);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [appVerifier]);

  async function onSendCode(values: z.infer<typeof phoneSchema>) {
    setError(null);
    if (!appVerifier) {
      setError('reCAPTCHA not initialized. Please refresh the page.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await sendVerificationCode(values.phoneNumber, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onConfirmCode(values: z.infer<typeof otpSchema>) {
    setError(null);
    if (!confirmationResult) {
      setError('No confirmation result found. Please try sending the code again.');
      return;
    }
    setIsLoading(true);
    try {
      await confirmVerificationCode(confirmationResult, values.otp);
      // AuthProvider will handle redirect on successful login
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div id="recaptcha-container" />
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!showOtpInput ? (
        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(onSendCode)} className="space-y-4">
            <FormField
              control={phoneForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+2348012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Code
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onConfirmCode)} className="space-y-4">
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Code & Sign In
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setShowOtpInput(false);
                setError(null);
              }}
            >
              Back to phone number entry
            </Button>
          </form>
        </Form>
      )}
    </>
  );
}
