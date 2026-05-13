import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

// Display font voor titels, acties en branding
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Body font — scherp leesbaar
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nerve",
  description: "Jouw persoonlijk task command center",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // transparante statusbalk → app-achtergrond schijnt erdoorheen
    title: "Nerve",
    startupImage: "/apple-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // nodig voor Dynamic Island / notch
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detecteer Windows server-side via UA-header en zet een class op <html>.
  // Daar haakt globals.css op aan om backdrop-filter overal uit te zetten
  // (subpixel-AA / ClearType blijft dan behouden voor body-tekst).
  const ua = (await headers()).get("user-agent") ?? "";
  const isWindows = /Windows/i.test(ua);

  return (
    <html
      lang="nl"
      className={`${syne.variable} ${inter.variable} h-full antialiased${
        isWindows ? " os-windows" : ""
      }`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
