"use client";
import { checkUserRole } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions";
import CreateTicketForm from "@/components/tickets/CreateTicketForm";
import { authService } from "@/lib/auth/authService";
import { useUserContext } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CreateTicketPage() {
  const { user, loading } = useUserContext();
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading) {
      // بررسی مجوز دسترسی و تأیید شماره موبایل
      if (!user) {
        router.push("/login");
        return;
      }

      if (
        user.role !== ROLES.EXAM_CENTER_MANAGER &&
        user.role !== ROLES.DISTRICT_EDUCATION_EXPERT &&
        user.role !== ROLES.DISTRICT_TECH_EXPERT
      ) {
        setError(
          "خطای دسترسی: فقط مسئولین واحد سازمانی و کارشناسان منطقه می‌توانند تیکت ایجاد کنند."
        );
        return;
      }

      if (!user.phoneVerified) {
        setError("برای ایجاد تیکت، ابتدا باید شماره موبایل خود را تأیید کنید");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="loader h-8 w-8 rounded-full border-4 border-t-4 border-gray-200 border-t-blue-600 ease-linear"></div>
        <span className="mr-2">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-4">
          <div className="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-500"
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
          <h2 className="text-xl font-bold text-red-600 mb-3">خطا</h2>
          <p className="text-gray-700 mb-4">{error}</p>

          {!user?.phoneVerified && (
            <>
              <p className="text-gray-600 mb-4 text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
                تأیید شماره موبایل به شما امکان می‌دهد در صورت فراموشی رمز عبور،
                بتوانید حساب خود را بازیابی کنید و همچنین از قابلیت‌های پیشرفته
                سیستم استفاده نمایید.
              </p>
              <Link
                href="/dashboard/profile"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                تأیید شماره موبایل
              </Link>
            </>
          )}
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
