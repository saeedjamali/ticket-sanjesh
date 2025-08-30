"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

export default function DistrictDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { districtId } = params;

  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState(null);
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    course: searchParams.get("course") || "",
    branch: searchParams.get("branch") || "",
    search: "",
    sortBy: "registrationPercentage",
    sortOrder: "desc",
  });
  const [currentYear, setCurrentYear] = useState("");
  const [previousYear, setPreviousYear] = useState("");
  const [courseOptions, setCourseOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters.course, filters.branch, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    // فیلتر بر اساس جستجو
    if (filters.search) {
      const filtered = schools.filter(
        (school) =>
          school.examCenter.name.includes(filters.search) ||
          school.examCenter.code.includes(filters.search)
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [schools, filters.search]);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/student-status-reports/filters", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCourseOptions(data.data.courses || []);
        setBranchOptions(data.data.branches || []);
      } else {
        console.error("خطا در دریافت فیلترها");
      }
    } catch (error) {
      console.error("خطا در ارتباط با سرور برای فیلترها:", error);
    }
  };

  const fetchBranches = async (courseCode = "") => {
    try {
      const token = localStorage.getItem("token");
      let url = "/api/student-status-reports/filters";
      if (courseCode) {
        url += `?course=${courseCode}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBranchOptions(data.data.branches || []);
      } else {
        console.error("خطا در دریافت شاخه‌ها");
      }
    } catch (error) {
      console.error("خطا در ارتباط با سرور برای شاخه‌ها:", error);
    }
  };

  const handleCourseChange = (courseCode) => {
    setFilters((prev) => ({
      ...prev,
      course: courseCode,
      branch: "", // ریست کردن شاخه هنگام تغییر دوره
    }));

    // بارگیری شاخه‌های مربوط به دوره جدید
    fetchBranches(courseCode);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      let url = `/api/student-status-reports/districts/${districtId}`;
      const params = new URLSearchParams();

      if (filters.course) params.append("course", filters.course);
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

     
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();

        setDistrict(result.data.district);
        setSchools(result.data.schools);
        setSummary(result.data.summary);
        setCurrentYear(result.data.currentYear);
        setPreviousYear(result.data.previousYear);

        console.log("🔍 Schools:----->", result.data);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "خطا در دریافت داده‌ها");
      }
    } catch (error) {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage) => {
    if (percentage < 25) return "text-red-600";
    if (percentage < 75) return "text-orange-600";
    if (percentage < 90) return "text-green-600";
    return "text-green-700";
  };

  const getRowColor = (percentage) => {
    if (percentage < 25) return "bg-red-50";
    if (percentage < 75) return "bg-orange-50";
    if (percentage < 90) return "bg-green-50";
    return "bg-green-100";
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem("token");

      let url = `/api/student-status-reports/districts/${districtId}/export`;
      const params = new URLSearchParams();

      if (filters.course) params.append("course", filters.course);
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `گزارش-مدارس-${
          district?.name
        }-${new Date().toLocaleDateString("fa-IR")}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("فایل اکسل با موفقیت دانلود شد");
      } else {
        toast.error("خطا در تولید فایل اکسل");
      }
    } catch (error) {
      toast.error("خطا در دانلود فایل");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              گزارش مدارس منطقه {district?.name}
            </h1>
            <div className="text-sm text-gray-600 mt-1">
              کد منطقه: {district?.code} | استان: {district?.province.name}
            </div>
            <div className="text-sm text-gray-600">
              مقایسه آمار سال جاری ({currentYear}) با سال قبل ({previousYear})
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            بازگشت
          </button>
        </div>

        {/* فیلترها */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                دوره تحصیلی
              </label>
              <select
                value={filters.course}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {courseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شاخه
              </label>
              <select
                value={filters.branch}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, branch: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {branchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                جستجوی مدرسه
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="نام یا کد مدرسه"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مرتب‌سازی بر اساس
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="registrationPercentage">درصد ثبت‌نام</option>
                <option value="currentYearStudents">
                  دانش‌آموزان سال جاری
                </option>
                <option value="previousYearStudents">
                  دانش‌آموزان سال قبل
                </option>
                <option value="classifiedStudents">کلاس‌بندی شده</option>
                <option value="femaleStudents">دانش‌آموزان دختر</option>
                <option value="maleStudents">دانش‌آموزان پسر</option>
                <option value="totalClasses">تعداد کلاس‌ها</option>
                <option value="growthRate">نرخ رشد</option>
                <option value="schoolName">نام مدرسه</option>
                <option value="schoolCode">کد مدرسه</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                دانلود گزارش
              </label>
              <button
                onClick={exportToExcel}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                دانلود اکسل
              </button>
            </div>
          </div>

          {/* کنترل مرتب‌سازی */}
          <div className="flex items-center justify-between pt-4 border-t mt-4 text-gray-800">
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                }))
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              {filters.sortOrder === "asc" ? "↑" : "↓"}
              {filters.sortOrder === "asc" ? "صعودی" : "نزولی"}
            </button>
          </div>
        </div>
      </div>

      {/* جدول مدارس */}
      {/* خلاصه آمار */}
      {filteredSchools.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            خلاصه آمار:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredSchools.length}
              </div>
              <div className="text-sm text-gray-600">تعداد مدارس</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredSchools
                  .reduce(
                    (sum, school) =>
                      sum + (school.currentYearStats?.totalStudents || 0),
                    0
                  )
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                کل دانش‌آموزان سال جاری
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredSchools
                  .reduce(
                    (sum, school) =>
                      sum + (school.previousYearStats?.totalStudents || 0),
                    0
                  )
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                کل دانش‌آموزان سال قبل
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredSchools
                  .reduce(
                    (sum, school) =>
                      sum + (school.currentYearStats?.classifiedStudents || 0),
                    0
                  )
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">کل کلاس‌بندی شده</div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  مدرسه
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  دوره
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  جنسیت
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  سال جاری
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  سال قبل
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  درصد جذب
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider"
                  style={{ color: "#1f2937" }}
                >
                  کلاس‌بندی شده
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchools.map((school) => (
                <tr
                  key={school.examCenter._id}
                  className={getRowColor(school.registrationPercentage)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {school.examCenter.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        کد: {school.examCenter.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {school.examCenter.course}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {school.examCenter.gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {school.currentYearStats
                      ? school.currentYearStats.totalStudents.toLocaleString()
                      : "0"}{" "}
                    نفر
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {school.previousYearStats
                      ? school.previousYearStats.totalStudents.toLocaleString()
                      : "0"}{" "}
                    نفر
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-semibold ${getPercentageColor(
                        school.registrationPercentage
                      )}`}
                    >
                      {Math.round(
                        (school.currentYearStats.totalStudents /
                          school.previousYearStats.totalStudents) *
                          100
                      )}
                      %
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {school.currentYearStats
                      ? school.currentYearStats.classifiedStudents.toLocaleString()
                      : "0"}{" "}
                    نفر
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">هیچ مدرسه‌ای یافت نشد</p>
          </div>
        )}
      </div>
    </div>
  );
}
