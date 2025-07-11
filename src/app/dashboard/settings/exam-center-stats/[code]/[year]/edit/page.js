"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { FaArrowRight } from "react-icons/fa";

export default function EditExamCenterStatsPage() {
  const router = useRouter();
  const params = useParams();
  const { code, year } = params;

  const [loading, setLoading] = useState(true);
  const [examCenter, setExamCenter] = useState(null);
  const [formData, setFormData] = useState({
    organizationalUnitCode: code,
    academicYear: year,
    totalStudents: "",
    classifiedStudents: "",
    totalClasses: "",
    femaleStudents: "",
    maleStudents: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [code, year]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [statsRes, examCenterRes] = await Promise.all([
        fetch(`/api/exam-center-stats/${code}/${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/exam-centers/${code}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok && examCenterRes.ok) {
        const [statsData, examCenterData] = await Promise.all([
          statsRes.json(),
          examCenterRes.json(),
        ]);

        setExamCenter(examCenterData.examCenter);
        setFormData({
          organizationalUnitCode: code,
          academicYear: year,
          totalStudents: statsData.stats.totalStudents.toString(),
          classifiedStudents: statsData.stats.classifiedStudents.toString(),
          totalClasses: statsData.stats.totalClasses.toString(),
          femaleStudents: statsData.stats.femaleStudents.toString(),
          maleStudents: statsData.stats.maleStudents.toString(),
        });
      } else {
        router.push("/dashboard/settings/exam-center-stats");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      router.push("/dashboard/settings/exam-center-stats");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const totalStudents = parseInt(formData.totalStudents);
    const classifiedStudents = parseInt(formData.classifiedStudents);
    const totalClasses = parseInt(formData.totalClasses);
    const femaleStudents = parseInt(formData.femaleStudents);
    const maleStudents = parseInt(formData.maleStudents);

    if (isNaN(totalStudents) || totalStudents < 0) {
      newErrors.totalStudents = "تعداد کل دانش‌آموزان باید عدد مثبت باشد";
    }

    if (isNaN(classifiedStudents) || classifiedStudents < 0) {
      newErrors.classifiedStudents =
        "تعداد دانش‌آموزان کلاس‌بندی شده باید عدد مثبت باشد";
    } else if (classifiedStudents > totalStudents) {
      newErrors.classifiedStudents =
        "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد";
    }

    if (isNaN(totalClasses) || totalClasses < 0) {
      newErrors.totalClasses = "تعداد کلاس‌ها باید عدد مثبت باشد";
    }

    if (isNaN(femaleStudents) || femaleStudents < 0) {
      newErrors.femaleStudents = "تعداد دانش‌آموزان دختر باید عدد مثبت باشد";
    }

    if (isNaN(maleStudents) || maleStudents < 0) {
      newErrors.maleStudents = "تعداد دانش‌آموزان پسر باید عدد مثبت باشد";
    }

    if (femaleStudents + maleStudents !== totalStudents) {
      newErrors.totalStudents =
        "مجموع دانش‌آموزان دختر و پسر باید برابر با کل دانش‌آموزان باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/exam-center-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard/settings/exam-center-stats");
      } else {
        setErrors({ submit: data.message || "خطا در به‌روزرسانی آمار" });
      }
    } catch (error) {
      console.error("Error updating stats:", error);
      setErrors({ submit: "خطا در برقراری ارتباط با سرور" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // پاک کردن خطای مربوط به این فیلد
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ویرایش آمار واحد سازمانی
            </h1>
            {examCenter && (
              <div className="text-sm text-gray-600 mt-1">
                <p>نام واحد سازمانی: {examCenter.name}</p>
                <p>کد: {examCenter.code}</p>
                <p>سال تحصیلی: {year}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* تعداد کل دانش‌آموزان */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعداد کل دانش‌آموزان <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="totalStudents"
              value={formData.totalStudents}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.totalStudents ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.totalStudents && (
              <p className="mt-1 text-sm text-red-500">
                {errors.totalStudents}
              </p>
            )}
          </div>

          {/* تعداد دانش‌آموزان کلاس‌بندی شده */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعداد دانش‌آموزان کلاس‌بندی شده{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="classifiedStudents"
              value={formData.classifiedStudents}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.classifiedStudents ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.classifiedStudents && (
              <p className="mt-1 text-sm text-red-500">
                {errors.classifiedStudents}
              </p>
            )}
          </div>

          {/* تعداد کلاس‌ها */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعداد کلاس‌ها <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="totalClasses"
              value={formData.totalClasses}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.totalClasses ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.totalClasses && (
              <p className="mt-1 text-sm text-red-500">{errors.totalClasses}</p>
            )}
          </div>

          {/* تعداد دانش‌آموزان دختر */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعداد دانش‌آموزان دختر <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="femaleStudents"
              value={formData.femaleStudents}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.femaleStudents ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.femaleStudents && (
              <p className="mt-1 text-sm text-red-500">
                {errors.femaleStudents}
              </p>
            )}
          </div>

          {/* تعداد دانش‌آموزان پسر */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعداد دانش‌آموزان پسر <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="maleStudents"
              value={formData.maleStudents}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.maleStudents ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.maleStudents && (
              <p className="mt-1 text-sm text-red-500">{errors.maleStudents}</p>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-md">
            {errors.submit}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            به‌روزرسانی آمار
          </button>
        </div>
      </form>
    </div>
  );
}
