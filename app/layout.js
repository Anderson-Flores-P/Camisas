import './globals.css';

export const metadata = {
  title: 'WAVE CLUB Store — Camisas de taller',
  description: 'Tienda WAVE CLUB: camisas de algodón con serigrafía de taller. Drop 01 disponible bajo pedido.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }) {
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { return null; } })()
    : null;
  return (
    <html lang="es">
      <head>
        {supabaseHost && <link rel="preconnect" href={supabaseHost} crossOrigin="" />}
      </head>
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
