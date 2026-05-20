import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoCollect Studio",
  description: "Form designer & project management portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-muted text-slate-800 antialiased">{children}</body>
    </html>
  );
}
