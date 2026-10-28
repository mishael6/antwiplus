import type { Metadata } from "next";
import "./globals.css";
import "./store.css";
import { CartProvider } from "@/components/cart";

export const metadata: Metadata = {
  title: "AntwiPlus — Bags, luggage & everyday finds",
  description: "Thoughtful bags, luggage, and finds for your everyday and your next adventure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
