"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";

export default function ImportExamCentersPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

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

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("لطفا ابتدا یک فایل اکسل انتخاب کنید");
      return;
    }

    setUploading(true);
    setUploadStatus("در حال آپلود و پردازش فایل...");
    setUploadResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/exam-centers/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "خطا در آپلود فایل");
      }

      setUploadResults(data);
      setUploadStatus("آپلود با موفقیت انجام شد");
      toast.success("فایل با موفقیت پردازش شد");
      fileInputRef.current.value = "";
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("خطا در آپلود فایل");
      toast.error(error.message || "خطا در آپلود فایل");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.location.href = "/api/exam-centers/template";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          افزودن گروهی واحدهای سازمانی
        </h1>
        <Link
          href="/dashboard/exam-centers"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          بازگشت به مدیریت واحدهای سازمانی
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            راهنمای افزودن گروهی واحدهای سازمانی
          </h2>
          <p className="text-gray-600">
            برای افزودن گروهی واحدهای سازمانی، لطفا مراحل زیر را دنبال کنید:
          </p>
          <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-600 pr-4">
            <li>فایل نمونه اکسل را دانلود کنید</li>
            <li>
              اطلاعات واحدهای سازمانی را در فایل وارد کنید با استفاده از کدها
              (نه عناوین)
            </li>
            <li>فایل تکمیل شده را آپلود کنید</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 text-sm">
              <strong>توجه مهم:</strong> در هنگام افزودن گروهی، باید کدها وارد
              شوند نه عناوین:
            </p>
            <ul className="text-blue-600 text-sm mt-1 pr-4">
              <li>• کد جنسیت: از جدول جنسیت‌ها (مثل: FEMALE, MALE, MIXED)</li>
              <li>• کد دوره: از جدول دوره-پایه (مثل: PRIMARY, SECONDARY1)</li>
              <li>• کد شاخه: از جدول دوره-شاخه-رشته (مثل: SCIENCE, MATH)</li>
              <li>• تعداد دانش آموز: عدد صحیح</li>
              <li>
                • کد نوع واحد سازمانی: از جدول نوع واحد (مثل: PUBLIC, PRIVATE)
              </li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700 text-sm">
              <strong>ساختار فایل اکسل:</strong> ستون‌ها بترتیب:
            </p>
            <ol className="text-yellow-600 text-sm mt-1 pr-4">
              <li>1. نام واحد سازمانی</li>
              <li>2. کد واحد سازمانی</li>
              <li>3. شناسه منطقه</li>
              <li>4. ظرفیت</li>
              <li>5. آدرس</li>
              <li>6. تلفن</li>
              <li>7. کد جنسیت</li>
              <li>8. کد دوره</li>
              <li>9. کد شاخه</li>
              <li>10. تعداد دانش آموز</li>
              <li>11. کد نوع واحد سازمانی</li>
            </ol>
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
          <form onSubmit={handleUpload} className="space-y-4">
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
                disabled={uploading}
              />
              <p className="mt-1 text-sm text-gray-500">
                فقط فایل‌های با فرمت .xlsx و .xls پذیرفته می‌شوند
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!file || uploading}
              >
                {uploading ? "در حال پردازش..." : "آپلود و پردازش فایل"}
              </button>
            </div>
          </form>
        </div>

        {uploadStatus && (
          <div
            className={`mt-6 p-4 rounded-md ${
              uploadStatus.includes("خطا")
                ? "bg-red-50 border border-red-200 text-red-700"
                : uploadStatus.includes("موفقیت")
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}
          >
            <p className="font-medium">{uploadStatus}</p>
          </div>
        )}

        {uploadResults && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">نتیجه پردازش فایل</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                <p className="text-green-700 font-medium">
                  واحدهای سازمانی ایجاد شده
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {uploadResults.success}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                <p className="text-red-700 font-medium">خطاها</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {uploadResults.failed}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <p className="text-blue-700 font-medium">تعداد کل</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {uploadResults.total}
                </p>
              </div>
            </div>

            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-red-600 mb-2">جزئیات خطاها:</h3>
                <div className="max-h-60 overflow-y-auto bg-white border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ردیف
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نام واحد سازمانی
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          پیام خطا
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadResults.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {error.row || index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {error.name || "-"}
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
