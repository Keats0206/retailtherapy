/**
 * Brand marks — this build of lucide ships no social icons, so these are
 * hand-rolled at the same 24-grid / currentColor as the rest of the set.
 */
export function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path d="M16.5 3c.3 2.1 1.6 3.6 3.5 3.9v2.6c-1.3 0-2.5-.4-3.5-1.1v5.4c0 3.3-2.4 5.9-5.6 5.9S5.3 19.1 5.3 15.9c0-3.1 2.3-5.6 5.3-5.8v2.7c-1.4.2-2.6 1.4-2.6 3.1 0 1.7 1.1 3 2.8 3s2.9-1.3 2.9-3.2V3h2.5z" />
    </svg>
  );
}

export function SubstackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path d="M22.54 8.24H1.46V5.41h21.08v2.83zM1.46 10.81V24L12 18.11 22.54 24V10.81H1.46zM22.54 0H1.46v2.84h21.08V0z" />
    </svg>
  );
}

export function YouTubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z" fill="currentColor" />
    </svg>
  );
}
