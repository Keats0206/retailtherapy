export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: July 22, 2026</p>

      <section className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using frontrow during the controlled beta, you agree to these
          terms. If you do not agree, do not use the service.
        </p>
        <h2 className="text-base text-foreground">Beta access</h2>
        <p>
          Hosting is invite-only during beta. We may revoke access at any time.
          Viewer pages may be shared publicly by hosts via show links.
        </p>
        <h2 className="text-base text-foreground">Host responsibilities</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You are responsible for content you broadcast and products you pin.</li>
          <li>
            Do not stream illegal content, harass viewers, or misrepresent products.
          </li>
          <li>End your show when finished so recordings and trails are saved.</li>
        </ul>
        <h2 className="text-base text-foreground">Viewer participation</h2>
        <p>
          Chat and votes are part of the live experience. Do not spam, abuse other
          participants, or attempt to disrupt shows.
        </p>
        <h2 className="text-base text-foreground">Product links</h2>
        <p>
          Buy links may redirect to third-party retailers. We do not guarantee
          pricing, availability, or fulfillment. Purchases happen directly with
          retailers.
        </p>
        <h2 className="text-base text-foreground">Disclaimer</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; during beta without
          warranties. We are not liable for lost broadcasts, failed recordings,
          or third-party outages.
        </p>
      </section>
    </main>
  );
}
