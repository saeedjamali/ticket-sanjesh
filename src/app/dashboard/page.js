"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleName } from "@/lib/permissions";
import TicketStats from "@/components/dashboard/TicketStats";
import DistrictsGrid from "@/components/dashboard/DistrictsGrid";
import ProvinceExamCenters from "@/components/dashboard/ProvinceExamCenters";
import EventsList from "@/components/dashboard/EventsList";
import { useUserContext } from "@/context/UserContext";
import { ROLES } from "@/lib/permissions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import PasswordGuideModal from "@/components/auth/PasswordGuideModal";
import WebsiteVisitStats from "@/components/dashboard/WebsiteVisitStats";

export default function DashboardPage() {
  const { user, loading, checkAuth } = useUserContext();
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDistrictsGrid, setShowDistrictsGrid] = useState(true);
  const [showExamCenters, setShowExamCenters] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
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
    user?.role === ROLES.PROVINCE_TECH_EXPERT ||
    user?.role === ROLES.PROVINCE_EVAL_EXPERT;

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
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* هدر صفحه با آمار بازدید */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="heading-2 text-gray-800">داشبورد</h1>
        
        {/* کامپوننت آمار بازدید - کوچک و در گوشه */}
        <div className="sm:max-w-xs w-full sm:w-auto">
          {/* <WebsiteVisitStats /> */}
        </div>
      </div>

      {/* هشدار تأیید شماره موبایل - فقط اگر فیلدهای مربوطه وجود داشته باشند و شماره تأیید نشده باشد */}
      {user &&
        (user.phone === undefined ||
          user.phone === null ||
          user.phone === "" ||
          user.phoneVerified === false) && (
          <div className="bg-amber-50 border-r-4 border-amber-500 p-4 sm:p-5 mb-6 rounded-lg shadow-sm animate-pulse">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-amber-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="mr-3">
                <h3 className="text-lg font-medium text-amber-800">
                  {!user.phone
                    ? "شماره موبایل ثبت نشده است"
                    : "شماره موبایل شما تأیید نشده است"}
                </h3>
                <div className="mt-2 text-amber-700">
                  <p>
                    برای استفاده از امکان <strong>بازیابی رمز عبور</strong> در
                    صورت فراموشی، لطفاً شماره موبایل خود را در{" "}
                    <a
                      href="/dashboard/profile"
                      className="underline font-medium hover:text-amber-900"
                    >
                      صفحه پروفایل
                    </a>{" "}
                    ثبت و تأیید کنید.
                  </p>
                </div>
              </div>
              <div className="mr-auto">
                <a
                  href="/dashboard/profile"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  {!user.phone ? "ثبت شماره موبایل" : "تأیید شماره موبایل"}
                  <svg
                    className="mr-2 -ml-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

      {/* بخش خوش‌آمدگویی - در ابتدای صفحه */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h2 className="heading-3 mb-3 sm:mb-4 text-gray-800">
          به سامانه رصد خوش آمدید!
        </h2>
        <p className="text-paragraph text-gray-700">
          برای استفاده از امکانات سامانه، از منوی سمت راست گزینه‌های مورد نظر
          خود را انتخاب کنید.
        </p>
        <p className="text-paragraph text-gray-700 mt-2">
          شما به عنوان {renderRoleName(user.role)} وارد شده‌اید و می‌توانید
          گزارش‌های مرتبط با حوزه خود را مشاهده و مدیریت کنید.
        </p>
      </div>
      {/* بنر راهنمای امنیت حساب کاربری */}
      <div className="mt-4 sm:mt-6">
        <PasswordGuideModal />
      </div>

      {/* بخش رویدادها */}
      <div className="mt-4 sm:mt-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="heading-3 text-gray-800">رویدادهای جاری</h2>
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="btn-icon-responsive bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            {showEvents ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
                <span className="btn-text">مخفی کردن</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                <span className="btn-text">نمایش</span>
              </>
            )}
          </button>
        </div>

        {showEvents && (
          <div className="bg-white shadow-sm rounded-lg p-3 sm:p-6">
            <EventsList />
          </div>
        )}
      </div>
      {/* بخش کاشی‌های مناطق استان - فقط برای مدیران کل و کارشناسان استان */}
      {isProvinceUser && (
        <div className="mt-4 sm:mt-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="heading-3 text-gray-800">وضعیت مناطق استان</h2>
            <button
              onClick={() => setShowDistrictsGrid(!showDistrictsGrid)}
              className="btn-icon-responsive bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
            >
              {showDistrictsGrid ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span className="btn-text">مخفی کردن</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span className="btn-text">نمایش</span>
                </>
              )}
            </button>
          </div>

          {showDistrictsGrid && (
            <div className="bg-white shadow-sm rounded-lg p-3 sm:p-6 overflow-x-auto">
              <DistrictsGrid />
            </div>
          )}
        </div>
      )}

      {/* بخش آمار تیکت‌ها */}
      <div className="mt-4 sm:mt-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="heading-3 text-gray-800">گزارش تیکت‌ها</h2>
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn-icon-responsive bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            {showStats ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
                <span className="btn-text">مخفی کردن</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                <span className="btn-text">نمایش</span>
              </>
            )}
          </button>
        </div>

        {showStats && (
          <div className="bg-white shadow-sm rounded-lg p-3 sm:p-6 overflow-x-auto">
            <TicketStats />
          </div>
        )}
      </div>

      {/* بخش مدارس امتحانی استان - فقط برای مدیران کل و کارشناسان استان */}
      {isProvinceUser && (
        <div className="mt-4 sm:mt-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="heading-3 text-gray-800">مدارس امتحانی استان</h2>
            <button
              onClick={() => setShowExamCenters(!showExamCenters)}
              className="btn-icon-responsive bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
            >
              {showExamCenters ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span className="btn-text">مخفی کردن</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span className="btn-text">نمایش</span>
                </>
              )}
            </button>
          </div>

          {showExamCenters && (
            <div className="bg-white shadow-sm rounded-lg p-3 sm:p-6 overflow-x-auto">
              <ProvinceExamCenters />
            </div>
          )}
        </div>
      )}

      {/* بخش وضعیت اتصال به دیتابیس */}
      {/* <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">وضعیت اتصال به دیتابیس</h2>
          <button
            onClick={checkDatabaseConnection}
            className="btn-responsive bg-blue-500 text-white hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 btn-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="btn-text">در حال بررسی...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 btn-icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span className="btn-text">بررسی اتصال</span>
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
      </div> */}

      {/* بخش راهنمای سریع */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="heading-3 mb-3 sm:mb-4 text-gray-800">راهنمای سریع</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 border rounded-lg bg-gray-50">
            <h3 className="heading-4 mb-2 text-gray-700">مشاهده تیکت‌ها</h3>
            <p className="text-paragraph text-gray-700">
              از منوی سمت راست گزینه &quot;تیکت‌ها&quot; را انتخاب کنید تا لیست
              تیکت‌های مرتبط با حوزه خود را مشاهده کنید.
            </p>
          </div>
          {user?.role === "examCenterManager" && (
            <div className="p-3 sm:p-4 border rounded-lg bg-gray-50">
              <h3 className="heading-4 mb-2">ثبت تیکت جدید</h3>
              <p className="text-paragraph text-gray-700">
                برای ثبت تیکت جدید، به صفحه تیکت‌ها رفته و روی دکمه &quot;ایجاد
                تیکت جدید&quot; کلیک کنید.
              </p>
            </div>
          )}
          {user?.role !== "examCenterManager" && (
            <div className="p-3 sm:p-4 border rounded-lg bg-gray-50">
              <h3 className="heading-4 mb-2 text-gray-700">پاسخ به تیکت‌ها</h3>
              <p className="text-paragraph text-gray-700">
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
