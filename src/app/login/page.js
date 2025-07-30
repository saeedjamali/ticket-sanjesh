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
                <Image
                  src="/logo2.png"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="text-blue-600"
                />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-800 ">
                سامانه پایش و رصد وضعیت عدالت آموزشی
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
            <Image
              src="/logo.png"
              alt="Logo 2"
              width={200}
              height={200}
              className="mx-auto text-white"
            />
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-14">
            به مرکز پایش و رصد وضعیت عدالت آموزشی خوش آمدید
          </h2>
          <p className="text-blue-100 mb-6">
            از طریق این سامانه می‌توانید به راحتی درخواست‌ها و گزارشات خود را
            ثبت و پیگیری نمایید{" "}
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
