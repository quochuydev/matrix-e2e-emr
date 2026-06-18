import type { Metadata } from "next";
import "./globals.css";
import { MatrixProvider } from "matrix-client/react";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Patient Records",
  description: "E2E-encrypted patient records over Matrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <MatrixProvider>{children}</MatrixProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
