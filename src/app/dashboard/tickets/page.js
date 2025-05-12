"use client";

import { useState, useEffect } from "react";
import TicketsList from "@/components/tickets/TicketsList";
import Link from "next/link";
import { ROLES } from "@/lib/permissions";
import { useUserContext } from "@/context/UserContext";

export default function TicketsPage() {
  const { user, loading } = useUserContext();

  useEffect(() => {
    if (user) {
      try {
        console.log("Updating localStorage with user data:", user);
        localStorage.setItem("user", JSON.stringify(user));
      } catch (error) {
        console.error("Error updating localStorage:", error);
      }
    }
  }, [user]);

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
        <h1 className="text-2xl font-bold text-gray-800">مدیریت تیکت‌ها</h1>
        {(user.role === ROLES.EXAM_CENTER_MANAGER ||
          user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
          user.role === ROLES.DISTRICT_TECH_EXPERT) && (
          <Link
            href="/dashboard/tickets/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <span>ایجاد تیکت جدید</span>
          </Link>
        )}
      </div>

      <TicketsList user={user} />

      {/* راهنمای وضعیت تیکت‌ها */}
      <div className="bg-gradient-to-r from-white to-gray-50 p-5 rounded-lg shadow-sm border border-gray-100 mt-8">
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
      </div>
    </div>
  );
}
