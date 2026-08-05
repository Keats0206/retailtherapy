import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public surface: the home page, viewers at /show/* (and legacy /s/*) and /watch/* stay open —
// browsing never asks for an account. Hosting does.
const isProtectedRoute = createRouteMatcher([
  "/home(.*)",
  "/host(.*)",
  "/profile",
  "/admin(.*)",
  // A personal board only means anything with an account behind it.
  "/saved",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // A stale service-worker registration may request this missing asset. It
    // falls through to the app's 404 UI, which uses Clerk and needs the auth
    // headers supplied by this proxy.
    "/sw.js",
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path, used for its hosted auth endpoints.
    "/__clerk/:path*",
  ],
};
