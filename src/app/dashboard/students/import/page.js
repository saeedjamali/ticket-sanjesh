"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaUpload,
  FaDownload,
  FaInfoCircle,
} from "react-icons/fa";

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // بررسی نوع فایل
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      const fileExt = file.name.split(".").pop().toLowerCase();
      if (
        !allowedTypes.includes(file.type) &&
        !["xlsx", "xls", "csv"].includes(fileExt)
      ) {
        toast.error("لطفاً فایل Excel یا CSV انتخاب کنید");
        event.target.value = null;
        return;
      }

      setSelectedFile(file);
      setResults(null);
      setErrors([]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("لطفاً فایل را انتخاب کنید");
      return;
    }

    setLoading(true);
    setResults(null);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Get year filter from URL if exists
      const urlParams = new URLSearchParams(window.location.search);
      const yearFilter = urlParams.get("yearFilter");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/students/import${yearFilter ? `?yearFilter=${yearFilter}` : ""}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "خطا در بارگذاری فایل");
      }

      setResults(data);
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
        toast.warning(`${data.errors.length} خطا در پردازش فایل رخ داد`);
      } else {
        toast.success("فایل با موفقیت پردازش شد");
      }
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error(error.message || "خطا در بارگذاری فایل");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || error.error || "خطا در دانلود فایل نمونه"
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "students-template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error(error.message || "خطا در دانلود فایل نمونه");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/students")}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              بارگذاری گروهی دانش‌آموزان
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              امکان ثبت دسته‌جمعی اطلاعات دانش‌آموزان از طریق فایل Excel
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* راهنمای استفاده */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaInfoCircle className="text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">
                راهنمای استفاده
              </h3>
            </div>

            <div className="space-y-4 text-sm text-blue-700">
              <div>
                <h4 className="font-medium mb-2">مراحل بارگذاری:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>فایل نمونه را دانلود کنید</li>
                  <li>اطلاعات دانش‌آموزان را در فایل وارد کنید</li>
                  <li>فایل تکمیل شده را بارگذاری کنید</li>
                </ol>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded p-3">
                <h4 className="font-bold mb-2 text-blue-900">
                  🔍 منبع اطلاعات:
                </h4>
                <p className="font-bold text-blue-900 text-xs">
                  کلیه اطلاعات مورد نیاز در فایل اکسل در سامانه سیدا،از قسمت
                  اطلاعات دانش‌آموزان ثبت نام شده، قابل احصا می‌باشد.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">فیلدهای ضروری:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>کد ملی (10 رقم)</li>
                  <li>نام</li>
                  <li>نام خانوادگی</li>
                  <li>نام پدر</li>
                  <li>تاریخ تولد (فارسی)</li>
                  <li>پایه (عنوان)</li>
                  <li>کد رشته</li>
                  <li>رشته (عنوان)</li>
                  <li>جنسیت</li>
                  <li>نوع دانش‌آموز</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">نکات مهم:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>فرمت‌های پشتیبانی شده: Excel (.xlsx, .xls), CSV</li>
                  <li>حداکثر ۵۰۰ رکورد در هر بار</li>
                  <li>کد ملی نباید تکراری باشد</li>
                  <li>تاریخ باید به صورت فارسی باشد</li>
                  <li>عنوان پایه باید دقیقاً مطابق سیستم باشد</li>
                  <li>کد رشته باید دقیقاً صحیح باشد</li>
                </ul>
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
            >
              <FaDownload />
              دانلود فایل نمونه
            </button>
          </div>
        </div>

        {/* بخش بارگذاری */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              بارگذاری فایل
            </h3>

            {/* انتخاب فایل */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <div className="text-green-600">
                    <FaUpload className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">فایل انتخاب شده:</p>
                    <p className="text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      حجم: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      انتخاب فایل دیگر
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner />
                          در حال پردازش...
                        </>
                      ) : (
                        <>
                          <FaUpload />
                          شروع بارگذاری
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <FaUpload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    فایل خود را اینجا بکشید یا کلیک کنید
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    فرمت‌های پشتیبانی شده: Excel (.xlsx, .xls), CSV
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    انتخاب فایل
                  </button>
                </div>
              )}
            </div>

            {/* نتایج */}
            {results && (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">
                    نتیجه بارگذاری
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>تعداد کل رکوردها: {results.totalRecords}</p>
                    <p>موفق: {results.successCount}</p>
                    <p>ناموفق: {results.errorCount}</p>
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">خطاها</h4>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-red-200">
                            <th className="text-right py-2">ردیف</th>
                            <th className="text-right py-2">کد ملی</th>
                            <th className="text-right py-2">خطا</th>
                          </tr>
                        </thead>
                        <tbody>
                          {errors.map((error, index) => (
                            <tr key={index} className="border-b border-red-100">
                              <td className="py-2">{error.row}</td>
                              <td className="py-2">
                                {error.nationalId || "-"}
                              </td>
                              <td className="py-2 text-red-600">
                                {error.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => router.push("/dashboard/students")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    بازگشت به فهرست دانش‌آموزان
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
