"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useUserContext } from "@/context/UserContext";
import {
  FaSync,
  FaDownload,
  FaSearch,
  FaChart,
  FaTable,
  FaFilter,
  FaChartBar,
  FaMapMarkedAlt,
  FaCalendarAlt,
} from "react-icons/fa";
import RegistrationStatusChart from "@/components/charts/RegistrationStatusChart";
import PreviousYearStudentStats from "@/components/dashboard/PreviousYearStudentStats";
import CurrentYearStudentStats from "@/components/dashboard/CurrentYearStudentStats";

export default function StudentStatusReportsPage() {
  const { user } = useUserContext();
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
  const [gridSize, setGridSize] = useState(12);
  const [refreshing, setRefreshing] = useState(false);
  const [courseOptions, setCourseOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("charts");

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
      branch: "",
    }));
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

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("داده‌ها بروزرسانی شد");
  };

  const getCardColor = (percentage) => {
    if (percentage < 25) return "bg-red-50 border-red-300 hover:bg-red-100";
    if (percentage < 75)
      return "bg-orange-50 border-orange-300 hover:bg-orange-100";
    if (percentage < 90)
      return "bg-green-50 border-green-300 hover:bg-green-100";
    return "bg-green-100 border-green-400 hover:bg-green-200";
  };

  const getPercentageColor = (percentage) => {
    if (percentage < 25) return "text-red-700";
    if (percentage < 75) return "text-orange-700";
    if (percentage < 90) return "text-green-700";
    return "text-green-800";
  };

  const getTextColor = (percentage) => {
    if (percentage < 25) return "text-red-800";
    if (percentage < 75) return "text-orange-800";
    if (percentage < 90) return "text-green-800";
    return "text-green-900";
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

  const displayedDistricts = filteredDistricts.slice(0, gridSize);

  // برای تب districts: فیلتر کردن مناطق بر اساس نقش کاربر
  const getDistrictsForTab = () => {
    if (user?.role === "districtRegistrationExpert") {
      return filteredDistricts.filter(
        (districtData) =>
          districtData.district._id === user?.district ||
          districtData.district.code === user?.districtCode
      );
    }
    return filteredDistricts;
  };

  const districtsForTab = getDistrictsForTab();
  const displayedDistrictsForTab = districtsForTab.slice(0, gridSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* هدر صفحه */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            گزارش وضعیت دانش آموزی
          </h1>
          <p className="text-gray-600">
            مقایسه آمار ثبت نام سال جاری ({currentYear}) با سال قبل (
            {previousYear})
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* فیلترها */}
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="p-6 border-b bg-gray-50 rounded-t-xl">
            <div className="flex items-center gap-2 mb-4">
              <FaFilter className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                فیلترها و جستجو
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  دوره تحصیلی
                </label>
                <select
                  value={filters.course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {courseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  شاخه
                </label>
                <select
                  value={filters.branch}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {branchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  جستجوی منطقه
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="نام یا کد منطقه"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  مرتب‌سازی
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="registrationPercentage">درصد ثبت‌نام</option>
                  <option value="currentYearStudents">سال جاری</option>
                  <option value="previousYearStudents">سال قبل</option>
                  <option value="districtName">نام منطقه</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                    }))
                  }
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {filters.sortOrder === "asc" ? "↑" : "↓"}
                  {filters.sortOrder === "asc" ? "صعودی" : "نزولی"}
                </button>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
                    refreshing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  <FaSync
                    className={`text-sm ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "بروز..." : "بروزرسانی"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  نمایش {displayedDistricts.length} از{" "}
                  {filteredDistricts.length} منطقه
                  {user?.role === "districtRegistrationExpert" && (
                    <span className="text-orange-600 mr-2">
                      (در تب مناطق فقط منطقه شما نمایش داده می‌شود)
                    </span>
                  )}
                </span>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1 text-gray-800"
                >
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>همه</option>
                </select>
              </div>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FaDownload />
                دانلود اکسل
              </button>
            </div>
          </div>
        </div>

        {/* تب‌ها */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("charts")}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "charts"
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaChartBar />
                نمودارها
              </button>
              <button
                onClick={() => setActiveTab("districts")}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "districts"
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaMapMarkedAlt />
                {user?.role === "districtRegistrationExpert"
                  ? `منطقه من (${districtsForTab.length})`
                  : `مناطق (${filteredDistricts.length})`}
              </button>
              <button
                onClick={() => setActiveTab("current-year")}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "current-year"
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaCalendarAlt />
                آمار سال جاری
              </button>
              <button
                onClick={() => setActiveTab("previous-year")}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "previous-year"
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaTable />
                آمار سال گذشته
              </button>
            </nav>
          </div>

          {/* محتوای تب‌ها */}
          <div className="p-6">
            {activeTab === "charts" && (
              <div className="space-y-6">
                <RegistrationStatusChart
                  data={filteredDistricts}
                  currentYear={currentYear}
                  previousYear={previousYear}
                  title="گزارش وضعیت ثبت نام مناطق"
                />

                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 border-b pb-2">
                    📊 راهنمای رنگ‌ها:
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded-lg mr-3 shadow-sm"></div>
                      <span className="text-sm font-semibold text-red-800">
                        کمتر از 25%
                      </span>
                    </div>
                    <div className="flex items-center bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="w-6 h-6 bg-orange-100 border-2 border-orange-300 rounded-lg mr-3 shadow-sm"></div>
                      <span className="text-sm font-semibold text-orange-800">
                        25% تا 75%
                      </span>
                    </div>
                    <div className="flex items-center bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded-lg mr-3 shadow-sm"></div>
                      <span className="text-sm font-semibold text-green-800">
                        75% تا 90%
                      </span>
                    </div>
                    <div className="flex items-center bg-green-100 p-3 rounded-lg border border-green-300">
                      <div className="w-6 h-6 bg-green-200 border-2 border-green-400 rounded-lg mr-3 shadow-sm"></div>
                      <span className="text-sm font-semibold text-green-900">
                        بیشتر از 90%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3 text-center bg-gray-50 p-2 rounded-lg">
                    💡 رنگ‌ها بر اساس درصد ثبت‌نام سال جاری نسبت به سال قبل
                    محاسبه می‌شوند
                  </p>
                </div>
              </div>
            )}

            {activeTab === "districts" && (
              <div>
                <div
                  className={`grid gap-4 ${
                    gridSize <= 8
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : gridSize <= 16
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  }`}
                >
                  {displayedDistrictsForTab.map((districtData) => (
                    <div
                      key={districtData.district._id}
                      onClick={() =>
                        handleDistrictClick(districtData.district._id)
                      }
                      className={`${getCardColor(
                        districtData.registrationPercentage
                      )} border-2 rounded-lg p-4 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3
                            className={`font-bold text-lg ${getTextColor(
                              districtData.registrationPercentage
                            )}`}
                          >
                            {districtData.district.name}
                          </h3>
                          <p className="text-sm text-gray-700 font-medium">
                            کد: {districtData.district.code}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            {districtData.district.province.name}
                          </p>
                        </div>
                        <div
                          className={`text-2xl font-bold ${getPercentageColor(
                            districtData.registrationPercentage
                          )} bg-white/70 px-3 py-1 rounded-lg shadow-sm`}
                        >
                          {districtData.registrationPercentage}%
                        </div>
                      </div>

                      <div
                        className={`space-y-2 text-sm ${getTextColor(
                          districtData.registrationPercentage
                        )}`}
                      >
                        <div className="flex justify-between bg-white/30 px-2 py-1 rounded">
                          <span className="font-medium">سال جاری:</span>
                          <span className="font-bold">
                            {districtData.currentYearStats.totalStudents.toLocaleString()}{" "}
                            نفر
                          </span>
                        </div>
                        <div className="flex justify-between bg-white/30 px-2 py-1 rounded">
                          <span className="font-medium">سال قبل:</span>
                          <span className="font-bold">
                            {districtData.previousYearStats.totalStudents.toLocaleString()}{" "}
                            نفر
                          </span>
                        </div>
                        <div className="flex justify-between bg-white/30 px-2 py-1 rounded">
                          <span className="font-medium">تعداد مدارس:</span>
                          <span className="font-bold">
                            {districtData.examCentersCount} مدرسه
                          </span>
                        </div>
                      </div>

                      {districtData.periodBreakdown &&
                        Object.keys(districtData.periodBreakdown).length >
                          0 && (
                          <div className="mt-3 pt-3 border-t border-white/40">
                            <h4
                              className={`text-xs font-bold ${getTextColor(
                                districtData.registrationPercentage
                              )} mb-2 bg-white/40 px-2 py-1 rounded`}
                            >
                              آمار بر اساس دوره:
                            </h4>
                            <div className="space-y-1">
                              {Object.entries(districtData.periodBreakdown).map(
                                ([period, stats]) => (
                                  <div
                                    key={period}
                                    className={`flex justify-between text-xs ${getTextColor(
                                      districtData.registrationPercentage
                                    )} bg-white/20 px-2 py-1 rounded`}
                                  >
                                    <span className="font-medium">
                                      {period}:
                                    </span>
                                    <span className="font-bold">
                                      {stats.totalStudents.toLocaleString()}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {districtsForTab.length > gridSize && (
                  <div className="text-center mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                    <p className="text-gray-700 font-medium mb-4">
                      {gridSize} از {districtsForTab.length} منطقه نمایش داده
                      شده است
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() =>
                          setGridSize((prev) =>
                            Math.min(prev + 12, districtsForTab.length)
                          )
                        }
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        📈 نمایش بیشتر ({districtsForTab.length - gridSize}{" "}
                        منطقه باقی مانده)
                      </button>
                      <button
                        onClick={() => setGridSize(districtsForTab.length)}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        📊 نمایش همه ({districtsForTab.length} منطقه)
                      </button>
                    </div>
                  </div>
                )}

                {districtsForTab.length === 0 && (
                  <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      {user?.role === "districtRegistrationExpert"
                        ? "اطلاعات منطقه شما یافت نشد"
                        : "هیچ منطقه‌ای یافت نشد"}
                    </h3>
                    <p className="text-gray-500">
                      {user?.role === "districtRegistrationExpert"
                        ? "لطفاً با مدیر سیستم تماس بگیرید"
                        : "فیلترهای انتخابی را بررسی کنید"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "current-year" && (
              <div>
                <CurrentYearStudentStats filters={filters} />
              </div>
            )}

            {activeTab === "previous-year" && (
              <div>
                <PreviousYearStudentStats filters={filters} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
