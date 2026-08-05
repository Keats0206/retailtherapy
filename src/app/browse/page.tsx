import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** Legacy browse URL — send members to the app, visitors to the landing. */
export default async function BrowseRoute() {
  const { userId } = await auth();
  redirect(userId ? "/home" : "/");
}
