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

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/exam-center-stats/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.data);
        if (data.data.errors && data.data.errors.length > 0) {
          setErrors(data.data.errors);
        }
      } else {
        alert(data.message || "خطا در بارگذاری فایل");
      }
    } catch (error) {
      console.error("Error importing stats:", error);
      alert("خطا در بارگذاری فایل");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
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
        <div className="bg-white p-6 rounded-lg shadow">
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

          {errors.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">
                خطاها
              </h3>
              <div className="bg-red-50 p-4 rounded-lg">
                <ul className="list-disc list-inside text-red-600 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>
                      سطر {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
