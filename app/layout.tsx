import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Barney's 3D Monopoly",
  description: "Interactive 3D Monopoly engine with Barney's Custom Rules, Card Compendium for Property Deeds, Wildcards, Chance, and Community Chest cards, Exchange Center, In-Game Settings, and smooth 3D camera animations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden min-h-screen">
        {children}
      </body>
    </html>
  );
}
