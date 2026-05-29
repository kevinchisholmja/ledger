import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import UploadButton from "./components/UploadButton";
import MobileNav from "./components/MobileNav";
import Sidebar from "./components/Sidebar";
import ThemeProvider from "./components/ThemeProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledger — Personal Finance Tracker",
  description: "Track budgets, transactions and goals with Ledger.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#13191c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Sidebar />
          {children}
          <MobileNav />
          <UploadButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
