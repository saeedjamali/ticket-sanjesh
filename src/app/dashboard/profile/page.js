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
        // console.log("data from profile----->", data);
        if (data.success) {
          setUserInfo(data.user);
          setLoading(false);
        } else {
          // console.error("Error fetching user info:", data.message);
        }
      } catch (error) {
        // console.error("Error fetching user info:", error);
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

    console.log("userInfo----->", userInfo);
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
    return <div className="text-paragraph">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6 w-full pb-16">
      <h1 className="heading-2 mb-4 sm:mb-6 text-gray-800">پروفایل کاربری</h1>

      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 border-t-4 border-blue-500 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="text-caption text-gray-500 mb-2">نام کامل</h3>
            <p className="text-paragraph font-medium">{userInfo?.fullName}</p>
          </div>

          <div>
            <h3 className="text-caption text-gray-500 mb-2">کد ملی</h3>
            <p className="text-paragraph font-medium">{userInfo?.nationalId}</p>
          </div>

          <div>
            <h3 className="text-caption text-gray-500 mb-2">نقش</h3>
            <p className="text-paragraph font-medium">
              {getRoleName(userInfo?.role)}
            </p>
          </div>

          <div>
            <h3 className="text-caption text-gray-500 mb-2">سال تحصیلی</h3>
            <p className="text-paragraph font-medium">
              {userInfo?.academicYear || "تعیین نشده"}
            </p>
          </div>

          {userInfo?.province && (
            <div>
              <h3 className="text-caption text-gray-500 mb-2">استان</h3>
              <p className="text-paragraph font-medium">
                {userInfo.province.name}
              </p>
            </div>
          )}

          {userInfo?.district && (
            <div>
              <h3 className="text-caption text-gray-500 mb-2">منطقه</h3>
              <p className="text-paragraph font-medium">
                {userInfo.district.name}
              </p>
            </div>
          )}

          {userInfo?.examCenter && (
            <div>
              <h3 className="text-caption text-gray-500 mb-2">مرکز</h3>
              <p className="text-paragraph font-medium">
                {userInfo.examCenter.name}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 border-t-4 border-green-500 w-full">
        <h2 className="heading-3 mb-4">تغییر رمز عبور</h2>

        {formSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-paragraph">
            {formSuccess}
          </div>
        )}

        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-paragraph">
            {formError}
          </div>
        )}

        <form className="space-y-4 max-w-xl" onSubmit={handlePasswordChange}>
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-gray-700 mb-2 text-caption"
            >
              رمز عبور فعلی
            </label>
            <input
              id="currentPassword"
              type="password"
              className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-paragraph"
              placeholder="رمز عبور فعلی خود را وارد کنید"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-gray-700 mb-2 text-caption"
            >
              رمز عبور جدید
            </label>
            <input
              id="newPassword"
              type="password"
              className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-paragraph"
              placeholder="رمز عبور جدید خود را وارد کنید"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 mb-2 text-caption"
            >
              تکرار رمز عبور جدید
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-paragraph"
              placeholder="رمز عبور جدید خود را تکرار کنید"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-responsive bg-green-600 text-white hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
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
                <span className="btn-text">در حال ارسال...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 btn-icon"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="btn-text">تغییر رمز عبور</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
