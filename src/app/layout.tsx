import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AmbientBackground } from "@/components/layout/AmbientBackground";

const fraunces = localFont({
  src: "../fonts/Fraunces-VariableFont.ttf",
  variable: "--font-fraunces",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090c14",
};

export const metadata: Metadata = {
  title: "TrackMed — Multi-Channel Medicine System",
  description:
    "Personal single-user medicine stock tracker with multi-channel lead times (Apollo 24|7, Mr. Med, Offline chemist) and 30-day procurement planning.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrackMed",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
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
      className={`dark h-full bg-[#090c14] text-white antialiased selection:bg-[#ff385c] selection:text-white ${fraunces.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TrackMed" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090c14] text-white relative">
        <AmbientBackground />
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
