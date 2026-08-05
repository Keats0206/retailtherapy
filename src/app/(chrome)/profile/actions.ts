"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { saveProfileForUser } from "@/lib/profile";
import { SOCIAL_PLATFORMS } from "@/lib/social-links";

export type SaveProfileState = {
  status: "idle" | "saved" | "error";
  message?: string;
  /** Bumps on every successful save so the form can re-flash "Saved". */
  savedAt?: number;
};

/**
 * Persist the profile form (name, city, socials) for the signed-in user.
 * Social fields arrive as typed — handle, "@handle" or pasted link — and are
 * normalized in `saveProfileForUser`, mirroring the form's live preview.
 */
export async function saveProfileAction(
  _prev: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const { userId } = await auth();
  if (!userId) {
    return {
      status: "error",
      message: "You need to be signed in to save your profile.",
    };
  }

  const socials: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = formData.get(`social-${platform}`);
    if (typeof value === "string") socials[platform] = value;
  }

  try {
    await saveProfileForUser(userId, {
      name: String(formData.get("name") ?? ""),
      city: String(formData.get("city") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      socials,
    });
  } catch (err) {
    // Driver errors carry the query and values — log, don't echo.
    console.error("[profile] save failed", err);
    return {
      status: "error",
      message: "Couldn’t save your profile. Try again in a moment.",
    };
  }

  // /home flips from setup to browse once a profile exists; /profile shows
  // the saved values on next visit.
  revalidatePath("/home");
  revalidatePath("/profile");
  return { status: "saved", savedAt: Date.now() };
}
