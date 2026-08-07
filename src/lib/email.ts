import "server-only";

/**
 * Transactional email via Resend REST API.
 * Skips silently when RESEND_API_KEY is unset (local dev / pre-config).
 */

function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export async function sendShowReminderEmail(opts: {
  to: string;
  showTitle: string;
  hostName: string;
  waitroomPath: string;
  scheduledFor: Date;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Frontrow <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY unset — would remind ${opts.to} about "${opts.showTitle}"`,
    );
    return false;
  }

  const waitroomUrl = `${appOrigin()}${opts.waitroomPath}`;
  const when = opts.scheduledFor.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: `${opts.hostName} goes live soon: ${opts.showTitle}`,
      html: `
        <p>${opts.hostName} is going live soon with <strong>${opts.showTitle}</strong>.</p>
        <p>Scheduled for ${when}.</p>
        <p><a href="${waitroomUrl}">Join the waitroom</a> — you'll be brought in automatically when the show starts.</p>
      `.trim(),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend failed (${res.status}): ${body}`);
    return false;
  }

  return true;
}
