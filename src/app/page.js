import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";

export default async function Home() {
  // Check for auth token in cookies
  const cookieStore = await cookies();
  const authToken = cookieStore?.get("refresh-token");

  const { user } = await authService.refreshToken(authToken?.value);


  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  // This code will never run because of the redirects above
  return null;
}
