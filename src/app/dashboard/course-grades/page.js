import { auth } from "@/lib/auth";
import { checkUserRole, ROLES } from "@/lib/permissions";
import CourseGradeManager from "@/components/admin/CourseGradeManager";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";

export default async function CourseGradesPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore?.get("refresh-token");

  const { user } = await authService.refreshToken(authToken?.value);

  // بررسی دسترسی - فقط برای مدیران سیستم
  await checkUserRole([ROLES.SYSTEM_ADMIN], user);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white text-right">
              مدیریت دوره-پایه
            </h1>
            <p className="text-blue-100 mt-2 text-right">
              مدیریت اطلاعات دوره‌ها و پایه‌های تحصیلی
            </p>
          </div>

          <div className="p-6">
            <CourseGradeManager />
          </div>
        </div>
      </div>
    </div>
  );
}
