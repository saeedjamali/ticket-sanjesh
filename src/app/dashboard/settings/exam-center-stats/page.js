"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFileImport,
  FaFileExcel,
} from "react-icons/fa";

export default function ExamCenterStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState(""); // فیلتر دوره تحصیلی
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [academicYears, setAcademicYears] = useState([]);

  // لیست دوره‌های تحصیلی
  const courseOptions = [
    { code: "100", name: "پیش دبستانی" },
    { code: "200", name: "ابتدایی" },
    { code: "300", name: "متوسطه اول" },
    { code: "400", name: "متوسطه دوم" },
    { code: "500", name: "سایر" },
  ];

  // دریافت لیست سال‌های تحصیلی
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // دریافت آمار
  useEffect(() => {
    fetchStats();
  }, [currentPage, searchTerm, academicYearFilter, courseFilter]);

  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/academic-years", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data.academicYears);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        academicYear: academicYearFilter,
        course: courseFilter,
      });

      const response = await fetch(`/api/exam-center-stats?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStats();
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchStats();
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
        a.href = url;
        a.download = "exam-center-stats-template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading template:", error);
    }
  };

  const handleDelete = async (organizationalUnitCode, academicYear) => {
    if (
      !confirm(
        `آیا از حذف آمار واحد سازمانی ${organizationalUnitCode} برای سال ${academicYear} اطمینان دارید؟`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/exam-center-stats/${organizationalUnitCode}/${academicYear}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchStats();
      }
    } catch (error) {
      console.error("Error deleting stats:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          آمار واحدهای سازمانی
        </h1>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={() =>
              router.push("/dashboard/settings/exam-center-stats/create")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaPlus />
            افزودن آمار جدید
          </button>
          <button
            onClick={() =>
              router.push("/dashboard/settings/exam-center-stats/import")
            }
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaFileImport />
            آپلود فایل اکسل
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaFileExcel />
            دانلود قالب
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              جستجو
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="کد واحد سازمانی..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سال تحصیلی
            </label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه سال‌ها</option>
              {academicYears.map((year) => (
                <option key={year._id} value={year.name}>
                  {year.name} {year.isActive && "(فعال)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              دوره تحصیلی
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه دوره‌ها</option>
              {courseOptions.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
            >
              <FaSearch />
              جستجو
            </button>
          </div>
        </form>
      </div>

      {/* Stats Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد واحد سازمانی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام واحد سازمانی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد استان
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد منطقه
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  سال تحصیلی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  دوره تحصیلی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  شاخه
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تعداد کل دانش‌آموزان
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کلاس‌بندی شده
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تعداد کلاس‌ها
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  دختر
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  پسر
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((stat) => (
                <tr key={`${stat.organizationalUnitCode}-${stat.academicYear}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.organizationalUnitCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.organizationalUnitName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.provinceCode || "نامشخص"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.districtCode || "نامشخص"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.academicYear}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {stat.courseName} ({stat.courseCode})
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {stat.branchTitle} ({stat.branchCode})
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.totalStudents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.classifiedStudents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.totalClasses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.femaleStudents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stat.maleStudents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/settings/exam-center-stats/${stat.organizationalUnitCode}/${stat.academicYear}/edit`
                          )
                        }
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            stat.organizationalUnitCode,
                            stat.academicYear
                          )
                        }
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stats.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">هیچ آماری یافت نشد</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center space-x-2 space-x-reverse">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-md text-sm ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                } border border-gray-300`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
