import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobile Saving Bank Admin",
  description: "Enterprise crypto investment administration dashboard"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
