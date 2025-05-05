"use client";

import { Suspense } from "react";
import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Left side: Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <Suspense
          fallback={
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          }
        >
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-block p-2 bg-blue-100 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 14h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800">
                سامانه پیگیری درخواست ها
              </h2>
              <p className="text-gray-600 mt-4">
                لطفاً وارد حساب کاربری خود شوید
              </p>
            </div>
            <LoginForm />
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>
                مالکیت مادی و معنوی این سایت متعلق به اداره کل آموزش و پرورش
                خراسان رضوی می باشد
              </p>
            </div>
          </div>
        </Suspense>
      </div>

      {/* Right side: Illustration/Info */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <pattern
                id="grid"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 8 0 L 0 0 0 8"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-md text-white text-center">
          <div className="mb-8 mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 mx-auto text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            به مرکز پیگیری درخواست ها خوش آمدید
          </h2>
          <p className="text-blue-100 mb-6">
            از طریق این سامانه می‌توانید به راحتی درخواست‌های خود را ثبت و
            پیگیری نمایید{" "}
          </p>
          {/* <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <span className="block text-2xl font-bold">۲۴/۷</span>
              <span className="text-blue-100">پشتیبانی دائمی</span>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <span className="block text-2xl font-bold">+۱۰۰</span>
              <span className="text-blue-100">مرکز آموزشی</span>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
