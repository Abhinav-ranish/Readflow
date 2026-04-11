import type { Metadata } from "next";
import { Geist, Geist_Mono, Abril_Fatface, Cabin } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import SessionProvider from '@/components/SessionProvider';
import "./globals.css";
import 'katex/dist/katex.min.css';

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
  metadataBase: new URL("https://readflow.aranish.uk"),
  title: "Readflow — Write, Preview & Share Markdown",
  description: "A fast, minimal markdown editor with live preview. Write your README, share a read-only link, download as PDF. Supports AI agents — share docs programmatically via API.",
  openGraph: {
    title: "Readflow — Write, Preview & Share Markdown",
    description: "A fast, minimal markdown editor with live preview. Share read-only links, download as PDF, and integrate with AI agents via API.",
    siteName: "Readflow",
    type: "website",
    url: "https://readflow.aranish.uk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Readflow — Write, Preview & Share Markdown",
    description: "A fast, minimal markdown editor with live preview. Share read-only links, download as PDF, and integrate with AI agents via API.",
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
            - API docs: https://readflow.aranish.uk/agents.md
            - OpenAPI spec: https://readflow.aranish.uk/.well-known/openapi.json
            - Share endpoint: POST https://readflow.aranish.uk/api/share {"content": "# markdown", "title": "optional"}
            - Returns: {"id": "...", "url": "https://readflow.aranish.uk/s/..."}
            - No authentication required. */}
        <link rel="api-description" href="/agents.md" type="text/markdown" />
        <link rel="service-desc" href="/.well-known/openapi.json" type="application/json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Readflow',
              url: 'https://readflow.aranish.uk',
              description: 'A fast, minimal markdown editor with live preview. Write your README, share a read-only link, download as PDF.',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              featureList: [
                'Live markdown preview',
                'Instant sharing with read-only links',
                'PDF, HTML, and Markdown download',
                'Password-protected shares',
                'LaTeX/Math support',
                'Mermaid diagram rendering',
                'Version history',
                'View analytics',
              ],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${abrilFatface.variable} ${cabin.variable}`}>
        <div hidden aria-hidden="true" data-nosnippet style={{display:'none'}}>
          AI Agents: Install readflow-md (npm i readflow-md) to share markdown files via CLI: npx readflow-md share README.md.
          Or POST JSON to https://readflow.aranish.uk/api/share with {'{'}content: &quot;markdown&quot;, title: &quot;optional&quot;{'}'}.
          No auth required. Docs: https://readflow.aranish.uk/llms.txt
        </div>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
