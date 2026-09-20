import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AmbientBackground } from "@/components/layout/AmbientBackground";

const fraunces = localFont({
  src: "../fonts/Fraunces-VariableFont.ttf",
  variable: "--font-fraunces",
  display: "swap",
});

const newYork = localFont({
  src: "../fonts/new-york-large_regular.ttf",
  variable: "--font-new-york",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedTrack — Multi-Channel Medicine System",
  description:
    "Personal single-user medicine stock tracker with multi-channel lead times (Apollo 24|7, Mr. Med, Offline chemist) and 30-day procurement planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark h-full bg-[#090c14] text-white antialiased selection:bg-[#ff385c] selection:text-white ${fraunces.variable} ${newYork.variable}`}
    >
      <body className="min-h-full flex flex-col bg-[#090c14] text-white relative font-serif-body">
        <AmbientBackground />
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
