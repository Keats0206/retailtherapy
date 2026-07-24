import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public surface: viewers at /s/* and /watch/* stay open. Hosting and the
// dashboard require an account.
const isProtectedRoute = createRouteMatcher([
  "/host(.*)",
  "/dashboard",
  "/admin",
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
