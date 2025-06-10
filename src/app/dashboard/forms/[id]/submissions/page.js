"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import FieldChart from "@/components/charts/FieldChart";

export default function FormSubmissionsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const params = useParams();

  // Check if user can manage forms
  const canManageForms =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

  useEffect(() => {
    if (user && canManageForms && params.id) {
      fetchSubmissions(currentPage, filter);
    }
  }, [currentPage, filter, user, params.id]);

  useEffect(() => {
    if (user && canManageForms && params.id && showAnalytics) {
      fetchAnalytics();
    }
  }, [user, params.id, showAnalytics]);

  const fetchSubmissions = async (page = 1, status = "all") => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url =
        status === "all"
          ? `/api/forms/${params.id}/submissions?page=${page}`
          : `/api/forms/${params.id}/submissions?page=${page}&status=${status}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت submissions: ${response.status}`);
      }

      const data = await response.json();
      console.log("data---->", data);
      if (data.success) {
        setSubmissions(data.submissions);
        setForm(data.form);
        setTotalPages(data.pagination.pages || 1);
      } else {
        throw new Error(data.message || "خطا در دریافت submissions");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${params.id}/analytics`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${params.id}/export`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دانلود: ${response.status}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `گزارش-فرم-${new Date().toISOString().split("T")[0]}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename\*=UTF-8''(.+)/
        );
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("فایل اکسل با موفقیت دانلود شد");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("خطا در دانلود فایل اکسل");
    } finally {
      setExportLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to get status text and color
  const getStatusInfo = (status) => {
    const statusMap = {
      submitted: { text: "ارسال شده", color: "bg-blue-100 text-blue-800" },
      reviewed: { text: "بررسی شده", color: "bg-yellow-100 text-yellow-800" },
      approved: { text: "تایید شده", color: "bg-green-100 text-green-800" },
      rejected: { text: "رد شده", color: "bg-red-100 text-red-800" },
    };
    return (
      statusMap[status] || { text: status, color: "bg-gray-100 text-gray-800" }
    );
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !canManageForms) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">شما مجاز به مشاهده این صفحه نیستید</p>
        <Link
          href="/dashboard/forms"
          className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          بازگشت به فرم‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                گزارش‌های ارسالی فرم
              </h1>
              {form && (
                <div className="mt-2">
                  <h2 className="text-lg text-gray-700">{form.title}</h2>
                  {form.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {form.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            <Link
              href="/dashboard/forms"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              بازگشت به فرم‌ها
            </Link>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  وضعیت:
                </label>
                <select
                  value={filter}
                  onChange={handleFilterChange}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">همه</option>
                  <option value="submitted">ارسال شده</option>
                  <option value="reviewed">بررسی شده</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {showAnalytics ? "مخفی کردن آمار" : "نمایش آمار"}
              </button>

              <button
                onClick={handleExportExcel}
                disabled={loading || submissions.length === 0 || exportLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exportLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                {exportLoading ? "در حال آماده‌سازی..." : "دانلود اکسل"}
              </button>

              {submissions.length > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  شامل {submissions.length} گزارش + آمار تحلیلی
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {showAnalytics && analytics && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">گزارش تحلیلی</h3>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.overview.totalSubmissions}
                </div>
                <div className="text-sm text-gray-600">کل ارسال‌ها</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.overview.uniqueDistricts}
                </div>
                <div className="text-sm text-gray-600">مناطق شرکت‌کننده</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.overview.uniqueExamCenters}
                </div>
                <div className="text-sm text-gray-600">واحدهای سازمانی</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.overview.statusCounts.approved}
                </div>
                <div className="text-sm text-gray-600">تایید شده</div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* District Stats */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-semibold mb-3">آمار مناطق</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analytics.districtStats.map((district, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm">{district.name}</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {district.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Center Stats */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-semibold mb-3">آمار واحدهای سازمانی</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analytics.examCenterStats
                    .slice(0, 10)
                    .map((center, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">{center.name}</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                          {center.count}
                        </span>
                      </div>
                    ))}
                  {analytics.examCenterStats.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">
                      و {analytics.examCenterStats.length - 10} واحد دیگر...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Field Analysis with Charts */}
            {analytics.fieldAnalysis && analytics.fieldAnalysis.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-semibold mb-4">تحلیل نموداری محتوای فرم</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {analytics.fieldAnalysis
                    .filter(
                      (field) =>
                        field.statistics.chartData &&
                        ["select", "radio", "checkbox", "number"].includes(
                          field.type
                        )
                    )
                    .map((field, index) => (
                      <FieldChart key={index} field={field} />
                    ))}
                </div>

                {/* Text fields summary */}
                {analytics.fieldAnalysis.filter((field) =>
                  ["text", "textarea", "email", "tel"].includes(field.type)
                ).length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-medium mb-3">فیلدهای متنی</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.fieldAnalysis
                        .filter((field) =>
                          ["text", "textarea", "email", "tel"].includes(
                            field.type
                          )
                        )
                        .map((field, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-3 bg-gray-50"
                          >
                            <h6 className="font-medium text-sm mb-1">
                              {field.label}
                            </h6>
                            <div className="text-xs text-gray-600">
                              <div>نوع: {field.type}</div>
                              <div>
                                تعداد پاسخ: {field.statistics.totalResponses}
                              </div>
                              <div>
                                درصد پاسخ: {field.statistics.responseRate}%
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => fetchSubmissions(currentPage, filter)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                تلاش مجدد
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">هیچ گزارشی یافت نشد</p>
            </div>
          ) : (
            <>
              {/* Submissions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ارسال کننده
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        منطقه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        واحد سازمانی
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ ارسال
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        بررسی کننده
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => {
                      const statusInfo = getStatusInfo(submission.status);
                      return (
                        <tr
                          key={submission._id}
                          className="hover:bg-gray-50 text-right"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.submittedBy?.fullName || "نامشخص"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.submittedBy?.email || ""}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {submission.submittedByDistrict?.name || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {submission.submittedByExamCenter?.name || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(submission.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                            >
                              {statusInfo.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {submission.reviewedBy?.fullName || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                            <Link
                              href={`/dashboard/submissions/${submission._id}`}
                              className="text-blue-600 hover:text-blue-900 ml-4"
                            >
                              مشاهده جزئیات
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <nav className="flex space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
