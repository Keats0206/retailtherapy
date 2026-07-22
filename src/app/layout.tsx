import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Agentation } from "agentation";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const alpino = localFont({
  src: [
    {
      path: "./fonts/alpino/Alpino-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/alpino/Alpino-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/alpino/Alpino-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "frontrow",
  description: "Watch people shop.",
};

const clerkAppearance = {
  theme: shadcn,
  variables: {
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={cn("h-full", "antialiased", "font-sans", alpino.variable, geistMono.variable)}
      >
        {/* h-full + overflow-hidden so /watch can fill the viewport exactly and
            scroll only inside its rail. The header lives in (chrome)/layout,
            which every route except /watch renders under. */}
        <body className="flex h-full flex-col overflow-hidden">
          <TooltipProvider>{children}</TooltipProvider>
          {process.env.NODE_ENV === "development" && <Agentation />}
        </body>
      </html>
    </ClerkProvider>
  );
}
