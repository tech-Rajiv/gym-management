import { redirect } from "next/navigation";

/**
 * The dashboard is the application's home. Rather than duplicating it at "/",
 * this sends visitors to its real URL so there is only ever one address for it.
 */
export default function HomePage() {
  redirect("/dashboard");
}
