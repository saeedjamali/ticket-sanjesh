"use client";

import { useUserContext } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PhoneVerificationGuard = ({ children, requiresVerification = false }) => {
  const { user, loading } = useUserContext();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPhoneVerification = async () => {
      // اگر احراز هویت مورد نیاز نیست، مستقیماً اجازه دسترسی بده
      if (!requiresVerification) {
        setIsVerified(true);
        setIsChecking(false);
        return;
      }

      // منتظر بمان تا اطلاعات کاربر لود شود
      if (loading || !user) {
        return;
      }

      try {
        // بررسی وضعیت احراز هویت از سرور
        const response = await fetch("/api/users/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user.phoneVerified) {
            setIsVerified(true);
          } else {
            setIsVerified(false);
          }
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error("Error checking phone verification:", error);
        setIsVerified(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkPhoneVerification();
  }, [user, loading, requiresVerification]);

  // در حال بررسی
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بررسی وضعیت احراز هویت...</p>
        </div>
      </div>
    );
  }

  // اگر احراز هویت مورد نیاز است ولی کاربر احراز نشده
  if (requiresVerification && !isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="bg-yellow-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              احراز هویت مورد نیاز
            </h2>

            <p className="text-gray-600 mb-6 leading-relaxed">
              برای دسترسی به این بخش، ابتدا باید شماره موبایل خود را تأیید کنید.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5 ml-2 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">راهنما:</p>
                  <p className="mt-1">
                    به صفحه پروفایل مراجعه کرده و در بخش &quot;شماره
                    موبایل&quot; روی دکمه &quot;ارسال کد تأیید&quot; کلیک کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                رفتن به پروفایل
              </button>

              <button
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg transition-colors font-medium"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // اگر همه چیز درست است، children را نمایش بده
  return children;
};

export default PhoneVerificationGuard;
