import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/error-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "心洞",
  description: "心洞——记录生活，留住心情，让时间说话。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <QueryProvider>
            <LocaleProvider>{children}</LocaleProvider>
            <Toaster position="top-right" richColors closeButton />
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
