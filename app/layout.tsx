import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart-Perp V2 | Hyperliquid Smart Money Tracker',
  description: 'Real-time tracking of Smart Money and Whale trades on Hyperliquid. Track the wallets that matter.',
  keywords: ['hyperliquid', 'smart money', 'whale tracking', 'perps', 'trading', 'crypto'],
  authors: [{ name: 'Smart-Perp' }],
  openGraph: {
    title: 'Smart-Perp V2',
    description: 'Real-time Hyperliquid Smart Money Tracker',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-body antialiased bg-base-900 text-gray-100 min-h-screen overflow-hidden">
        {/* Background layers */}
        <div className="fixed inset-0 -z-10">
          {/* Mesh gradient base */}
          <div className="absolute inset-0 bg-mesh-gradient" />
          
          {/* Grid overlay */}
          <div className="absolute inset-0 grid-overlay opacity-50" />
          
          {/* Radial vignette */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-base-900/80" />
          
          {/* Noise texture */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Main content */}
        {children}
      </body>
    </html>
  );
}

