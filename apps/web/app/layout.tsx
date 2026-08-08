import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { after } from "next/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { syncStaleProjects, discoverNewProjectsForTrackedOwners } from "@olgax/github";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Olgax Community Platform",
    template: "%s | Olgax Community Platform",
  },
  description:
    "An open-source community and mentorship platform for contributors, mentors, and maintainers to learn, build, and grow together.",
  keywords: [
    "open source",
    "open source community",
    "mentorship",
    "contributor platform",
    "GitHub contributions",
    "developer mentorship",
    "open source certification",
  ],
  authors: [{ name: "Olgax" }],
  openGraph: {
    type: "website",
    siteName: "Olgax Community Platform",
    title: "Olgax Community Platform",
    description:
      "An open-source community and mentorship platform for contributors, mentors, and maintainers to learn, build, and grow together.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Olgax Community Platform",
    description:
      "An open-source community and mentorship platform for contributors, mentors, and maintainers to learn, build, and grow together.",
  },
  manifest: "/favicon_io-logo-light-bg/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon_io-logo-light-bg/favicon.ico", sizes: "any" },
      {
        url: "/favicon_io-logo-light-bg/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon_io-logo-light-bg/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon_io-logo-dark-bg/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon_io-logo-dark-bg/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/favicon_io-logo-light-bg/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runs after the response is sent, so it never adds latency to a page load - keeps
  // synced GitHub data (issues/PRs/reviews) reasonably fresh, and auto-registers any new
  // repo created under an owner we already track, without a manual sync or a real webhook
  // (which needs a public HTTPS URL we don't have outside of production).
  after(() => syncStaleProjects().catch(() => {}));
  after(() => discoverNewProjectsForTrackedOwners().catch(() => {}));

  return (
    <html lang="en" className={cn("h-full antialiased", inter.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
