import { auth } from "@/lib/auth";
import { checkUserRole, ROLES } from "@/lib/permissions";
import StudentInfoForm from "@/components/forms/StudentInfoForm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";

export default async function StudentInfoPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore?.get("refresh-token");

  const { user } = await authService.refreshToken(authToken?.value);
  console.log("user---->", user);

  // بررسی دسترسی - فقط برای مدیران واحد سازمانی
  await checkUserRole([ROLES.EXAM_CENTER_MANAGER], user);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white text-right">
              اطلاعات دانش آموزی
            </h1>
            <p className="text-blue-100 mt-2 text-right">
              لطفا اطلاعات مورد نیاز را تکمیل کنید
            </p>
          </div>

          <div className="p-6">
            <StudentInfoForm />
          </div>
        </div>
      </div>
    </div>
  );
}
