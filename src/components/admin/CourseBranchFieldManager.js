"use client";

import { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFileImport,
  FaDownload,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function CourseBranchFieldManager() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    courseCode: "",
    courseTitle: "",
    branchCode: "",
    branchTitle: "",
    fieldCode: "",
    fieldTitle: "",
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

      const response = await fetch(`/api/course-branch-fields?${params}`);
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
      courseTitle: "",
      branchCode: "",
      branchTitle: "",
      fieldCode: "",
      fieldTitle: "",
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
        ? `/api/course-branch-fields/${editingItem._id}`
        : "/api/course-branch-fields";

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
          `دوره-شاخه-رشته با موفقیت ${editingItem ? "ویرایش" : "اضافه"} شد`
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
      courseTitle: item.courseTitle,
      branchCode: item.branchCode,
      branchTitle: item.branchTitle,
      fieldCode: item.fieldCode,
      fieldTitle: item.fieldTitle,
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
      const response = await fetch(`/api/course-branch-fields/${id}`, {
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

  // دانلود فایل نمونه
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/course-branch-fields/template");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "course-branch-field-template.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage("خطا در دانلود فایل نمونه");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      setMessage("خطا در دانلود فایل نمونه");
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
            افزودن مورد جدید
          </button>

          <button
            onClick={() => setShowBulkImport(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <FaFileImport className="h-4 w-4" />
            آپلود گروهی
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
          >
            <FaDownload className="h-4 w-4" />
            دانلود فایل نمونه
          </button>
        </div>

        {/* جستجو */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="جستجو در عنوان‌ها و کدها..."
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
            {editingItem ? "ویرایش" : "افزودن"} دوره-شاخه-رشته
          </h3>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                کد دوره
              </label>
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                عنوان دوره
              </label>
              <input
                type="text"
                name="courseTitle"
                value={formData.courseTitle}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                کد شاخه
              </label>
              <input
                type="text"
                name="branchCode"
                value={formData.branchCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                عنوان شاخه
              </label>
              <input
                type="text"
                name="branchTitle"
                value={formData.branchTitle}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                کد رشته
              </label>
              <input
                type="text"
                name="fieldCode"
                value={formData.fieldCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                عنوان رشته
              </label>
              <input
                type="text"
                name="fieldTitle"
                value={formData.fieldTitle}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
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
                  عنوان رشته
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد رشته
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عنوان شاخه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد شاخه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عنوان دوره
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد دوره
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
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.fieldTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.fieldCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.branchTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.branchCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.courseTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.courseCode}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-4 text-center text-gray-500"
                  >
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
            ))}
          </div>
        </div>
      )}

      {/* کامپوننت آپلود گروهی */}
      {showBulkImport && (
        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            fetchData(currentPage, searchTerm);
          }}
        />
      )}
    </div>
  );
}

// کامپوننت آپلود گروهی
function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) {
      alert("لطفا فایل را انتخاب کنید");
      return;
    }

    setImporting(true);

    try {
      // خواندن فایل CSV
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",");

      const data = lines.slice(1).map((line) => {
        const values = line.split(",");
        return {
          courseCode: values[0]?.trim(),
          courseTitle: values[1]?.trim(),
          branchCode: values[2]?.trim(),
          branchTitle: values[3]?.trim(),
          fieldCode: values[4]?.trim(),
          fieldTitle: values[5]?.trim(),
        };
      });

      const response = await fetch("/api/course-branch-fields/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();
      setResults(result.results);

      if (result.success) {
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (error) {
      console.error("Error importing file:", error);
      alert("خطا در پردازش فایل");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-right">آپلود گروهی</h3>

        {!results ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                انتخاب فایل CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-sm text-gray-600 text-right">
              <p>فرمت فایل باید CSV باشد و شامل ستون‌های زیر:</p>
              <ul className="list-disc list-inside mt-2">
                <li>courseCode (کد دوره)</li>
                <li>courseTitle (عنوان دوره)</li>
                <li>branchCode (کد شاخه)</li>
                <li>branchTitle (عنوان شاخه)</li>
                <li>fieldCode (کد رشته)</li>
                <li>fieldTitle (عنوان رشته)</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                انصراف
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    در حال پردازش...
                  </>
                ) : (
                  "شروع آپلود"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              <h4 className="font-semibold mb-2">نتایج آپلود:</h4>
              <p>تعداد کل: {results.total}</p>
              <p className="text-green-600">موفق: {results.success}</p>
              <p className="text-red-600">ناموفق: {results.failed}</p>
              <p className="text-yellow-600">تکراری: {results.duplicates}</p>
            </div>

            {results.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <h5 className="font-medium mb-2 text-right">خطاها:</h5>
                {results.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 text-right">
                    ردیف {error.row}: {error.error}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
