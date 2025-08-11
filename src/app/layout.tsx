import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Civic Match",
  description: "Connect with civic tech founders.",
  manifest: "/manifest.webmanifest",
  themeColor: "#111827",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.png",
    other: [{ rel: "mask-icon", url: "/icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} antialiased bg-background text-foreground`}>
        <div className="min-h-dvh">
          <TopBar />
          <div className="pb-0">{children}</div>
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
