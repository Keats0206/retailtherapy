import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { db, showReminderJobs, streams } from "@/lib/db";
import { REMINDER_LEAD_MINUTES } from "@/lib/shows";
import { waitroomShowPath } from "@/lib/show-urls";

/**
 * Email reminders for scheduled shows.
 *
 * No transactional provider is wired yet — jobs are persisted and logged so a
 * future cron can call `processPendingReminders()` with Resend/SendGrid.
 */

/** Queue a reminder job when a show is scheduled. */
export async function queueShowReminder(
  streamId: string,
  scheduledFor: Date,
): Promise<void> {
  const sendAt = new Date(
    scheduledFor.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000,
  );

  // If the lead window already passed, skip — the show is imminent.
  if (sendAt.getTime() <= Date.now()) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[show-reminders] Skipping reminder for ${streamId} — show starts within ${REMINDER_LEAD_MINUTES}m`,
      );
    }
    return;
  }

  await db.insert(showReminderJobs).values({
    streamId,
    sendAt,
    status: "pending",
  });
}

/** Cancel pending reminders when a scheduled show is deleted or goes live early. */
export async function cancelShowReminders(streamId: string): Promise<void> {
  await db
    .update(showReminderJobs)
    .set({ status: "skipped" })
    .where(
      and(
        eq(showReminderJobs.streamId, streamId),
        eq(showReminderJobs.status, "pending"),
      ),
    );
}

/**
 * Process due reminder jobs. Intended for a cron/worker — not called inline
 * during scheduling. Logs what would be sent until a provider is integrated.
 */
export async function processPendingReminders(limit = 50): Promise<number> {
  const now = new Date();
  const due = await db
    .select({
      jobId: showReminderJobs.id,
      streamId: showReminderJobs.streamId,
      slug: streams.slug,
      title: streams.title,
      hostName: streams.hostName,
      scheduledFor: streams.scheduledFor,
    })
    .from(showReminderJobs)
    .innerJoin(streams, eq(showReminderJobs.streamId, streams.id))
    .where(
      and(
        eq(showReminderJobs.status, "pending"),
        lte(showReminderJobs.sendAt, now),
        eq(streams.status, "scheduled"),
      ),
    )
    .limit(limit);

  let processed = 0;

  for (const job of due) {
    const waitroomUrl = waitroomShowPath(job.slug);
    // TODO: integrate Resend/SendGrid — fetch interested emails from show_interests
    console.info(
      `[show-reminders] Would send "${job.title}" reminder → ${waitroomUrl} (${job.scheduledFor?.toISOString()})`,
    );

    await db
      .update(showReminderJobs)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(showReminderJobs.id, job.jobId));

    processed += 1;
  }

  return processed;
}
