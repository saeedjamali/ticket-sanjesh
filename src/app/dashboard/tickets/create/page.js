import { checkUserRole } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions";
import CreateTicketForm from "@/components/tickets/CreateTicketForm";

export const metadata = {
  title: "ایجاد تیکت جدید",
  description: "ثبت تیکت جدید در سیستم",
};

export default async function CreateTicketPage() {
  // Ensure only exam center managers can access this page
  const user = await checkUserRole([ROLES.EXAM_CENTER_MANAGER]);

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
