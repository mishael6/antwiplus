import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AntwiPlus — Good finds, delivered",
  description: "Everyday essentials and standout finds, all in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
