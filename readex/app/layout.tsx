import type { Metadata } from "next";
import { Geist, Geist_Mono, Abril_Fatface, Cabin } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
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
  title: "Readflow — Write, Preview & Share Markdown",
  description: "A fast, minimal markdown editor with live preview. Write your README, share a read-only link, download as PDF — all from the browser.",
  openGraph: {
    title: "Readflow — Write, Preview & Share Markdown",
    description: "A fast, minimal markdown editor with live preview. Write your README, share a read-only link, download as PDF.",
    siteName: "Readflow",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Readflow — Write, Preview & Share Markdown",
    description: "A fast, minimal markdown editor with live preview. Write your README, share a read-only link, download as PDF.",
  },
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
        <Analytics />
      </body>
    </html>
  );
}
