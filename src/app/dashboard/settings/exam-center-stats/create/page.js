"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { FaArrowRight } from "react-icons/fa";

export default function CreateExamCenterStatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [examCenters, setExamCenters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    organizationalUnitCode: "",
    provinceCode: "",
    districtCode: "",
    academicYear: "",
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
    fetchHelperData();
  }, []);

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

  const fetchHelperData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [academicYearsRes, provincesRes] = await Promise.all([
        fetch("/api/helpers?type=academic-years", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/helpers?type=provinces", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (academicYearsRes.ok && provincesRes.ok) {
        const [academicYearsData, provincesData] = await Promise.all([
          academicYearsRes.json(),
          provincesRes.json(),
        ]);

        setAcademicYears(academicYearsData.data);
        setProvinces(provincesData.data);
      }
    } catch (error) {
      console.error("Error fetching helper data:", error);
    }
  };

  const fetchDistricts = async (provinceCode) => {
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

  const fetchExamCenters = async (districtCode) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/helpers?type=organizational-units&district=${districtCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExamCenters(data.data);
      }
    } catch (error) {
      console.error("Error fetching exam centers:", error);
    }
  };

  const fetchBranches = async (courseCode) => {
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
      newErrors.organizationalUnitCode = "انتخاب واحد سازمانی الزامی است";
    }

    if (!formData.academicYear) {
      newErrors.academicYear = "انتخاب سال تحصیلی الزامی است";
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
      newErrors.classifiedStudents = "تعداد کلاس‌بندی شده باید عدد مثبت باشد";
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
        "تعداد کلاس‌بندی شده نمی‌تواند از کل بیشتر باشد";
    }

    if (femaleStudents + maleStudents !== totalStudents) {
      newErrors.genderSum = "مجموع دانش‌آموزان دختر و پسر باید برابر کل باشد";
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
        alert(errorData.message || "خطا در ثبت آمار");
      }
    } catch (error) {
      console.error("Error creating stats:", error);
      alert("خطا در ارتباط با سرور");
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
        organizationalUnitCode: "",
      }));
      setDistricts([]);
      setExamCenters([]);
      if (value) {
        fetchDistricts(value);
      }
    }

    if (name === "districtCode") {
      setFormData((prev) => ({
        ...prev,
        organizationalUnitCode: "",
      }));
      setExamCenters([]);
      if (value) {
        fetchExamCenters(value);
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
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="ml-4 text-gray-600 hover:text-gray-900"
        >
          <FaArrowRight />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">ثبت آمار جدید</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* انتخاب واحد سازمانی */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                استان *
              </label>
              <select
                name="provinceCode"
                value={formData.provinceCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">انتخاب استان</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name} ({province.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                منطقه *
              </label>
              <select
                name="districtCode"
                value={formData.districtCode}
                onChange={handleInputChange}
                disabled={!formData.provinceCode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">انتخاب منطقه</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name} ({district.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                واحد سازمانی *
              </label>
              <select
                name="organizationalUnitCode"
                value={formData.organizationalUnitCode}
                onChange={handleInputChange}
                disabled={!formData.districtCode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">انتخاب واحد سازمانی</option>
                {examCenters.map((center) => (
                  <option key={center.code} value={center.code}>
                    {center.name} ({center.code})
                  </option>
                ))}
              </select>
              {errors.organizationalUnitCode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.organizationalUnitCode}
                </p>
              )}
            </div>
          </div>

          {/* سال تحصیلی و دوره */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سال تحصیلی *
              </label>
              <select
                name="academicYear"
                value={formData.academicYear}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">انتخاب سال تحصیلی</option>
                {academicYears.map((year) => (
                  <option key={year.name} value={year.name}>
                    {year.name} {year.isActive && "(فعال)"}
                  </option>
                ))}
              </select>
              {errors.academicYear && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.academicYear}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                دوره تحصیلی *
              </label>
              <select
                name="courseCode"
                value={formData.courseCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">انتخاب دوره تحصیلی</option>
                {courseOptions.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
              {errors.courseCode && (
                <p className="mt-1 text-sm text-red-600">{errors.courseCode}</p>
              )}
            </div>
          </div>

          {/* شاخه */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شاخه *
            </label>
            <select
              name="branchCode"
              value={formData.branchCode}
              onChange={handleInputChange}
              disabled={!formData.courseCode}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">انتخاب شاخه</option>
              {branches.map((branch) => (
                <option key={branch.code} value={branch.code}>
                  {branch.title} ({branch.code})
                </option>
              ))}
            </select>
            {errors.branchCode && (
              <p className="mt-1 text-sm text-red-600">{errors.branchCode}</p>
            )}
          </div>

          {/* آمار دانش‌آموزان */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد کل دانش‌آموزان *
              </label>
              <input
                type="number"
                name="totalStudents"
                value={formData.totalStudents}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.totalStudents && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.totalStudents}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد کلاس‌بندی شده *
              </label>
              <input
                type="number"
                name="classifiedStudents"
                value={formData.classifiedStudents}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.classifiedStudents && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.classifiedStudents}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد کلاس‌ها *
              </label>
              <input
                type="number"
                name="totalClasses"
                value={formData.totalClasses}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.totalClasses && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.totalClasses}
                </p>
              )}
            </div>
          </div>

          {/* تفکیک جنسیت */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد دانش‌آموزان دختر *
              </label>
              <input
                type="number"
                name="femaleStudents"
                value={formData.femaleStudents}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.femaleStudents && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.femaleStudents}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعداد دانش‌آموزان پسر *
              </label>
              <input
                type="number"
                name="maleStudents"
                value={formData.maleStudents}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.maleStudents && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.maleStudents}
                </p>
              )}
            </div>
          </div>

          {/* پیام خطای کلی */}
          {errors.genderSum && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{errors.genderSum}</p>
            </div>
          )}

          {/* دکمه‌های عمل */}
          <div className="flex justify-end space-x-4 space-x-reverse">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "در حال ثبت..." : "ثبت آمار"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
