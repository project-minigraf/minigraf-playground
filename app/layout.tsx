import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrivacyModal } from "@/components/modals/PrivacyModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (() => { throw new Error("NEXT_PUBLIC_APP_URL is not set") })();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Minigraf Playground",
  description:
    "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
  openGraph: {
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
    url: appUrl,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PrivacyModal />
      </body>
    </html>
  );
}
