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
    <html lang="en" className="dark h-full bg-[#0c0f17] text-[#f8fafc] antialiased">
      <body className="min-h-full flex flex-col bg-[#0c0f17] text-[#f8fafc] selection:bg-[#ff385c] selection:text-white">
        {children}
      </body>
    </html>
  );
}
