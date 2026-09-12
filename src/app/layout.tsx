import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { Shell } from '@/components/Shell';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Synapse CRM — Corretor de Seguros',
  description: 'CRM para corretores de seguros. Funil de vendas, leads, clientes, apólices e renovações.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Synapse CRM',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <AuthProvider>
          <ProductsProvider>
            <PWARegister />
            <Shell>{children}</Shell>
          </ProductsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
