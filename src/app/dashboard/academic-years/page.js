"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/academic-years", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت اطلاعات سال‌های تحصیلی");
      }

      if (!data.success) {
        throw new Error(data.error || "خطا در دریافت اطلاعات سال‌های تحصیلی");
      }

      setAcademicYears(data.academicYears || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
      setError(error.message);
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/academic-years", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: newYear }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در ایجاد سال تحصیلی");
      }

      if (!data.success) {
        throw new Error(data.error || "خطا در ایجاد سال تحصیلی");
      }

      toast.success("سال تحصیلی با موفقیت ایجاد شد");
      setNewYear("");
      fetchAcademicYears();
    } catch (error) {
      console.error("Error creating academic year:", error);
      toast.error(error.message);
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  const handleSetActive = async (id) => {
    try {
      const response = await fetch(`/api/academic-years/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در فعال‌سازی سال تحصیلی");
      }

      if (!data.success) {
        throw new Error(data.error || "خطا در فعال‌سازی سال تحصیلی");
      }

      toast.success("سال تحصیلی با موفقیت فعال شد");
      fetchAcademicYears();
    } catch (error) {
      console.error("Error activating academic year:", error);
      toast.error(error.message);
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این سال تحصیلی اطمینان دارید؟")) return;

    try {
      const response = await fetch(`/api/academic-years/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در حذف سال تحصیلی");
      }

      if (!data.success) {
        throw new Error(data.error || "خطا در حذف سال تحصیلی");
      }

      toast.success("سال تحصیلی با موفقیت حذف شد");
      fetchAcademicYears();
    } catch (error) {
      console.error("Error deleting academic year:", error);
      toast.error(error.message);
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مدیریت سال‌های تحصیلی</h1>

      {/* فرم ایجاد سال تحصیلی جدید */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">افزودن سال تحصیلی جدید</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              سال تحصیلی
            </label>
            <input
              type="text"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="مثال: 1402-1403"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            افزودن سال تحصیلی
          </button>
        </form>
      </div>

      {/* جدول نمایش سال‌های تحصیلی */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">لیست سال‌های تحصیلی</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  سال تحصیلی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {academicYears.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    هیچ سال تحصیلی یافت نشد
                  </td>
                </tr>
              ) : (
                academicYears.map((year) => (
                  <tr key={year._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{year.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {year.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          فعال
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActive(year._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          فعال‌سازی
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!year.isActive && (
                        <button
                          onClick={() => handleDelete(year._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
