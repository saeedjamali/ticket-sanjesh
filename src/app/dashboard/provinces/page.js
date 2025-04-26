"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function ProvincesPage() {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [newProvince, setNewProvince] = useState({ name: "", code: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingProvince, setEditingProvince] = useState({
    id: "",
    name: "",
    code: "",
  });
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [showDistricts, setShowDistricts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchProvinces = async () => {
    try {
      setError("");

      // Fetch provinces
      const provincesResponse = await fetch("/api/provinces", {
        credentials: "include",
      });

      if (!provincesResponse.ok) {
        throw new Error("خطا در ارتباط با سرور");
      }

      const provincesData = await provincesResponse.json();

      if (!provincesData.success) {
        throw new Error(
          provincesData.error || "خطا در دریافت اطلاعات استان‌ها"
        );
      }

      setProvinces(provincesData.provinces || []);

      // Fetch districts
      const districtsResponse = await fetch("/api/districts", {
        credentials: "include",
      });

      if (!districtsResponse.ok) {
        throw new Error("خطا در ارتباط با سرور");
      }

      const districtsData = await districtsResponse.json();

      if (!districtsData.success) {
        throw new Error(districtsData.error || "خطا در دریافت اطلاعات مناطق");
      }

      setDistricts(districtsData.districts || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "خطا در دریافت اطلاعات");
      toast.error(error.message || "خطا در دریافت اطلاعات");
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      await fetchProvinces();
      setIsLoading(false);
    };

    initializePage();
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (isEditing) {
      setEditingProvince((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewProvince((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const provinceData = isEditing ? editingProvince : newProvince;
      const url = isEditing
        ? `/api/provinces/${editingProvince.id}`
        : "/api/provinces";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: provinceData.name,
          code: provinceData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || `خطا در ${isEditing ? "ویرایش" : "ایجاد"} استان`
        );
      }

      toast.success(`استان با موفقیت ${isEditing ? "ویرایش" : "ایجاد"} شد`);

      if (isEditing) {
        setIsEditing(false);
        setEditingProvince({ id: "", name: "", code: "" });
      } else {
        setNewProvince({ name: "", code: "" });
      }

      // بروزرسانی لیست استان‌ها
      await fetchProvinces();
    } catch (error) {
      console.error("Error saving province:", error);
      toast.error(error.message);
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  const handleEdit = (province) => {
    setIsEditing(true);
    setEditingProvince({
      id: province._id,
      name: province.name,
      code: province.code,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingProvince({ id: "", name: "", code: "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این استان اطمینان دارید؟")) return;

    try {
      const response = await fetch(`/api/provinces/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("خطا در ارتباط با سرور");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "خطا در حذف استان");
      }

      toast.success("استان با موفقیت حذف شد");
      fetchProvinces();
    } catch (error) {
      console.error("Error deleting province:", error);
      toast.error(error.message || "خطا در حذف استان");
      if (error.message.includes("عدم احراز هویت")) {
        router.push("/login");
      }
    }
  };

  const handleShowDistricts = (province) => {
    setSelectedProvince(province);
    setShowDistricts(true);
  };

  const handleBackToProvinces = () => {
    setShowDistricts(false);
    setSelectedProvince(null);
  };

  const filteredDistricts = selectedProvince
    ? districts.filter(
        (district) => district.province._id === selectedProvince._id
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">مدیریت استان‌ها</h1>

      {showDistricts ? (
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={handleBackToProvinces}
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
              بازگشت به لیست استان‌ها
            </button>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                مناطق استان {selectedProvince.name}
              </h2>
              <Link
                href={`/dashboard/districts?province=${selectedProvince._id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                مدیریت مناطق
              </Link>
            </div>

            {filteredDistricts.length === 0 ? (
              <p className="text-gray-500">
                هیچ منطقه‌ای برای این استان ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        نام منطقه
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        کد
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ ایجاد
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDistricts.map((district) => (
                      <tr key={district._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {district.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {district.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(district.createdAt).toLocaleDateString(
                            "fa-IR"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">افزودن استان جدید</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    نام استان *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={isEditing ? editingProvince.name : newProvince.name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="code"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    کد استان *
                  </label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={isEditing ? editingProvince.code : newProvince.code}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {isEditing ? "ویرایش استان" : "افزودن استان"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 ml-2"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">لیست استان‌ها</h2>
            {provinces.length === 0 ? (
              <p className="text-gray-500">هیچ استانی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        نام استان
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        کد استان
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        تعداد مناطق
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        سال تحصیلی
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        تاریخ ایجاد
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {provinces.map((province) => (
                      <tr key={province._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {province.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {province.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {province.districtsCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {province.academicYear || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {province.createdAt
                            ? new Date(province.createdAt).toLocaleDateString(
                                "fa-IR"
                              )
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleShowDistricts(province)}
                            className="text-indigo-600 hover:text-indigo-900 ml-2"
                          >
                            مناطق
                          </button>
                          <button
                            onClick={() => handleEdit(province)}
                            className="text-blue-600 hover:text-blue-900 ml-2"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDelete(province._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
