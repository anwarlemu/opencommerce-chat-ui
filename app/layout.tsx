import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Body type is Inter, as on agentcard.sh. Display and labels use the Neue Haas
// stack in globals.css, which falls back to Helvetica Neue.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentcard shopping agent",
  icons: { icon: "/agentcard-trueblue-symbol.svg" },
  description: "UI-only demo of the opencommerce shopping chat",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
