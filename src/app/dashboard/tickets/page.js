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
    </div>
  );
}
