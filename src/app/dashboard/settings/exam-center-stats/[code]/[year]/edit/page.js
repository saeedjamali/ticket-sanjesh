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
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    organizationalUnitCode: code,
    provinceCode: "",
    districtCode: "",
    academicYear: year,
    courseCode: "",
    courseName: "",
    branchCode: "",
    branchTitle: "",
    totalStudents: "",
    classifiedStudents: "",
    totalClasses: "",
    femaleStudents: "",
    maleStudents: "",
  });
  const [errors, setErrors] = useState({});

  // لیست دوره‌های تحصیلی
  const courseOptions = [
    { code: "100", name: "پیش دبستانی" },
    { code: "200", name: "ابتدایی" },
    { code: "300", name: "متوسطه اول" },
    { code: "400", name: "متوسطه دوم" },
    { code: "500", name: "سایر" },
  ];

  useEffect(() => {
    fetchData();
  }, [code, year]);

  // وقتی کد دوره تغییر می‌کند، نام دوره را بروزرسانی کن
  useEffect(() => {
    if (formData.courseCode) {
      const selectedCourse = courseOptions.find(
        (course) => course.code === formData.courseCode
      );
      if (selectedCourse) {
        setFormData((prev) => ({
          ...prev,
          courseName: selectedCourse.name,
        }));
      }
    }
  }, [formData.courseCode]);

  // وقتی کد شاخه تغییر می‌کند، نام شاخه را بروزرسانی کن
  useEffect(() => {
    if (formData.branchCode) {
      const selectedBranch = branches.find(
        (branch) => branch.code === formData.branchCode
      );
      if (selectedBranch) {
        setFormData((prev) => ({
          ...prev,
          branchTitle: selectedBranch.title,
        }));
      }
    }
  }, [formData.branchCode, branches]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [statsRes, provincesRes] = await Promise.all([
        fetch(`/api/exam-center-stats/${code}/${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/helpers?type=provinces", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok && provincesRes.ok) {
        const [statsData, provincesData] = await Promise.all([
          statsRes.json(),
          provincesRes.json(),
        ]);

        setProvinces(provincesData.data);

        const stats = statsData.stats;
        const formDataToSet = {
          organizationalUnitCode: code,
          provinceCode: stats.provinceCode || "",
          districtCode: stats.districtCode || "",
          academicYear: year,
          courseCode: stats.courseCode || "",
          courseName: stats.courseName || "",
          branchCode: stats.branchCode || "",
          branchTitle: stats.branchTitle || "",
          totalStudents: stats.totalStudents.toString(),
          classifiedStudents: stats.classifiedStudents.toString(),
          totalClasses: stats.totalClasses.toString(),
          femaleStudents: stats.femaleStudents.toString(),
          maleStudents: stats.maleStudents.toString(),
        };

        setFormData(formDataToSet);

        // If we have province code, fetch districts
        if (stats.provinceCode) {
          fetchDistricts(stats.provinceCode);
        }

        // If we have course code, fetch branches
        if (stats.courseCode) {
          fetchBranches(stats.courseCode);
        }
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

  // Fetch districts when province is selected
  const fetchDistricts = async (provinceCode) => {
    if (!provinceCode) {
      setDistricts([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/helpers?type=districts&province=${provinceCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDistricts(data.data);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  // Fetch branches when course is selected
  const fetchBranches = async (courseCode) => {
    if (!courseCode) {
      setBranches([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/helpers?type=branches&course=${courseCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBranches(data.data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.organizationalUnitCode) {
      newErrors.organizationalUnitCode = "کد واحد سازمانی الزامی است";
    }

    if (!formData.provinceCode) {
      newErrors.provinceCode = "انتخاب استان الزامی است";
    }

    if (!formData.districtCode) {
      newErrors.districtCode = "انتخاب منطقه الزامی است";
    }

    if (!formData.academicYear) {
      newErrors.academicYear = "سال تحصیلی الزامی است";
    }

    if (!formData.courseCode) {
      newErrors.courseCode = "انتخاب دوره تحصیلی الزامی است";
    }

    if (!formData.branchCode) {
      newErrors.branchCode = "انتخاب شاخه الزامی است";
    }

    if (!formData.totalStudents || formData.totalStudents < 0) {
      newErrors.totalStudents = "تعداد کل دانش‌آموزان باید عدد مثبت باشد";
    }

    if (!formData.classifiedStudents || formData.classifiedStudents < 0) {
      newErrors.classifiedStudents =
        "تعداد دانش‌آموزان کلاس‌بندی شده باید عدد مثبت باشد";
    }

    if (!formData.totalClasses || formData.totalClasses < 0) {
      newErrors.totalClasses = "تعداد کلاس‌ها باید عدد مثبت باشد";
    }

    if (!formData.femaleStudents || formData.femaleStudents < 0) {
      newErrors.femaleStudents = "تعداد دانش‌آموزان دختر باید عدد مثبت باشد";
    }

    if (!formData.maleStudents || formData.maleStudents < 0) {
      newErrors.maleStudents = "تعداد دانش‌آموزان پسر باید عدد مثبت باشد";
    }

    // اعتبارسنجی منطقی
    const totalStudents = parseInt(formData.totalStudents) || 0;
    const classifiedStudents = parseInt(formData.classifiedStudents) || 0;
    const femaleStudents = parseInt(formData.femaleStudents) || 0;
    const maleStudents = parseInt(formData.maleStudents) || 0;

    if (classifiedStudents > totalStudents) {
      newErrors.classifiedStudents =
        "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند بیشتر از کل دانش‌آموزان باشد";
    }

    if (femaleStudents + maleStudents > totalStudents) {
      newErrors.submit =
        "مجموع دانش‌آموزان دختر و پسر نمی‌تواند بیشتر از کل دانش‌آموزان باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/exam-center-stats/${code}/${year}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          totalStudents: parseInt(formData.totalStudents),
          classifiedStudents: parseInt(formData.classifiedStudents),
          totalClasses: parseInt(formData.totalClasses),
          femaleStudents: parseInt(formData.femaleStudents),
          maleStudents: parseInt(formData.maleStudents),
        }),
      });

      if (response.ok) {
        router.push("/dashboard/settings/exam-center-stats");
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.message });
      }
    } catch (error) {
      console.error("Error updating stats:", error);
      setErrors({ submit: "خطا در بروزرسانی آمار" });
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

    // پاک کردن خطا برای فیلد فعلی
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // بروزرسانی cascading dropdowns
    if (name === "provinceCode") {
      setFormData((prev) => ({
        ...prev,
        districtCode: "",
      }));
      setDistricts([]);
      if (value) {
        fetchDistricts(value);
      }
    }

    if (name === "courseCode") {
      setFormData((prev) => ({
        ...prev,
        branchCode: "",
        branchTitle: "",
      }));
      setBranches([]);
      if (value) {
        fetchBranches(value);
      }
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
            <div className="text-sm text-gray-600 mt-1">
              <p>کد واحد سازمانی: {code}</p>
              <p>سال تحصیلی: {year}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        {/* استان، منطقه و دوره تحصیلی */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* استان */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              استان <span className="text-red-500">*</span>
            </label>
            <select
              name="provinceCode"
              value={formData.provinceCode}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.provinceCode ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">انتخاب کنید</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            {errors.provinceCode && (
              <p className="mt-1 text-sm text-red-500">{errors.provinceCode}</p>
            )}
          </div>

          {/* منطقه */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              منطقه <span className="text-red-500">*</span>
            </label>
            <select
              name="districtCode"
              value={formData.districtCode}
              onChange={handleInputChange}
              disabled={!formData.provinceCode}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.districtCode ? "border-red-500" : "border-gray-300"
              } ${!formData.provinceCode ? "bg-gray-100" : ""}`}
            >
              <option value="">
                {formData.provinceCode
                  ? "انتخاب کنید"
                  : "ابتدا استان را انتخاب کنید"}
              </option>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
            {errors.districtCode && (
              <p className="mt-1 text-sm text-red-500">{errors.districtCode}</p>
            )}
          </div>

          {/* دوره تحصیلی */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              دوره تحصیلی <span className="text-red-500">*</span>
            </label>
            <select
              name="courseCode"
              value={formData.courseCode}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.courseCode ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">انتخاب کنید</option>
              {courseOptions.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.name}
                </option>
              ))}
            </select>
            {errors.courseCode && (
              <p className="mt-1 text-sm text-red-500">{errors.courseCode}</p>
            )}
          </div>

          {/* شاخه */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شاخه <span className="text-red-500">*</span>
            </label>
            <select
              name="branchCode"
              value={formData.branchCode}
              onChange={handleInputChange}
              disabled={!formData.courseCode}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.branchCode ? "border-red-500" : "border-gray-300"
              } ${!formData.courseCode ? "bg-gray-100" : ""}`}
            >
              <option value="">
                {formData.courseCode
                  ? "انتخاب کنید"
                  : "ابتدا دوره تحصیلی را انتخاب کنید"}
              </option>
              {branches.map((branch) => (
                <option key={branch.code} value={branch.code}>
                  {branch.title} ({branch.code})
                </option>
              ))}
            </select>
            {errors.branchCode && (
              <p className="mt-1 text-sm text-red-500">{errors.branchCode}</p>
            )}
          </div>
        </div>

        {/* آمار دانش‌آموزان */}
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
