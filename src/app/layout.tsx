import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";
import TopBar from "@/components/TopBar";
import IncompleteProfileBanner from "@/components/IncompleteProfileBanner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Civic Match",
  description: "Connect with civic tech founders.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.png",
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#111827",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
      </head>
      <body className="google-sans-flex antialiased bg-background text-foreground">
        <AuthProvider>
          <div className="h-dvh flex flex-col">
            <IncompleteProfileBanner />
            <Suspense fallback={null}>
              <TopBar />
            </Suspense>
            <div className="flex-1 pb-0">{children}</div>
          </div>
          <ServiceWorkerRegister />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
