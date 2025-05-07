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
  // اجازه دسترسی به مسئولین مرکز آزمون و کارشناسان منطقه (سنجش و فناوری)
  const cookieStore = await cookies();
  const authToken = cookieStore?.get("refresh-token");
  const { user } = await authService.refreshToken(authToken?.value);

  // بررسی مجوز دسترسی
  if (
    !user ||
    (user.role !== ROLES.EXAM_CENTER_MANAGER &&
      user.role !== ROLES.DISTRICT_EDUCATION_EXPERT &&
      user.role !== ROLES.DISTRICT_TECH_EXPERT)
  ) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-4">
          <h2 className="text-xl font-bold text-red-600 mb-3">خطای دسترسی</h2>
          <p className="text-gray-700">
            شما مجوز دسترسی به این صفحه را ندارید.
          </p>
          <p className="text-gray-600 mt-2">
            فقط مسئولین مرکز آزمون و کارشناسان منطقه می‌توانند تیکت ایجاد کنند.
          </p>
        </div>
      </div>
    );
  }

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
