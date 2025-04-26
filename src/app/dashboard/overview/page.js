import { redirect } from "next/navigation";
import { checkUserRole } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions";
import DistrictMap from "@/components/overview/DistrictMap";

export const metadata = {
  title: "نمای کلی مناطق",
  description: "نمایش وضعیت تیکت‌های مناطق مختلف",
};

export default async function OverviewPage() {
  // Ensure only general managers can access this page
  const user = await checkUserRole([ROLES.GENERAL_MANAGER, ROLES.SYSTEM_ADMIN]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        نمای کلی وضعیت مناطق
      </h1>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          در این صفحه می‌توانید وضعیت تیکت‌های مناطق مختلف را مشاهده کنید.
          مناطقی که هیچ خطایی ندارند یا خطاهای آن‌ها پاسخ داده شده است با رنگ
          سبز و مناطق دارای خطای باز با رنگ قرمز نمایش داده می‌شوند.
        </p>

        <DistrictMap userId={user.id} />
      </div>
    </div>
  );
}
