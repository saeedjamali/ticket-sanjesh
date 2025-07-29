"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaSync, FaDownload, FaSearch } from "react-icons/fa";

export default function StudentStatusReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filters, setFilters] = useState({
    course: "",
    branch: "",
    province: "",
    search: "",
    sortBy: "registrationPercentage",
    sortOrder: "desc",
  });
  const [currentYear, setCurrentYear] = useState("");
  const [previousYear, setPreviousYear] = useState("");
  const [gridSize, setGridSize] = useState(12); // تعداد کاشی در هر صفحه
  const [refreshing, setRefreshing] = useState(false); // وضعیت بروزرسانی
  const [courseOptions, setCourseOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [
    filters.course,
    filters.branch,
    filters.province,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    // فیلتر بر اساس جستجو
    if (filters.search) {
      const filtered = districts.filter(
        (district) =>
          district.district.name.includes(filters.search) ||
          district.district.code.includes(filters.search)
      );
      setFilteredDistricts(filtered);
    } else {
      setFilteredDistricts(districts);
    }
  }, [districts, filters.search]);

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

      let url = "/api/student-status-reports";
      const params = new URLSearchParams();

      if (filters.course) params.append("course", filters.course);
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.province) params.append("province", filters.province);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      console.log("🔍 Sorting Debug:", {
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        fullUrl: url + (params.toString() ? `?${params.toString()}` : ""),
      });

      // Debug log
      console.log("Filters:", filters);
      console.log("URL params:", params.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log("Final URL:", url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Response data:", data);
        setDistricts(data.data);
        setCurrentYear(data.currentYear);
        setPreviousYear(data.previousYear);
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

  // تابع بروزرسانی
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("داده‌ها بروزرسانی شد");
  };

  const getCardColor = (percentage) => {
    if (percentage < 25) return "bg-red-100 border-red-300";
    if (percentage < 75) return "bg-orange-100 border-orange-300";
    if (percentage < 90) return "bg-green-100 border-green-300";
    return "bg-green-200 border-green-400";
  };

  const getPercentageColor = (percentage) => {
    if (percentage < 25) return "text-red-600";
    if (percentage < 75) return "text-orange-600";
    if (percentage < 90) return "text-green-600";
    return "text-green-700";
  };

  const handleDistrictClick = (districtId) => {
    const params = new URLSearchParams();
    if (filters.course) params.append("course", filters.course);
    if (filters.branch) params.append("branch", filters.branch);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    router.push(
      `/dashboard/student-status-reports/districts/${districtId}${queryString}`
    );
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      let url = "/api/student-status-reports/export";
      const params = new URLSearchParams();

      if (filters.course) params.append("course", filters.course);
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.province) params.append("province", filters.province);
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
        link.download = `student-status-report-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
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

  // محاسبه کاشی‌های نمایش داده شده
  const displayedDistricts = filteredDistricts.slice(0, gridSize);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          گزارش وضعیت دانش آموزی
        </h1>
        <div className="text-sm text-gray-600 mb-4">
          مقایسه آمار ثبت نام سال جاری ({currentYear}) با سال قبل (
          {previousYear})
        </div>

        {/* فیلترها */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-gray-800">
            <label className="text-sm font-medium text-gray-700">
              تعداد نمایش:
            </label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1 text-gray-800"
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={16}>16</option>
              <option value={20}>20</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="text-sm text-gray-600">
              نمایش {displayedDistricts.length} از {filteredDistricts.length}{" "}
              منطقه
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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
                جستجوی منطقه
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="نام یا کد منطقه"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <option value="examCentersCount">تعداد مدارس</option>
                <option value="growthRate">نرخ رشد</option>
                <option value="districtName">نام منطقه</option>
                <option value="districtCode">کد منطقه</option>
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
                <FaDownload />
                دانلود اکسل
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                بروزرسانی
              </label>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 ${
                  refreshing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                <FaSync className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "در حال بروزرسانی..." : "بروزرسانی"}
              </button>
            </div>
          </div>

          {/* کنترل مرتب‌سازی */}
          <div className="flex items-center justify-between pt-4 border-t">
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

        {/* راهنمای رنگ‌ها */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-green-900">
          <h3 className="text-lg font-semibold mb-3">راهنمای رنگ‌ها:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded mr-2"></div>
              <span className="text-sm">کمتر از 25% (قرمز)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded mr-2"></div>
              <span className="text-sm">25% تا 75% (نارنجی)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span className="text-sm">75% تا 90% (سبز کم رنگ)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 border border-green-400 rounded mr-2"></div>
              <span className="text-sm">بیشتر از 90% (سبز)</span>
            </div>
          </div>
        </div>
      </div>

      {/* کاشی‌های مناطق */}
      <div
        className={`grid gap-6 ${
          gridSize <= 4
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : gridSize <= 8
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : gridSize <= 12
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : gridSize <= 16
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        }`}
      >
        {displayedDistricts.map((districtData) => (
          <div
            key={districtData.district._id}
            onClick={() => handleDistrictClick(districtData.district._id)}
            className={`${getCardColor(
              districtData.registrationPercentage
            )} border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {districtData.district.name}
                </h3>
                <p className="text-sm text-gray-600">
                  کد: {districtData.district.code}
                </p>
                <p className="text-xs text-gray-500">
                  {districtData.district.province.name}
                </p>
              </div>
              <div
                className={`text-2xl font-bold ${getPercentageColor(
                  districtData.registrationPercentage
                )}`}
              >
                {districtData.registrationPercentage}%
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-800">
              <div className="flex justify-between">
                <span>سال جاری:</span>
                <span className="font-semibold">
                  {districtData.currentYearStats.totalStudents.toLocaleString()}{" "}
                  نفر
                </span>
              </div>
              <div className="flex justify-between">
                <span>سال قبل:</span>
                <span className="font-semibold">
                  {districtData.previousYearStats.totalStudents.toLocaleString()}{" "}
                  نفر
                </span>
              </div>
              <div className="flex justify-between">
                <span>تعداد مدارس:</span>
                <span className="font-semibold">
                  {districtData.examCentersCount} مدرسه
                </span>
              </div>
            </div>

            {/* آمار تفکیکی دوره‌ها */}
            {districtData.periodBreakdown &&
              Object.keys(districtData.periodBreakdown).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    آمار بر اساس دوره:
                  </h4>
                  <div className="space-y-1 ">
                    {Object.entries(districtData.periodBreakdown).map(
                      ([period, stats]) => (
                        <div
                          key={period}
                          className="flex justify-between text-xs text-gray-800"
                        >
                          <span>{period}:</span>
                          <span>{stats.totalStudents.toLocaleString()}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>

      {/* دکمه نمایش بیشتر */}
      {filteredDistricts.length > gridSize && (
        <div className="text-center mt-6 flex gap-4 justify-center">
          <button
            onClick={() =>
              setGridSize((prev) =>
                Math.min(prev + 12, filteredDistricts.length)
              )
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            نمایش بیشتر ({filteredDistricts.length - gridSize} منطقه باقی مانده)
          </button>
          <button
            onClick={() => setGridSize(filteredDistricts.length)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            نمایش همه ({filteredDistricts.length} منطقه)
          </button>
        </div>
      )}

      {filteredDistricts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">هیچ منطقه‌ای یافت نشد</p>
        </div>
      )}
    </div>
  );
}
