import { redirect } from "next/navigation";

// The old News page is now the front page's "Latest" section.
export default function NewsPage() {
  redirect("/section/latest");
}
