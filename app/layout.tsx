import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSO Input Price Tracker",
  description: "Weekly buy-zone signals for feed and fertiliser inputs across UK livestock farm types",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
