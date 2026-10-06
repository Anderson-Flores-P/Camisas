import './globals.css';

export const metadata = {
  title: 'nuevas camisas — taller / drop 01',
  description: 'Maqueta taller: camisas con diseños propios.',
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
