"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

export default function CorrectionRequestModal({
  isOpen,
  onClose,
  currentCount,
  academicYear,
  examCenterInfo,
}) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [correctedCount, setCorrectedCount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("توضیحات درخواست اصلاح الزامی است");
      return;
    }

    if (!correctedCount || correctedCount < 0) {
      toast.error("تعداد صحیح دانش‌آموزان الزامی است");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("/api/correction-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentStudentCount: currentCount,
          correctedStudentCount: parseInt(correctedCount),
          reason: description.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("درخواست اصلاح با موفقیت ارسال شد");
        setDescription("");
        setCorrectedCount("");
        onClose();
      } else {
        toast.error(data.message || "خطا در ارسال درخواست اصلاح");
      }
    } catch (error) {
      console.error("Error submitting correction request:", error);
      toast.error("خطا در ارسال درخواست اصلاح");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDescription("");
    setCorrectedCount("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            درخواست اصلاح آمار دانش‌آموزان سال گذشته
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Information Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-500 mt-0.5 ml-2 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">درخواست اصلاح آمار سال گذشته</p>
                <p>
                  این فرم برای ارسال درخواست اصلاح آمار دانش‌آموزان سال تحصیلی
                  گذشته (<strong>{academicYear}</strong>) طراحی شده است. لطفاً
                  تعداد صحیح دانش‌آموزان و دلیل درخواست اصلاح را وارد کنید.
                </p>
              </div>
            </div>
          </div>

          {/* Current Statistics Display */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-yellow-800 mb-3 flex items-center">
              <svg
                className="h-5 w-5 text-yellow-600 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 00-2-2m-4 0h.01M21 16h.01"
                />
              </svg>
              آمار ثبت شده برای سال گذشته ({academicYear})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-md p-3 border border-yellow-300">
                <span className="font-medium text-gray-700 block mb-1">
                  📊 تعداد دانش‌آموزان ثبت شده در سال گذشته:
                </span>
                <span className="text-2xl text-yellow-700 font-bold">
                  {currentCount?.toLocaleString("fa-IR") || "0"} نفر
                </span>
              </div>
              <div className="bg-white rounded-md p-3 border border-yellow-300">
                <span className="font-medium text-gray-700 block mb-1">
                  📅 سال تحصیلی مورد اصلاح:
                </span>
                <span className="text-2xl text-yellow-700 font-bold">
                  {academicYear || "نامشخص"}
                </span>
              </div>
              {examCenterInfo && (
                <>
                  <div className="bg-white rounded-md p-3 border border-yellow-300">
                    <span className="font-medium text-gray-700 block mb-1">
                      🏫 نام مدرسه:
                    </span>
                    <span className="text-lg text-yellow-700 font-semibold">
                      {examCenterInfo.name || "نامشخص"}
                    </span>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-yellow-300">
                    <span className="font-medium text-gray-700 block mb-1">
                      🔢 کد مدرسه:
                    </span>
                    <span className="text-lg text-yellow-700 font-semibold">
                      {examCenterInfo.code || "نامشخص"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Corrected Count Field */}
          <div className="mb-6">
            <label
              htmlFor="correctedCount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              تعداد صحیح دانش‌آموزان سال گذشته{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="correctedCount"
              value={correctedCount}
              onChange={(e) => setCorrectedCount(e.target.value)}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="تعداد صحیح دانش‌آموزان سال گذشته را وارد کنید"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              تعداد صحیح دانش‌آموزان سال گذشته که باید در آمار ثبت شود
            </p>
          </div>

          {/* Description Field */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              توضیحات درخواست اصلاح آمار سال گذشته{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="لطفاً دلیل درخواست اصلاح آمار سال گذشته را به تفصیل بیان کنید..."
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              حداقل 20 کاراکتر وارد کنید
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
              disabled={loading}
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                description.trim().length < 20 ||
                !correctedCount ||
                correctedCount < 0
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  در حال ارسال...
                </>
              ) : (
                "ارسال درخواست"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
