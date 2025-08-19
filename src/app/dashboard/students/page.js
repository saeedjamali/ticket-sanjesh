"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import CorrectionRequestModal from "@/components/students/CorrectionRequestModal";
import CorrectionRequestWorkflow from "@/components/students/CorrectionRequestWorkflow";
import GradeStatsDisplay from "@/components/students/GradeStatsDisplay";
import TransferRequestModal from "@/components/modals/TransferRequestModal";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaFileImport,
  FaFileExcel,
  FaExclamationTriangle,
  FaExchangeAlt,
} from "react-icons/fa";

export default function StudentsPage({
  defaultAcademicYear,
  hideAcademicYearFilter = false,
  maxStudents,
  currentStudentCount,
  modalStudentCount,
  disableCapacityControl = false,
}) {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // برای محاسبه آمار پایه‌ها
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [stats, setStats] = useState({
    maxStudents: maxStudents || null,
    currentStudentCount: currentStudentCount || null,
  });
  const [helpers, setHelpers] = useState({
    examCenterInfo: null,
    grades: [],
    fields: [],
    genders: [],
    studentTypes: [],
    activeAcademicYear: null,
    academicYears: [],
  });

  // به‌روزرسانی آمار وقتی props تغییر کرد
  useEffect(() => {
    setStats({
      maxStudents: maxStudents || null,
      currentStudentCount: currentStudentCount || null,
    });
  }, [maxStudents, currentStudentCount]);

  // دریافت اطلاعات کمکی
  useEffect(() => {
    fetchHelpers();
    // اگر آمار از props پاس نشده، آن را دریافت کن
    if (!maxStudents && !currentStudentCount) {
      fetchStats();
    }
  }, []);

  // تنظیم فیلتر سال تحصیلی بر اساس prop
  useEffect(() => {
    if (helpers.activeAcademicYear && helpers.academicYears?.length > 0) {
      if (defaultAcademicYear === "current") {
        const activeYear = helpers.academicYears.find((year) => year.isActive);
        if (activeYear) {
          setAcademicYearFilter(activeYear.name);
        }
      } else if (defaultAcademicYear === "previous") {
        const activeYearIndex = helpers.academicYears.findIndex(
          (year) => year.isActive
        );
        if (
          activeYearIndex >= 0 &&
          activeYearIndex < helpers.academicYears.length - 1
        ) {
          setAcademicYearFilter(
            helpers.academicYears[activeYearIndex + 1].name
          );
        }
      }
    }
  }, [helpers.academicYears, defaultAcademicYear]);

  // دریافت فهرست دانش‌آموزان
  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm, gradeFilter, fieldFilter, academicYearFilter]);

  // دریافت تمام دانش‌آموزان برای آمار پایه‌ها (فقط وقتی فیلترها تغییر کنند)
  useEffect(() => {
    fetchAllStudentsForStats();
  }, [searchTerm, gradeFilter, fieldFilter, academicYearFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/check-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const targetStats =
          defaultAcademicYear === "previous"
            ? data.data.previousYear
            : data.data.currentYear;

        setStats({
          maxStudents: targetStats.totalStudents,
          currentStudentCount: targetStats.registeredStudents,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

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
      });

      // اگر سال تحصیلی انتخاب شده باشد، از آن استفاده کن
      if (academicYearFilter) {
        params.append("academicYear", academicYearFilter);
      }
      // در غیر این صورت، اگر defaultAcademicYear تنظیم شده باشد
      else if (
        defaultAcademicYear === "current" ||
        defaultAcademicYear === "previous"
      ) {
        params.append("yearFilter", defaultAcademicYear);
      }

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

  const fetchAllStudentsForStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        limit: "1000", // حد بالا برای دریافت همه دانش‌آموزان
        ...(searchTerm && { search: searchTerm }),
        ...(gradeFilter && { gradeCode: gradeFilter }),
        ...(fieldFilter && { fieldCode: fieldFilter }),
      });

      // اگر سال تحصیلی انتخاب شده باشد، از آن استفاده کن
      if (academicYearFilter) {
        params.append("academicYear", academicYearFilter);
      }
      // در غیر این صورت، اگر defaultAcademicYear تنظیم شده باشد
      else if (
        defaultAcademicYear === "current" ||
        defaultAcademicYear === "previous"
      ) {
        params.append("yearFilter", defaultAcademicYear);
      }

      const response = await fetch(`/api/students?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllStudents(data.students);
      } else {
        console.error("Error fetching all students for stats");
      }
    } catch (error) {
      console.error("Error fetching all students for stats:", error);
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

  const handleExcelExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(gradeFilter && { gradeCode: gradeFilter }),
        ...(fieldFilter && { fieldCode: fieldFilter }),
        ...(academicYearFilter && { academicYear: academicYearFilter }),
      });

      const response = await fetch(`/api/students/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // تبدیل response به blob
        const blob = await response.blob();

        // ایجاد URL موقت برای دانلود
        const url = window.URL.createObjectURL(blob);

        // ایجاد المنت a برای دانلود
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;

        // استخراج نام فایل از header
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "students.xlsx";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // پاک کردن URL موقت
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در دانلود فایل Excel");
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("خطا در دانلود فایل Excel");
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
            {defaultAcademicYear === "current"
              ? "لیست دانش‌آموزان سال جاری"
              : defaultAcademicYear === "previous"
              ? "لیست دانش‌آموزان سال گذشته"
              : "مدیریت دانش‌آموزان"}
          </h1>
          {academicYearFilter && (
            <p className="text-sm text-gray-600 mt-1">
              سال تحصیلی: {academicYearFilter}
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
          {stats.maxStudents &&
            stats.currentStudentCount > stats.maxStudents && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-500 ml-2" />
                  <p className="text-red-700">
                    هشدار: تعداد دانش‌آموزان ثبت نام شده (
                    {stats.currentStudentCount} نفر) از حد مجاز (
                    {stats.maxStudents} نفر) بیشتر است!
                  </p>
                </div>
              </div>
            )}
        </div>
        <div className="flex gap-3">
          {/* دکمه درخواست جابجایی */}
          {defaultAcademicYear && helpers.examCenterInfo && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              title="درخواست جابجایی دانش‌آموز"
            >
              <FaExchangeAlt />
              درخواست جابجایی
            </button>
          )}

          {/* دکمه درخواست اصلاح آمار - فقط برای سال قبل و مدیران واحد سازمانی */}
          {defaultAcademicYear === "previous" && helpers.examCenterInfo && (
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              title="درخواست اصلاح آمار سال گذشته"
            >
              <FaEdit />
              درخواست اصلاح آمار
            </button>
          )}
          {/* <button
            onClick={handleExcelExport}
            className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:cursor-not-allowed"
            title="دانلود Excel"
            disabled={true}
          >
            <FaFileExcel />
            دانلود Excel
          </button> */}
          {defaultAcademicYear && (
            <>
              <button
                onClick={() =>
                  router.push(
                    `/dashboard/students/import?yearFilter=${defaultAcademicYear}`
                  )
                }
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                disabled={
                  !disableCapacityControl &&
                  maxStudents &&
                  stats.maxStudents &&
                  stats.currentStudentCount >= stats.maxStudents
                }
                title={
                  !disableCapacityControl &&
                  maxStudents &&
                  stats.maxStudents &&
                  stats.currentStudentCount >= stats.maxStudents
                    ? "تعداد دانش‌آموزان به حداکثر مجاز رسیده است"
                    : ""
                }
              >
                <FaFileImport />
                بارگذاری گروهی
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/dashboard/students/create?yearFilter=${defaultAcademicYear}`
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                disabled={
                  !disableCapacityControl &&
                  maxStudents &&
                  stats.maxStudents &&
                  stats.currentStudentCount >= stats.maxStudents
                }
                title={
                  !disableCapacityControl &&
                  maxStudents &&
                  stats.maxStudents &&
                  stats.currentStudentCount >= stats.maxStudents
                    ? "تعداد دانش‌آموزان به حداکثر مجاز رسیده است"
                    : ""
                }
              >
                <FaPlus />
                دانش‌آموز جدید
              </button>
            </>
          )}
        </div>
      </div>

      {stats.maxStudents && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                {defaultAcademicYear === "current"
                  ? "آمار ثبت نام دانش‌آموزان (در حال ثبت)"
                  : "آمار ثبت نام دانش‌آموزان"}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">تعداد ثبت شده:</span>
                  <span className="font-bold text-blue-600 mr-2">
                    {stats.currentStudentCount?.toLocaleString("fa-IR") || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ظرفیت کل:</span>
                  <span className="font-bold text-blue-600 mr-2">
                    {stats.maxStudents?.toLocaleString("fa-IR") || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {defaultAcademicYear === "current"
                      ? "ظرفیت باقی مانده:"
                      : "باقی مانده:"}
                  </span>
                  <span className="font-bold text-blue-600 mr-2">
                    {(
                      stats.maxStudents - stats.currentStudentCount
                    )?.toLocaleString("fa-IR") || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {stats.currentStudentCount && stats.maxStudents
                  ? `${Math.round(
                      (stats.currentStudentCount / stats.maxStudents) * 100
                    )}%`
                  : "0%"}
              </div>
              <div className="text-sm text-gray-600">
                {defaultAcademicYear === "current"
                  ? "در حال ثبت"
                  : "درصد تکمیل"}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  defaultAcademicYear === "current"
                    ? stats.currentStudentCount > stats.maxStudents
                      ? "bg-red-500"
                      : "bg-blue-500"
                    : stats.currentStudentCount > stats.maxStudents
                    ? "bg-red-500"
                    : stats.currentStudentCount / stats.maxStudents > 0.9
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(
                    (stats.currentStudentCount / stats.maxStudents) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* آمار به تفکیک پایه */}
      {allStudents.length > 0 && (
        <GradeStatsDisplay
          students={allStudents}
          title={`آمار به تفکیک پایه (${allStudents.length} دانش‌آموز)`}
        />
      )}

      {/* گردش کار درخواست‌های اصلاح آمار - فقط برای مدیران واحد سازمانی و سال گذشته */}
      {defaultAcademicYear === "previous" && helpers.examCenterInfo && (
        <CorrectionRequestWorkflow />
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 mt-2">
        <form
          onSubmit={handleSearch}
          className={`grid grid-cols-1 ${
            hideAcademicYearFilter ? "md:grid-cols-3" : "md:grid-cols-4"
          } gap-4`}
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

          {!hideAcademicYearFilter && (
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
          )}

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
                          router.push(
                            `/dashboard/students/${student._id}?yearFilter=${
                              defaultAcademicYear || "current"
                            }`
                          )
                        }
                        className="text-blue-600 hover:text-blue-900"
                        title="مشاهده جزئیات"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/students/${
                              student._id
                            }/edit?yearFilter=${
                              defaultAcademicYear || "current"
                            }`
                          )
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

      {/* Modal درخواست اصلاح آمار */}
      <CorrectionRequestModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        currentCount={modalStudentCount || stats.currentStudentCount}
        academicYear={academicYearFilter}
        examCenterInfo={helpers.examCenterInfo}
      />

      {/* مودال درخواست جابجایی */}
      <TransferRequestModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        academicYear={academicYearFilter}
      />
    </div>
  );
}
