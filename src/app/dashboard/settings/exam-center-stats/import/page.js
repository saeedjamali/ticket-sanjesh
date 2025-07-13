"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { FaArrowRight, FaFileExcel } from "react-icons/fa";

export default function ImportExamCenterStatsPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (
      file &&
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      setSelectedFile(file);
      setResults(null);
      setErrors([]);
      setUploadProgress(0);
    } else {
      alert("لطفاً یک فایل Excel (.xlsx) انتخاب کنید");
      e.target.value = null;
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/exam-center-stats/template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "exam-center-stats-template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("خطا در دانلود قالب");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("خطا در دانلود قالب");
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("لطفاً فایل را انتخاب کنید");
      return;
    }

    setLoading(true);
    setResults(null);
    setErrors([]);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const token = localStorage.getItem("token");

      // شبیه‌سازی پیشرفت بارگذاری
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      const response = await fetch("/api/exam-center-stats/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        // ساختار پاسخ API: data.data شامل processed, errorCount, results, errors
        const importData = data.data;

        setResults({
          totalRows: importData.processed + importData.errorCount,
          successCount: importData.processed,
          errorCount: importData.errorCount,
          results: importData.results || [],
        });

        if (
          importData.errors &&
          Array.isArray(importData.errors) &&
          importData.errors.length > 0
        ) {
          // تبدیل خطاها به فرمت قابل نمایش
          const formattedErrors = importData.errors.map((error, index) => {
            if (typeof error === "string") {
              // اگر خطا string است، سعی کنیم شماره ردیف را استخراج کنیم
              const rowMatch = error.match(/ردیف (\d+):/);
              return {
                row: rowMatch ? rowMatch[1] : index + 1,
                message: error.replace(/ردیف \d+:\s*/, ""),
              };
            } else if (
              typeof error === "object" &&
              error.row &&
              error.message
            ) {
              return error;
            } else {
              return {
                row: index + 1,
                message: error.toString(),
              };
            }
          });
          setErrors(formattedErrors);
        }
      } else {
        // نمایش خطاهای API
        if (data.errors && Array.isArray(data.errors)) {
          const formattedErrors = data.errors.map((error, index) => ({
            row: index + 1,
            message: error,
          }));
          setErrors(formattedErrors);
        } else if (data.message) {
          setErrors([
            {
              row: 1,
              message: data.message,
            },
          ]);
        } else {
          setErrors([
            {
              row: 1,
              message: "خطا در بارگذاری فایل",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error importing stats:", error);
      setErrors([
        {
          row: 1,
          message: "خطا در برقراری ارتباط با سرور",
        },
      ]);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              در حال پردازش فایل...
            </h2>
            <p className="text-gray-600 mb-4">
              لطفاً صبر کنید، فایل Excel شما در حال پردازش است.
            </p>

            {/* Progress Bar */}
            <div className="w-64 mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>پیشرفت</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/settings/exam-center-stats")}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            بارگذاری گروهی آمار واحدهای سازمانی
          </h1>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            راهنمای بارگذاری
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-2">
            <li>ابتدا قالب Excel را دانلود کنید</li>
            <li>قالب را مطابق با راهنمای موجود در فایل تکمیل نمایید</li>
            <li>فایل تکمیل شده را بارگذاری کنید</li>
          </ol>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleDownloadTemplate}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaFileExcel />
            دانلود قالب Excel
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            انتخاب فایل Excel
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={!selectedFile || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
        >
          بارگذاری فایل
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            نتیجه بارگذاری
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">تعداد کل رکوردها</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.totalRows}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">موارد موفق</p>
              <p className="text-2xl font-bold text-green-900">
                {results.successCount}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">موارد ناموفق</p>
              <p className="text-2xl font-bold text-red-900">
                {results.errorCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-red-800 mb-4">
            خطاهای بارگذاری ({errors.length} مورد)
          </h3>
          <div className="bg-red-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-800 text-xs font-medium rounded-full flex-shrink-0">
                    {error.row}
                  </span>
                  <span className="text-red-700 text-sm">{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>راهنما:</strong> لطفاً خطاهای بالا را بررسی کرده و فایل
              Excel را اصلاح نمایید.
            </p>
          </div>
        </div>
      )}

      {/* Success message when no errors */}
      {results && errors.length === 0 && results.errorCount === 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                بارگذاری با موفقیت انجام شد!
              </h3>
              <p className="text-sm text-green-600">
                تمامی {results.successCount} رکورد با موفقیت پردازش شدند.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
