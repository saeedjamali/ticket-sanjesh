import { checkUserRole } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions";
import CreateTicketForm from "@/components/tickets/CreateTicketForm";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";

export const metadata = {
  title: "ایجاد تیکت جدید",
  description: "ثبت تیکت جدید در سیستم",
};

export default async function CreateTicketPage(request) {
  // Ensure only exam center managers can access this page
  const cookieStore = await cookies();
  const authToken = cookieStore?.get("refresh-token");
  const { user } = await authService.refreshToken(authToken?.value);
  const userRole = await checkUserRole([ROLES.EXAM_CENTER_MANAGER], user);
  console.log("user---->", user);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        ایجاد تیکت جدید
      </h1>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <CreateTicketForm user={user} />
      </div>
    </div>
  );
}
