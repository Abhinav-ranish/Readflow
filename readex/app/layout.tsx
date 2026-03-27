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
      <head>
        {/* AI Agent Discovery: This is a client-side React app. The UI loads via JavaScript.
            For programmatic access, use the REST API:
            - API docs: https://readflow.vercel.app/agents.md
            - OpenAPI spec: https://readflow.vercel.app/.well-known/openapi.json
            - Share endpoint: POST https://readflow.vercel.app/api/share {"content": "# markdown", "title": "optional"}
            - Returns: {"id": "...", "url": "https://readflow.vercel.app/s/..."}
            - No authentication required. */}
        <link rel="api-description" href="/agents.md" type="text/markdown" />
        <link rel="service-desc" href="/.well-known/openapi.json" type="application/json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${abrilFatface.variable} ${cabin.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
