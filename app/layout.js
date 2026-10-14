import './globals.css';

export const metadata = {
  title: 'WAVE CLUB Store — Camisas de taller',
  description: 'Tienda WAVE CLUB: camisas de algodón con serigrafía de taller. Drop 01 disponible bajo pedido.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
