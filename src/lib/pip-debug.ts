/**
 * Traces the floating-studio state machine in dev.
 *
 * Whether Chrome hands us the auto-PiP action is invisible from the outside —
 * when it doesn't fire, the symptom is silence. These lines are how you tell
 * "Chrome never asked" apart from "we asked and it was refused".
 *
 * Filter the console on `[pip]`.
 */
export function pipDebug(message: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  if (typeof console === "undefined") return;
  console.log(`[pip] ${message}`, detail ?? "");
}
