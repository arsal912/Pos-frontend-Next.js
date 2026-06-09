import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'POS System — Modern Point of Sale',
  description: 'Run your business smarter with our cloud-based POS. Works offline on tablets.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS System',
  },
  icons: {
    icon:  [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
