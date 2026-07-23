export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: July 22, 2026</p>

      <section className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          frontrow (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a live
          shopping platform that lets hosts broadcast from the browser and lets
          viewers watch, chat, and vote on products in real time.
        </p>
        <h2 className="text-base text-foreground">Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account information from Clerk when you sign in (email, name, profile
            identifier).
          </li>
          <li>
            Show data you create as a host (title, shopping trail, chat activity,
            recordings archived via Mux).
          </li>
          <li>
            Technical logs needed to operate the service (IP address, browser
            type, request timestamps).
          </li>
        </ul>
        <h2 className="text-base text-foreground">How we use information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authenticate hosts and enforce invite-only hosting during beta.</li>
          <li>Deliver live video, chat, and replay pages to viewers.</li>
          <li>Resolve retailer product URLs through Channel3 for buy links.</li>
          <li>Maintain security, prevent abuse, and improve reliability.</li>
        </ul>
        <h2 className="text-base text-foreground">Third-party services</h2>
        <p>
          We use Clerk (authentication), LiveKit (live video), Mux (recording
          and replay), Neon (database), Channel3 (product lookup), and Vercel
          (hosting). Each provider processes data according to its own privacy
          policy.
        </p>
        <h2 className="text-base text-foreground">Contact</h2>
        <p>
          Questions about this policy? Email the team address listed on your beta
          invite.
        </p>
      </section>
    </main>
  );
}
