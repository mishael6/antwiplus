import type { Metadata } from "next";
import "./globals.css";
import "./store.css";
import { CartProvider } from "@/components/cart";

export const metadata: Metadata = {
  title: "AntwiPlus — Discover more of what you love",
  description: "Explore useful, thoughtful finds across fashion, technology, home, travel, and more at AntwiPlus.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
