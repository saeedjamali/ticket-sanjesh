"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function DistrictsPage() {
  const [districts, setDistricts] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [examCenters, setExamCenters] = useState([
    { id: "1", name: "مرکز آزمون ۱", district: "1", manager: "علی محمدی" },
    { id: "2", name: "مرکز آزمون ۲", district: "1", manager: "حسن رضایی" },
    { id: "3", name: "مرکز آزمون ۳", district: "2", manager: "محمد حسینی" },
    { id: "4", name: "مرکز آزمون ۴", district: "3", manager: "رضا کریمی" },
    { id: "5", name: "مرکز آزمون ۵", district: "4", manager: "زهرا احمدی" },
  ]);
  const [activeUsers, setActiveUsers] = useState([
    { id: "1", name: "علی محمدی", role: "مدیر", district: "1" },
    { id: "2", name: "مریم حسینی", role: "کارشناس", district: "1" },
    { id: "3", name: "حسن رضایی", role: "کارشناس", district: "2" },
    { id: "4", name: "زهرا احمدی", role: "مدیر", district: "4" },
  ]);
  const [newDistrict, setNewDistrict] = useState({
    name: "",
    code: "",
    province: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [viewingExamCenters, setViewingExamCenters] = useState(false);
  const [viewingUsers, setViewingUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Fetch provinces
      const provincesResponse = await fetch("/api/provinces", { headers });
      const provincesData = await provincesResponse.json();

      if (!provincesData.success) {
        throw new Error(
          provincesData.error || "خطا در دریافت اطلاعات استان‌ها"
        );
      }

      setProvinces(provincesData.provinces || []);

      // Fetch districts
      const districtsResponse = await fetch("/api/districts", { headers });
      const districtsData = await districtsResponse.json();

      if (!districtsData.success) {
        throw new Error(districtsData.error || "خطا در دریافت اطلاعات مناطق");
      }

      setDistricts(districtsData.districts || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "خطا در دریافت اطلاعات");
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
      const response = await fetch("/api/districts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(newDistrict),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "خطا در ایجاد منطقه");
      }

      setDistricts((prev) => [...prev, data.district]);
      setNewDistrict({ name: "", code: "", province: "" });
      toast.success("منطقه با موفقیت ایجاد شد");
    } catch (error) {
      console.error("Error creating district:", error);
      toast.error(error.message || "خطا در ایجاد منطقه");
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این منطقه اطمینان دارید؟")) return;

    try {
      const response = await fetch(`/api/districts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "خطا در حذف منطقه");
      }

      setDistricts((prev) => prev.filter((district) => district._id !== id));
      toast.success("منطقه با موفقیت حذف شد");
    } catch (error) {
      console.error("Error deleting district:", error);
      toast.error(error.message || "خطا در حذف منطقه");
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  // Filter districts based on selected province
  const filteredDistricts = districts.filter(
    (district) => !selectedProvince || district.province === selectedProvince
  );

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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">مدیریت مناطق</h1>

      {viewingExamCenters ? (
        // نمایش مراکز آزمون منطقه انتخاب شده
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setViewingExamCenters(false);
                setViewingUsers(false);
                setSelectedDistrict(null);
              }}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              بازگشت به لیست مناطق
            </button>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                مراکز آزمون منطقه {selectedDistrict?.name}
              </h2>
              <Link
                href={`/dashboard/exam-centers?district=${selectedDistrict?.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                افزودن مرکز آزمون جدید
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="py-3 px-4 text-right">نام مرکز آزمون</th>
                    <th className="py-3 px-4 text-right">مدیر مرکز</th>
                    <th className="py-3 px-4 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {examCenters
                    .filter(
                      (center) => center.district === selectedDistrict?.id
                    )
                    .map((center) => (
                      <tr key={center.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">{center.name}</td>
                        <td className="py-3 px-4">{center.manager}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Link
                              href={`/dashboard/exam-centers/edit/${center.id}`}
                              className="text-yellow-600 hover:text-yellow-800"
                            >
                              ویرایش
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {examCenters.filter(
              (center) => center.district === selectedDistrict?.id
            ).length === 0 && (
              <div className="text-center py-4 text-gray-500">
                هیچ مرکز آزمونی برای این منطقه یافت نشد
              </div>
            )}
          </div>
        </div>
      ) : viewingUsers ? (
        // نمایش کاربران فعال منطقه انتخاب شده
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setViewingUsers(false);
                setViewingExamCenters(false);
                setSelectedDistrict(null);
              }}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              بازگشت به لیست مناطق
            </button>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                کاربران فعال منطقه {selectedDistrict?.name}
              </h2>
              <Link
                href={`/dashboard/users?district=${selectedDistrict?.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                افزودن کاربر جدید
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="py-3 px-4 text-right">نام کاربر</th>
                    <th className="py-3 px-4 text-right">نقش</th>
                    <th className="py-3 px-4 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeUsers
                    .filter((user) => user.district === selectedDistrict?.id)
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">{user.name}</td>
                        <td className="py-3 px-4">{user.role}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Link
                              href={`/dashboard/users/edit/${user.id}`}
                              className="text-yellow-600 hover:text-yellow-800"
                            >
                              ویرایش
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {activeUsers.filter(
              (user) => user.district === selectedDistrict?.id
            ).length === 0 && (
              <div className="text-center py-4 text-gray-500">
                هیچ کاربر فعالی برای این منطقه یافت نشد
              </div>
            )}
          </div>
        </div>
      ) : (
        // نمایش فرم افزودن/ویرایش منطقه و لیست مناطق
        <>
          <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-4">افزودن منطقه جدید</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  نام منطقه
                </label>
                <input
                  type="text"
                  value={newDistrict.name}
                  onChange={(e) =>
                    setNewDistrict({ ...newDistrict, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  کد منطقه
                </label>
                <input
                  type="text"
                  value={newDistrict.code}
                  onChange={(e) =>
                    setNewDistrict({ ...newDistrict, code: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  استان
                </label>
                <select
                  value={newDistrict.province}
                  onChange={(e) =>
                    setNewDistrict({ ...newDistrict, province: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">انتخاب استان</option>
                  {provinces.map((province) => (
                    <option key={province._id} value={province._id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                افزودن منطقه
              </button>
            </form>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">لیست مناطق</h2>

              <div>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">همه استان‌ها</option>
                  {provinces.map((province) => (
                    <option key={province._id} value={province._id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="py-3 px-4 text-right">نام منطقه</th>
                    <th className="py-3 px-4 text-right">کد منطقه</th>
                    <th className="py-3 px-4 text-right">استان</th>
                    <th className="py-3 px-4 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDistricts.map((district) => (
                    <tr key={district._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{district.name}</td>
                      <td className="py-3 px-4">{district.code}</td>
                      <td className="py-3 px-4">
                        {provinces.find((p) => p._id === district.province)
                          ?.name || "نامشخص"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              setViewingExamCenters(true);
                              setViewingUsers(false);
                              setSelectedDistrict(district);
                            }}
                          >
                            مراکز آزمون
                          </button>
                          <button
                            className="text-indigo-600 hover:text-indigo-800"
                            onClick={() => {
                              setViewingUsers(true);
                              setViewingExamCenters(false);
                              setSelectedDistrict(district);
                            }}
                          >
                            کاربران
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(district._id)}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDistricts.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                هیچ منطقه‌ای یافت نشد
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                نمایش {filteredDistricts.length} منطقه
              </p>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-yellow-500">
            <h2 className="text-xl font-semibold mb-4">راهنما</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>
                برای مشاهده مراکز آزمون یک منطقه، روی دکمه «مراکز آزمون» کلیک
                کنید.
              </li>
              <li>
                برای مشاهده کاربران فعال یک منطقه، روی دکمه «کاربران» کلیک کنید.
              </li>
              <li>
                مناطقی که دارای مراکز آزمون یا کاربران فعال هستند را نمی‌توان
                حذف کرد.
              </li>
              <li>کد منطقه باید منحصر به فرد باشد.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
