import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Interview Mission Control Dashboard",
  description: "Google Sheets powered interview planning dashboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-canvas text-text antialiased">{children}</body>
    </html>
  );
}
