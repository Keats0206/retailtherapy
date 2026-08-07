/** Shared copy for the host / go-live CTA across hero, header, and promos. */
export const HOST_CTA = {
  approved: {
    label: "Go live",
    href: "/host/setup",
    hook: null,
  },
  schedule: {
    label: "Schedule show",
    href: "/host/schedule",
    hook: null,
  },
  apply: {
    label: "Apply to be a creator",
    /** Fits the app header without wrapping on small screens. */
    compactLabel: "Become a creator",
    href: "/creators",
    hook: "Get paid to shop live — from your browser, no studio required.",
  },
} as const;

export type HostCtaStage = keyof typeof HOST_CTA;

export function hostCtaStage(canHost: boolean): HostCtaStage {
  return canHost ? "approved" : "apply";
}
