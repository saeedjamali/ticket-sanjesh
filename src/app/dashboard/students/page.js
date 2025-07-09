"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaFileImport,
} from "react-icons/fa";

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [helpers, setHelpers] = useState({
    examCenterInfo: null,
    grades: [],
    fields: [],
    genders: [],
    studentTypes: [],
    activeAcademicYear: null,
    academicYears: [],
  });

  // دریافت اطلاعات کمکی
  useEffect(() => {
    fetchHelpers();
  }, []);

  // دریافت فهرست دانش‌آموزان
  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm, gradeFilter, fieldFilter, academicYearFilter]);

  const fetchHelpers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/helpers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHelpers(data);
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(gradeFilter && { gradeCode: gradeFilter }),
        ...(fieldFilter && { fieldCode: fieldFilter }),
        ...(academicYearFilter && { academicYear: academicYearFilter }),
      });

      const response = await fetch(`/api/students?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
        setTotalPages(data.pagination.totalPages);
      } else {
        console.error("Error fetching students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStudents();
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchStudents();
  };

  const handleDelete = async (studentId) => {
    if (!confirm("آیا از حذف این دانش‌آموز مطمئن هستید؟")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students?id=${studentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // حذف دانش‌آموز از لیست محلی
        setStudents((prev) =>
          prev.filter((student) => student._id !== studentId)
        );
        alert("دانش‌آموز با موفقیت حذف شد");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در حذف دانش‌آموز");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const getAllGrades = () => {
    return helpers.grades || [];
  };

  const getAllFields = () => {
    return helpers.fields || [];
  };

  if (loading && students.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مدیریت دانش‌آموزان
          </h1>
          {helpers.activeAcademicYear && (
            <p className="text-sm text-gray-600 mt-1">
              سال تحصیلی: {helpers.activeAcademicYear}
            </p>
          )}
          {helpers.examCenterInfo && (
            <div className="text-sm text-gray-600 mt-2">
              <p>واحد سازمانی: {helpers.examCenterInfo.name}</p>
              <p>
                دوره: {helpers.examCenterInfo.course.courseName} - شاخه:{" "}
                {helpers.examCenterInfo.branch.branchTitle}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard/students/import")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaFileImport />
            بارگذاری گروهی
          </button>
          <button
            onClick={() => router.push("/dashboard/students/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaPlus />
            دانش‌آموز جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              جستجو
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="کد ملی، نام، نام خانوادگی یا نام پدر"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FaSearch className="absolute right-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              پایه تحصیلی
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه پایه‌ها</option>
              {getAllGrades().map((grade) => (
                <option key={grade.gradeCode} value={grade.gradeCode}>
                  {grade.gradeName} (کد: {grade.gradeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رشته تحصیلی
            </label>
            <select
              value={fieldFilter}
              onChange={(e) => {
                setFieldFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه رشته‌ها</option>
              {getAllFields().map((field) => (
                <option key={field.fieldCode} value={field.fieldCode}>
                  {field.fieldTitle} (کد: {field.fieldCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سال تحصیلی
            </label>
            <select
              value={academicYearFilter}
              onChange={(e) => {
                setAcademicYearFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه سال‌ها</option>
              {(helpers.academicYears || []).map((year) => (
                <option key={year.name} value={year.name}>
                  {year.name} {year.isActive && "(فعال)"}
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

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider ">
                  کد ملی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام و نام خانوادگی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام پدر
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  پایه
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رشته
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  سال تحصیلی
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {student.nationalId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {student.fatherName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {student.gradeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center  ">
                    {student.fieldName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        student.studentType === "normal"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {student.studentTypeName ||
                        (student.studentType === "normal" ? "عادی" : "بزرگسال")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {student.academicYear}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/students/${student._id}`)
                        }
                        className="text-blue-600 hover:text-blue-900"
                        title="مشاهده جزئیات"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/students/${student._id}/edit`)
                        }
                        className="text-green-600 hover:text-green-900"
                        title="ویرایش"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
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

        {students.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">هیچ دانش‌آموزی یافت نشد</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                قبلی
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                بعدی
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  صفحه {currentPage} از {totalPages}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
