"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { ROLES, checkUserRole } from "@/lib/permissions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { toast } from "react-hot-toast";
import {
  FaSearch,
  FaUsers,
  FaMale,
  FaFemale,
  FaGraduationCap,
  FaChartBar,
  FaDownload,
  FaFilter,
  FaEye,
  FaFileExcel,
} from "react-icons/fa";

export default function StudentRegistrationReportsPage() {
  const { user, loading: userLoading } = useUserContext();
  const router = useRouter();

  // States for search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // States for statistics
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // States for filters
  const [filters, setFilters] = useState({
    academicYear: "",
    province: "",
    district: "",
    organizationalUnit: "",
    grade: "",
    field: "",
    gender: "",
  });

  // States for helpers data
  const [academicYears, setAcademicYears] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [organizationalUnits, setOrganizationalUnits] = useState([]);
  const [grades, setGrades] = useState([]);
  const [fields, setFields] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  // Check permissions
  useEffect(() => {
    if (!userLoading && user) {
      if (user.role !== ROLES.GENERAL_MANAGER) {
        toast.error("شما مجوز دسترسی به این بخش را ندارید");
        router.push("/dashboard");
        return;
      }
      // Load initial data
      loadStatistics();
      loadHelperData();
    }
  }, [user, userLoading, router]);

  // Load helper data for filters
  const loadHelperData = async () => {
    try {
      const [academicYearsRes, provincesRes, gradesRes, fieldsRes] =
        await Promise.all([
          fetch("/api/helpers?type=academic-years"),
          fetch("/api/helpers?type=provinces"),
          fetch("/api/helpers?type=grades"),
          fetch("/api/helpers?type=fields"),
        ]);

      const [academicYearsData, provincesData, gradesData, fieldsData] =
        await Promise.all([
          academicYearsRes.json(),
          provincesRes.json(),
          gradesRes.json(),
          fieldsRes.json(),
        ]);

      setAcademicYears(academicYearsData.data || []);
      setProvinces(provincesData.data || []);
      setGrades(gradesData.data || []);
      setFields(fieldsData.data || []);
    } catch (error) {
      console.error("Error loading helper data:", error);
      toast.error("خطا در بارگذاری اطلاعات کمکی");
    }
  };

  // Load districts when province changes
  useEffect(() => {
    if (filters.province) {
      loadDistricts(filters.province);
    } else {
      setDistricts([]);
      setOrganizationalUnits([]);
    }
  }, [filters.province]);

  // Load organizational units when district changes
  useEffect(() => {
    if (filters.district) {
      loadOrganizationalUnits(filters.district);
    } else {
      setOrganizationalUnits([]);
    }
  }, [filters.district]);

  const loadDistricts = async (provinceCode) => {
    try {
      const response = await fetch(
        `/api/helpers?type=districts&province=${provinceCode}`
      );
      const data = await response.json();
      setDistricts(data.data || []);
    } catch (error) {
      console.error("Error loading districts:", error);
    }
  };

  const loadOrganizationalUnits = async (districtCode) => {
    try {
      const response = await fetch(
        `/api/helpers?type=organizational-units&district=${districtCode}`
      );
      const data = await response.json();
      setOrganizationalUnits(data.data || []);
    } catch (error) {
      console.error("Error loading organizational units:", error);
    }
  };

  // Load statistics
  const loadStatistics = async (customFilters = {}) => {
    setStatsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const filterParams = { ...filters, ...customFilters };

      Object.entries(filterParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/students/statistics?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setStatistics(data.data);
      } else {
        toast.error(data.message || "خطا در بارگذاری آمار");
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast.error("خطا در بارگذاری آمار");
    } finally {
      setStatsLoading(false);
    }
  };

  // Search students
  const searchStudents = async (page = 1) => {
    if (!searchQuery.trim()) {
      toast.error("لطفا متن جستجو را وارد کنید");
      return;
    }

    setSearchLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("q", searchQuery);
      queryParams.append("page", page);
      queryParams.append("limit", itemsPerPage);

      // Add filters to search
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/students/search?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.data.students);
        setTotalPages(data.data.totalPages);
        setCurrentPage(page);
      } else {
        toast.error(data.message || "خطا در جستجو");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching students:", error);
      toast.error("خطا در جستجو");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Clear dependent filters
    if (key === "province") {
      newFilters.district = "";
      newFilters.organizationalUnit = "";
      setFilters(newFilters);
    } else if (key === "district") {
      newFilters.organizationalUnit = "";
      setFilters(newFilters);
    }

    // Reload statistics with new filters
    loadStatistics(newFilters);
  };

  // Export search results
  const exportResults = async () => {
    if (searchResults.length === 0) {
      toast.error("ابتدا جستجو انجام دهید");
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.append("q", searchQuery);
      queryParams.append("export", "true");

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/students/search?${queryParams}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-search-results-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("فایل با موفقیت دانلود شد");
      } else {
        toast.error("خطا در دانلود فایل");
      }
    } catch (error) {
      console.error("Error exporting results:", error);
      toast.error("خطا در دانلود فایل");
    }
  };

  if (userLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== ROLES.GENERAL_MANAGER) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          گزارش ثبت نام دانش‌آموزی
        </h1>
        <p className="text-gray-600">
          مشاهده آمار و جستجوی دانش‌آموزان ثبت نام شده در سراسر کشور
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <FaFilter className="ml-2 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">فیلترها</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              سال تحصیلی
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) =>
                handleFilterChange("academicYear", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه سال‌ها</option>
              {academicYears.map((year) => (
                <option key={year._id} value={year._id}>
                  {year.title}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              استان
            </label>
            <select
              value={filters.province}
              onChange={(e) => handleFilterChange("province", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه استان‌ها</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              منطقه
            </label>
            <select
              value={filters.district}
              onChange={(e) => handleFilterChange("district", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!filters.province}
            >
              <option value="">همه مناطق</option>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              پایه
            </label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange("grade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه پایه‌ها</option>
              {grades.map((grade) => (
                <option key={grade._id} value={grade._id}>
                  {grade.title}
                </option>
              ))}
            </select>
          </div>

          {/* Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رشته
            </label>
            <select
              value={filters.field}
              onChange={(e) => handleFilterChange("field", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه رشته‌ها</option>
              {fields.map((field) => (
                <option key={field._id} value={field._id}>
                  {field.title}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جنسیت
            </label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange("gender", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه</option>
              <option value="male">پسر</option>
              <option value="female">دختر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : statistics ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <FaUsers className="text-blue-600 text-2xl ml-3" />
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    کل دانش‌آموزان
                  </p>
                  <p className="text-blue-800 text-2xl font-bold">
                    {statistics.total?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center">
                <FaMale className="text-green-600 text-2xl ml-3" />
                <div>
                  <p className="text-green-600 text-sm font-medium">
                    دانش‌آموزان پسر
                  </p>
                  <p className="text-green-800 text-2xl font-bold">
                    {statistics.maleCount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
              <div className="flex items-center">
                <FaFemale className="text-pink-600 text-2xl ml-3" />
                <div>
                  <p className="text-pink-600 text-sm font-medium">
                    دانش‌آموزان دختر
                  </p>
                  <p className="text-pink-800 text-2xl font-bold">
                    {statistics.femaleCount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center">
                <FaGraduationCap className="text-purple-600 text-2xl ml-3" />
                <div>
                  <p className="text-purple-600 text-sm font-medium">
                    تعداد واحدهای سازمانی
                  </p>
                  <p className="text-purple-800 text-2xl font-bold">
                    {statistics.organizationalUnitsCount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            خطا در بارگذاری آمار
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <FaSearch className="ml-2 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            جستجوی دانش‌آموز
          </h2>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="نام، نام خانوادگی، کد ملی یا شماره دانش‌آموزی را وارد کنید..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && searchStudents(1)}
            />
          </div>
          <button
            onClick={() => searchStudents(1)}
            disabled={searchLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {searchLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <FaSearch className="ml-2" />
                جستجو
              </>
            )}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={exportResults}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <FaFileExcel className="ml-2" />
              دانلود Excel
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              {searchResults.length} نتیجه یافت شد
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      نام و نام خانوادگی
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      کد ملی
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      شماره دانش‌آموزی
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      جنسیت
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      پایه
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      رشته
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      واحد سازمانی
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.nationalId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.studentNumber}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.genderName ||
                          (student.gender === "male" ? "پسر" : "دختر")}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.gradeName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.fieldName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {student.organizationalUnitName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/students/${student._id}`)
                          }
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <FaEye className="ml-1" />
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => searchStudents(page)}
                      className={`px-3 py-1 mx-1 rounded ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {searchQuery && !searchLoading && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            نتیجه‌ای یافت نشد
          </div>
        )}
      </div>
    </div>
  );
}
