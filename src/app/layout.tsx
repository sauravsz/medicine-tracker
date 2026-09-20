import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTrack — Personal Medicine Stock & Lead-Time Reorder System",
  description:
    "Personal single-user medicine stock tracker with multi-channel lead times (Apollo 24|7, Mr. Med, Offline chemist) and 30-day procurement planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white text-[#222222] antialiased">
      <body className="min-h-full flex flex-col bg-white text-[#222222] selection:bg-[#ff385c] selection:text-white">
        {children}
      </body>
    </html>
  );
}
