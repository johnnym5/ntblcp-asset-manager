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
 * Phase 65: Hardened metadata and icon handling for absolute build stability.
 */

export const metadata: Metadata = {
  title: 'Assetain',
  description: 'Professional Asset Management & Verification Pulse. High-integrity offline-first registry.',
  manifest: '/manifest.json',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2225%22 fill=%22%23D4AF37%22/><text y=%22.9em%22 x=%225%22 font-size=%2270%22 font-weight=%22bold%22 fill=%22black%22>A</text></svg>',
    apple: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2225%22 fill=%22%23D4AF37%22/><text y=%22.9em%22 x=%225%22 font-size=%2270%22 font-weight=%22bold%22 fill=%22black%22>A</text></svg>',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Assetain',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#D4AF37',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20" suppressHydrationWarning>
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
