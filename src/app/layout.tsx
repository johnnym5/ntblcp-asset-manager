import type {Metadata, Viewport} from 'next';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/contexts/auth-context';
import { AppStateProvider } from '@/contexts/app-state-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * @fileOverview Root Layout - Deterministic System Shell.
 * Phase 65: Hardened metadata with inline icon pulse to prevent favicon route errors.
 */

export const metadata: Metadata = {
  title: 'Assetain',
  description: 'Professional Asset Management & Verification Pulse. High-integrity offline-first registry.',
  manifest: '/manifest.json',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Assetain',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#2E3192',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary isGlobal module="Assetain Global Shell">
            <AppStateProvider>
              <AuthProvider>
                {children}
                <Toaster />
                <FirebaseErrorListener />
              </AuthProvider>
            </AppStateProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
