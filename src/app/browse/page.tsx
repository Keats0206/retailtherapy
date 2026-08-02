import { redirect } from "next/navigation";

/** Browse moved to `/` — this keeps older links and shares working. */
export default function BrowseRoute() {
  redirect("/");
}
