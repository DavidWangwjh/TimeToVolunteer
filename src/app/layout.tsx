import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { absoluteUrl, getSiteUrl, siteDescription, siteName } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteName,
  title: {
    default: `${siteName} | Volunteer Near Me & Student Volunteer Opportunities`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "volunteer",
    "volunteer near me",
    "volunteer opportunity",
    "volunteer programs",
    "volunteer jobs",
    "volunteer organizations",
    "volunteering for students",
    "student volunteer opportunities",
    "local volunteer opportunities",
    "find volunteer opportunities",
    "volunteer scheduling",
    "volunteer management",
    "volunteer registration",
    "nonprofit organizations",
    "local volunteering",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "community",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: `${siteName} | Volunteer Near Me & Student Opportunities`,
    description: siteDescription,
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Volunteer Near Me & Student Opportunities`,
    description: siteDescription,
    images: [absoluteUrl("/twitter-image")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico" },
      {
        url: "/favicon_io/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon_io/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
