import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Agentation } from "agentation";
import "./globals.css";
import { SavedProvider } from "@/components/saved-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Nunito (Fontshare) carries everything that isn't the wordmark — body copy, UI
 * and headings alike. Stardom (below) is the only exception. Self-hosted so it
 * ships with the app instead of hitting cdn.fontshare.com.
 */
const nunito = localFont({
  src: [
    {
      path: "./fonts/nunito/Nunito-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/nunito/Nunito-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/nunito/Nunito-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/nunito/Nunito-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Stardom (Fontshare) — high-contrast display serif, wordmark/hero only.
 * Self-hosted so it ships with the app instead of hitting cdn.fontshare.com.
 * Exposed as `font-brand`; headings stay on the sans (`font-heading`).
 */
const stardom = localFont({
  src: [
    {
      path: "./fonts/stardom/Stardom-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-stardom",
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
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        nunito.variable,
        stardom.variable,
        geistMono.variable,
      )}
    >
      {/* h-full + overflow-hidden so /watch can fill the viewport exactly and
          scroll only inside its rail. The header lives in (chrome)/layout,
          which every route except /watch renders under. */}
      <body className="flex h-full flex-col overflow-hidden">
        <ClerkProvider appearance={clerkAppearance}>
          {/* Root, not (chrome): /browse and /show/<slug> both carry save buttons
              and render outside that group. */}
          <SavedProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SavedProvider>
          <Analytics debug={process.env.NODE_ENV === "development"} />
          {/* Real-user Core Web Vitals. Worth having on a video-heavy app —
              LCP and INP on /browse and /show/<slug> are the ones to watch. */}
          <SpeedInsights />
          {process.env.NODE_ENV === "development" && <Agentation />}
        </ClerkProvider>
      </body>
    </html>
  );
}
