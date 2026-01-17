import type { Metadata } from "next";
import { Geist, Geist_Mono, Abril_Fatface, Cabin } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const abrilFatface = Abril_Fatface({
  weight: "400",
  variable: "--font-abril",
  subsets: ["latin"],
});

const cabin = Cabin({
  subsets: ["latin"],
  variable: "--font-cabin",
});

export const metadata: Metadata = {
  title: "Readex | Shareable Markdown",
  description: "Write, preview, and share README files instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${abrilFatface.variable} ${cabin.variable}`}>
        {children}
      </body>
    </html>
  );
}
