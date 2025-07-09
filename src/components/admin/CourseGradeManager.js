"use client";

import { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function CourseGradeManager() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    courseCode: "",
    courseName: "",
    gradeCode: "",
    gradeName: "",
  });

  // دریافت داده‌ها
  const fetchData = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });

      const response = await fetch(`/api/course-grades?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotalPages(result.pagination.totalPages);
        setCurrentPage(page);
      } else {
        setMessage(result.error || "خطا در دریافت اطلاعات");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("خطا در اتصال به سرور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // جستجو
  const handleSearch = () => {
    fetchData(1, searchTerm);
  };

  // تغییر صفحه
  const handlePageChange = (page) => {
    fetchData(page, searchTerm);
  };

  // تغییر فیلدهای فرم
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ریست فرم
  const resetForm = () => {
    setFormData({
      courseCode: "",
      courseName: "",
      gradeCode: "",
      gradeName: "",
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  // ذخیره (اضافه کردن یا ویرایش)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const url = editingItem
        ? `/api/course-grades/${editingItem._id}`
        : "/api/course-grades";

      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(
          `دوره-پایه با موفقیت ${editingItem ? "ویرایش" : "اضافه"} شد`
        );
        resetForm();
        fetchData(currentPage, searchTerm);
      } else {
        setMessage(result.error || "خطا در ثبت اطلاعات");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setMessage("خطا در اتصال به سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ویرایش
  const handleEdit = (item) => {
    setFormData({
      courseCode: item.courseCode,
      courseName: item.courseName,
      gradeCode: item.gradeCode,
      gradeName: item.gradeName,
    });
    setEditingItem(item);
    setShowAddForm(true);
  };

  // حذف
  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این مورد اطمینان دارید؟")) {
      return;
    }

    try {
      const response = await fetch(`/api/course-grades/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setMessage("مورد با موفقیت حذف شد");
        fetchData(currentPage, searchTerm);
      } else {
        setMessage(result.error || "خطا در حذف");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setMessage("خطا در اتصال به سرور");
    }
  };

  return (
    <div className="space-y-6">
      {/* پیام‌ها */}
      {message && (
        <div
          className={`p-4 rounded-md text-right ${
            message.includes("موفقیت") || message.includes("شد")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message}
          <button onClick={() => setMessage("")} className="float-left mt-1">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* دکمه‌های اصلی */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus className="h-4 w-4" />
            افزودن دوره-پایه جدید
          </button>
        </div>

        {/* جستجو */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="جستجو در نام‌ها و کدها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            <FaSearch className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* فرم اضافه کردن/ویرایش */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 text-right">
            {editingItem ? "ویرایش" : "افزودن"} دوره-پایه
          </h3>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                کد دوره *
              </label>
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="مثال: 01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                نام دوره *
              </label>
              <input
                type="text"
                name="courseName"
                value={formData.courseName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="مثال: متوسطه اول"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                کد پایه *
              </label>
              <input
                type="text"
                name="gradeCode"
                value={formData.gradeCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="مثال: 07"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                نام پایه *
              </label>
              <input
                type="text"
                name="gradeName"
                value={formData.gradeName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="مثال: هفتم"
                required
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <FaCheck className="h-4 w-4" />
                    {editingItem ? "ویرایش" : "ثبت"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* جدول داده‌ها */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
            <span className="mr-2">در حال بارگذاری...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام پایه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد پایه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام دوره
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد دوره
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ ایجاد
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="ویرایش"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.gradeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.gradeCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.courseName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.courseCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    داده‌ای یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-md ${
                    page === currentPage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
} 