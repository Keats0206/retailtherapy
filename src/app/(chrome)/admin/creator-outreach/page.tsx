import { redirect } from "next/navigation";

export default function CreatorOutreachRedirect() {
  redirect("/admin?tab=outreach");
}
