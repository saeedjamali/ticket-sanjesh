"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleName } from "@/lib/permissions";
import TicketStats from "@/components/dashboard/TicketStats";
import DistrictsGrid from "@/components/dashboard/DistrictsGrid";
import ProvinceExamCenters from "@/components/dashboard/ProvinceExamCenters";
import { useUserContext } from "@/context/UserContext";
import { ROLES } from "@/lib/permissions";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function DashboardPage() {
  const { user, loading, checkAuth } = useUserContext();
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showDistrictsGrid, setShowDistrictsGrid] = useState(true);
  const [showExamCenters, setShowExamCenters] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const checkDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/check-db");
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      setDbStatus({ status: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleName = (roleKey) => {
    return getRoleName(roleKey) || roleKey;
  };

  // تشخیص اینکه آیا کاربر مدیر کل یا کارشناس استان است
  const isProvinceUser =
    user?.role === ROLES.GENERAL_MANAGER ||
    user?.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
    user?.role === ROLES.PROVINCE_TECH_EXPERT;

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
      setPageLoading(false);
    };

    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirectTo=/dashboard");
    }
  }, [user, loading, router]);

  if (loading || pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">داشبورد</h1>

      {/* بخش خوش‌آمدگویی - در ابتدای صفحه */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          به سامانه تیکتینگ خوش آمدید!
        </h2>
        <p className="text-gray-700">
          برای استفاده از امکانات سامانه، از منوی سمت راست گزینه‌های مورد نظر
          خود را انتخاب کنید.
        </p>
        <p className="text-gray-700 mt-2">
          شما به عنوان {renderRoleName(user.role)} وارد شده‌اید و می‌توانید
          تیکت‌های مرتبط با حوزه خود را مشاهده و مدیریت کنید.
        </p>
      </div>

      {/* بخش کاشی‌های مناطق استان - فقط برای مدیران کل و کارشناسان استان */}
      {isProvinceUser && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">وضعیت مناطق استان</h2>
            <button
              onClick={() => setShowDistrictsGrid(!showDistrictsGrid)}
              className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
            >
              {showDistrictsGrid ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 ml-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span>مخفی کردن</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 ml-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span>نمایش</span>
                </>
              )}
            </button>
          </div>

          {showDistrictsGrid && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <DistrictsGrid />
            </div>
          )}
        </div>
      )}

      {/* بخش آمار تیکت‌ها */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">گزارش تیکت‌ها</h2>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
          >
            {showStats ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 ml-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
                <span>مخفی کردن</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 ml-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                <span>نمایش</span>
              </>
            )}
          </button>
        </div>

        {showStats && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <TicketStats />
          </div>
        )}
      </div>

      {/* بخش مراکز امتحانی استان - فقط برای مدیران کل و کارشناسان استان */}
      {isProvinceUser && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">مراکز امتحانی استان</h2>
            <button
              onClick={() => setShowExamCenters(!showExamCenters)}
              className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
            >
              {showExamCenters ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 ml-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span>مخفی کردن</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 ml-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span>نمایش</span>
                </>
              )}
            </button>
          </div>

          {showExamCenters && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <ProvinceExamCenters />
            </div>
          )}
        </div>
      )}

      {/* بخش وضعیت اتصال به دیتابیس */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">وضعیت اتصال به دیتابیس</h2>
          <button
            onClick={checkDatabaseConnection}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="ml-2" />
                <span>در حال بررسی...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 ml-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>بررسی اتصال</span>
              </>
            )}
          </button>
        </div>

        {dbStatus && (
          <div
            className={`bg-white shadow-sm rounded-lg p-6 ${
              dbStatus.status === "connected"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            <p>{dbStatus.message}</p>

            {dbStatus.status === "connected" && (
              <div className="mt-3">
                <p>
                  <strong>نام پایگاه داده:</strong> {dbStatus.database}
                </p>
                <p>
                  <strong>مدل‌های موجود:</strong> {dbStatus.models?.join(", ")}
                </p>
                {dbStatus.collections && (
                  <p>
                    <strong>جداول موجود:</strong>{" "}
                    {dbStatus.collections.join(", ")}
                  </p>
                )}
                {dbStatus.stats && (
                  <div className="mt-2">
                    <p>
                      <strong>تعداد سال‌های تحصیلی:</strong>{" "}
                      {dbStatus.stats.academicYears}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* بخش راهنمای سریع */}
      <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">راهنمای سریع</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">مشاهده تیکت‌ها</h3>
            <p className="text-gray-700">
              از منوی سمت راست گزینه &quot;تیکت‌ها&quot; را انتخاب کنید تا لیست
              تیکت‌های مرتبط با حوزه خود را مشاهده کنید.
            </p>
          </div>
          {user?.role === "examCenterManager" && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold text-lg mb-2">ثبت تیکت جدید</h3>
              <p className="text-gray-700">
                برای ثبت تیکت جدید، به صفحه تیکت‌ها رفته و روی دکمه &quot;ایجاد
                تیکت جدید&quot; کلیک کنید.
              </p>
            </div>
          )}
          {user?.role !== "examCenterManager" && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold text-lg mb-2">پاسخ به تیکت‌ها</h3>
              <p className="text-gray-700">
                با مراجعه به صفحه تیکت مورد نظر می‌توانید به تیکت‌های ارسال شده
                پاسخ دهید.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
