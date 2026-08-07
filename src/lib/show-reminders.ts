import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { db, showReminderJobs, streams } from "@/lib/db";
import { sendShowReminderEmail } from "@/lib/email";
import { listInterestEmails } from "@/lib/show-interest";
import { REMINDER_LEAD_MINUTES } from "@/lib/shows";
import { waitroomShowPath } from "@/lib/show-urls";

/** Queue a reminder job when a show is scheduled. */
export async function queueShowReminder(
  streamId: string,
  scheduledFor: Date,
): Promise<void> {
  const sendAt = new Date(
    scheduledFor.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000,
  );

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
 * Process due reminder jobs. Called by /api/cron/show-reminders every 5 minutes.
 * Sends via Resend when RESEND_API_KEY is set; otherwise logs and marks sent.
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
    const waitroomPath = waitroomShowPath(job.slug);
    const hostName = job.hostName?.trim() || "Your host";
    const scheduledFor = job.scheduledFor ?? now;

    const recipients = await listInterestEmails(job.streamId);

    if (recipients.length === 0) {
      console.info(
        `[show-reminders] No interested viewers for "${job.title}" (${job.slug})`,
      );
    } else {
      for (const to of recipients) {
        await sendShowReminderEmail({
          to,
          showTitle: job.title,
          hostName,
          waitroomPath,
          scheduledFor,
        });
      }
    }

    await db
      .update(showReminderJobs)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(showReminderJobs.id, job.jobId));

    processed += 1;
  }

  return processed;
}
