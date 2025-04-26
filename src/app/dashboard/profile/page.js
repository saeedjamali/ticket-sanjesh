"use client";

import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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

        <form className="space-y-4">
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
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            تغییر رمز عبور
          </button>
        </form>
      </div>
    </div>
  );
}
