"use client";

import { useState, useRef } from "react";
import { toast } from "react-toastify";
import Link from "next/link";

export default function UpdateLocationsPage() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // بررسی پسوند فایل
      const fileExt = selectedFile.name.split(".").pop().toLowerCase();
      if (fileExt !== "xlsx" && fileExt !== "xls") {
        toast.error("لطفا فقط فایل اکسل (.xlsx یا .xls) انتخاب کنید");
        fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("لطفاً ابتدا یک فایل انتخاب کنید");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/exam-centers/update-locations", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطا در بروزرسانی اطلاعات");
      }

      setResults(result.data);
      toast.success("عملیات بروزرسانی با موفقیت انجام شد");
      fileInputRef.current.value = "";
      setFile(null);
    } catch (error) {
      console.error("Error updating locations:", error);
      toast.error(error.message || "خطا در بروزرسانی اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.location.href = "/api/exam-centers/template";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          بروزرسانی موقعیت جغرافیایی مراکز
        </h1>
        <Link
          href="/dashboard/exam-centers"
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          بازگشت به لیست مراکز
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">راهنمای بروزرسانی</h2>
          <p className="text-gray-600 mb-4">
            برای بروزرسانی موقعیت جغرافیایی مراکز، یک فایل اکسل با ساختار زیر
            آماده کنید:
          </p>
          <div className="bg-gray-50 p-4 rounded-md">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-right px-4 py-2 border">ستون</th>
                  <th className="text-right px-4 py-2 border">توضیحات</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-2">کد مرکز</td>
                  <td className="border px-4 py-2">
                    کد منحصر به فرد مرکز (مثال: 11111)
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">موقعیت جغرافیایی</td>
                  <td className="border px-4 py-2">
                    یکی از مقادیر: شهری، روستایی، خارج کشور
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700 text-sm">
              <strong>نکات مهم:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-yellow-600 text-sm">
              <li>
                فایل اکسل باید شامل دو ستون "کد مرکز" و "موقعیت جغرافیایی" باشد
              </li>
              <li>
                موقعیت جغرافیایی فقط می‌تواند یکی از سه مقدار شهری، روستایی یا
                خارج کشور باشد
              </li>
              <li>کد مرکز باید دقیقاً مطابق با کد موجود در سیستم باشد</li>
            </ul>
          </div>
          <div className="mt-4">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              دانلود فایل نمونه
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">آپلود فایل اکسل</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                انتخاب فایل اکسل
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-gray-700 bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="mt-1 text-sm text-gray-500">
                فقط فایل‌های با فرمت .xlsx و .xls پذیرفته می‌شوند
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={!file || isLoading}
              >
                {isLoading ? "در حال بروزرسانی..." : "شروع بروزرسانی"}
              </button>
            </div>
          </form>
        </div>

        {results && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">نتایج بروزرسانی</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800 font-medium">تعداد موفق</p>
                <p className="text-2xl font-bold text-green-600">
                  {results.successCount}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-medium">تعداد خطا</p>
                <p className="text-2xl font-bold text-red-600">
                  {results.errorCount}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 font-medium">کل پردازش شده</p>
                <p className="text-2xl font-bold text-blue-600">
                  {results.totalProcessed}
                </p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  جزئیات خطاها:
                </h4>
                <div className="bg-white border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          ردیف
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          کد مرکز
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          پیام خطا
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {error.row || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {error.code || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                            {error.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
