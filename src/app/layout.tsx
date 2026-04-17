import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/contexts/auth-context';
import { AppStateProvider } from '@/contexts/app-state-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Assetain | Professional Asset Intelligence',
  description: 'A mission-critical, offline-first asset management and verification platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Assetain',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="https://picsum.photos/seed/assetain/180/180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans select-none antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppStateProvider>
            <AuthProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <FirebaseErrorListener />
              </TooltipProvider>
            </AuthProvider>
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
