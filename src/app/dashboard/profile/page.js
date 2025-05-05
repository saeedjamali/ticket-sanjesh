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
    console.log("user----->", user);
    // const storedUser = localStorage.getItem("user");
    if (user) {
      setUserInfo(user);
      setLoading(false);
    }
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

    try {
      // ارسال درخواست به API برای تغییر رمز عبور
      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userInfo.id,
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
    return <div>در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">پروفایل کاربری</h1>

      <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-gray-500 mb-2">نام کامل</h3>
            <p className="text-lg font-medium">{user?.name}</p>
          </div>

          <div>
            <h3 className="text-gray-500 mb-2">کد ملی</h3>
            <p className="text-lg font-medium">{user?.nationalId}</p>
          </div>

          <div>
            <h3 className="text-gray-500 mb-2">نقش</h3>
            <p className="text-lg font-medium">{getRoleName(user?.role)}</p>
          </div>

          <div>
            <h3 className="text-gray-500 mb-2">سال تحصیلی</h3>
            <p className="text-lg font-medium">
              {user?.academicYear || "تعیین نشده"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-green-500">
        <h2 className="text-xl font-semibold mb-4">تغییر رمز عبور</h2>

        {formSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {formSuccess}
          </div>
        )}

        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {formError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handlePasswordChange}>
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-gray-700 mb-2"
            >
              رمز عبور فعلی
            </label>
            <input
              id="currentPassword"
              type="password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="رمز عبور فعلی خود را وارد کنید"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-gray-700 mb-2">
              رمز عبور جدید
            </label>
            <input
              id="newPassword"
              type="password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="رمز عبور جدید خود را وارد کنید"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 mb-2"
            >
              تکرار رمز عبور جدید
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="رمز عبور جدید خود را تکرار کنید"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? "در حال ارسال..." : "تغییر رمز عبور"}
          </button>
        </form>
      </div>
    </div>
  );
}
