import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AOSProvider } from "@/components/AOSProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "EMS Pro – Enterprise Dashboard",
  description: "Enterprise Management System",
  manifest: "/manifest.json",
  themeColor: "#007aff",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`antialiased flex h-screen overflow-hidden bg-bg`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <CommandPalette />
            <AOSProvider />
            <canvas id="bg-canvas" className="fixed inset-0 pointer-events-none z-0 opacity-25" />
            <div className="flex h-screen overflow-hidden w-full">
              <ErrorBoundary>
                <AppShell>
                  {children}
                </AppShell>
              </ErrorBoundary>
            </div>
            <Toaster position="top-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
