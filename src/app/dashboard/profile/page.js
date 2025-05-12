"use client";

import { useUserContext } from "@/context/UserContext";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserContext();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/users/profile", {
          credentials: "include",
        });
        const data = await response.json();
        if (data.success) {
          setUserInfo(data.user);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  const getRoleName = (role) => {
    const roleMap = {
      systemAdmin: "مدیر سیستم",
      generalManager: "مدیر کل",
      provinceEducationExpert: "کارشناس سنجش استان",
      provinceTechExpert: "کارشناس فناوری استان",
      districtEducationExpert: "کارشناس سنجش منطقه",
      districtTechExpert: "کارشناس فناوری منطقه",
      examCenterManager: "مسئول مرکز آزمون",
    };

    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const roleColorMap = {
      systemAdmin: "bg-purple-100 text-purple-800",
      generalManager: "bg-indigo-100 text-indigo-800",
      provinceEducationExpert: "bg-blue-100 text-blue-800",
      provinceTechExpert: "bg-cyan-100 text-cyan-800",
      districtEducationExpert: "bg-teal-100 text-teal-800",
      districtTechExpert: "bg-green-100 text-green-800",
      examCenterManager: "bg-amber-100 text-amber-800",
    };

    return roleColorMap[role] || "bg-gray-100 text-gray-800";
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // اعتبارسنجی فرم
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError("لطفاً تمام فیلدها را پر کنید");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("رمز عبور جدید با تکرار آن مطابقت ندارد");
      return;
    }

    if (newPassword.length < 6) {
      setFormError("رمز عبور باید حداقل 6 کاراکتر باشد");
      return;
    }

    setIsSubmitting(true);

    try {
      // ارسال درخواست به API برای تغییر رمز عبور
      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userInfo._id,
          currentPassword: currentPassword,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در تغییر رمز عبور");
      }

      // موفقیت
      setFormSuccess("رمز عبور با موفقیت تغییر یافت");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-16">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md relative">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between">
          <div className="flex flex-col text-center md:text-right">
            <h2 className="text-2xl font-bold">
              {getRoleName(userInfo?.role)}
            </h2>
            <p className="text-white mt-1">کد ملی: {userInfo?.nationalId}</p>
            <p className="text-white mt-1">
              سال تحصیلی: {userInfo?.academicYear || "تعیین نشده"}
            </p>
          </div>
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-md border-4 border-white">
            {userInfo?.fullName ? userInfo.fullName.substring(0, 2) : "مد"}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-800">اطلاعات کاربری</h3>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {userInfo?.province && (
              <div className="flex items-center justify-between border-b pb-4">
                <span className="font-medium text-gray-600">استان</span>
                <div className="flex items-center">
                  <span className="text-gray-900">
                    {userInfo.province.name}
                  </span>
                  <div className="mr-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {userInfo?.district && (
              <div className="flex items-center justify-between py-4">
                <span className="font-medium text-gray-600">منطقه</span>
                <div className="flex items-center">
                  <span className="text-gray-900">
                    {userInfo.district.name}
                  </span>
                  <div className="mr-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password change section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            تغییر رمز عبور
          </h2>
        </div>

        <div className="p-6">
          {formSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-r-4 border-green-500 rounded-md flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-green-700">{formSuccess}</p>
            </div>
          )}

          {formError && (
            <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 rounded-md flex items-start">
              <svg
                className="h-6 w-6 text-red-500 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-700">{formError}</p>
            </div>
          )}

          <form className="space-y-6 max-w-xl" onSubmit={handlePasswordChange}>
            <div className="space-y-1">
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                رمز عبور فعلی
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1v-1H4a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v2zm-6 5a4 4 0 100-8 4 4 0 000 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="currentPassword"
                  type="password"
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="رمز عبور فعلی خود را وارد کنید"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                رمز عبور جدید
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="newPassword"
                  type="password"
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="رمز عبور جدید خود را وارد کنید"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                رمز عبور باید حداقل 6 کاراکتر باشد
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                تکرار رمز عبور جدید
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="رمز عبور جدید خود را تکرار کنید"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
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
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    تغییر رمز عبور
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Last login info */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center text-gray-500 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>آخرین ورود: {new Date().toLocaleDateString("fa-IR")}</span>
        </div>
      </div>
    </div>
  );
}
