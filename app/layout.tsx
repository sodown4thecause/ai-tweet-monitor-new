
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Tweet Monitor - Intelligent Twitter Analysis & Rewriting',
  description: 'Monitor trending AI content, analyze engagement patterns, and generate optimized rewrites with advanced AI-powered insights from the top voices in artificial intelligence.',
  keywords: ['AI', 'Twitter', 'Analytics', 'Tweet Monitoring', 'Social Media Intelligence', 'Content Analysis'],
  authors: [{ name: 'AI Tweet Monitor' }],
  openGraph: {
    title: 'AI Tweet Monitor - Intelligent Twitter Analysis',
    description: 'Monitor trending AI content and analyze engagement patterns with AI-powered insights.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'antialiased')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
