"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";

export default function SubmissionsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchSubmissions(currentPage, filter);
    }
  }, [currentPage, filter, user]);

  const fetchSubmissions = async (page = 1, status = "all") => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url =
        status === "all"
          ? `/api/submissions?page=${page}`
          : `/api/submissions?page=${page}&status=${status}`;

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

      if (data.success) {
        setSubmissions(data.submissions);
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

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
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

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">لطفا وارد شوید</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              گزارش‌های ارسالی من
            </h1>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
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
        </div>

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
                        عنوان فرم
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
                        <tr key={submission._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.form?.title || "نامشخص"}
                              </div>
                              {submission.form?.description && (
                                <div className="text-sm text-gray-500">
                                  {submission.form.description.length > 50
                                    ? `${submission.form.description.substring(
                                        0,
                                        50
                                      )}...`
                                    : submission.form.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(submission.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                            >
                              {statusInfo.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {submission.reviewedBy?.fullName || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
