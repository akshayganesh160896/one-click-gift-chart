import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'One Click Gift Chart',
  description: 'Generate and edit campaign gift charts from one goal input.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
