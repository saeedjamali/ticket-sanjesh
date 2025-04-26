import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  // Check for auth token in cookies
  const cookieStore = cookies();
  const authToken = cookieStore.get("auth-token");

  if (authToken) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  // This code will never run because of the redirects above
  return null;
}
