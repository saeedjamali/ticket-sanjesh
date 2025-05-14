"use client";

import { useState, useEffect } from "react";
import TicketsList from "@/components/tickets/TicketsList";
import Link from "next/link";
import { ROLES } from "@/lib/permissions";
import { useUserContext } from "@/context/UserContext";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function TicketsPage() {
  const { user, loading } = useUserContext();
  const searchParams = useSearchParams();
  const districtId = searchParams.get("district");
  const [districtName, setDistrictName] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch (error) {
        console.error("Error updating localStorage:", error);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchDistrictInfo = async () => {
      if (!districtId) {
        setDistrictName("");
        return;
      }

      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await fetch(`/api/districts/${districtId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.district) {
            setDistrictName(data.district.name);
          }
        }
      } catch (error) {
        console.error("خطا در دریافت اطلاعات منطقه:", error);
      }
    };

    fetchDistrictInfo();
  }, [districtId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>در حال بارگذاری اطلاعات کاربر...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-red-500 mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            خطا در دسترسی
          </h2>
          <p className="text-gray-600 mb-6">
            لطفا برای دسترسی به این بخش وارد حساب کاربری خود شوید.
          </p>
          <Link
            href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md inline-block"
          >
            ورود به حساب کاربری
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مدیریت تیکت‌ها</h1>
          {districtName && (
            <div className="flex items-center text-gray-600 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm">
                منطقه:{" "}
                <span className="font-semibold text-blue-600">
                  {districtName}
                </span>
              </span>
              <button
                onClick={() => router.push("/dashboard/tickets")}
                className="mr-2 text-xs text-red-500 hover:text-red-700 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                حذف فیلتر
              </button>
            </div>
          )}
        </div>
        {(user.role === ROLES.EXAM_CENTER_MANAGER ||
          user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
          user.role === ROLES.DISTRICT_TECH_EXPERT) &&
          (user.phoneVerified ? (
            <Link
              href="/dashboard/tickets/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <span>ایجاد تیکت جدید</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => {
                  toast.error(
                    "برای ایجاد تیکت، ابتدا باید شماره موبایل خود را تأیید کنید",
                    {
                      duration: 4000,
                      position: "top-center",
                      icon: "⚠️",
                    }
                  );
                  router.push("/dashboard/profile");
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>ایجاد تیکت جدید</span>
              </button>
            </>
          ))}
      </div>

      {!user.phoneVerified && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-3 rounded-lg shadow-sm mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 ml-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-700">
                <strong>توجه:</strong> برای ایجاد تیکت جدید، ابتدا باید شماره
                موبایل خود را در{" "}
                <Link
                  href="/dashboard/profile"
                  className="text-amber-800 font-semibold underline"
                >
                  صفحه پروفایل
                </Link>{" "}
                تأیید کنید.
              </p>
            </div>
          </div>
        </div>
      )}

      <TicketsList user={user} districtFilter={districtId} />

      {/* راهنمای وضعیت تیکت‌ها */}
      {/* <div className="bg-gradient-to-r from-white to-gray-50 p-5 rounded-lg shadow-sm border border-gray-100 mt-8">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-blue-500 ml-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <h2 className="font-bold text-base text-gray-700">
              راهنمای وضعیت تیکت‌ها
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-2">
          <div className="flex items-center bg-white px-3 py-2 rounded border border-gray-100 shadow-sm text-[8px] hover:border-blue-200 transition-all">
            <span className="badge status-new ml-2  justify-center text-[8px]">
              جدید
            </span>
            <span className="text-gray-600 text-[8px]">
              تیکت‌هایی که هنوز بررسی نشده‌اند
            </span>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded border border-gray-100 shadow-sm text-[8px] hover:border-blue-200 transition-all">
            <span className="badge status-inProgress ml-2  justify-center text-[8px]">
              در حال بررسی
            </span>
            <span className="text-gray-600 text-[8px]">
              تیکت‌هایی که توسط کارشناسان در حال رسیدگی هستند
            </span>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded border border-gray-100 shadow-sm text-[8px] hover:border-blue-200 transition-all">
            <span className="badge status-seen ml-2  justify-center text-[8px]">
              دیده شده
            </span>
            <span className="text-gray-600 text-[8px]">
              تیکت‌هایی که توسط کارشناس دیده ولی هنوز پاسخ داده نشده است
            </span>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded border border-gray-100 shadow-sm text-[8px] hover:border-blue-200 transition-all">
            <span className="badge bg-purple-500 text-white ml-2  justify-center text-[8px]">
              ارجاع به استان
            </span>
            <span className="text-gray-600 text-[8px]">
              تیکت‌هایی که به استان ارجاع شده است
            </span>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded border border-gray-100 shadow-sm text-[8px] hover:border-blue-200 transition-all">
            <span className="badge status-closed ml-2  justify-center text-[8px]">
              بسته شده
            </span>
            <span className="text-gray-600 text-[8px]">
              تیکت‌هایی که فرایند رسیدگی اشان به اتمام رسیده و کارشناس آن را
              بسته است
            </span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
