import { redirect } from "next/navigation";

/** The Discuss start page now lives in the Gurbani hub. */
export default function DiscussHome() {
  redirect("/gurbani");
}
