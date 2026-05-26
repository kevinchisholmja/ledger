import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import UploadButton from "./components/UploadButton";
import MobileNav from "./components/MobileNav";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledger",
  description: "Personal finance tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ledger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 font-sans antialiased">
        {children}
        <MobileNav />
        <UploadButton />
      </body>
    </html>
  );
}
